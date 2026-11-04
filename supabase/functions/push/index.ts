// M&M's · push: sends a notification to the other person when something happens.
// Called by database triggers. It holds no secrets itself: the database checks the
// hook secret and hands over the subscriptions and the VAPID key.
const SUPABASE_URL = "https://vktxzparkerniiqlayio.supabase.co";
const KEY = "sb_publishable_fvtYnAYSFmUUGKikjsT4bw_qYZwuvsC";

const te = (s: string) => new TextEncoder().encode(s);
const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
};
const b64u = {
  enc: (buf: ArrayBuffer | Uint8Array) => {
    let s = "";
    for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  dec: (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0)),
};
async function hmac(key: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

// RFC 8291 (aes128gcm) message encryption
export async function encrypt(p256dh: string, authSecret: string, plaintext: Uint8Array) {
  const ua = b64u.dec(p256dh), auth = b64u.dec(authSecret);
  const as = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  const prkKey = await hmac(auth, ecdh);
  const ikm = await hmac(prkKey, cat(te("WebPush: info\0"), ua, asPub, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(te("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(te("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, cat(plaintext, new Uint8Array([2]))));
  const header = new Uint8Array(86);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = 65;
  header.set(asPub, 21);
  return cat(header, ct);
}

// RFC 8292 (VAPID) authorization
export async function vapidJwt(audience: string, subject: string, publicKey: string, privateD: string) {
  const pub = b64u.dec(publicKey);
  const jwk = { kty: "EC", crv: "P-256", d: privateD, x: b64u.enc(pub.slice(1, 33)), y: b64u.enc(pub.slice(33, 65)), ext: true };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64u.enc(te(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u.enc(te(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, te(`${head}.${body}`));
  return `${head}.${body}.${b64u.enc(sig)}`;
}

type Sub = { endpoint: string; name: string; p256dh: string; auth: string; prefs: Record<string, unknown> | null };
type Ctx = { vapid_public: string; vapid_private: string; subject: string; members: { name: string; tz: string }[]; subs: Sub[] };
type Note = { to: string; category: string; title: string; body: string | ((tz: string) => string); privateBody?: string; url: string; tag?: string };

export async function sendPush(sub: Sub, payload: string, ctx: Ctx) {
  const body = await encrypt(sub.p256dh, sub.auth, te(payload));
  const jwt = await vapidJwt(new URL(sub.endpoint).origin, ctx.subject, ctx.vapid_public, ctx.vapid_private);
  return fetch(sub.endpoint, {
    method: "POST",
    headers: { TTL: "86400", Urgency: "high", "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", Authorization: `vapid t=${jwt}, k=${ctx.vapid_public}` },
    body,
  });
}

const DEFAULTS = { messages: true, hearts: true, photos: true, calls: true, words: true, story: true, preview: true, quiet_from: null, quiet_to: null };
const clip = (s: string, n = 180) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");
const when = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

export function quiet(p: Record<string, unknown>, now = new Date()) {
  const from = p.quiet_from as string | null, to = p.quiet_to as string | null;
  if (!from || !to || from === to) return false;
  const hm = new Intl.DateTimeFormat("en-GB", { timeZone: (p.tz as string) || "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  return from < to ? hm >= from && hm < to : hm >= from || hm < to;
}

// What happened, and who should hear about it
export function compose(ev: { table: string; op: string; record: Record<string, any>; old?: Record<string, any> | null }, members: { name: string }[]): Note | null {
  const r = ev.record || {}, o = ev.old || {};
  const other = (n: string) => members.find((m) => m.name !== n)?.name || "";
  switch (ev.table) {
    case "posts": {
      // a scheduled message notifies when it arrives (send_at cleared), not when it's written
      const arriving = ev.op === "INSERT" ? !r.send_at : ev.op === "UPDATE" && !!o.send_at && !r.send_at;
      if (!arriving) return null;
      const to = other(r.author);
      if (r.kind === "voice") {
        const s = Math.round(r.meta?.duration || 0);
        return { to, category: "messages", title: r.author, body: `🎤 Voice message${s ? ` · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : ""}`, privateBody: "🎤 Voice message", url: "./#chat" };
      }
      if (r.kind === "note") return { to, category: "messages", title: r.author, body: clip(r.body), privateBody: "New message", url: "./#chat" };
      if (r.kind === "heart") return { to, category: "hearts", title: r.author, body: "♥ is thinking of you", privateBody: "♥", url: "./#chat", tag: "heart" };
      if (r.kind === "photo") return { to, category: "photos", title: r.author, body: "📷 sent you a photo", privateBody: "📷 New photo", url: "./#chat" };
      return null;
    }
    case "calls": {
      if (ev.op === "INSERT" && r.status === "proposed") {
        return { to: other(r.proposed_by), category: "calls", title: r.proposed_by, body: (tz) => `📞 suggests a call · ${when(r.starts_at, tz)}${r.note ? ` · ${clip(r.note, 60)}` : ""}`, privateBody: "📞 New call suggestion", url: "./#calls" };
      }
      if (ev.op === "UPDATE" && o.status !== r.status && (r.status === "accepted" || r.status === "declined")) {
        const from = other(r.proposed_by);
        return { to: r.proposed_by, category: "calls", title: from, body: (tz) => (r.status === "accepted" ? `✅ said yes to the call · ${when(r.starts_at, tz)}` : `can't make the call · ${when(r.starts_at, tz)}`), url: "./#calls" };
      }
      return null;
    }
    case "words":
      if (ev.op !== "INSERT") return null;
      return { to: r.for_name, category: "words", title: r.added_by, body: `📖 taught you a word: ${r.word} · ${clip(r.meaning, 80)}`, privateBody: "📖 taught you a new word", url: "./#words" };
    case "trips":
      if (ev.op !== "INSERT" || !r.created_by) return null;
      return { to: other(r.created_by), category: "story", title: r.created_by, body: `✈️ added a trip: ${clip(r.title, 80)}`, url: "./#trips" };
    case "moments":
      if (ev.op !== "INSERT" || !r.created_by) return null;
      return { to: other(r.created_by), category: "story", title: r.created_by, body: `📸 added a memory: ${clip(r.title, 80)}`, url: "./#us" };
    case "surprises":
      if (ev.op !== "UPDATE" || o.found_at || !r.found_at) return null;
      return { to: r.created_by, category: "surprise", title: "M&M's", body: `✨ ${r.for_name} just found one of your surprises`, url: "./#us" };
    case "push_pings":
      return { to: r.name, category: "test", title: "M&M's", body: "🔔 Notifications are working", url: "./#us" };
  }
  return null;
}

const rpc = (fn: string, args: Record<string, unknown>) =>
  fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify(args) })
    .then((r) => (r.ok ? r.json() : null));

export async function handle(req: Request) {
  if (req.method !== "POST") return new Response("M&M's push", { status: 200 });
  const secret = req.headers.get("x-mm-hook") || "";
  const ctx: Ctx | null = secret ? await rpc("push_context", { p_secret: secret }) : null;
  if (!ctx) return new Response("unauthorized", { status: 401 });
  const ev = await req.json();
  const note = compose(ev, ctx.members);
  if (!note || !note.to) return new Response(JSON.stringify({ sent: 0 }), { headers: { "Content-Type": "application/json" } });
  const memberTz = ctx.members.find((m) => m.name === note.to)?.tz || "UTC";
  let sent = 0;
  for (const s of ctx.subs.filter((x) => x.name === note.to)) {
    const p = { ...DEFAULTS, tz: memberTz, ...(s.prefs || {}) } as Record<string, unknown>;
    if (note.category !== "test" && note.category !== "surprise" && p[note.category] === false) continue;
    if (note.category !== "test" && quiet(p)) continue;
    const text = p.preview === false && note.privateBody ? note.privateBody : typeof note.body === "function" ? note.body(p.tz as string) : note.body;
    const payload = JSON.stringify({ title: note.title, body: text, url: note.url, tag: note.tag || null });
    try {
      const res = await sendPush(s, payload, ctx);
      if (res.status === 404 || res.status === 410) await rpc("push_forget", { p_secret: secret, p_endpoint: s.endpoint });
      else if (res.ok) sent++;
    } catch (_e) { /* one device failing shouldn't stop the other */ }
  }
  return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });
}

if (typeof Deno !== "undefined") Deno.serve(handle);
