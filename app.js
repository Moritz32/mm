// M&M's · chat, trips, calls and memories for Moritz & Margaret
import { SUPABASE_URL, SUPABASE_KEY, CALENDAR_FEED, CITIES, VAPID_PUBLIC } from "./config.js";
import { wordOfTheDay } from "./words.js";

const sb = window.__MM_FAKE__ ??
  (await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm")).createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

// ═══ Small helpers ═══════════════════════════════════════════════
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const DAY = 864e5, HOUR = 36e5, MIN = 6e4;
const PAGE = 80;
const EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
const EMOJI_SETS = [
  ["Love", "❤️ 🥰 😘 😍 💕 💖 💗 💞 💘 💝 💋 🫶 🤗 🌹 💐 🧸"],
  ["Smileys", "😊 😂 🥹 😭 😅 😉 😴 🤔 😮 🥺 😢 😤 😎 🤪 🙈 🤭"],
  ["Us", "✈️ 🗽 🌉 🗼 🌍 🧳 ⏳ 📞 🌙 ☀️ ❄️ ☕ 🍕 🍷 🥂 🎁"],
  ["More", "👍 👏 🙏 💪 👋 🤞 ✨ 🎉 🔥 💯 🌈 🦋 🐻 🐶 🐱 🍀"],
].map(([name, list]) => [name, list.split(" ")]);
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const FINE_POINTER = matchMedia("(pointer: fine)").matches;
const plural = (n, w) => `${n} ${n === 1 ? w : w + "s"}`;
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

const PATHS = {
  heart: '<path fill="currentColor" stroke="none" d="M12 21.2c-.3 0-.6-.1-.8-.3C7.1 17.6 2.5 13.7 2.5 9.1 2.5 6.1 4.9 3.7 7.8 3.7c1.7 0 3.2.8 4.2 2.1 1-1.3 2.5-2.1 4.2-2.1 2.9 0 5.3 2.4 5.3 5.4 0 4.6-4.6 8.5-8.7 11.8-.2.2-.5.3-.8.3z"/>',
  chat: '<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z"/>',
  plane: '<path fill="currentColor" stroke="none" d="M21.5 12c0-.8-.7-1.4-1.5-1.4h-5.2L10 3.2H8.1l2.4 7.4H5.4L3.8 8.4H2.3l1 3.6-1 3.6h1.5l1.6-2.2h5.1l-2.4 7.4H10l4.8-7.4H20c.8 0 1.5-.6 1.5-1.4z"/>',
  phone: '<path d="M6.5 3.5h3l1.5 4.5-2 1.2a11 11 0 0 0 5.8 5.8l1.2-2 4.5 1.5v3a2 2 0 0 1-2.1 2A16.5 16.5 0 0 1 4.5 5.6a2 2 0 0 1 2-2.1z"/>',
  us: '<path d="M12 3.5l1.9 5 5.1 1.9-5.1 1.9-1.9 5-1.9-5L5 10.4l5.1-1.9z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  camera: '<rect x="3" y="6.5" width="18" height="13" rx="3"/><circle cx="12" cy="13" r="3.3"/><path d="M8.5 6.5 10 4.5h4l1.5 2"/>',
  send: '<path d="M12 18.5V6M6.5 11.5 12 6l5.5 5.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  pin: '<path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  dots: '<circle cx="5.5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18.5" cy="12" r="1.6" fill="currentColor"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5h10"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
  book: '<path d="M5 4.5h11.5a1.5 1.5 0 0 1 1.5 1.5v14H7a2 2 0 0 1-2-2z"/><path d="M5 18a2 2 0 0 1 2-2h11"/><path d="M9 8.5h5"/>',
  speaker: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9.3a3.8 3.8 0 0 1 0 5.4M18.2 6.8a7.5 7.5 0 0 1 0 10.4"/>',
  smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.6 14.3a4.6 4.6 0 0 0 6.8 0"/><circle cx="9.3" cy="10" r="1.1" fill="currentColor" stroke="none"/><circle cx="14.7" cy="10" r="1.1" fill="currentColor" stroke="none"/>',
  reply: '<path d="M9.5 6.5 4 12l5.5 5.5"/><path d="M4.5 12H14a6 6 0 0 1 6 6v.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  star: '<path d="M12 3.8l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-3.9 5.6-.8z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>',
  play: '<path fill="currentColor" stroke="none" d="M8 5.6v12.8a1 1 0 0 0 1.5.86l10.2-6.4a1 1 0 0 0 0-1.72L9.5 4.74A1 1 0 0 0 8 5.6z"/>',
  pause: '<rect x="6.5" y="5" width="3.8" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.7" y="5" width="3.8" height="14" rx="1.2" fill="currentColor" stroke="none"/>',
  photo: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/>',
};
const ico = (name, cls = "i") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;

// ═══ Time zones ══════════════════════════════════════════════════
const WD = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
const WD_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const partsFmt = new Map();
function zoneParts(date, tz) {
  if (!partsFmt.has(tz)) {
    partsFmt.set(tz, new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", weekday: "short",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }));
  }
  const o = {};
  for (const p of partsFmt.get(tz).formatToParts(date)) o[p.type] = p.value;
  return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second, wd: WD[o.weekday] };
}
function zoneOffset(date, tz) {
  const p = zoneParts(date, tz);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(date.getTime() / 1000) * 1000;
}
// A wall-clock time in a city → the real moment
function zonedDate(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let t = guess - zoneOffset(new Date(guess), tz);
  t = guess - zoneOffset(new Date(t), tz);
  return new Date(t);
}
const fmt = (date, tz, opts) => new Intl.DateTimeFormat(undefined, { timeZone: tz, ...opts }).format(date);
const fTime = (d, tz = LOCAL_TZ) => fmt(d, tz, { hour: "2-digit", minute: "2-digit" });
const fDay = (d, tz = LOCAL_TZ) => fmt(d, tz, { weekday: "short", day: "numeric", month: "short" });
const fDate = (d, tz = LOCAL_TZ) => fmt(d, tz, { day: "numeric", month: "long", year: "numeric" });
const dayKey = (d, tz = LOCAL_TZ) => { const p = zoneParts(d, tz); return `${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`; };
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
function dayLabel(d) {
  const k = dayKey(d), today = dayKey(new Date()), yest = dayKey(new Date(Date.now() - DAY));
  if (k === today) return "Today";
  if (k === yest) return "Yesterday";
  return fmt(d, LOCAL_TZ, { weekday: "long", day: "numeric", month: "long" });
}
function inText(ms) {
  if (ms < MIN) return "now";
  const d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / HOUR), m = Math.floor((ms % HOUR) / MIN);
  if (d >= 2) return `in ${d} days`;
  if (d === 1) return `in 1 day ${h} h`;
  if (h) return `in ${h} h ${m} min`;
  return `in ${m} min`;
}
// Parse <input type=date> + <input type=time> in a city's time
function fromInputs(dateStr, timeStr, tz) {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || ""), tm = /^(\d{1,2}):(\d{2})/.exec(timeStr || "");
  if (!dm || !tm) return null;
  return zonedDate(+dm[1], +dm[2], +dm[3], +tm[1], +tm[2], tz);
}
const toDateInput = (d, tz) => dayKey(d, tz);
const toTimeInput = (d, tz) => { const p = zoneParts(d, tz); return `${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`; };

// ═══ State ═══════════════════════════════════════════════════════
const S = {
  started: false, me: null, partner: null, members: [],
  posts: [], reactions: [], more: false, msgCount: 0,
  chatV2: false, replyTo: null, editing: null, editText: null, draftKeep: "", quoted: new Map(), // replies and edits
  chatV3: false, saved: [], rec: null, playing: null, audio: null, sendingVoice: 0, unreadFrom: null, searchSeq: 0, // voice, send later, saved
  trips: [], trip_days: [], ideas: [], packing: [], availability: [], calls: [], moments: [], locations: [], surprises: [], words: [],
  tab: tabFromHash(), tripId: null, tripSub: "plan", packOwner: null,
  urls: new Map(), uploading: 0, channel: null, prefill: null,
};
const KEYS = {
  posts: (r) => r.id, reactions: (r) => `${r.post_id}|${r.author}`, trip_days: (r) => `${r.trip_id}|${r.day}`,
  trips: (r) => r.id, ideas: (r) => r.id, packing: (r) => r.id, availability: (r) => r.id, calls: (r) => r.id, moments: (r) => r.id,
  locations: (r) => r.name, surprises: (r) => r.id, words: (r) => r.id, saved: (r) => `${r.post_id}|${r.saved_by}`,
};
const SORTS = {
  posts: (a, b) => a.created_at.localeCompare(b.created_at),
  trips: (a, b) => a.reunion.localeCompare(b.reunion),
  calls: (a, b) => a.starts_at.localeCompare(b.starts_at),
  moments: (a, b) => b.happened_on.localeCompare(a.happened_on),
  ideas: (a, b) => a.created_at.localeCompare(b.created_at),
  packing: (a, b) => a.created_at.localeCompare(b.created_at),
  surprises: (a, b) => a.created_at.localeCompare(b.created_at),
  words: (a, b) => a.created_at.localeCompare(b.created_at),
};
function upsertRow(t, row) {
  if (!row) return;
  const k = KEYS[t](row), list = S[t];
  const i = list.findIndex((r) => KEYS[t](r) === k);
  if (i >= 0) list[i] = { ...list[i], ...row };
  else {
    list.push(row);
    if (t === "posts" && row.kind === "note") S.msgCount++;
  }
  if (SORTS[t]) list.sort(SORTS[t]);
}
function removeRow(t, row) {
  const k = KEYS[t](row);
  const before = S[t].length;
  S[t] = S[t].filter((r) => KEYS[t](r) !== k);
  if (t === "posts" && S[t].length < before && row.kind !== "heart") S.msgCount = Math.max(0, S.msgCount - 1);
  if (t === "posts") {
    S.reactions = S.reactions.filter((r) => r.post_id !== row.id);
    // replies to it lose their quote (the database does the same), and a reply or edit in progress stops
    for (const p of S.posts) if (p.reply_to === row.id) p.reply_to = null;
    S.quoted.delete(row.id);
    S.saved = S.saved.filter((x) => x.post_id !== row.id);
    if (S.playing?.id === row.id) voiceStop();
    if (S.replyTo === row.id || S.editing === row.id) cancelCtx();
  }
}
const member = (name) => S.members.find((m) => m.name === name);
const otherOf = (name) => S.members.find((m) => m.name !== name);

async function run(query, failMsg = "Couldn't save. Check your connection and try again.") {
  const { data, error } = await query;
  if (error) {
    console.error(error);
    toast(failMsg);
    throw error;
  }
  return data;
}

// ═══ Start-up and login ══════════════════════════════════════════
function tabFromHash() {
  const t = location.hash.replace("#", "");
  return ["chat", "trips", "calls", "words", "us"].includes(t) ? t : "chat";
}

async function boot() {
  sb.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") return renderLogin("reset");
    if (event === "SIGNED_OUT") { stop(); return renderLogin("signin"); }
    if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session && !S.started && !S.recovering) start(session);
  });
  const { data } = await sb.auth.getSession();
  if (data.session) { if (!S.started && !S.recovering) start(data.session); }
  else if (!S.recovering) renderLogin("signin");
}

function renderLogin(mode, note) {
  S.recovering = mode === "reset";
  const titles = {
    signin: ["Welcome back", "Sign in to your space."],
    signup: ["Join M&M's", "Create your account with the email you gave Moritz."],
    forgot: ["Forgot your password?", "We'll email you a link to choose a new one."],
    reset: ["New password", "Choose a new password for your account."],
  };
  const [h, sub] = titles[mode];
  $("#app").innerHTML = `
    <section class="login">
      <div class="login-box">
        <div class="logo">${ico("heart")}</div>
        <div class="row" style="gap:6px;flex-direction:column;align-items:flex-start">
          <h1>${h}</h1><p class="muted">${sub}</p>
        </div>
        <form class="form" data-form="auth" data-mode="${mode}" novalidate>
          ${mode !== "reset" ? `<label class="f">Email<input class="in" id="auth-email" type="email" autocomplete="email" inputmode="email" required></label>` : ""}
          ${mode !== "forgot" ? `<label class="f">Password<input class="in" id="auth-pass" type="password" autocomplete="${mode === "signin" ? "current-password" : "new-password"}" minlength="6" required></label>` : ""}
          <button class="btn" type="submit">${{ signin: "Sign in", signup: "Create account", forgot: "Send link", reset: "Save password" }[mode]}</button>
          <div class="msg ${note?.bad ? "bad" : "good"}" id="auth-msg" ${note ? "" : "hidden"}>${esc(note?.text || "")}</div>
        </form>
        <div class="row wrap" style="justify-content:space-between">
          ${mode === "signin" ? `<button class="link" data-act="auth-mode" data-mode="signup">First time? Create your account</button><button class="link" data-act="auth-mode" data-mode="forgot">Forgot password</button>` : ""}
          ${mode === "signup" || mode === "forgot" ? `<button class="link" data-act="auth-mode" data-mode="signin">Back to sign in</button>` : ""}
        </div>
      </div>
    </section>`;
}

function authError(e) {
  const m = (e && e.message) || "";
  if (/database error saving new user|private/i.test(m)) return "This app is private. Only Moritz's and Margaret's emails can join.";
  if (/invalid login credentials/i.test(m)) return "That email or password isn't right.";
  if (/email not confirmed/i.test(m)) return "Confirm your email first: tap the link in the email we sent you.";
  if (/already registered|already exists/i.test(m)) return "This email already has an account. Sign in instead.";
  if (/password should be at least/i.test(m)) return "Use at least 6 characters for your password.";
  if (/rate limit|too many/i.test(m)) return "Too many tries. Wait a minute and try again.";
  return m || "Something went wrong. Check your connection and try again.";
}

async function submitAuth(form) {
  const mode = form.dataset.mode;
  const email = $("#auth-email")?.value.trim();
  const password = $("#auth-pass")?.value;
  const msg = $("#auth-msg");
  const say = (text, bad = true) => { msg.hidden = false; msg.className = `msg ${bad ? "bad" : "good"}`; msg.textContent = text; };
  if (mode !== "reset" && !/^\S+@\S+\.\S+$/.test(email || "")) return say("Enter your email address.");
  if (mode !== "forgot" && (password || "").length < 6) return say("Use at least 6 characters for your password.");
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const here = location.origin + location.pathname;
    if (mode === "signin") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } else if (mode === "signup") {
      const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: here } });
      if (error) throw error;
      if (!data.session) renderLogin("signin", { text: `Almost done: we sent an email to ${email}. Tap the link in it, then sign in here.` });
    } else if (mode === "forgot") {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: here });
      if (error) throw error;
      say("Check your email for a link to choose a new password.", false);
    } else if (mode === "reset") {
      const { data, error } = await sb.auth.updateUser({ password });
      if (error) throw error;
      S.recovering = false;
      const { data: s } = await sb.auth.getSession();
      start(s.session || data.session);
    }
  } catch (e) {
    say(authError(e));
  } finally {
    btn.disabled = false;
  }
}

async function start(session) {
  if (S.started) return;
  S.started = true;
  S.session = session;
  try {
    const members = await run(sb.from("members").select("*"), "Couldn't load your space. Check your connection.");
    S.members = members;
    S.me = members.find((m) => m.user_id === session.user.id);
    S.partner = S.me && otherOf(S.me.name);
    if (!S.me || !S.partner) {
      $("#app").innerHTML = `<section class="login"><div class="login-box"><div class="logo">${ico("heart")}</div><h1>Almost there</h1><p class="muted">Your account isn't linked to M&amp;M's yet. Make sure you signed up with the email Moritz added.</p><button class="btn ghost" data-act="signout">Sign out</button></div></section>`;
      return;
    }
    S.packOwner = S.me.name;
    await loadAll();
    subscribe();
    renderShell();
    if (!S.timer) S.timer = setInterval(tick, 1000);
    checkDrop();
    if (location.hash === "#drop") { const ph = tripPhase(); if (ph.kind === "countdown") celebrate(ph.days + 1, ph.days); }
    greetToday();
    seekOnOpen();
    pushStart();
    shareLocation(false);
    if (!S.locTimer) S.locTimer = setInterval(() => shareLocation(false), 10 * MIN);
  } catch (e) {
    S.started = false;
    $("#app").innerHTML = `<section class="login"><div class="login-box"><div class="logo">${ico("heart")}</div><h1>Can't connect</h1><p class="muted">Check your internet connection, then try again.</p><button class="btn" data-act="reload">Try again</button></div></section>`;
  }
}

function stop() {
  if (S.channel) sb.removeChannel(S.channel);
  Object.assign(S, { started: false, channel: null, me: null, partner: null, posts: [], reactions: [], trips: [], trip_days: [], ideas: [], packing: [], availability: [], calls: [], moments: [], locations: [], surprises: [], words: [], saved: [], tripId: null, dropSeen: null });
}

async function loadAll() {
  const [posts, trips, days, ideas, packing, availability, calls, moments, count, locations, surprises, words] = await Promise.all([
    run(sb.from("posts").select("*").order("created_at", { ascending: false }).limit(PAGE)),
    run(sb.from("trips").select("*").order("reunion")),
    run(sb.from("trip_days").select("*")),
    run(sb.from("ideas").select("*").order("created_at")),
    run(sb.from("packing").select("*").order("created_at")),
    run(sb.from("availability").select("*")),
    run(sb.from("calls").select("*").order("starts_at")),
    run(sb.from("moments").select("*").order("happened_on", { ascending: false })),
    sb.from("posts").select("id", { count: "exact", head: true }).eq("kind", "note"),
    sb.from("locations").select("*").then((r) => r.data || []),
    sb.from("surprises").select("*").then((r) => r.data || [], () => []),
    sb.from("words").select("*").order("created_at").then((r) => r.data || [], () => []),
    // replies and edits light up once the database has them (update 8); voice, send later and saved with update 9
    sb.from("posts").select("reply_to,edited_at").limit(1).then((r) => !r.error, () => false),
    sb.from("posts").select("send_at,meta").limit(1).then((r) => !r.error, () => false),
    sb.from("saved").select("*").then((r) => (r.error ? null : r.data), () => null),
  ]).then((r) => { const saved = r.pop(); S.chatV3 = r.pop() && !!saved; S.chatV2 = r.pop(); S.saved = saved || []; return r; });
  S.posts = posts.slice().reverse();
  S.more = posts.length === PAGE;
  Object.assign(S, { trips, trip_days: days, ideas, packing, availability, calls, moments, locations, surprises, words });
  S.msgCount = count?.count ?? posts.filter((p) => p.kind === "note").length;
  S.reactions = posts.length ? await run(sb.from("reactions").select("*").in("post_id", posts.map((p) => p.id))) : [];
  await fetchQuoted();
}

// Replies to messages older than what's loaded still show what they answer
async function fetchQuoted() {
  if (!S.chatV2) return false;
  const ids = [...S.posts.map((p) => p.reply_to), ...S.saved.map((x) => x.post_id)];
  const need = [...new Set(ids.filter((id) => id && !S.quoted.has(id) && !S.posts.some((x) => x.id === id)))];
  if (!need.length) return false;
  const { data } = await sb.from("posts").select("*").in("id", need);
  for (const p of data || []) S.quoted.set(p.id, p);
  return !!data?.length;
}

function subscribe() {
  const ch = sb.channel("mm-live");
  for (const t of Object.keys(KEYS)) {
    if (t === "saved" && !S.chatV3) continue; // the table arrives with update 9
    ch.on("postgres_changes", { event: "*", schema: "public", table: t }, (p) => {
      if (t === "surprises" && p.eventType === "UPDATE") noticeFound(p.new);
      // a new message from her (or one she scheduled, arriving now)
      if (t === "posts" && p.eventType !== "DELETE" && p.new.author !== S.me?.name && p.new.kind === "note" && !p.new.send_at && !S.posts.some((x) => x.id === p.new.id)) builtInEggs(p.new.body, false);
      if (p.eventType === "DELETE") removeRow(t, p.old);
      else upsertRow(t, p.new);
      refresh(t);
      if ((t === "posts" && p.new?.reply_to) || (t === "saved" && p.eventType === "INSERT")) fetchQuoted().then((got) => { if (got) refresh(t); });
    });
  }
  ch.subscribe((status) => {
    // After a reconnect (phone woke up), catch up on anything missed
    if (status === "SUBSCRIBED" && S.wasDisconnected) { S.wasDisconnected = false; loadAll().then(() => refresh("all")); }
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") S.wasDisconnected = true;
  });
  S.channel = ch;
}

// Re-render what a change touches
function refresh(t) {
  renderHeader();
  if (S.tab === "chat" && (t === "posts" || t === "reactions" || t === "saved" || t === "all")) { renderMsgs(); renderChatTools(); markSeen(); }
  else if (S.tab !== "chat") renderView();
}

// ═══ Shell ═══════════════════════════════════════════════════════
function renderShell() {
  $("#app").innerHTML = `
    <header class="top" id="top"></header>
    <main id="view"></main>
    <nav class="tabs" aria-label="Sections">
      ${[["chat", "Chat", "chat"], ["trips", "Trips", "plane"], ["calls", "Calls", "phone"], ["words", "Words", "book"], ["us", "Us", "us"]].map(([id, label, icon]) =>
        `<button class="tab" data-act="tab" data-tab="${id}" ${S.tab === id ? 'aria-current="page"' : ""}>${ico(icon)}<span>${label}</span></button>`).join("")}
    </nav>`;
  renderHeader();
  renderView();
}

function setTab(tab) {
  if (tab === S.tab && tab === "trips") S.tripId = null;
  if (tab !== "chat" && S.rec) voiceFinish(false);
  S.tab = tab;
  history.replaceState(null, "", `#${tab}`);
  $$(".tab").forEach((b) => { if (b.dataset.tab === tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  renderView();
  $("#view").scrollTop = 0;
}

function tripPhase(now = Date.now()) {
  const upcoming = S.trips.filter((t) => Date.parse(t.goodbye) > now).sort((a, b) => a.reunion.localeCompare(b.reunion));
  const trip = upcoming[0];
  if (!trip) return { kind: "none" };
  const reunion = Date.parse(trip.reunion), goodbye = Date.parse(trip.goodbye);
  if (now < reunion) {
    const ms = reunion - now;
    return { kind: ms > DAY ? "countdown" : "lastday", trip, ms, days: Math.floor(ms / DAY) };
  }
  const total = Math.max(1, Math.round((goodbye - reunion) / DAY));
  return { kind: "together", trip, day: Math.min(total, Math.floor((now - reunion) / DAY) + 1), total };
}

function renderHeader() {
  const top = $("#top");
  if (!top || !S.partner) return;
  const ph = tripPhase();
  let big, sub;
  if (ph.kind === "countdown") { big = plural(ph.days, "day"); sub = `until we're together · ${fDay(new Date(ph.trip.reunion), destOf(ph.trip).tz)}`; }
  else if (ph.kind === "lastday") { const h = Math.floor(ph.ms / HOUR), m = Math.floor((ph.ms % HOUR) / MIN); big = h ? `${h} h ${m} min` : `${m} min`; sub = "almost there ♥"; }
  else if (ph.kind === "together") { big = `Day ${ph.day} of ${ph.total}`; sub = "together ♥"; }
  else { big = "M&M's"; sub = "plan your next trip"; }
  const sp = today();
  if (sp.text) sub = sp.text;
  if (document.body.dataset.theme !== (sp.theme || "")) setTheme(sp.theme);
  const html = `${decorHTML(sp.theme)}
    <div class="top-left"><div class="top-days" data-act="heart-tap">${ico("heart")}<span>${esc(big)}</span></div><div class="top-sub">${esc(sub)}</div></div>
    <div class="top-right"><div class="top-city">${esc(S.partner.city)}</div><div class="top-clock" id="partner-clock">${esc(clock())}</div></div>`;
  const sig = big + sub + (sp.theme || "");
  if (top.dataset.sig !== sig) { top.innerHTML = html; top.dataset.sig = sig; }
}
const clock = () => fmt(new Date(), S.partner.tz, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function tick() {
  checkDrop();
  wishTime();
  const c = $("#partner-clock");
  if (c) c.textContent = clock();
  renderHeader();
  $$("[data-until]").forEach((el) => { el.textContent = inText(Date.parse(el.dataset.until) - Date.now()); });
}

function renderView() {
  const view = $("#view");
  if (!view) return;
  view.classList.toggle("chat-mode", S.tab === "chat");
  if (S.tab === "chat") return viewChat(view);
  preserve(view, () => {
    view.innerHTML = { trips: viewTrips, calls: viewCalls, words: viewWords, us: viewUs }[S.tab]();
  });
  hydratePhotos(view);
  if (S.tab === "calls") updateCallPreview();
}

// Keep focus, typing and scroll position when live updates re-render a view
function preserve(view, paint) {
  const active = document.activeElement;
  const activeId = active && view.contains(active) ? active.id : null;
  const sel = activeId && typeof active.selectionStart === "number" ? [active.selectionStart, active.selectionEnd] : null;
  const dirty = $$("[data-dirty]", view).filter((el) => el.id).map((el) => [el.id, el.value]);
  const top = view.scrollTop;
  paint();
  for (const [id, value] of dirty) {
    const el = document.getElementById(id);
    if (el) { el.value = value; el.dataset.dirty = "1"; }
  }
  view.scrollTop = top;
  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) {
      el.focus({ preventScroll: true });
      if (sel) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* not a text field */ }
    }
  }
}

// ═══ Photos ══════════════════════════════════════════════════════
async function hydratePhotos(root) {
  const imgs = $$("img[data-path]", root);
  const now = Date.now();
  const need = [...new Set(imgs.map((i) => i.dataset.path))].filter((p) => !(S.urls.get(p)?.exp > now + MIN));
  if (need.length) {
    const { data, error } = await sb.storage.from("photos").createSignedUrls(need, 6 * 3600);
    if (!error && data) for (const d of data) if (d.signedUrl) S.urls.set(d.path, { url: d.signedUrl, exp: now + 6 * HOUR });
  }
  for (const img of $$("img[data-path]", root)) {
    const u = S.urls.get(img.dataset.path);
    if (u && img.getAttribute("src") !== u.url) img.src = u.url;
  }
}

async function compress(file, max = 1400) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("That file isn't a photo")); i.src = url; });
    const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * sc);
    c.height = Math.round(img.naturalHeight * sc);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't read the photo"))), "image/jpeg", 0.82));
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function uploadPhoto(file) {
  const blob = await compress(file);
  const path = `${uuid()}.jpg`;
  const { error } = await sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

function openLightbox(path) {
  const u = S.urls.get(path);
  if (!u) return;
  const box = document.createElement("div");
  box.className = "lightbox";
  box.innerHTML = `<img src="${esc(u.url)}" alt="Photo"><button class="icon-btn" aria-label="Close">${ico("close")}</button>`;
  box.addEventListener("click", () => box.remove());
  document.body.append(box);
}

// ═══ Sheets and toasts ═══════════════════════════════════════════
function openSheet(html) {
  closeSheet();
  const root = $("#sheet-root");
  root.innerHTML = `<div class="scrim" data-act="sheet-close"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  const first = root.querySelector("input:not([type=file]), textarea, select");
  if (first && FINE_POINTER) first.focus();
  return root.querySelector(".sheet");
}
function closeSheet() { $("#sheet-root").innerHTML = ""; }
let toastTimer;
function toast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast("Copied"); }
  catch (e) { toast("Couldn't copy. Press and hold the link to copy it."); }
}

// ═══ Chat ════════════════════════════════════════════════════════
function viewChat(view) {
  const canVoice = S.chatV3 && voiceSupported();
  view.innerHTML = `
    <div class="chat-tools" id="chat-tools">${chatToolsHTML()}</div>
    <div class="msgs" id="msgs" aria-label="Messages"></div>
    <div class="emoji-panel" id="emoji-panel" hidden></div>
    <div class="compose-ctx" id="compose-ctx" hidden></div>
    <form class="composer${canVoice ? " can-voice" : ""}" data-form="send">
      <label class="icon-btn" aria-label="Send a photo">${ico("camera")}<input type="file" accept="image/*" hidden data-file="chat"></label>
      <button type="button" class="icon-btn" data-act="send-heart" aria-label="Send a heart">${ico("heart")}</button>
      <button type="button" class="icon-btn" data-act="emoji-panel" aria-label="Emojis" aria-expanded="false" aria-controls="emoji-panel">${ico("smile")}</button>
      <textarea id="composer" rows="1" maxlength="2000" placeholder="Message ${esc(S.partner.name)}" aria-label="Message"></textarea>
      ${S.chatV3 ? `<button type="button" class="icon-btn sched-btn" data-act="send-later" aria-label="Send later">${ico("clock")}</button>` : ""}
      ${canVoice ? `<button type="button" class="mic-btn" data-act="voice-start" aria-label="Record a voice message">${ico("mic")}</button>` : ""}
      <button class="send" id="send-btn" type="submit" aria-label="Send" disabled>${ico("send")}</button>
      <div class="rec" id="rec" hidden>
        <button type="button" class="icon-btn" data-act="voice-cancel" aria-label="Delete recording">${ico("trash")}</button>
        <span class="rec-dot" aria-hidden="true"></span><span class="rec-time" id="rec-time" role="timer">0:00</span>
        <span class="rec-level" id="rec-level" aria-hidden="true">${"<i></i>".repeat(24)}</span>
        <button type="button" class="send" data-act="voice-send" aria-label="Send voice message">${ico("send")}</button>
      </div>
    </form>`;
  const ta = $("#composer");
  ta.value = S.editing ? S.editText ?? "" : S.draft || "";
  autosize(ta);
  syncComposer();
  renderComposeCtx();
  computeUnread();
  renderMsgs(true);
  const sep = $("#new-sep"), box = $("#msgs");
  if (sep) box.scrollTop += sep.getBoundingClientRect().top - box.getBoundingClientRect().top - 12;
  markSeen();
  bindPress(box);
}

function autosize(ta) { ta.style.height = "auto"; ta.style.height = Math.min(120, ta.scrollHeight) + "px"; }
// Send or record, clock while typing, heart while not
function syncComposer() {
  const ta = $("#composer"), form = $(".composer");
  if (!ta || !form) return;
  const has = !!ta.value.trim();
  form.classList.toggle("has-text", has);
  $("#send-btn").disabled = !has;
}

function chatToolsHTML() {
  const n = savedCount();
  return `<button class="chat-search" data-act="chat-search">${ico("search")}<span>Search messages</span></button>
    ${S.chatV3 ? `<button class="chat-saved" data-act="saved-list" aria-label="Saved messages${n ? `, ${n}` : ""}">${ico("star")}<span>Saved${n ? ` · ${n}` : ""}</span></button>` : ""}`;
}
function renderChatTools() { const el = $("#chat-tools"); if (el) el.innerHTML = chatToolsHTML(); }

// A scheduled message is yours alone until it's due
const isPending = (p) => !!p.send_at && Date.parse(p.send_at) > Date.now();
const delivered = () => S.posts.filter((p) => !isPending(p));

function renderMsgs(forceBottom) {
  const box = $("#msgs");
  if (!box) return;
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 90;
  const prevH = box.scrollHeight, prevTop = box.scrollTop;
  let html = S.more ? `<button class="btn soft small earlier" data-act="earlier">Show earlier messages</button>` : "";
  if (!S.posts.length) {
    html += `<div class="empty">${ico("heart")}<b>No messages yet</b><span>Say good morning to ${esc(S.partner.name)} ♥</span></div>`;
  }
  let last = "";
  for (const p of S.posts) {
    if (isPending(p)) continue;
    const d = new Date(p.created_at), k = dayKey(d);
    if (k !== last) { html += `<div class="day-sep">${esc(dayLabel(d))}</div>`; last = k; }
    if (p.id === S.unreadFrom) html += `<div class="new-sep" id="new-sep"><span>New messages</span></div>`;
    html += msgHTML(p);
  }
  if (S.uploading) html += `<div class="uploading">Sending ${S.uploading > 1 ? `${S.uploading} photos` : "photo"}…</div>`;
  if (S.sendingVoice) html += `<div class="uploading">Sending voice message…</div>`;
  const pend = S.posts.filter((p) => isPending(p) && p.author === S.me.name).sort((a, b) => a.send_at.localeCompare(b.send_at));
  if (pend.length) html += `<div class="day-sep sched-sep">${ico("clock")}Scheduled</div>${pend.map((p) => msgHTML(p)).join("")}`;
  box.innerHTML = html;
  hydratePhotos(box);
  hydrateVoice(box);
  if (forceBottom === "keep-top") box.scrollTop = box.scrollHeight - prevH + prevTop;
  else if (forceBottom || atBottom) box.scrollTop = box.scrollHeight;
  else box.scrollTop = prevTop;
  // when the next scheduled one is due, move it into the chat even if the server's note is late
  clearTimeout(S.dueT);
  if (pend[0]) S.dueT = setTimeout(() => renderMsgs(), Math.min(2 ** 31 - 1, Date.parse(pend[0].send_at) - Date.now() + 1000));
}

function msgHTML(p) {
  const mine = p.author === S.me.name;
  const who = mine ? "You" : esc(p.author);
  const d = new Date(p.created_at), time = fTime(d);
  if (p.kind === "heart") return `<div class="event">${ico("heart")}${who} sent a heart · ${time}</div>`;
  if (p.kind === "trip") return `<div class="event">${ico("plane")}${who} updated the trip dates · ${time}</div>`;
  const pending = isPending(p);
  const reacts = pending ? [] : S.reactions.filter((r) => r.post_id === p.id);
  const groups = {};
  for (const r of reacts) (groups[r.emoji] ||= []).push(r.author === S.me.name ? "You" : r.author);
  const reactHTML = reacts.length
    ? `<div class="reacts">${Object.entries(groups).map(([e, names]) => `<span class="react" title="${esc(names.join(", "))}">${e}${names.length > 1 ? " " + names.length : ""}</span>`).join("")}</div>`
    : "";
  let body;
  if (p.kind === "photo") body = `<div class="bubble photo" data-press="${p.id}"><img data-path="${esc(p.body)}" alt="Photo from ${who}" data-zoom="${esc(p.body)}"></div>`;
  else if (p.kind === "voice") body = voiceHTML(p);
  else {
    const em = emojiOnly(p.body);
    body = `<div class="bubble${em ? ` emoji n${em}${/^[\s❤️♥️💖💗💓💕💞💘🩷]+$/u.test(p.body) ? " beat" : ""}` : ""}" data-press="${p.id}">${em ? esc(p.body) : linkify(esc(p.body))}</div>`;
  }
  const savers = savedBy(p.id);
  const star = savers.length ? ` · <span class="star-mark" title="Saved by ${esc(savers.map((n) => (n === S.me.name ? "you" : n)).join(" and "))}">${ico("star")}</span>` : "";
  const meta = pending
    ? `<div class="meta">${ico("clock")}Arrives ${esc(herWhen(new Date(p.send_at)))}</div>`
    : `<div class="meta" title="${esc(bothTimes(d))}">${time}${p.edited_at ? " · Edited" : ""}${star}</div>`;
  const replyBtn = S.chatV2 && !pending ? `<button class="m-reply" data-act="reply" data-id="${p.id}" aria-label="Reply">${ico("reply")}</button>` : "";
  return `<div class="m${mine ? " mine" : ""}${pending ? " pending" : ""}">${quoteHTML(p)}${body}${reactHTML}${meta}${replyBtn}</div>`;
}

// Links in messages open in Safari
function linkify(escaped) {
  return escaped.replace(/\b(?:https?:\/\/|www\.)[^\s<]+/gi, (m) => {
    let url = m, tail = "";
    for (let t; (t = url.match(/(?:[.,!?;:)\]}]|&quot;|&#39;)$/)); ) { tail = t[0] + tail; url = url.slice(0, -t[0].length); }
    if (!/[a-z0-9]/i.test(url.replace(/^(https?:\/\/|www\.)/i, ""))) return m;
    return `<a href="${/^www\./i.test(url) ? "https://" + url : url}" target="_blank" rel="noopener noreferrer">${url}</a>${tail}`;
  });
}

// "Thu 5 Nov · 01:08 your time · 19:08 (Wed 4 Nov) in Boston"
function bothTimes(d) {
  const tz = S.partner.tz;
  const mineTxt = `${fDay(d)} · ${fTime(d)}`;
  if (fTime(d, tz) === fTime(d) && dayKey(d, tz) === dayKey(d)) return mineTxt;
  return `${mineTxt} your time · ${fTime(d, tz)}${dayKey(d, tz) !== dayKey(d) ? ` (${fDay(d, tz)})` : ""} in ${S.partner.city}`;
}
function relDay(d, tz) {
  const k = dayKey(d, tz);
  if (k === dayKey(new Date(), tz)) return "today";
  if (k === dayKey(new Date(Date.now() + DAY), tz)) return "tomorrow";
  return fDay(d, tz);
}
// when a scheduled message arrives, in her time and in yours
const herWhen = (d) => `${relDay(d, S.partner.tz)} ${fTime(d, S.partner.tz)} in ${S.partner.city}`;
const myWhen = (d) => `${relDay(d, LOCAL_TZ) === relDay(d, S.partner.tz) ? "" : relDay(d, LOCAL_TZ) + " "}${fTime(d)} your time`;

const snip = (s, n = 120) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const findPost = (id) => S.posts.find((x) => x.id === id) || S.quoted.get(id);
const mmss = (s) => `${Math.floor((s || 0) / 60)}:${String(Math.floor((s || 0) % 60)).padStart(2, "0")}`;
// One line describing a message, for quotes, the reply bar, saved and search
function gist(o, n = 100) {
  if (o.kind === "photo") return "Photo";
  if (o.kind === "voice") return `Voice message · ${mmss(o.meta?.duration)}`;
  return snip(o.body, n);
}
// The message a reply answers, shown small above it; tap to jump there
function quoteHTML(p) {
  const o = p.reply_to && findPost(p.reply_to);
  if (!o) return "";
  const who = o.author === S.me.name ? "You" : esc(o.author);
  const what = o.kind === "photo"
    ? `<span class="q-photo"><img data-path="${esc(o.body)}" alt="">Photo</span>`
    : o.kind === "voice"
      ? `<span class="q-photo">${ico("mic")}${esc(gist(o))}</span>`
      : `<span class="q-text">${esc(snip(o.body, 160))}</span>`;
  return `<button class="quote${o.author === S.me.name ? " me" : ""}" data-act="jump" data-id="${o.id}" aria-label="Reply to ${who}: ${esc(gist(o, 60))}. Show message"><b>${who}</b>${what}</button>`;
}

// ── New messages line (this device remembers where you left off)
const seenKey = () => `mm-seen-${S.me?.name}`;
function getSeen() { try { return localStorage.getItem(seenKey()) || S.seenMem || null; } catch (e) { return S.seenMem || null; } }
function setSeen(iso) { S.seenMem = iso; try { localStorage.setItem(seenKey(), iso); } catch (e) { /* private mode */ } }
function computeUnread() {
  const seen = getSeen();
  S.unreadFrom = seen ? delivered().find((p) => p.author !== S.me.name && p.kind !== "trip" && p.created_at > seen)?.id || null : null;
}
function showChatUpdates() {
  renderHeader();
  renderChatTools();
  computeUnread();
  renderMsgs();
  const sep = $("#new-sep"), box = $("#msgs");
  if (sep && box) box.scrollTop += sep.getBoundingClientRect().top - box.getBoundingClientRect().top - 12;
  markSeen();
}
function markSeen() {
  if (S.tab !== "chat" || document.visibilityState !== "visible") return;
  const last = delivered().at(-1);
  const cur = getSeen();
  if (last && (!cur || last.created_at > cur)) setSeen(last.created_at);
}

// Press and hold a message to react, reply, edit or delete; swipe it to the right to reply
const SWIPE_AT = 56;
function bindPress(box) {
  let press = null, suppressClick = false;
  const settle = (row) => {
    row.classList.remove("swiping");
    row.style.transform = "";
    row.querySelector(".swipe-ico")?.remove();
  };
  const cancel = (e) => {
    if (!press) return;
    clearTimeout(press.t);
    press.el.classList.remove("pressing");
    if (press.row) {
      settle(press.row);
      if (press.armed && e?.type === "pointerup") {
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 400);
        startReply(press.el.dataset.press);
      }
    }
    press = null;
  };
  box.addEventListener("pointerdown", (e) => {
    const el = e.target.closest("[data-press]");
    if (!el || e.button > 0) return;
    el.classList.add("pressing");
    press = { el, x: e.clientX, y: e.clientY, touch: e.pointerType !== "mouse", t: setTimeout(() => {
      el.classList.remove("pressing");
      press = null;
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 500);
      navigator.vibrate?.(8);
      openMsgSheet(el.dataset.press);
    }, 430) };
  });
  box.addEventListener("pointermove", (e) => {
    if (!press) return;
    const dx = e.clientX - press.x, dy = e.clientY - press.y;
    const sideways = S.chatV2 && press.touch && dx > 0 && Math.abs(dy) < dx * 0.6;
    if (!press.row && sideways && dx <= 10) return; // too early to tell a swipe from a wobble
    if (!press.row && sideways) {
      clearTimeout(press.t);
      press.el.classList.remove("pressing");
      press.row = press.el.closest(".m");
      press.row.classList.add("swiping");
      press.row.insertAdjacentHTML("afterbegin", `<i class="swipe-ico" aria-hidden="true">${ico("reply")}</i>`);
    }
    if (press.row) {
      const x = Math.max(0, Math.min(dx, SWIPE_AT + 24));
      press.row.style.transform = `translateX(${x}px)`;
      press.row.style.setProperty("--pull", Math.min(1, x / SWIPE_AT).toFixed(2));
      if (x >= SWIPE_AT && !press.armed) { press.armed = true; navigator.vibrate?.(6); }
      else if (x < SWIPE_AT) press.armed = false;
      return;
    }
    if (Math.hypot(dx, dy) > 10) cancel();
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => box.addEventListener(ev, cancel));
  box.addEventListener("contextmenu", (e) => {
    const el = e.target.closest("[data-press]");
    if (!el) return;
    e.preventDefault();
    cancel();
    openMsgSheet(el.dataset.press);
  });
  let lastTap = null, zoomT = null;
  box.addEventListener("click", (e) => {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
    const el = e.target.closest("[data-press]");
    if (el && !e.target.closest("button, a, [data-act]") && !el.closest(".m.pending")) {
      // double-tap a message to ♥ it
      const now = Date.now();
      if (lastTap && lastTap.id === el.dataset.press && now - lastTap.t < 330) {
        lastTap = null;
        clearTimeout(zoomT);
        e.preventDefault();
        e.stopPropagation();
        return loveTap(el.dataset.press);
      }
      lastTap = { id: el.dataset.press, t: now };
    }
    const z = e.target.closest("[data-zoom]");
    if (z) { clearTimeout(zoomT); const path = z.dataset.zoom; zoomT = setTimeout(() => openLightbox(path), 300); }
  }, true);
}

function loveTap(id) {
  const mineNow = S.reactions.find((r) => r.post_id === id && r.author === S.me.name)?.emoji;
  if (mineNow !== "❤️") react(id, "❤️");
  navigator.vibrate?.(8);
  const el = $(`#msgs [data-press="${CSS.escape(id)}"]`);
  if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const pop = document.createElement("i");
  pop.className = "love-pop";
  pop.setAttribute("aria-hidden", "true");
  pop.innerHTML = ico("heart");
  el.append(pop);
  setTimeout(() => pop.remove(), 900);
}

function openMsgSheet(id) {
  const p = S.posts.find((x) => x.id === id);
  if (!p) return;
  const mine = p.author === S.me.name;
  if (isPending(p)) {
    const at = new Date(p.send_at);
    openSheet(`
      <div class="msg-when">${ico("clock")}<span>Arrives ${esc(herWhen(at))} · ${esc(myWhen(at))}</span></div>
      <div class="msg-actions">
        <button class="btn soft" data-act="sched-now" data-id="${id}">${ico("send")}Send now</button>
        <button class="btn soft" data-act="sched-change" data-id="${id}">${ico("clock")}Change time</button>
        <button class="btn soft" data-act="edit-msg" data-id="${id}">${ico("edit")}Edit</button>
      </div>
      <div class="sheet-actions">
        <button class="btn danger" data-act="del-msg" data-id="${id}">${ico("trash")}Don't send it</button>
        <button class="btn ghost" data-act="sheet-close">Cancel</button>
      </div>`);
    return;
  }
  const current = S.reactions.find((r) => r.post_id === id && r.author === S.me.name)?.emoji;
  const savedMine = S.saved.some((x) => x.post_id === id && x.saved_by === S.me.name);
  openSheet(`
    <div class="msg-when">${ico("clock")}<span>${esc(bothTimes(new Date(p.created_at)))}</span></div>
    <div class="emoji-row" role="group" aria-label="React">
      ${EMOJIS.map((e) => `<button data-act="react" data-id="${id}" data-emoji="${e}" aria-pressed="${current === e}" aria-label="React with ${e}">${e}</button>`).join("")}
    </div>
    <details class="more-emoji"><summary>More emojis</summary>
      <div class="ep-grid">${[...new Set(EMOJI_SETS.flatMap(([, l]) => l))].map((e) => `<button data-act="react" data-id="${id}" data-emoji="${e}" aria-pressed="${current === e}" aria-label="React with ${e}">${e}</button>`).join("")}</div>
    </details>
    <div class="msg-actions">
      ${S.chatV2 ? `<button class="btn soft" data-act="reply" data-id="${id}">${ico("reply")}Reply</button>` : ""}
      ${S.chatV2 && mine && p.kind === "note" ? `<button class="btn soft" data-act="edit-msg" data-id="${id}">${ico("edit")}Edit</button>` : ""}
      ${p.kind === "note" ? `<button class="btn soft" data-act="copy-msg" data-id="${id}">${ico("copy")}Copy</button>` : ""}
      ${S.chatV3 ? `<button class="btn soft${savedMine ? " on" : ""}" data-act="save-msg" data-id="${id}" aria-pressed="${savedMine}">${ico("star")}${savedMine ? "Saved" : "Save"}</button>` : ""}
    </div>
    <div class="sheet-actions">
      ${mine ? `<button class="btn danger" data-act="del-msg" data-id="${id}">${ico("trash")}Delete message</button>` : ""}
      <button class="btn ghost" data-act="sheet-close">Cancel</button>
    </div>`);
}

async function react(id, emoji) {
  closeSheet();
  const current = S.reactions.find((r) => r.post_id === id && r.author === S.me.name);
  if (current && current.emoji === emoji) {
    removeRow("reactions", current);
    renderMsgs();
    await run(sb.from("reactions").delete().eq("post_id", id).eq("author", S.me.name));
  } else {
    const row = { post_id: id, author: S.me.name, emoji, created_at: new Date().toISOString() };
    upsertRow("reactions", row);
    renderMsgs();
    await run(sb.from("reactions").upsert({ post_id: id, author: S.me.name, emoji }));
  }
}

async function deleteMsg(btn) {
  const p = S.posts.find((x) => x.id === btn.dataset.id);
  if (!btn.dataset.sure) {
    btn.dataset.sure = "1";
    btn.innerHTML = `${ico("trash")}${p && isPending(p) ? "Tap again to delete it" : "Tap again to delete for both of you"}`;
    return;
  }
  closeSheet();
  if (!p) return;
  await run(sb.from("posts").delete().eq("id", p.id), "Couldn't delete the message.");
  removeRow("posts", p);
  renderMsgs();
  if (p.kind === "photo") sb.storage.from("photos").remove([p.body]);
  if (p.kind === "voice") sb.storage.from("voice").remove([p.body]);
  toast("Message deleted");
}

async function sendNote() {
  if (S.editing) return saveEdit();
  const ta = $("#composer");
  const body = ta.value.trim();
  if (!body) return;
  const replyTo = S.chatV2 ? S.replyTo : null;
  ta.value = "";
  S.draft = "";
  S.replyTo = null;
  renderComposeCtx();
  autosize(ta);
  syncComposer();
  try {
    const row = await run(sb.from("posts").insert({ author: S.me.name, kind: "note", body, ...(replyTo ? { reply_to: replyTo } : {}) }).select().single(), "Couldn't send. Check your connection and try again.");
    upsertRow("posts", row);
    renderMsgs(true);
    seek("word", body).then((found) => { if (!found) builtInEggs(body, true); });
  } catch (e) {
    ta.value = body;
    S.draft = body;
    if (replyTo && !S.editing) { S.replyTo = replyTo; renderComposeCtx(); }
    autosize(ta);
    syncComposer();
  }
}

// ── Replying and editing: a small bar above the message field says which
function renderComposeCtx() {
  const box = $("#compose-ctx"), form = $(".composer");
  if (!box) return;
  const id = S.editing || S.replyTo;
  const o = id && findPost(id);
  const editing = !!(o && S.editing);
  form?.classList.toggle("editing", editing);
  $("#send-btn")?.setAttribute("aria-label", editing ? "Save" : "Send");
  if ($("#send-btn")) $("#send-btn").innerHTML = ico(editing ? "check" : "send");
  if (!o) { box.hidden = true; box.innerHTML = ""; return; }
  const who = o.author === S.me.name ? "yourself" : esc(o.author);
  box.innerHTML = `${ico(editing ? "edit" : "reply")}
    <div class="cc-text"><b>${editing ? (isPending(o) ? "Edit scheduled message" : "Edit message") : `Replying to ${who}`}</b><span>${esc(gist(o))}</span></div>
    <button type="button" class="icon-btn" data-act="ctx-cancel" aria-label="${editing ? "Cancel editing" : "Cancel reply"}">${ico("close")}</button>`;
  box.hidden = false;
}

function startReply(id) {
  const p = S.posts.find((x) => x.id === id);
  if (!S.chatV2 || !p || !["note", "photo", "voice"].includes(p.kind) || isPending(p)) return;
  closeSheet();
  if (S.editing) cancelCtx();
  S.replyTo = id;
  renderComposeCtx();
  $("#composer")?.focus();
}

function startEdit(id) {
  const p = S.posts.find((x) => x.id === id);
  if (!S.chatV2 || !p || p.kind !== "note" || p.author !== S.me.name) return;
  closeSheet();
  if (!S.editing) S.draftKeep = $("#composer")?.value ?? S.draft ?? "";
  S.replyTo = null;
  S.editing = id;
  S.editText = p.body;
  const ta = $("#composer");
  if (ta) {
    ta.value = p.body;
    autosize(ta);
    syncComposer();
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }
  renderComposeCtx();
}

function cancelCtx() {
  const wasEditing = !!S.editing;
  S.replyTo = null;
  S.editing = null;
  S.editText = null;
  const ta = $("#composer");
  if (wasEditing) {
    S.draft = S.draftKeep || "";
    if (ta) { ta.value = S.draft; autosize(ta); syncComposer(); }
  }
  renderComposeCtx();
}

async function saveEdit() {
  const ta = $("#composer");
  const p = S.posts.find((x) => x.id === S.editing);
  const body = ta.value.trim();
  if (!p) return cancelCtx();
  if (!body) return;
  if (body === p.body) return cancelCtx();
  const before = { ...p };
  upsertRow("posts", { ...p, body, edited_at: p.send_at ? p.edited_at : new Date().toISOString() });
  cancelCtx();
  renderMsgs();
  try {
    const row = await run(sb.from("posts").update({ body }).eq("id", p.id).select().single(), "Couldn't save the change. Check your connection and try again.");
    upsertRow("posts", row);
    renderMsgs();
  } catch (e) {
    upsertRow("posts", before);
    renderMsgs();
    startEdit(p.id);
    ta.value = body;
    S.editText = body;
    autosize(ta);
  }
}

// Tap a quote to see the message it answers (loading earlier messages if needed)
async function jumpTo(id) {
  for (let i = 0; i < 30 && !S.posts.some((p) => p.id === id) && S.more; i++) await loadEarlier();
  const el = $(`#msgs [data-press="${CSS.escape(id)}"]`);
  if (!el) return toast("That message isn't here anymore");
  el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  el.classList.remove("flash");
  void el.offsetWidth;
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 1700);
}

async function sendHeart() {
  const row = await run(sb.from("posts").insert({ author: S.me.name, kind: "heart", body: null }).select().single(), "Couldn't send the heart.");
  upsertRow("posts", row);
  renderMsgs(true);
  navigator.vibrate?.(8);
}

async function sendPhotos(files) {
  let replyTo = S.chatV2 && !S.editing ? S.replyTo : null; // a photo can answer a message too (the first one sent does)
  if (replyTo) { S.replyTo = null; renderComposeCtx(); }
  for (const file of files) {
    S.uploading++;
    renderMsgs(true);
    try {
      const path = await uploadPhoto(file);
      const row = await run(sb.from("posts").insert({ author: S.me.name, kind: "photo", body: path, ...(replyTo ? { reply_to: replyTo } : {}) }).select().single());
      replyTo = null;
      upsertRow("posts", row);
    } catch (e) {
      toast("Couldn't send the photo. Check your connection and try again.");
    } finally {
      S.uploading--;
      renderMsgs(true);
    }
  }
}

async function loadEarlier() {
  const oldest = S.posts[0];
  if (!oldest) return;
  const older = await run(sb.from("posts").select("*").lt("created_at", oldest.created_at).order("created_at", { ascending: false }).limit(PAGE), "Couldn't load earlier messages.");
  S.more = older.length === PAGE;
  for (const p of older) S.posts.push(p);
  S.posts.sort(SORTS.posts);
  if (older.length) {
    const rs = await run(sb.from("reactions").select("*").in("post_id", older.map((p) => p.id)));
    for (const r of rs) upsertRow("reactions", r);
    await fetchQuoted();
  }
  renderMsgs("keep-top");
}

// ── Voice messages ───────────────────────────────────────────────
const MAX_VOICE = 5 * 60;
const BARS = 28;
const voiceSupported = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
const voiceKey = (path) => `voice:${path}`;
const rateLabel = () => `${S.voiceRate || 1}×`;
function waveBars(id) { // the same little waveform every time for a message
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Array.from({ length: BARS }, () => { h = (h * 1103515245 + 12345) >>> 0; return 28 + ((h >>> 16) % 73); });
}
function voiceHTML(p) {
  const on = S.playing?.id === p.id, playing = on && !S.playing.paused, prog = on ? S.playing.p : 0;
  const bars = waveBars(p.id).map((h, i) => `<i style="height:${h}%"${i / BARS < prog ? ' class="on"' : ""}></i>`).join("");
  return `<div class="bubble voice${playing ? " playing" : ""}" data-press="${p.id}" data-voice="${esc(p.body)}" data-id="${p.id}">
    <button class="vplay" data-act="voice-play" data-id="${p.id}" data-state="${playing}" aria-label="${playing ? "Pause" : "Play"} voice message">${ico(playing ? "pause" : "play")}</button>
    <span class="vwave" data-act="voice-seek" data-id="${p.id}" role="slider" aria-label="Position" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(prog * 100)}">${bars}</span>
    <span class="vtime">${mmss(on ? S.playing.t : p.meta?.duration)}</span>
    <button class="vspeed" data-act="voice-speed" aria-label="Playback speed"${on ? "" : " hidden"}>${rateLabel()}</button>
  </div>`;
}
async function voiceUrls(paths) {
  const now = Date.now();
  const need = [...new Set(paths)].filter((p) => !(S.urls.get(voiceKey(p))?.exp > now + MIN));
  if (!need.length) return;
  const { data } = await sb.storage.from("voice").createSignedUrls(need, 6 * 3600);
  for (const d of data || []) if (d.signedUrl) S.urls.set(voiceKey(d.path), { url: d.signedUrl, exp: now + 6 * HOUR });
}
// fetch links ahead of time: on iPhone, play() has to happen right in the tap
function hydrateVoice(root) {
  const paths = $$("[data-voice]", root).map((e) => e.dataset.voice);
  if (paths.length) voiceUrls(paths).catch(() => {});
}
function updateVoiceUI() {
  for (const el of $$(".bubble.voice")) {
    const id = el.dataset.id, on = S.playing?.id === id, playing = on && !S.playing.paused;
    el.classList.toggle("playing", playing);
    const btn = el.querySelector(".vplay");
    if (btn.dataset.state !== String(playing)) {
      btn.dataset.state = String(playing);
      btn.innerHTML = ico(playing ? "pause" : "play");
      btn.setAttribute("aria-label", `${playing ? "Pause" : "Play"} voice message`);
    }
    const prog = on ? S.playing.p : 0;
    el.querySelectorAll(".vwave i").forEach((b, i) => b.classList.toggle("on", i / BARS < prog));
    el.querySelector(".vwave").setAttribute("aria-valuenow", Math.round(prog * 100));
    el.querySelector(".vtime").textContent = mmss(on ? S.playing.t : findPost(id)?.meta?.duration);
    const sp = el.querySelector(".vspeed");
    sp.hidden = !on;
    sp.textContent = rateLabel();
  }
}
function audioEl() {
  if (S.audio) return S.audio;
  const a = new Audio();
  a.preload = "auto";
  const dur = () => (Number.isFinite(a.duration) && a.duration > 0 ? a.duration : S.playing?.dur || 1);
  a.addEventListener("timeupdate", () => { if (!S.playing) return; S.playing.t = a.currentTime; S.playing.p = Math.min(1, a.currentTime / dur()); updateVoiceUI(); });
  a.addEventListener("play", () => { if (S.playing) { S.playing.paused = false; updateVoiceUI(); } });
  a.addEventListener("pause", () => { if (S.playing) { S.playing.paused = true; updateVoiceUI(); } });
  a.addEventListener("ended", () => { S.playing = null; updateVoiceUI(); });
  return (S.audio = a);
}
function voiceStop() { if (S.audio) S.audio.pause(); S.playing = null; updateVoiceUI(); }
async function voicePlay(id) {
  const p = findPost(id);
  if (!p) return;
  const a = audioEl();
  if (S.playing?.id === id) { if (a.paused) a.play().catch(() => {}); else a.pause(); return; }
  if (S.playing) a.pause();
  let u = S.urls.get(voiceKey(p.body));
  if (!u) { await voiceUrls([p.body]).catch(() => {}); u = S.urls.get(voiceKey(p.body)); }
  if (!u) return toast("Couldn't load the voice message. Check your connection.");
  S.playing = { id, p: 0, t: 0, paused: false, dur: p.meta?.duration || 0 };
  a.src = u.url;
  a.defaultPlaybackRate = a.playbackRate = S.voiceRate || 1;
  updateVoiceUI();
  try { await a.play(); } catch (e) { if (S.playing?.id === id) { S.playing.paused = true; updateVoiceUI(); } }
}
async function voiceSeek(id, e, el) {
  const r = el.getBoundingClientRect();
  const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  if (S.playing?.id !== id) await voicePlay(id);
  const a = audioEl(), d = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : S.playing?.dur || 0;
  if (S.playing?.id === id && d) { a.currentTime = frac * d; S.playing.t = a.currentTime; S.playing.p = frac; updateVoiceUI(); }
}
function voiceSpeed() {
  S.voiceRate = { 1: 1.5, 1.5: 2, 2: 1 }[S.voiceRate || 1];
  try { localStorage.setItem("mm-voice-rate", S.voiceRate); } catch (e) { /* fine */ }
  if (S.audio) S.audio.defaultPlaybackRate = S.audio.playbackRate = S.voiceRate;
  updateVoiceUI();
}
try { S.voiceRate = +localStorage.getItem("mm-voice-rate") || 1; } catch (e) { S.voiceRate = 1; }

function pickVoiceType() {
  for (const t of ["audio/mp4", "audio/mp4;codecs=mp4a.40.2", "audio/aac", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return "";
}
async function voiceStart() {
  if (S.rec || !voiceSupported()) return;
  voiceStop();
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (e) { return toast(e?.name === "NotAllowedError" ? "Allow the microphone for M&M's to send voice messages" : "Couldn't use the microphone"); }
  const type = pickVoiceType();
  let rec;
  try { rec = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 64000 } : undefined); }
  catch (e) { rec = new MediaRecorder(stream); }
  const r = (S.rec = { rec, stream, chunks: [], start: Date.now(), levels: [], replyTo: S.chatV2 && !S.editing ? S.replyTo : null });
  rec.ondataavailable = (ev) => { if (ev.data?.size) r.chunks.push(ev.data); };
  rec.start(250);
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const an = ac.createAnalyser();
    an.fftSize = 512;
    ac.createMediaStreamSource(stream).connect(an);
    Object.assign(r, { ac, an });
  } catch (e) { /* the timer is enough */ }
  $(".composer")?.classList.add("recording");
  if ($("#rec")) $("#rec").hidden = false;
  r.timer = setInterval(recTick, 100);
  navigator.vibrate?.(10);
}
function recTick() {
  const r = S.rec;
  if (!r) return;
  const s = (Date.now() - r.start) / 1000;
  const t = $("#rec-time");
  if (t) t.textContent = mmss(s);
  if (r.an) {
    const data = new Uint8Array(r.an.fftSize);
    r.an.getByteTimeDomainData(data);
    let peak = 0;
    for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
    r.levels = [...r.levels, Math.min(1, (peak / 128) * 2.2)].slice(-24);
    $$("#rec-level i").forEach((b, i) => { const v = r.levels[i - (24 - r.levels.length)] ?? 0; b.style.height = `${Math.round(12 + v * 88)}%`; });
  }
  if (s >= MAX_VOICE) { toast("Voice messages can be up to 5 minutes"); voiceFinish(true); }
}
async function voiceFinish(send) {
  const r = S.rec;
  if (!r) return;
  S.rec = null;
  clearInterval(r.timer);
  const duration = (Date.now() - r.start) / 1000;
  const stopped = new Promise((res) => { r.rec.onstop = res; setTimeout(res, 1500); });
  try { if (r.rec.state !== "inactive") r.rec.stop(); } catch (e) { /* already stopped */ }
  await stopped;
  r.stream.getTracks().forEach((tr) => tr.stop());
  r.ac?.close?.().catch(() => {});
  $(".composer")?.classList.remove("recording");
  if ($("#rec")) $("#rec").hidden = true;
  if (!send) return;
  if (duration < 1 || !r.chunks.length) return toast("Too short to send");
  const type = (r.rec.mimeType || r.chunks[0]?.type || "audio/mp4").split(";")[0];
  if (r.replyTo && S.replyTo === r.replyTo) { S.replyTo = null; renderComposeCtx(); }
  await sendVoice(new Blob(r.chunks, { type }), type, duration, r.replyTo);
}
async function sendVoice(blob, type, duration, replyTo) {
  S.sendingVoice++;
  renderMsgs(true);
  try {
    const ext = /mp4|aac|m4a/.test(type) ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
    const path = `${uuid()}.${ext}`;
    const { error } = await sb.storage.from("voice").upload(path, blob, { contentType: type });
    if (error) throw error;
    const row = await run(sb.from("posts").insert({ author: S.me.name, kind: "voice", body: path, meta: { duration: Math.round(duration * 10) / 10 }, ...(replyTo ? { reply_to: replyTo } : {}) }).select().single());
    upsertRow("posts", row);
  } catch (e) {
    toast("Couldn't send the voice message. Check your connection and try again.");
  } finally {
    S.sendingVoice--;
    renderMsgs(true);
  }
}

// ── Send later, in her time ──────────────────────────────────────
function openSendLater(id = null) {
  const tz = S.partner.tz, now = new Date(), hp = zoneParts(now, tz), mins = hp.h * 60 + hp.mi;
  const at = (days, h) => { const b = zoneParts(new Date(now.getTime() + days * DAY), tz); return zonedDate(b.y, b.mo, b.d, h, 0, tz); };
  const opts = [
    ["When she wakes up", mins < 7 * 60 + 30 ? at(0, 8) : at(1, 8)],
    ["Her evening", mins < 18 * 60 + 30 ? at(0, 19) : at(1, 19)],
    ["In an hour", new Date(Math.ceil((now.getTime() + HOUR) / (5 * MIN)) * 5 * MIN)],
  ];
  const idAttr = id ? ` data-id="${id}"` : "";
  const p = id && S.posts.find((x) => x.id === id);
  const start = p ? new Date(p.send_at) : opts[0][1];
  openSheet(`
    <h3>${id ? "Change the time" : "Send later"}</h3>
    ${id ? "" : `<p class="muted sched-note">${esc(S.partner.name)} gets it at the time you pick, with a notification. Until then only you can see it.</p>`}
    <div class="sched-opts">${opts.map(([label, d]) => `<button class="sched-opt" data-act="sched-pick" data-at="${d.toISOString()}"${idAttr}><b>${label}</b><span>${esc(herWhen(d))} · ${esc(myWhen(d))}</span></button>`).join("")}</div>
    <div class="sched-custom">
      <b>Or pick a time in ${esc(S.partner.city)}</b>
      <div class="sched-inputs"><input class="in" type="date" id="sched-date" value="${dayKey(start, tz)}" min="${dayKey(now, tz)}" aria-label="Day, ${esc(S.partner.city)} time"><input class="in" type="time" id="sched-time" value="${toTimeInput(start, tz)}" aria-label="Time, ${esc(S.partner.city)} time"></div>
      <span class="fine" id="sched-preview"></span>
      <button class="btn" data-act="sched-custom"${idAttr}>${ico("clock")}${id ? "Change time" : "Schedule"}</button>
    </div>`);
  updateSchedPreview();
}
const customSchedDate = () => fromInputs($("#sched-date")?.value, $("#sched-time")?.value, S.partner.tz);
function updateSchedPreview() {
  const el = $("#sched-preview"), d = customSchedDate();
  if (!el) return;
  el.textContent = !d ? "" : d.getTime() <= Date.now() + MIN ? "Pick a time in the future" : `Arrives ${herWhen(d)} · ${myWhen(d)}`;
}
async function scheduleNote(d) {
  const ta = $("#composer"), body = ta?.value.trim();
  closeSheet();
  if (!body) return;
  const replyTo = S.chatV2 ? S.replyTo : null;
  ta.value = "";
  S.draft = "";
  S.replyTo = null;
  renderComposeCtx();
  autosize(ta);
  syncComposer();
  try {
    const row = await run(sb.from("posts").insert({ author: S.me.name, kind: "note", body, send_at: d.toISOString(), ...(replyTo ? { reply_to: replyTo } : {}) }).select().single(), "Couldn't schedule it. Check your connection and try again.");
    upsertRow("posts", row);
    renderMsgs(true);
    toast(`Scheduled · arrives ${herWhen(d)}`);
  } catch (e) {
    ta.value = body;
    S.draft = body;
    autosize(ta);
    syncComposer();
    if (replyTo) { S.replyTo = replyTo; renderComposeCtx(); }
  }
}
async function reschedule(id, d) {
  closeSheet();
  const p = S.posts.find((x) => x.id === id);
  if (!p) return;
  const before = { ...p };
  upsertRow("posts", { ...p, send_at: d.toISOString() });
  renderMsgs();
  try {
    upsertRow("posts", await run(sb.from("posts").update({ send_at: d.toISOString() }).eq("id", id).select().single(), "Couldn't change the time. Check your connection."));
    renderMsgs();
    toast(`Arrives ${herWhen(d)}`);
  } catch (e) { upsertRow("posts", before); renderMsgs(); }
}
async function sendNow(id) {
  closeSheet();
  const p = S.posts.find((x) => x.id === id);
  if (!p) return;
  const before = { ...p };
  upsertRow("posts", { ...p, send_at: null, created_at: new Date().toISOString() });
  renderMsgs(true);
  try {
    upsertRow("posts", await run(sb.from("posts").update({ send_at: null }).eq("id", id).select().single(), "Couldn't send it. Check your connection."));
    renderMsgs(true);
  } catch (e) { upsertRow("posts", before); renderMsgs(); }
}

// ── Saved messages (you both see what either of you kept) ────────
const savedBy = (id) => [...new Set(S.saved.filter((x) => x.post_id === id).map((x) => x.saved_by))];
const savedCount = () => new Set(S.saved.map((x) => x.post_id)).size;
async function toggleSave(id) {
  closeSheet();
  const mine = S.saved.find((x) => x.post_id === id && x.saved_by === S.me.name);
  if (mine) {
    removeRow("saved", mine);
    refresh("saved");
    try { await run(sb.from("saved").delete().eq("post_id", id).eq("saved_by", S.me.name)); toast("Removed from saved"); }
    catch (e) { upsertRow("saved", mine); refresh("saved"); }
  } else {
    const row = { post_id: id, saved_by: S.me.name, created_at: new Date().toISOString() };
    upsertRow("saved", row);
    refresh("saved");
    try { await run(sb.from("saved").insert({ post_id: id })); toast("Saved ★"); }
    catch (e) { removeRow("saved", row); refresh("saved"); }
  }
}
function savedList() {
  const latest = new Map();
  for (const x of S.saved.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))) if (!latest.has(x.post_id)) latest.set(x.post_id, x);
  return [...latest.keys()].map(findPost).filter(Boolean);
}
function savedItemHTML(p) {
  const d = new Date(p.created_at), who = p.author === S.me.name ? "You" : esc(p.author);
  const by = savedBy(p.id), byTxt = by.length > 1 ? "both of you" : by[0] === S.me.name ? "you" : esc(by[0]);
  const what = p.kind === "photo" ? `<span class="q-photo"><img data-path="${esc(p.body)}" alt="">Photo</span>`
    : p.kind === "voice" ? `<span class="q-photo">${ico("mic")}${esc(gist(p))}</span>` : `<span class="si-text">${esc(snip(p.body, 220))}</span>`;
  return `<button class="saved-item" data-act="goto-msg" data-id="${p.id}"><span class="si-top"><b>${who}</b> · ${esc(fDay(d))}, ${esc(fTime(d))}</span>${what}<span class="si-by">${ico("star")}Saved by ${byTxt}</span></button>`;
}
function openSavedSheet() {
  const list = savedList();
  openSheet(`<h3>Saved messages</h3>
    ${list.length ? `<div class="saved-list">${list.map(savedItemHTML).join("")}</div>`
      : `<p class="muted">Press and hold a message and tap <b>Save</b> to keep it here. You both see what either of you saves.</p>`}
    <div class="sheet-actions"><button class="btn ghost" data-act="sheet-close">Close</button></div>`);
  hydratePhotos($("#sheet-root"));
}
function savedCardHTML() {
  if (!S.chatV3) return "";
  const list = savedList();
  return `<div class="card saved-card">
    <div class="row" style="justify-content:space-between;align-items:center">
      <div class="notif-main">${ico("star")}<div><b>Saved messages</b><span>${list.length ? `${list.length} kept` : "Hold a message in the chat and tap Save"}</span></div></div>
      ${list.length ? `<button class="btn soft small" data-act="saved-list">See all</button>` : ""}
    </div>
    ${list.length ? `<div class="saved-list mini">${list.slice(0, 2).map(savedItemHTML).join("")}</div>` : ""}
  </div>`;
}

// ── Search (the whole chat, not just what's loaded) ──────────────
function openSearch() {
  openSheet(`<h3>Search messages</h3>
    <input class="in" id="search-q" type="search" placeholder="A word or a few" autocomplete="off" enterkeyhint="search" aria-label="Search messages">
    <div class="search-res" id="search-res" aria-live="polite"></div>`);
}
function markMatch(text, q) {
  const t = String(text || ""), i = t.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return esc(snip(t, 160));
  const from = Math.max(0, i - 50), to = Math.min(t.length, i + q.length + 90);
  return `${from ? "…" : ""}${esc(t.slice(from, i))}<mark>${esc(t.slice(i, i + q.length))}</mark>${esc(t.slice(i + q.length, to))}${to < t.length ? "…" : ""}`;
}
async function runSearch(raw) {
  const box = $("#search-res"), q = String(raw || "").trim();
  if (!box) return;
  if (q.length < 2) { box.innerHTML = ""; return; }
  const seq = ++S.searchSeq;
  const { data, error } = await sb.from("posts").select("*").eq("kind", "note").ilike("body", `%${q.replace(/[\\%_]/g, (c) => "\\" + c)}%`).order("created_at", { ascending: false }).limit(50);
  if (seq !== S.searchSeq || !$("#search-res")) return;
  if (error) { box.innerHTML = `<p class="muted">Couldn't search. Check your connection.</p>`; return; }
  for (const p of data) if (!S.posts.some((x) => x.id === p.id)) S.quoted.set(p.id, p);
  box.innerHTML = data.length
    ? data.map((p) => { const d = new Date(p.created_at); return `<button class="saved-item" data-act="goto-msg" data-id="${p.id}"><span class="si-top"><b>${p.author === S.me.name ? "You" : esc(p.author)}</b> · ${esc(fDay(d))}, ${esc(fTime(d))}${p.send_at ? " · scheduled" : ""}</span><span class="si-text">${markMatch(p.body, q)}</span></button>`; }).join("")
    : `<p class="muted">No messages with “${esc(q)}”</p>`;
}

// ═══ Trips ═══════════════════════════════════════════════════════
const BOTH = "Both";
const isTogetherTime = (trip) => trip.traveler === BOTH; // a stretch in the same city, like the Munich summer
const destOf = (trip) => (isTogetherTime(trip) ? S.me : otherOf(trip.traveler)) || S.partner;
const tzFor = (traveler) => (traveler === BOTH ? S.me.tz : otherOf(traveler).tz);
// "Margaret · Hamburg → Aix-en-Provence", or "Moritz flies to Boston" when nothing else is set
function tripRoute(t) {
  const a = t.arrive_city || destOf(t).city, l = t.leave_city || a;
  if (isTogetherTime(t)) return `Together · ${a === l ? a : `${a} → ${l}`}`;
  if (!t.arrive_city && !t.leave_city) return `${t.traveler} ${Date.parse(t.goodbye) > Date.now() ? "flies" : "flew"} to ${a}`;
  return `${t.traveler} · ${a === l ? a : `${a} → ${l}`}`;
}

function tripWhen(trip) {
  const tz = destOf(trip).tz, r = new Date(trip.reunion), g = new Date(trip.goodbye);
  const days = Math.max(1, Math.round((g - r) / DAY));
  return `${fDay(r, tz)} → ${fDay(g, tz)} · ${plural(days, "day")}`;
}

function tripStatus(trip) {
  const now = Date.now(), r = Date.parse(trip.reunion), g = Date.parse(trip.goodbye);
  if (now < r) return `<span class="chip pink" data-until="${trip.reunion}">${inText(r - now)}</span>`;
  if (now < g) return `<span class="chip good">together now</span>`;
  return `<span class="chip">done ♥</span>`;
}

function viewTrips() {
  if (S.tripId && S.trips.some((t) => t.id === S.tripId)) return viewTrip(S.trips.find((t) => t.id === S.tripId));
  S.tripId = null;
  const now = Date.now();
  const coming = S.trips.filter((t) => Date.parse(t.goodbye) > now);
  const past = S.trips.filter((t) => Date.parse(t.goodbye) <= now).reverse();
  const card = (t, i) => {
    const ideas = S.ideas.filter((x) => x.trip_id === t.id).length;
    const planned = S.trip_days.filter((x) => x.trip_id === t.id && x.plan.trim()).length;
    return `<button class="trip-card ${i === 0 && Date.parse(t.goodbye) > now ? "next" : ""}" data-act="trip-open" data-id="${t.id}">
      <div class="row" style="justify-content:space-between"><span class="eyebrow">${esc(tripRoute(t))}</span>${tripStatus(t)}</div>
      <h3>${esc(t.title)}</h3>
      <div class="trip-when">${esc(tripWhen(t))}</div>
      <div class="trip-when">${plural(planned, "day")} planned · ${plural(ideas, "idea")}</div>
    </button>`;
  };
  return `<div class="page">
    <div class="sec-h"><h2>Trips</h2><button class="btn small" data-act="trip-new">${ico("plus")}New trip</button></div>
    ${coming.length ? coming.map(card).join("") : `<div class="card empty">${ico("plane")}<b>No trip planned yet</b><span>Add the next one when you book it.</span></div>`}
    ${past.length ? `<div class="sec-h"><h2>Past trips</h2></div>${past.map((t) => card(t, 1)).join("")}` : ""}
  </div>`;
}

function viewTrip(trip) {
  const dest = destOf(trip), tz = dest.tz;
  const r = new Date(trip.reunion), g = new Date(trip.goodbye);
  const localNote = (d) => (tz !== LOCAL_TZ ? ` · ${fTime(d)} your time` : "");
  const sub = S.tripSub;
  return `<div class="page">
    <button class="back" data-act="trip-back">${ico("back")}Trips</button>
    <div class="card glow">
      <div class="row" style="justify-content:space-between"><span class="eyebrow">${esc(tripRoute(trip))}</span>${tripStatus(trip)}</div>
      <h2 style="font:800 24px/1.15 var(--round)">${esc(trip.title)}</h2>
      <div class="trip-when">Together from <b>${fDay(r, tz)}, ${fTime(r, tz)}</b> ${esc(trip.arrive_city || dest.city)} time${localNote(r)}</div>
      <div class="trip-when">Until <b>${fDay(g, tz)}, ${fTime(g, tz)}</b>${localNote(g)}</div>
      ${trip.flights ? `<div class="flights">${esc(trip.flights)}</div>` : ""}
      <div class="row"><button class="btn soft small" data-act="trip-edit" data-id="${trip.id}">${ico("edit")}Edit trip</button></div>
    </div>
    <div class="seg" role="group" aria-label="Trip sections">
      ${[["plan", "Plan"], ["ideas", "Ideas"], ["packing", "Packing"]].map(([k, l]) => `<button data-act="trip-sub" data-sub="${k}" aria-pressed="${sub === k}">${l}</button>`).join("")}
    </div>
    ${sub === "plan" ? tripPlan(trip) : sub === "ideas" ? tripIdeas(trip) : tripPacking(trip)}
  </div>`;
}

function tripDays(trip) {
  const tz = destOf(trip).tz;
  const out = [];
  const last = dayKey(new Date(trip.goodbye), tz);
  let d = new Date(trip.reunion);
  for (let i = 0; i < 60; i++) {
    const k = dayKey(d, tz);
    out.push({ key: k, date: d });
    if (k >= last) break;
    const p = zoneParts(d, tz);
    d = zonedDate(p.y, p.mo, p.d + 1, 12, 0, tz);
  }
  return out;
}

function tripPlan(trip) {
  const tz = destOf(trip).tz;
  return `<div class="card">${tripDays(trip).map(({ key, date }, i) => {
    const row = S.trip_days.find((x) => x.trip_id === trip.id && x.day === key);
    const by = row && row.plan.trim() && row.updated_by ? `edited by ${row.updated_by === S.me.name ? "you" : esc(row.updated_by)}` : "";
    return `<div class="day">
      <div class="day-h"><b>${fmt(date, tz, { weekday: "long", day: "numeric", month: "short" })}</b><span>Day ${i + 1}${by ? ` · ${by}` : ""}</span></div>
      <textarea class="in" id="plan-${key}" data-plan="${trip.id}|${key}" rows="2" maxlength="2000" placeholder="What are we doing?">${esc(row?.plan || "")}</textarea>
    </div>`;
  }).join("")}</div>`;
}

const mapsUrl = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

function tripIdeas(trip) {
  const city = destOf(trip).city;
  const ideas = S.ideas.filter((x) => x.trip_id === trip.id)
    .sort((a, b) => (a.done - b.done) || (b.liked_by.length - a.liked_by.length) || a.created_at.localeCompare(b.created_at));
  return `<div class="card">
    <form class="form" data-form="idea" data-trip="${trip.id}">
      <input class="in" id="idea-text" maxlength="200" placeholder="Idea, like ice skating in Central Park" aria-label="Idea">
      <div class="add-row"><input class="in" id="idea-place" maxlength="200" placeholder="Place for Google Maps (optional)" aria-label="Place"><button class="btn" type="submit">Add</button></div>
    </form>
  </div>
  <div class="card">
    ${ideas.length ? ideas.map((x) => {
      const liked = x.liked_by.includes(S.me.name);
      return `<div class="item ${x.done ? "done" : ""}">
        <button class="check" role="checkbox" aria-checked="${x.done}" aria-label="Done" data-act="idea-done" data-id="${x.id}">${x.done ? ico("check") : ""}</button>
        <div class="item-text">${esc(x.text)}<small>${x.place ? esc(x.place) + " · " : ""}added by ${x.created_by === S.me.name ? "you" : esc(x.created_by || "")}</small></div>
        <a class="icon-btn maps" href="${mapsUrl(x.place || `${x.text}, ${city}`)}" target="_blank" rel="noopener" aria-label="Open in Google Maps">${ico("pin")}</a>
        <button class="like" aria-pressed="${liked}" data-act="idea-like" data-id="${x.id}" aria-label="Like">${ico("heart")}${x.liked_by.length || ""}</button>
        <button class="icon-btn" data-act="idea-del" data-id="${x.id}" aria-label="Delete idea">${ico("close")}</button>
      </div>`;
    }).join("") : `<div class="empty">${ico("pin")}<span>No ideas yet. Add the first thing you want to do together.</span></div>`}
  </div>`;
}

function tripPacking(trip) {
  const owner = S.packOwner;
  const items = S.packing.filter((x) => x.trip_id === trip.id && x.owner === owner);
  const done = items.filter((x) => x.done).length;
  return `<div class="seg" role="group" aria-label="Whose list">
      ${S.members.map((m) => `<button data-act="pack-owner" data-owner="${esc(m.name)}" aria-pressed="${owner === m.name}">${m.name === S.me.name ? "My list" : esc(m.name) + "'s list"}</button>`).join("")}
    </div>
    <div class="card">
      <div class="row" style="justify-content:space-between"><b>${done} of ${items.length} packed</b></div>
      <div class="progress"><i style="width:${items.length ? (done / items.length) * 100 : 0}%"></i></div>
      <form class="add-row" data-form="pack" data-trip="${trip.id}"><input class="in" id="pack-text" maxlength="120" placeholder="Add something to pack" aria-label="Item"><button class="btn" type="submit">Add</button></form>
      <div>${items.map((x) => `<div class="item ${x.done ? "done" : ""}">
        <button class="check" role="checkbox" aria-checked="${x.done}" aria-label="Packed" data-act="pack-done" data-id="${x.id}">${x.done ? ico("check") : ""}</button>
        <div class="item-text">${esc(x.text)}</div>
        <button class="icon-btn" data-act="pack-del" data-id="${x.id}" aria-label="Remove">${ico("close")}</button>
      </div>`).join("")}</div>
    </div>`;
}

function openTripSheet(trip) {
  const traveler = trip?.traveler || S.me.name;
  const dest = traveler === BOTH ? S.me : otherOf(traveler);
  const r = trip ? new Date(trip.reunion) : null, g = trip ? new Date(trip.goodbye) : null;
  openSheet(`
    <h3>${trip ? "Edit trip" : "New trip"}</h3>
    <form class="form" data-form="trip" data-id="${trip?.id || ""}">
      <label class="f">Name<input class="in" id="trip-title" maxlength="80" required placeholder="Boston · May 2027" value="${esc(trip?.title || "")}"></label>
      <label class="f">Who's flying?
        <select class="in" id="trip-traveler" data-act-change="trip-traveler">
          ${S.members.map((m) => `<option value="${esc(m.name)}" ${m.name === traveler ? "selected" : ""}>${esc(m.name)} → ${esc(otherOf(m.name).city)}</option>`).join("")}
          <option value="${BOTH}" ${traveler === BOTH ? "selected" : ""}>Nobody, we're in the same city</option>
        </select>
      </label>
      <p class="muted" id="trip-tz-note" style="font-size:14px">${tzNote(traveler)}</p>
      <div class="grid2">
        <label class="f">Together from<input class="in" id="trip-r-date" type="date" required value="${r ? toDateInput(r, dest.tz) : ""}"></label>
        <label class="f">at<input class="in" id="trip-r-time" type="time" required value="${r ? toTimeInput(r, dest.tz) : ""}"></label>
        <label class="f">Until<input class="in" id="trip-g-date" type="date" required value="${g ? toDateInput(g, dest.tz) : ""}"></label>
        <label class="f">at<input class="in" id="trip-g-time" type="time" required value="${g ? toTimeInput(g, dest.tz) : ""}"></label>
      </div>
      <div class="grid2">
        <label class="f">Arriving in (optional)<input class="in" id="trip-arrive" maxlength="60" placeholder="${esc(dest.city)}" value="${esc(trip?.arrive_city || "")}"></label>
        <label class="f">Leaving from (optional)<input class="in" id="trip-leave" maxlength="60" placeholder="${esc(dest.city)}" value="${esc(trip?.leave_city || "")}"></label>
      </div>
      <label class="f">Flights (optional)<textarea class="in" id="trip-flights" rows="3" maxlength="2000" placeholder="EI 107 DUB 16:35 → JFK 19:29">${esc(trip?.flights || "")}</textarea></label>
      <div class="msg bad" id="trip-msg" hidden></div>
      <button class="btn" type="submit">Save trip</button>
      ${trip ? `<button class="btn danger" type="button" data-act="trip-del" data-id="${trip.id}">${ico("trash")}Delete trip</button>` : ""}
      <button class="btn ghost" type="button" data-act="sheet-close">Cancel</button>
    </form>`);
}

function tzNote(traveler) {
  return traveler === BOTH ? "Enter both times in <b>your</b> time." : `Enter both times in <b>${esc(otherOf(traveler).city)}</b> time.`;
}

async function saveTrip(form) {
  const traveler = $("#trip-traveler").value;
  const tz = tzFor(traveler);
  const reunion = fromInputs($("#trip-r-date").value, $("#trip-r-time").value, tz);
  const goodbye = fromInputs($("#trip-g-date").value, $("#trip-g-time").value, tz);
  const title = $("#trip-title").value.trim();
  const msg = $("#trip-msg");
  const bad = (t) => { msg.hidden = false; msg.textContent = t; };
  if (!title) return bad("Give the trip a name.");
  if (!reunion || !goodbye) return bad("Fill in both dates and times.");
  if (goodbye <= reunion) return bad("The end needs to be after the start.");
  const row = {
    title, traveler, reunion: reunion.toISOString(), goodbye: goodbye.toISOString(), flights: $("#trip-flights").value.trim() || null,
    arrive_city: $("#trip-arrive").value.trim() || null, leave_city: $("#trip-leave").value.trim() || null,
  };
  const id = form.dataset.id;
  const saved = id
    ? await run(sb.from("trips").update(row).eq("id", id).select().single())
    : await run(sb.from("trips").insert(row).select().single());
  upsertRow("trips", saved);
  closeSheet();
  S.tripId = saved.id;
  renderHeader();
  renderView();
  toast(id ? "Trip saved" : "Trip added ♥");
}

async function deleteTrip(btn) {
  if (!btn.dataset.sure) { btn.dataset.sure = "1"; btn.innerHTML = `${ico("trash")}Tap again to delete the trip and its plans`; return; }
  const id = btn.dataset.id;
  await run(sb.from("trips").delete().eq("id", id));
  removeRow("trips", { id });
  closeSheet();
  S.tripId = null;
  renderHeader();
  renderView();
  toast("Trip deleted");
}

const planTimers = new Map();
function queuePlan(el) {
  clearTimeout(planTimers.get(el.id));
  planTimers.set(el.id, setTimeout(() => savePlan(el), 900));
}
async function savePlan(el) {
  clearTimeout(planTimers.get(el.id));
  const [trip_id, day] = el.dataset.plan.split("|");
  const plan = el.value;
  const existing = S.trip_days.find((x) => x.trip_id === trip_id && x.day === day);
  if (existing && existing.plan === plan) return;
  const row = { trip_id, day, plan, updated_by: S.me.name, updated_at: new Date().toISOString() };
  upsertRow("trip_days", row);
  await run(sb.from("trip_days").upsert(row), "Couldn't save the plan. Check your connection.");
  delete el.dataset.dirty;
}

// ═══ Calls ═══════════════════════════════════════════════════════
function memberRanges(name, fromMs, toMs) {
  const m = member(name);
  const out = [];
  const seen = new Set();
  for (let t = fromMs - DAY; t <= toMs + DAY; t += DAY / 2) {
    const p = zoneParts(new Date(t), m.tz);
    const key = `${p.y}-${p.mo}-${p.d}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const a of S.availability.filter((x) => x.owner === name && x.weekday === p.wd)) {
      const s = zonedDate(p.y, p.mo, p.d, Math.floor(a.start_min / 60), a.start_min % 60, m.tz).getTime();
      const e = zonedDate(p.y, p.mo, p.d, Math.floor(a.end_min / 60), a.end_min % 60, m.tz).getTime();
      out.push([s, e]);
    }
  }
  return out;
}

function overlaps(days = 7) {
  const now = Date.now(), end = now + days * DAY;
  const a = memberRanges(S.me.name, now, end), b = memberRanges(S.partner.name, now, end);
  const out = [];
  for (const [s1, e1] of a) for (const [s2, e2] of b) {
    const s = Math.max(s1, s2, now), e = Math.min(e1, e2, end);
    if (e - s >= 15 * MIN) out.push([s, e]);
  }
  out.sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const r of out) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}

function viewCalls() {
  const now = Date.now();
  const P = S.partner;
  const accepted = S.calls.filter((c) => c.status === "accepted" && Date.parse(c.starts_at) + c.minutes * MIN > now);
  const next = accepted[0];
  const incoming = S.calls.filter((c) => c.status === "proposed" && c.proposed_by !== S.me.name && Date.parse(c.starts_at) > now);
  const outgoing = S.calls.filter((c) => c.status === "proposed" && c.proposed_by === S.me.name && Date.parse(c.starts_at) > now);
  const callTimes = (c) => {
    const d = new Date(c.starts_at);
    return `<div class="both-times"><div><small>You</small><b>${fDay(d)} · ${fTime(d)}</b></div><div><small>${esc(P.name)} · ${esc(P.city)}</small><b>${fDay(d, P.tz)} · ${fTime(d, P.tz)}</b></div></div>`;
  };
  const slots = overlaps(7);
  const pre = S.prefill || defaultCallTime();
  S.prefill = null;
  const feed = `${CALENDAR_FEED}?token=${S.me.calendar_token}`;
  const webcal = feed.replace(/^https:/, "webcal:");
  return `<div class="page">
    ${next ? `<div class="card glow">
      <span class="eyebrow">Next call</span>
      <div class="big-time" data-until="${next.starts_at}">${inText(Date.parse(next.starts_at) - now)}</div>
      ${callTimes(next)}
      ${next.note ? `<p>${esc(next.note)}</p>` : ""}
      <div class="row wrap"><span class="chip">${next.minutes} min</span>${accepted.length > 1 ? `<span class="chip">+${accepted.length - 1} more planned</span>` : ""}<span class="grow"></span><button class="btn soft small" data-act="call-cancel" data-id="${next.id}">Cancel call</button></div>
    </div>` : `<div class="card empty">${ico("phone")}<b>No call planned</b><span>Propose a time below, or pick one of the times you're both free.</span></div>`}

    ${incoming.map((c) => `<div class="card"><span class="eyebrow">${esc(c.proposed_by)} wants to call</span>${callTimes(c)}${c.note ? `<p>${esc(c.note)}</p>` : ""}
      <div class="row"><button class="btn grow" data-act="call-accept" data-id="${c.id}">Accept</button><button class="btn ghost grow" data-act="call-decline" data-id="${c.id}">Can't then</button></div></div>`).join("")}
    ${outgoing.map((c) => `<div class="card"><span class="eyebrow">Waiting for ${esc(P.name)}</span>${callTimes(c)}<div class="row"><span class="grow muted" style="font-size:14px">${c.minutes} min${c.note ? " · " + esc(c.note) : ""}</span><button class="btn ghost small" data-act="call-cancel" data-id="${c.id}">Withdraw</button></div></div>`).join("")}

    <div class="card" id="propose">
      <h3 style="font:800 18px/1.2 var(--round)">Propose a call</h3>
      <form class="form" data-form="call">
        <div class="grid2">
          <label class="f">Day<input class="in" id="call-date" type="date" required value="${pre.date || ""}"></label>
          <label class="f">Your time<input class="in" id="call-time" type="time" required value="${pre.time || ""}"></label>
        </div>
        <div class="grid2">
          <label class="f">Length<select class="in" id="call-min">${[15, 30, 45, 60, 90, 120].map((m) => `<option value="${m}" ${m === (pre.minutes || 60) ? "selected" : ""}>${m < 60 ? m + " min" : m / 60 + " h" + (m % 60 ? " 30" : "")}</option>`).join("")}</select></label>
          <label class="f">Note (optional)<input class="in" id="call-note" maxlength="200" placeholder="Movie night?"></label>
        </div>
        <p class="muted" id="call-preview" style="font-size:14px">Pick a day and time to see ${esc(P.name)}'s time.</p>
        <button class="btn" type="submit">Send proposal</button>
      </form>
    </div>

    <div class="card">
      <h3 style="font:800 18px/1.2 var(--round)">When you're both free</h3>
      <p class="muted" style="font-size:14px">Next 7 days, from the free times you both set below.</p>
      <div>${slots.length ? slots.slice(0, 10).map(([s, e]) => `<div class="slot"><div class="grow"><b>${fDay(new Date(s))} · ${fTime(new Date(s))}–${fTime(new Date(e))}</b><small>${esc(P.name)}: ${fDay(new Date(s), P.tz)} · ${fTime(new Date(s), P.tz)}–${fTime(new Date(e), P.tz)}</small></div><button class="btn soft small" data-act="slot-pick" data-start="${s}">Propose</button></div>`).join("")
        : `<div class="empty"><span>${S.availability.some((a) => a.owner === P.name) ? "No overlap in the next 7 days." : `Once you and ${esc(P.name)} add your free times, the overlap shows up here.`}</span></div>`}</div>
    </div>

    <div class="card">
      <div class="sec-h"><h3 style="font:800 18px/1.2 var(--round)">Your free times</h3><button class="btn soft small" data-act="avail-add">${ico("plus")}Add</button></div>
      <p class="muted" style="font-size:14px">Usual weekly times, in ${esc(S.me.city)} time.</p>
      ${weekHTML(S.me.name, true)}
    </div>
    <div class="card">
      <h3 style="font:800 18px/1.2 var(--round)">${esc(P.name)}'s free times</h3>
      <p class="muted" style="font-size:14px">In ${esc(P.city)} time.</p>
      ${weekHTML(P.name, false)}
    </div>

    <div class="card">
      <h3 style="font:800 18px/1.2 var(--round)">Calls in your iPhone calendar</h3>
      <p class="muted" style="font-size:14px">Subscribe once and every accepted call appears in your Calendar app by itself. Changes can take up to an hour to show.</p>
      <a class="btn" href="${esc(webcal)}">${ico("calendar")}Subscribe on this iPhone</a>
      <div class="copyline"><code>${esc(feed)}</code><button class="btn soft small" data-act="copy" data-text="${esc(feed)}">Copy</button></div>
      <ol class="steps"><li>If the button does nothing, copy the link.</li><li>Open Settings → Apps → Calendar → Calendar Accounts → Add Account → Other → Add Subscribed Calendar.</li><li>Paste the link and tap Next, then Save.</li></ol>
    </div>
  </div>`;
}

function weekHTML(name, editable) {
  const mine = S.availability.filter((a) => a.owner === name);
  if (!editable && !mine.length) return `<div class="empty"><span>${esc(name)} hasn't added free times yet.</span></div>`;
  return `<div class="week">${WD_NAMES.map((d, i) => {
    const rs = mine.filter((a) => a.weekday === i).sort((a, b) => a.start_min - b.start_min);
    if (!editable && !rs.length) return "";
    return `<div class="wday"><b>${d}</b><div class="ranges">${rs.map((a) => `<span class="range">${hhmm(a.start_min)}–${hhmm(a.end_min)}${editable ? `<button data-act="avail-del" data-id="${a.id}" aria-label="Remove ${d} ${hhmm(a.start_min)}">${ico("close")}</button>` : ""}</span>`).join("") || (editable ? `<span class="muted" style="font-size:14px">Busy</span>` : "")}</div></div>`;
  }).join("")}</div>`;
}

function openAvailSheet() {
  const opts = (sel) => Array.from({ length: 49 }, (_, i) => i * 30).map((m) => `<option value="${m}" ${m === sel ? "selected" : ""}>${hhmm(m)}</option>`).join("");
  openSheet(`
    <h3>Add free time</h3>
    <p class="muted" style="font-size:14px">In ${esc(S.me.city)} time.</p>
    <form class="form" data-form="avail">
      <div class="seg" role="group" aria-label="Days" style="grid-auto-columns:auto">
        ${WD_NAMES.map((d, i) => `<button type="button" data-act="avail-day" data-day="${i}" aria-pressed="${i < 5}">${d.slice(0, 2)}</button>`).join("")}
      </div>
      <div class="grid2">
        <label class="f">From<select class="in" id="avail-from">${opts(1080)}</select></label>
        <label class="f">To<select class="in" id="avail-to">${opts(1320)}</select></label>
      </div>
      <div class="msg bad" id="avail-msg" hidden></div>
      <button class="btn" type="submit">Add</button>
      <button class="btn ghost" type="button" data-act="sheet-close">Cancel</button>
    </form>`);
}

async function saveAvail() {
  const days = $$("[data-act=avail-day][aria-pressed=true]").map((b) => +b.dataset.day);
  const start_min = +$("#avail-from").value, end_min = +$("#avail-to").value;
  const msg = $("#avail-msg");
  if (!days.length) { msg.hidden = false; msg.textContent = "Pick at least one day."; return; }
  if (end_min <= start_min) { msg.hidden = false; msg.textContent = "The end time needs to be after the start."; return; }
  const rows = await run(sb.from("availability").insert(days.map((weekday) => ({ owner: S.me.name, weekday, start_min, end_min }))).select());
  rows.forEach((r) => upsertRow("availability", r));
  closeSheet();
  renderView();
}

function updateCallPreview() {
  const out = $("#call-preview");
  if (!out) return;
  const d = fromInputs($("#call-date").value, $("#call-time").value, LOCAL_TZ);
  if (!d) return;
  const P = S.partner;
  out.innerHTML = d < Date.now()
    ? "That time has already passed."
    : `That's <b>${fDay(d, P.tz)}, ${fTime(d, P.tz)}</b> for ${esc(P.name)} in ${esc(P.city)}.`;
}

async function proposeCall() {
  const d = fromInputs($("#call-date").value, $("#call-time").value, LOCAL_TZ);
  if (!d) return toast("Pick a day and a time.");
  if (d < Date.now()) return toast("Pick a time in the future.");
  const row = await run(sb.from("calls").insert({
    starts_at: d.toISOString(), minutes: +$("#call-min").value, note: $("#call-note").value.trim() || null, proposed_by: S.me.name,
  }).select().single());
  upsertRow("calls", row);
  renderView();
  toast(`Sent to ${S.partner.name}`);
}

async function setCall(id, status) {
  const row = await run(sb.from("calls").update({ status }).eq("id", id).select().single());
  upsertRow("calls", row);
  renderView();
  if (status === "accepted") toast("Call accepted ♥");
}

async function cancelCall(id) {
  await run(sb.from("calls").delete().eq("id", id));
  removeRow("calls", { id });
  renderView();
  toast("Call removed");
}

// Next full hour, so the time box never starts empty
function defaultCallTime() {
  const d = new Date(Date.now() + HOUR);
  d.setMinutes(0, 0, 0);
  return { date: dayKey(d), time: toTimeInput(d, LOCAL_TZ) };
}

// ═══ Live distance ═══════════════════════════════════════════════
function haversineKm(A, B) {
  const rad = (x) => (x * Math.PI) / 180;
  const h = Math.sin(rad(B.lat - A.lat) / 2) ** 2 + Math.cos(rad(A.lat)) * Math.cos(rad(B.lat)) * Math.sin(rad(B.lon - A.lon) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
function placeOf(name) {
  const row = S.locations.find((l) => l.name === name);
  if (row) return { lat: +row.lat, lon: +row.lon, live: true, at: row.updated_at };
  const c = CITIES[member(name)?.city];
  return c ? { ...c, live: false } : null;
}
function distance() {
  const a = placeOf(S.me.name), b = placeOf(S.partner.name);
  if (!a || !b) return null;
  const km = haversineKm(a, b);
  const miles = S.me.tz.startsWith("America/");
  const value = Math.round(miles ? km * 0.621371 : km);
  const oldest = a.live && b.live ? Math.min(Date.parse(a.at), Date.parse(b.at)) : null;
  return { km, value, unit: miles ? "miles" : "km", live: a.live && b.live, oldest, together: km < 2 };
}
function agoText(t) {
  const m = Math.round((Date.now() - t) / MIN);
  if (m < 2) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}
const sharing = () => { try { return localStorage.getItem("mm-share-location") === "on"; } catch (e) { return false; } };
const setSharing = (on) => { try { localStorage.setItem("mm-share-location", on ? "on" : "off"); } catch (e) { /* private mode */ } };

// Your position, rounded to about 1 km; only the distance is ever shown
function shareLocation(force) {
  if (!S.me || !navigator.geolocation || (!force && !sharing())) return;
  const mine = S.locations.find((l) => l.name === S.me.name);
  if (!force && mine && Date.now() - Date.parse(mine.updated_at) < 9 * MIN) return;
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const row = { name: S.me.name, lat: Math.round(pos.coords.latitude * 100) / 100, lon: Math.round(pos.coords.longitude * 100) / 100, updated_at: new Date().toISOString() };
    setSharing(true);
    upsertRow("locations", row);
    if (S.tab === "us") renderView();
    try { await run(sb.from("locations").upsert(row), "Couldn't update your distance."); } catch (e) { /* shown */ }
  }, (err) => {
    if (err.code === 1) {
      setSharing(false);
      if (force) toast("Location is off for M&M's. Allow it in Settings → Privacy & Security → Location Services.");
      if (S.tab === "us") renderView();
    }
  }, { enableHighAccuracy: false, maximumAge: 10 * MIN, timeout: 20000 });
}
async function stopSharing() {
  setSharing(false);
  removeRow("locations", { name: S.me.name });
  renderView();
  try { await run(sb.from("locations").delete().eq("name", S.me.name)); } catch (e) { /* shown */ }
  toast("Stopped sharing your distance");
}

// ═══ The day count drops: a small celebration ════════════════════
function dropValue() {
  const ph = tripPhase();
  if (!ph.trip) return null;
  const v = ph.kind === "countdown" ? ph.days : ph.kind === "lastday" ? 0 : -1;
  return { key: `mm-days-${ph.trip.id}`, v, ph };
}
function checkDrop() {
  const d = dropValue();
  if (!d) return;
  if (S.dropSeen && S.dropSeen.key === d.key && S.dropSeen.v === d.v) return; // nothing changed this second
  let prev = null;
  try { prev = localStorage.getItem(d.key); localStorage.setItem(d.key, String(d.v)); } catch (e) { prev = S.dropSeen && S.dropSeen.key === d.key ? String(S.dropSeen.v) : null; }
  S.dropSeen = { key: d.key, v: d.v };
  if (prev !== null && d.v < +prev) { celebrate(+prev, d.v); if (d.v >= 0) seek("countdown", d.v); }
}
function celebrate(from, to) {
  if ($(".celebrate")) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const label = to > 0 ? (to === 1 ? "day to go" : "days to go") : to === 0 ? "Today's the day" : "Together";
  const eyebrow = to > 0 ? "One day closer" : to === 0 ? "It's happening" : "Finally";
  const shown = (n) => (n > 0 ? String(n) : n === 0 ? "0" : "♥");
  const hearts = reduce ? "" : Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2 + Math.random() * 0.4;
    const r = 120 + Math.random() * 140;
    return `<i style="--dx:${Math.round(Math.cos(a) * r)}px;--dy:${Math.round(Math.sin(a) * r)}px;--s:${(0.6 + Math.random() * 0.9).toFixed(2)};--d:${Math.round(Math.random() * 180)}ms">${ico("heart")}</i>`;
  }).join("");
  const box = document.createElement("div");
  box.className = "celebrate";
  box.setAttribute("role", "status");
  box.innerHTML = `<div class="burst" aria-hidden="true">${hearts}</div>
    <div class="cel-card">
      <span class="eyebrow">${eyebrow}</span>
      <div class="flip" aria-label="${to > 0 ? to : ""} ${label}"><b class="old">${shown(from)}</b><b class="new">${shown(to)}</b></div>
      <p>${label} ♥</p>
    </div>`;
  box.addEventListener("click", () => box.remove());
  document.body.append(box);
  navigator.vibrate?.([10, 60, 10]);
  setTimeout(() => box.classList.add("out"), 3600);
  setTimeout(() => box.remove(), 4100);
}

// ═══ Emojis ══════════════════════════════════════════════════════
const EMOJI_ONLY = /^(?:(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|⃣|\p{Emoji_Modifier})*(?:‍\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})*)*)+$/u;
// 1 to 3 emojis and nothing else → shown big, like in Messages
function emojiOnly(text) {
  const t = String(text || "").replace(/\s+/g, "");
  if (!t || t.length > 48 || !EMOJI_ONLY.test(t)) return 0;
  const n = typeof Intl.Segmenter === "function" ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(t)].length : [...t].length;
  return n <= 3 ? n : 0;
}
const recentEmojis = () => { try { return JSON.parse(localStorage.getItem("mm-emoji-recent") || "[]").slice(0, 8); } catch (e) { return []; } };
function rememberEmoji(e) { try { localStorage.setItem("mm-emoji-recent", JSON.stringify([e, ...recentEmojis().filter((x) => x !== e)].slice(0, 8))); } catch (err) { /* private mode */ } }

function toggleEmojiPanel(force) {
  const panel = $("#emoji-panel"), btn = $('[data-act="emoji-panel"]');
  if (!panel) return;
  const open = force ?? panel.hidden;
  if (open && panel.hidden) {
    const recent = recentEmojis();
    const grid = (list) => `<div class="ep-grid">${list.map((e) => `<button type="button" data-act="emoji-add" data-emoji="${e}" aria-label="${e}">${e}</button>`).join("")}</div>`;
    panel.innerHTML = (recent.length ? `<div class="ep-h">Recent</div>${grid(recent)}` : "") + EMOJI_SETS.map(([name, list]) => `<div class="ep-h">${name}</div>${grid(list)}`).join("");
    if (!FINE_POINTER) $("#composer")?.blur(); // the panel takes the keyboard's place
  }
  panel.hidden = !open;
  btn?.setAttribute("aria-expanded", String(open));
  const box = $("#msgs");
  if (open && box) box.scrollTop = box.scrollHeight;
}

function addEmoji(e) {
  const ta = $("#composer");
  if (!ta || ta.value.length + e.length > 2000) return;
  const focused = document.activeElement === ta;
  const [a, b] = focused ? [ta.selectionStart, ta.selectionEnd] : (S.caret && S.caret[1] <= ta.value.length ? S.caret : [ta.value.length, ta.value.length]);
  ta.value = ta.value.slice(0, a) + e + ta.value.slice(b);
  const pos = a + e.length;
  S.caret = [pos, pos];
  if (focused) ta.setSelectionRange(pos, pos);
  if (S.editing) S.editText = ta.value;
  else S.draft = ta.value;
  autosize(ta);
  syncComposer();
  rememberEmoji(e);
}

// ═══ Special days: birthdays, anniversaries, seasons and holidays ═══
// The same code runs in the widget and in the app.
function easterSunday(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return Date.UTC(y, Math.floor(n / 31) - 1, (n % 31) + 1);
}
const ordinal = (n) => n + ([11, 12, 13].includes(n % 100) ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");
const yearsText = (n) => (n === 1 ? "One year" : `${n} years`);

// ctx: { me, birthdays: { Moritz: "2004-07-20", … }, milestones: [{ kind, happened_on }] }
function specialDay(y, mo, d, ctx) {
  const DAYMS = 86400000;
  const t = Date.UTC(y, mo - 1, d);
  const on = (m, dd) => mo === m && d === dd;
  const parse = (s) => { const [a, b, c] = String(s).slice(0, 10).split("-").map(Number); return { y: a, mo: b, d: c, t: Date.UTC(a, b - 1, c) }; };
  const lastOfMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const all = [];
  const add = (priority, text, theme, big) => all.push({ priority, text, theme: theme || null, big: !!big });

  // Birthdays (29 Feb is celebrated on 28 Feb in other years)
  for (const name of Object.keys(ctx.birthdays || {})) {
    const iso = ctx.birthdays[name];
    if (!iso) continue;
    const b = parse(iso);
    if (mo === b.mo && d === Math.min(b.d, lastOfMonth) && y > b.y) {
      add(100, name === ctx.me ? `Happy birthday, ${name} 🎂` : `It's ${name}'s birthday 🎂`, "birthday", true);
    }
  }

  // Your story: the couple date every month, and the other milestones every year
  const story = { met: "we met", kiss: "our first kiss", love: "the first “I love you”" };
  for (const m of ctx.milestones || []) {
    if (!m || !m.kind || !m.happened_on) continue;
    const s = parse(m.happened_on);
    const days = Math.round((t - s.t) / DAYMS);
    if (m.kind === "couple") {
      const months = (y - s.y) * 12 + (mo - s.mo);
      if (months > 0 && d === Math.min(s.d, lastOfMonth)) {
        if (months % 12 === 0) add(90, `Happy ${ordinal(months / 12)} anniversary ♥`, "love", true);
        else if (months === 6) add(90, "Half a year together ♥", "love", true);
        else add(40, `Happy ${months} months ♥`, "love");
      }
      if (days === 100 || (days > 0 && days % 500 === 0)) add(60, `${days.toLocaleString("en-US")} days as a couple ♥`, "love");
    } else if (story[m.kind]) {
      if (on(s.mo, s.d) && y > s.y) add(70, `${yearsText(y - s.y)} since ${story[m.kind]} ♥`, "love");
      else if (m.kind === "met" && days > 0 && days % 1000 === 0) add(55, `${days.toLocaleString("en-US")} days since we met ♥`, "love");
    }
  }

  // Holidays in Germany, France and the US, and Düsseldorf's Karneval
  const fromEaster = Math.round((t - easterSunday(y)) / DAYMS);
  if (fromEaster === -52) add(25, "Weiberfastnacht · Helau! 🎭", "karneval");
  if (fromEaster === -48) add(30, "Rosenmontag · Helau! 🎭", "karneval");
  if (fromEaster === -2) add(25, "Good Friday 🐣", "easter");
  if (fromEaster === -1) add(20, "Easter weekend 🐣", "easter");
  if (fromEaster === 0 || fromEaster === 1) add(30, "Happy Easter 🐣", "easter");
  if (on(1, 1)) add(35, "Happy New Year 🎆", "newyear");
  if (on(2, 14)) add(35, "Happy Valentine's Day 💘", "valentine");
  if (on(3, 17)) add(25, "Happy St. Patrick's Day ☘️");
  if (on(6, 21)) add(15, "Fête de la Musique 🎶");
  if (on(7, 4)) add(30, "Happy 4th of July 🇺🇸");
  if (on(7, 14)) add(30, "Joyeux 14 juillet 🇫🇷");
  if (on(10, 3)) add(30, "Tag der Deutschen Einheit 🇩🇪");
  if (on(10, 31)) add(30, "Happy Halloween 🎃", "halloween");
  if (on(11, 11)) add(30, "11.11 · Karneval starts · Helau! 🎭", "karneval");
  if (mo === 11) {
    const firstThursday = 1 + ((4 - new Date(Date.UTC(y, 10, 1)).getUTCDay() + 7) % 7);
    if (d === firstThursday + 21) add(30, "Happy Thanksgiving 🦃");
  }
  if (on(12, 6)) add(25, "Happy Nikolaus 🎅", "christmas");
  if (mo === 11 || mo === 12) {
    const xmas = Date.UTC(y, 11, 25), wd = new Date(xmas).getUTCDay();
    const fourthAdvent = xmas - (wd === 0 ? 7 : wd) * DAYMS;
    for (let k = 1; k <= 4; k++) if (t === fourthAdvent - (4 - k) * 7 * DAYMS) add(20, `${ordinal(k)} Advent 🕯️`, "christmas");
  }
  if (on(12, 24)) add(35, "Merry Christmas Eve 🎄", "christmas");
  if (on(12, 25) || on(12, 26)) add(35, "Merry Christmas 🎄", "christmas");
  if (on(12, 31)) add(35, "Happy New Year's Eve 🥂", "newyear");

  all.sort((a, b) => b.priority - a.priority);
  const top = all[0] || null;
  // The season colours the look even on ordinary days
  const season = (mo === 12 && d <= 26) ? "christmas" : (on(12, 31) || on(1, 1)) ? "newyear" : null;
  return { text: top ? top.text : null, big: !!(top && top.big), theme: (top && top.theme) || season, all };
}

function today() {
  const k = dayKey(new Date());
  const sig = k + JSON.stringify(S.members.map((m) => m.birthday)) + S.moments.map((m) => (m.kind ? m.kind + m.happened_on : "")).join();
  if (S.todayCache?.sig === sig) return S.todayCache.v;
  const [y, mo, d] = k.split("-").map(Number);
  const v = specialDay(y, mo, d, { me: S.me?.name, birthdays: Object.fromEntries(S.members.map((m) => [m.name, m.birthday])), milestones: S.moments.filter((m) => m.kind) });
  S.todayCache = { sig, v };
  return v;
}
function setTheme(theme) { document.body.dataset.theme = theme || ""; }
function decorHTML(theme) {
  const n = { christmas: 16, newyear: 14, birthday: 18, karneval: 18, love: 7, valentine: 12 }[theme];
  if (!n) return "";
  const glyph = { newyear: "✦", love: "♥", valentine: "♥" }[theme] || "";
  return `<span class="decor ${theme}" aria-hidden="true">${Array.from({ length: n }, (_, i) =>
    `<i style="--x:${(i * 61) % 100}%;--d:${((i * 0.83) % 5).toFixed(2)}s;--t:${(5 + (i % 4) * 1.3).toFixed(1)}s;--s:${(0.55 + (i % 3) * 0.25).toFixed(2)}">${glyph}</i>`).join("")}</span>`;
}
function emojiOf(text) {
  const m = String(text || "").match(/(\p{Regional_Indicator}{2}|\p{Extended_Pictographic}️?)\s*$/u);
  return m ? m[1] : "♥";
}
// Once a day: a big greeting on birthdays and anniversaries, a little shower on other special days
function greetToday() {
  const sp = today();
  if (!sp.text) return;
  const key = `mm-greet-${dayKey(new Date())}`;
  try { if (localStorage.getItem(key)) return; localStorage.setItem(key, "1"); } catch (e) { if (S.greeted === key) return; S.greeted = key; }
  if (sp.big) bigGreeting(sp);
  else rain(emojiOf(sp.text), 18);
}
function bigGreeting(sp) {
  if ($(".celebrate")) return;
  const em = emojiOf(sp.text);
  const box = document.createElement("div");
  box.className = "celebrate greet";
  box.setAttribute("role", "status");
  box.innerHTML = `<div class="cel-card"><span class="eyebrow">Today</span><div class="greet-emoji" aria-hidden="true">${em === "♥" ? ico("heart") : em}</div><p>${esc(sp.text.replace(em, "").trim())}</p></div>`;
  box.addEventListener("click", () => box.remove());
  document.body.append(box);
  rain(em, 30);
  setTimeout(() => box.classList.add("out"), 5200);
  setTimeout(() => box.remove(), 5700);
}
function rain(sym, count = 24, mode = "fall") {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const syms = Array.isArray(sym) ? sym : [sym];
  const box = document.createElement("div");
  box.className = `rain ${mode}`;
  box.setAttribute("aria-hidden", "true");
  box.innerHTML = Array.from({ length: count }, (_, i) => {
    const s = syms[i % syms.length];
    return `<i style="--x:${(Math.random() * 96).toFixed(1)}%;--d:${Math.round(Math.random() * 1400)}ms;--t:${(2.6 + Math.random() * 2).toFixed(2)}s;--w:${Math.round(18 + Math.random() * 18)}px;--sway:${Math.round(Math.random() * 80 - 40)}px;--r:${Math.round(Math.random() * 120 - 60)}deg">${s === "♥" ? ico("heart") : esc(s)}</i>`;
  }).join("");
  document.body.append(box);
  setTimeout(() => box.remove(), 5400);
}

// Little things that happen without being announced
// Text is folded first: lower case, no accents, ß → ss, curly apostrophes straight.
const fold = (s) => String(s || "").toLowerCase().replace(/ß/g, "ss").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’‘`´]/g, "'");
// A list of wordings → one pattern. Every letter may repeat ("loveee youuu", "goood night"),
// a space may be left out ("goodnight"), an apostrophe may be left out or be a space ("je taime"),
// and a match never starts or ends in the middle of a word.
const wordings = (...list) => new RegExp(`(^|[^\\p{L}])(${list.map((w) => fold(w).replace(/\p{L}/gu, "$&+").replace(/'/g, "['\\s]?").replace(/ /g, "\\s*")).join("|")})(?=$|[^\\p{L}])`, "u");
const isNight = () => { const h = new Date().getHours(); return h >= 20 || h < 4; };
const isMorning = () => { const h = new Date().getHours(); return h >= 4 && h < 12; };
// When a message fits several, they mix into one shower (the first one's style); the first note wins.
const EGGS = [
  // using the word of the day, or a word your partner taught you, in your own message
  { mine: true, test: (t, raw) => usedWord(raw), fx: [["✨", "📖"], 16, "up"],
    note: (raw) => { const w = usedWord(raw); return w && (w.from ? `📖 ${w.from} taught you “${w.word}” ♥` : `📖 Nice, today's word: “${w.word}”`); } },
  { name: "paris", re: wordings("paris", "eiffel", "first kiss", "premier bisou", "erster kuss"), fx: [["💋", "🗼", "♥"], 21, "up"],
    note: () => { const k = S.moments.find((m) => m.kind === "kiss"); return k && `${k.title} · ${fDate(new Date(k.happened_on + "T12:00:00"))} ♥`; } },
  { name: "munich", re: wordings("munich", "münchen", "muenchen", "oktoberfest", "wiesn"), fx: [["🥨", "🍺", "♥"], 18, "up"],
    note: () => { const met = S.moments.find((m) => m.kind === "met"); return met && `Where it all began · ${fDate(new Date(met.happened_on + "T12:00:00"))} ♥`; } },
  { name: "boston", re: wordings("boston", "beantown", "massachusetts"), fx: [["🦆", "🦞", "☕"], 18, "up"],
    note: () => { const ph = tripPhase(); return ph.kind === "countdown" && `${plural(ph.days, "day")} to go ✈️`; } },
  { name: "karneval", re: wordings("helau", "alaaf", "karneval", "fasching", "fastnacht", "kamelle", "rosenmontag", "carnaval", "carnival"), fx: [["🎭", "🎉", "🎊"], 26] },
  { name: "cheers", re: wordings("prost", "prosit", "cheers", "santé", "zum wohl", "salud", "cin cin", "chin chin", "tchin", "skål", "nazdrave", "наздраве", "🍻", "🥂"), fx: [["🍻", "🥂"], 14, "up"] },
  { name: "mm", re: wordings("m & m('s|s)?", "m and m('s|s)?", "m n m('s|s)?"), fx: [["🔴", "🟡", "🟢", "🔵", "🟠", "🟤"], 36] },
  { name: "miss", re: wordings("miss(ed|ing|in')? (you|u|ya)", "vermiss(e)? dich", "fehlst mir", "tu me manque(s)?", "tu m'manque(s)?", "te extraño", "te echo de menos", "mi manchi", "липсваш ми"), fx: [["♥"], 14, "up"],
    note: () => { const d = distance(), ph = tripPhase(); return d && !d.together && `${d.value.toLocaleString()} ${d.unit} apart${ph.kind === "countdown" ? `, only ${plural(ph.days, "day")} to go` : ""} ♥`; } },
  { name: "night", when: isNight, fx: [["🌙", "✨", "⭐"], 18],
    re: wordings("good night", "nite", "gn", "g'night", "^night", "night night", "nighty( night)?", "sleep well", "sleep tight", "sweet dreams",
      "gute nacht", "gute n8", "n8", "gn8", "nachti", "schlaf gut", "schlaf schön", "träum süß", "träum schön", "träum was schönes", "süße träume",
      "bonne nuit", "bne nuit", "douce nuit", "dors bien", "beaux rêves", "buenas noches", "buona notte", "лека нощ") },
  { name: "morning", when: isMorning, fx: [["☀️", "🌤️", "☕"], 14, "up"],
    re: wordings("good morning", "good mornin'", "gm", "g'morning", "^morning", "^mornin'", "rise and shine",
      "guten morgen", "gumo", "moin", "morgen ☀", "bonjour", "bon matin", "buenos días", "buongiorno", "добро утро") },
  { name: "kiss", fx: [["💋", "😘"], 20],
    re: wordings("kiss(es|ed|ing|y)?", "xoxo", "xx", "mua(h)?", "mwa(h)?", "smooch(es)?", "kuss", "küsse", "küsschen", "kussi", "bussi", "busserl", "schmatz",
      "bisou(s)?", "bises", "biz", "beso(s)?", "bacio", "baci", "целувки", "😘", "😗", "😙", "😚", "😽", "💋", "💏") },
  { name: "love", fx: [["♥"], 28],
    re: wordings("i love you", "love (you|u|ya)", "luv (you|u|ya)", "ily", "ilysm", "ilu", "adore you", "<3",
      "ich liebe dich", "liebe dich", "lieb dich", "hab dich (so )?lieb", "hdl", "hdgdl",
      "je t'aime", "jtaime", "jtm", "je t'adore", "te amo", "te quiero", "ti amo", "ti voglio bene", "обичам те") },
];
function builtInEggs(text, mine = false) {
  const raw = String(text || "").replace(/\b(?:https?:\/\/|www\.)\S+/gi, " "), t = fold(raw); // links don't count
  const hits = EGGS.filter((e) => (!e.mine || mine) && (e.re ? e.re.test(t) : e.test(t, raw)) && (!e.when || e.when())).slice(0, 3);
  if (!hits.length) return;
  const mode = hits[0].fx[2] || "fall";
  rain([...new Set(hits.flatMap((e) => e.fx[0]))], Math.min(36, Math.max(...hits.map((e) => e.fx[1])) + 6 * (hits.length - 1)), mode);
  for (const e of hits) { const n = e.note && e.note(raw); if (n) { toast(n); break; } }
  return hits.map((e) => e.name || "word");
}

// 11:11 · make a wish (once per day, morning or evening, when the app is open)
function wishTime() {
  const d = new Date();
  if (d.getMinutes() !== 11 || (d.getHours() !== 11 && d.getHours() !== 23)) return;
  const key = `mm-wish-${dayKey(d)}-${d.getHours()}`;
  try { if (localStorage.getItem(key)) return; localStorage.setItem(key, "1"); } catch (e) { if (S.wished === key) return; S.wished = key; }
  rain(["✨", "⭐"], 14, "up");
  toast(`${d.getHours() === 11 ? "11:11" : "23:11"} · make a wish ✨`);
}

// ═══ Notifications ════════════════════════════════════════════════
const PUSH_DEFAULTS = { messages: true, hearts: true, photos: true, calls: true, words: true, story: true, preview: true, quiet_from: null, quiet_to: null };
const PUSH_TOPICS = [
  ["messages", "Messages"], ["hearts", "Hearts"], ["photos", "Photos"],
  ["calls", "Calls", "Suggestions and answers"], ["words", "New words", "When you're taught one"], ["story", "Trips and memories"],
];
const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const deviceName = () => (/iPhone/.test(navigator.userAgent) ? "this iPhone" : /iPad/.test(navigator.userAgent) ? "this iPad" : /Mac/.test(navigator.userAgent) ? "this Mac" : "this device");
function pushStatusText() {
  if (!pushSupported()) return /iPhone|iPad/.test(navigator.userAgent) ? "Open M&M's from your Home Screen to turn them on" : "Not available in this browser";
  if (S.push?.endpoint) return `On for ${deviceName()}`;
  return Notification.permission === "denied" ? "Blocked in your settings" : `Off on ${deviceName()}`;
}
const b64uBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

// Register the service worker and pick up this device's subscription
async function pushStart() {
  navigator.clearAppBadge?.().catch(() => {});
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.register("sw.js");
    S.swReg = reg;
    const sub = await reg.pushManager.getSubscription();
    if (!sub || Notification.permission !== "granted") return;
    const { data } = await sb.from("push_subscriptions").select("*").eq("endpoint", sub.endpoint).maybeSingle();
    const prefs = { ...PUSH_DEFAULTS, ...(data?.prefs || {}), tz: LOCAL_TZ };
    await savePushSub(sub, prefs);
    if (S.tab === "us") renderView();
  } catch (e) { /* notifications are a bonus */ }
}
async function savePushSub(sub, prefs) {
  const j = sub.toJSON();
  const row = { endpoint: j.endpoint, name: S.me.name, p256dh: j.keys.p256dh, auth: j.keys.auth, prefs, user_agent: navigator.userAgent.slice(0, 200), updated_at: new Date().toISOString() };
  const { error } = await sb.from("push_subscriptions").upsert(row);
  if (error) throw error;
  S.push = { endpoint: j.endpoint, prefs };
}

async function pushOn(btn) {
  const msg = $("#push-msg");
  const say = (t) => { if (msg) { msg.hidden = false; msg.textContent = t; } };
  if (!pushSupported()) return say("On iPhone, add M&M's to your Home Screen and open it from there (iOS 16.4 or later).");
  btn.disabled = true;
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { say("Notifications are blocked. Allow them in Settings → Notifications → M&M's."); return; }
    const reg = S.swReg || (await navigator.serviceWorker.register("sw.js"));
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uBytes(VAPID_PUBLIC) }));
    await savePushSub(sub, { ...PUSH_DEFAULTS, tz: LOCAL_TZ });
    openPushSheet();
    renderView();
    toast(`Notifications are on for ${deviceName()} ♥`);
  } catch (e) {
    console.error(e);
    say("Couldn't turn them on. Check your connection and try again.");
  } finally {
    btn.disabled = false;
  }
}

async function pushOff() {
  try {
    const reg = S.swReg || (await navigator.serviceWorker.getRegistration());
    const sub = reg && (await reg.pushManager.getSubscription());
    if (S.push?.endpoint) await sb.from("push_subscriptions").delete().eq("endpoint", S.push.endpoint);
    if (sub) await sub.unsubscribe();
  } catch (e) { /* already gone */ }
  S.push = null;
  closeSheet();
  renderView();
  toast(`Notifications are off on ${deviceName()}`);
}

let pushSaveTimer;
function setPushPref(key, value) {
  if (!S.push) return;
  S.push.prefs = { ...S.push.prefs, [key]: value, tz: LOCAL_TZ };
  clearTimeout(pushSaveTimer);
  pushSaveTimer = setTimeout(async () => {
    const { error } = await sb.from("push_subscriptions").update({ prefs: S.push.prefs, updated_at: new Date().toISOString() }).eq("endpoint", S.push.endpoint);
    toast(error ? "Couldn't save. Check your connection." : "Saved");
  }, 350);
}

async function pushTest(btn) {
  btn.disabled = true;
  const { error } = await sb.from("push_pings").insert({ name: S.me.name });
  btn.disabled = false;
  toast(error ? "Couldn't send the test. Check your connection." : "Test sent, it should arrive in a few seconds");
}

function openPushSheet() {
  const on = !!S.push?.endpoint, p = { ...PUSH_DEFAULTS, ...(S.push?.prefs || {}) };
  const quietOn = !!(p.quiet_from && p.quiet_to);
  const sw = (key, label, sub, checked) => `<label class="switch-row"><span><b>${label}</b>${sub ? `<i>${sub}</i>` : ""}</span>
    <input type="checkbox" role="switch" data-push-pref="${key}" ${checked ? "checked" : ""}><span class="switch" aria-hidden="true"></span></label>`;
  openSheet(`
    <h3>Notifications</h3>
    <p class="muted" style="font-size:14px">${esc(pushStatusText())}. Each device has its own settings.</p>
    ${on ? `
      <div class="switches">
        ${PUSH_TOPICS.map(([k, l, sub]) => sw(k, l, sub, p[k] !== false)).join("")}
      </div>
      <div class="switches">
        ${sw("preview", "Show message text", "Off: “New message from …” on the lock screen", p.preview !== false)}
        ${sw("quiet", "Quiet hours", "Nothing buzzes in this window, your time", quietOn)}
        <div class="grid2" id="quiet-times" ${quietOn ? "" : "hidden"}>
          <label class="f">From<input class="in" type="time" id="quiet-from" value="${esc(p.quiet_from || "23:00")}"></label>
          <label class="f">Until<input class="in" type="time" id="quiet-to" value="${esc(p.quiet_to || "07:30")}"></label>
        </div>
      </div>
      <button class="btn soft" data-act="push-test">${ico("bell")}Send a test notification</button>
      <button class="btn ghost" data-act="push-off">Turn off on ${esc(deviceName())}</button>`
    : `<div class="msg" id="push-msg" ${pushSupported() ? "hidden" : ""}>${pushSupported() ? "" : "On iPhone, add M&M's to your Home Screen and open it from there (iOS 16.4 or later). On a Mac, use Safari → File → Add to Dock."}</div>
      ${pushSupported() ? `<button class="btn" data-act="push-on">${ico("bell")}Turn on for ${esc(deviceName())}</button>` : ""}`}
    <button class="btn ghost" data-act="sheet-close">Close</button>`);
}

// ═══ Words: the word of the day and words you teach each other ═══
const LANG_NAME = { en: "English", de: "German" };
const LANG_VOICE = { en: "en-US", de: "de-DE" };
const taughtFor = (name) => S.words.filter((w) => w.for_name === name).map((w) => ({ ...w, day: dayKey(new Date(w.created_at)) }));
function todaysWord(name, key = dayKey(new Date())) {
  const m = member(name);
  return m && m.learns ? wordOfTheDay(key, m.learns, taughtFor(name)) : null;
}
// today's word or one your partner taught you, if this message of yours uses it
function usedWord(text) {
  if (!S.me) return null;
  const t = ` ${String(text).toLowerCase().replace(/[^\p{L}\p{N}']+/gu, " ").trim()} `;
  const has = (w) => { const k = String(w).toLowerCase().replace(/^(der|die|das) /, "").replace(/[^\p{L}\p{N}']+/gu, " ").trim(); return k.length > 2 && t.includes(` ${k} `); };
  const today = todaysWord(S.me.name);
  if (today && has(today.word)) return today;
  const taught = S.words.find((w) => w.for_name === S.me.name && has(w.word));
  return taught ? { word: taught.word, from: taught.added_by } : null;
}
function speak(text, lang) {
  try {
    if (!("speechSynthesis" in window)) return toast("Your browser can't read words aloud.");
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG_VOICE[lang] || "en-US";
    u.rate = lang === "de" ? 0.85 : 0.95;
    speechSynthesis.speak(u);
  } catch (e) { /* no voice available */ }
}
const sayBtn = (text, lang, label = "Listen") => `<button type="button" class="icon-btn say" data-act="say" data-text="${esc(text)}" data-lang="${lang}" aria-label="${esc(label)}">${ico("speaker")}</button>`;

function viewWords() {
  const me = S.me, partner = S.partner;
  const w = todaysWord(me.name);
  const theirs = todaysWord(partner.name);
  const header = (lang) => (lang === "de" ? "Wort des Tages" : "Word of the day");
  const card = w ? `<div class="card word-card">
      <div class="row" style="justify-content:space-between"><span class="eyebrow">${header(w.lang)} · ${LANG_NAME[w.lang]}</span>${sayBtn(w.word, w.lang, `Listen to ${w.word}`)}</div>
      <h2 class="word">${esc(w.word)}</h2>
      <p class="meaning">${esc(w.meaning)}</p>
      ${w.example ? `<div class="example"><p>“${esc(w.example)}”</p>${w.translation ? `<p class="tr">${esc(w.translation)}</p>` : ""}${sayBtn(w.example, w.lang, "Listen to the example")}</div>` : ""}
      ${w.from ? `<span class="chip pink">${ico("heart")}Taught by ${esc(w.from)}</span>` : ""}
      <div class="row"><button class="btn soft small" data-act="word-share">${ico("chat")}Share in the chat</button></div>
    </div>` : `<div class="card empty">${ico("book")}<b>No word yet</b></div>`;
  const recent = Array.from({ length: 7 }, (_, i) => todaysWord(me.name, dayKey(new Date(Date.now() - (i + 1) * DAY)))).filter(Boolean);
  const fromPartner = S.words.filter((x) => x.for_name === me.name).slice().reverse();
  const toPartner = S.words.filter((x) => x.for_name === partner.name).slice().reverse();
  const pl = partner.learns, isDe = pl === "de";
  const row = (x, lang, canDelete) => `<div class="word-row">
      <div class="grow"><b>${esc(x.word)}</b><span>${esc(x.meaning)}</span>${x.example ? `<i>${esc(x.example)}</i>` : ""}</div>
      ${sayBtn(x.word, lang, `Listen to ${x.word}`)}
      ${canDelete ? `<button class="icon-btn" data-act="word-del" data-id="${x.id}" aria-label="Remove ${esc(x.word)}">${ico("trash")}</button>` : ""}
    </div>`;
  return `<div class="page">
    ${card}
    ${theirs ? `<p class="muted theirs">${esc(partner.name)}'s word today: <b>${esc(theirs.word)}</b> · ${esc(theirs.meaning)}</p>` : ""}
    ${pl ? `<form class="card form" data-form="teach">
      <h3>Teach ${esc(partner.name)} a word</h3>
      <p class="muted" style="font-size:14px">It becomes ${esc(partner.name)}'s word of the day, starting today.</p>
      <label class="f">${isDe ? "German word or phrase" : "English word or phrase"}<input class="in" id="teach-word" maxlength="60" autocomplete="off" placeholder="${isDe ? "die Sehnsucht" : "heinous"}"></label>
      <label class="f">${isDe ? "What it means in English" : "What it means"}<input class="in" id="teach-meaning" maxlength="300" autocomplete="off" placeholder="${isDe ? "longing" : "utterly wicked; shockingly evil"}"></label>
      <label class="f">Example (optional)<input class="in" id="teach-example" maxlength="300" autocomplete="off" placeholder="${isDe ? "Ich habe Sehnsucht nach dir." : "A heinous crime."}"></label>
      <div class="msg bad" id="teach-msg" hidden></div>
      <button class="btn" type="submit">${ico("plus")}Add to ${esc(partner.name)}'s words</button>
    </form>` : ""}
    ${recent.length ? `<div class="sec-h"><h2>Your last week</h2></div><div class="card word-list">${recent.map((x) => row(x, x.lang, false)).join("")}</div>` : ""}
    <div class="sec-h"><h2>Words from ${esc(partner.name)}</h2><span class="muted">${fromPartner.length}</span></div>
    ${fromPartner.length ? `<div class="card word-list">${fromPartner.map((x) => row(x, x.lang, true)).join("")}</div>` : `<p class="muted">When ${esc(partner.name)} teaches you a word, it shows up here.</p>`}
    ${toPartner.length ? `<div class="sec-h"><h2>Words you taught ${esc(partner.name)}</h2><span class="muted">${toPartner.length}</span></div><div class="card word-list">${toPartner.map((x) => row(x, x.lang, true)).join("")}</div>` : ""}
  </div>`;
}

async function teachWord() {
  const word = $("#teach-word").value.trim(), meaning = $("#teach-meaning").value.trim(), example = $("#teach-example").value.trim();
  const msg = $("#teach-msg");
  if (!word || !meaning) { msg.hidden = false; msg.textContent = "Add the word and what it means."; return; }
  const row = await run(sb.from("words").insert({ lang: S.partner.learns, word, meaning, example: example || null, for_name: S.partner.name, added_by: S.me.name }).select().single(), "Couldn't add the word. Check your connection.");
  upsertRow("words", row);
  ["#teach-word", "#teach-meaning", "#teach-example"].forEach((id) => { $(id).value = ""; delete $(id).dataset.dirty; });
  renderView();
  toast(`Added to ${S.partner.name}'s words ♥`);
}

async function shareWord() {
  const w = todaysWord(S.me.name);
  if (!w) return;
  const body = `📖 ${w.lang === "de" ? "Wort des Tages" : "Word of the day"}: ${w.word} · ${w.meaning}`;
  const row = await run(sb.from("posts").insert({ author: S.me.name, kind: "note", body }).select().single(), "Couldn't share it. Check your connection.");
  upsertRow("posts", row);
  toast("Shared in the chat");
}

async function deleteWord(btn) {
  if (!btn.dataset.sure) { btn.dataset.sure = "1"; btn.classList.add("sure"); toast("Tap the bin again to remove it"); return; }
  const id = btn.dataset.id;
  await run(sb.from("words").delete().eq("id", id), "Couldn't remove it. Check your connection.");
  removeRow("words", { id });
  renderView();
}

// ═══ Surprises: hidden by one of you, found by the other ═════════
const taps = { n: 0, timer: null };
function heartTap(el) {
  if (S.holdFired) return;
  el.classList.remove("pop");
  void el.offsetWidth;
  el.classList.add("pop");
  taps.n++;
  clearTimeout(taps.timer);
  taps.timer = setTimeout(async () => {
    const n = taps.n;
    taps.n = 0;
    if (n < 3) return;
    const found = await seek("taps", n);
    if (!found && n >= 10) rain("♥", 30);
  }, 900);
}
const secretTaps = { n: 0, timer: null };
function secretTap() {
  secretTaps.n++;
  clearTimeout(secretTaps.timer);
  secretTaps.timer = setTimeout(() => { secretTaps.n = 0; }, 1500);
  if (secretTaps.n >= 5) { secretTaps.n = 0; openSurprises(); }
}

// Ask the database whether something is hidden here; it only answers when there is
function seek(spot, value = null) {
  S.seekQ = (S.seekQ || Promise.resolve()).then(async () => {
    if (!S.me) return false;
    try {
      const { data, error } = await sb.rpc("find_surprise", { p_spot: spot, p_value: value == null ? null : String(value) });
      if (error || !Array.isArray(data) || !data.length) return false;
      for (const row of data) { upsertRow("surprises", row); revealSurprise(row); }
      if (S.tab === "us") renderView();
      return true;
    } catch (e) {
      return false;
    }
  });
  return S.seekQ;
}
async function seekOnOpen() {
  for (let i = 0; i < 5 && (await seek("date")); i++);
  await seek("night");
  const ph = tripPhase();
  if (ph.kind === "countdown" || ph.kind === "lastday") {
    for (let i = 0; i < 5 && (await seek("countdown", ph.kind === "lastday" ? 0 : ph.days)); i++);
  }
}

function revealSurprise(row) {
  (S.revealQ ||= []).push(row);
  if (!$(".reveal")) nextReveal();
}
function nextReveal() {
  const row = S.revealQ?.shift();
  if (!row) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sparks = reduce ? "" : Array.from({ length: 26 }, (_, i) => {
    const a = (i / 26) * Math.PI * 2, r = 110 + (i % 5) * 34;
    return `<i style="--dx:${Math.round(Math.cos(a) * r)}px;--dy:${Math.round(Math.sin(a) * r)}px;--s:${(0.6 + (i % 4) * 0.25).toFixed(2)};--d:${(i % 6) * 40}ms">${ico(i % 3 ? "heart" : "us")}</i>`;
  }).join("");
  const box = document.createElement("div");
  box.className = "celebrate reveal";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", `A surprise from ${row.created_by}`);
  box.innerHTML = `<div class="burst" aria-hidden="true">${sparks}</div>
    <div class="cel-card reveal-card">
      <span class="eyebrow">A little surprise from ${esc(row.created_by)}</span>
      ${row.photo ? `<img class="reveal-photo" data-path="${esc(row.photo)}" alt="">` : ""}
      <p class="reveal-msg">${esc(row.message)}</p>
      <button class="btn" data-act="reveal-close">${ico("heart")}Close</button>
    </div>`;
  document.body.append(box);
  hydratePhotos(box);
  navigator.vibrate?.([12, 80, 12]);
  box.querySelector("button").focus({ preventScroll: true });
}
function closeReveal(el) {
  el.closest(".reveal")?.remove();
  setTimeout(nextReveal, 250);
}
function noticeFound(row) {
  if (!row || row.created_by !== S.me?.name || !row.found_at) return;
  const prev = S.surprises.find((x) => x.id === row.id);
  if (prev && !prev.found_at) toast(`${row.for_name} just found one of your surprises ♥`);
}

function spotsFor(p) {
  return {
    word: { label: "A secret word in the chat", short: (x) => `When ${p} writes “${x.secret}”` },
    taps: { label: "Taps on the heart at the top", short: (x) => `Tapping the heart at the top ${x.secret} times` },
    hold: { label: "Holding the countdown", short: () => "Holding the countdown at the top" },
    date: { label: "Opening the app on a day", short: (x) => `Opening the app from ${fDate(new Date(x.unlock_on + "T12:00:00"))}` },
    countdown: { label: "A number on the countdown", short: (x) => `When the countdown shows ${plural(+x.secret, "day")}` },
    night: { label: "Opening the app at night", short: () => "Opening the app between midnight and 5 am" },
  };
}

// The hiding place for your surprises: opened by tapping "Signed in as …" five times
function openSurprises() {
  const p = S.partner.name, SP = spotsFor(p);
  const mine = S.surprises.filter((x) => x.created_by === S.me.name).sort((a, b) => b.created_at.localeCompare(a.created_at));
  openSheet(`
    <h3>Surprises for ${esc(p)}</h3>
    <p class="muted" style="font-size:14px">Only you can see this. ${esc(p)} gets no counter and no hint: a surprise only appears when ${esc(p)} stumbles on it.</p>
    <button class="btn" data-act="surprise-new">${ico("plus")}Hide a new surprise</button>
    ${mine.length ? `<div class="sp-list">${mine.map((x) => `
      <div class="sp-item">
        <div class="grow">
          <b>${esc(SP[x.spot] ? SP[x.spot].short(x) : x.spot)}</b>
          <span class="muted">${esc(x.message)}</span>
          ${x.found_at ? `<span class="chip good">${ico("check")}Found ${esc(fDay(new Date(x.found_at)))}, ${esc(fTime(new Date(x.found_at)))}</span>` : `<span class="chip pink">Hidden</span>`}
        </div>
        ${x.found_at ? "" : `<button class="icon-btn" data-act="surprise-edit" data-id="${x.id}" aria-label="Edit">${ico("edit")}</button>`}
        <button class="icon-btn" data-act="surprise-del" data-id="${x.id}" aria-label="Delete">${ico("trash")}</button>
      </div>`).join("")}</div>` : `<p class="muted" style="font-size:14px">Nothing hidden yet.</p>`}
    <button class="btn ghost" data-act="sheet-close">Close</button>`);
}

function openSurpriseForm(x) {
  const SP = spotsFor(S.partner.name);
  S.spPhoto = x?.photo || null;
  S.spFile = null;
  openSheet(`
    <h3>${x ? "Edit surprise" : "Hide a surprise"}</h3>
    <form class="form" data-form="surprise" data-id="${x?.id || ""}" novalidate>
      <label class="f">Where it's hidden<select class="in" id="sp-spot">${Object.entries(SP).map(([k, v]) => `<option value="${k}" ${(x?.spot || "word") === k ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select></label>
      <div id="sp-extra" class="form"></div>
      <label class="f">Your message<textarea class="in" id="sp-msg" rows="4" maxlength="2000" placeholder="Something only ${esc(S.partner.name)} should read…">${esc(x?.message || "")}</textarea></label>
      <div id="sp-photo"></div>
      <label class="btn soft">${ico("photo")}Add a photo (optional)<input type="file" accept="image/*" hidden data-file="surprise"></label>
      <div class="msg bad" id="sp-err" hidden></div>
      <button class="btn" type="submit">${x ? "Save" : "Hide it"}</button>
      <button class="btn ghost" type="button" data-act="surprise-list">Back</button>
    </form>`);
  renderSpExtra(x?.spot || "word", x);
  renderSpPhoto();
}

function renderSpExtra(spot, x) {
  const box = $("#sp-extra");
  if (!box) return;
  const p = esc(S.partner.name);
  const val = (v) => (x && x.spot === spot && v != null ? esc(v) : "");
  box.innerHTML = {
    word: `<label class="f">Secret word<input class="in" id="sp-secret" maxlength="40" autocomplete="off" autocapitalize="none" placeholder="Paris" value="${val(x?.secret)}"></label><p class="fine">It appears when ${p} sends a message with this word in it. Capital letters don't matter, and an emoji works too.</p>`,
    taps: `<label class="f">Taps in a row<input class="in" id="sp-secret" type="number" inputmode="numeric" min="3" max="30" value="${val(x?.secret) || 7}"></label><p class="fine">The heart next to the countdown at the top. Pick 5 or more so it isn't found by accident.</p>`,
    hold: `<p class="fine">It appears when ${p} presses and holds the countdown at the top for 2 seconds.</p>`,
    date: `<label class="f">From this day<input class="in" id="sp-date" type="date" value="${val(x?.unlock_on) || dayKey(new Date(Date.now() + DAY))}"></label><p class="fine">It appears the first time ${p} opens the app on or after this day.</p>`,
    countdown: `<label class="f">Days left<input class="in" id="sp-secret" type="number" inputmode="numeric" min="0" max="999" value="${val(x?.secret) || 10}"></label><p class="fine">It appears once the countdown shows this number of days or fewer.</p>`,
    night: `<p class="fine">It appears the first time ${p} opens the app between midnight and 5 am, ${p}'s time.</p>`,
  }[spot] || "";
}

function renderSpPhoto() {
  const box = $("#sp-photo");
  if (!box) return;
  box.innerHTML = S.spFile
    ? `<div class="picked"><span>${esc(S.spFile.name || "photo")}</span><button type="button" class="link" data-act="sp-photo-del">Remove</button></div>`
    : S.spPhoto ? `<div class="thumbs"><button type="button" data-act="sp-photo-del" aria-label="Remove photo"><img data-path="${esc(S.spPhoto)}" alt=""></button></div>` : "";
  hydratePhotos(box);
}

async function saveSurprise(form) {
  const spot = $("#sp-spot").value, err = $("#sp-err");
  const fail = (t) => { err.hidden = false; err.textContent = t; };
  const message = $("#sp-msg").value.trim();
  let secret = null, unlock_on = null;
  if (spot === "word") { secret = ($("#sp-secret").value || "").trim(); if (!secret) return fail("Add the secret word."); }
  if (spot === "taps") { const n = Math.round(Number($("#sp-secret").value)); if (!(n >= 3 && n <= 30)) return fail("Pick between 3 and 30 taps."); secret = String(n); }
  if (spot === "countdown") { const raw = $("#sp-secret").value, n = Math.round(Number(raw)); if (raw === "" || !(n >= 0 && n <= 999)) return fail("Pick a number of days."); secret = String(n); }
  if (spot === "date") { unlock_on = $("#sp-date").value; if (!unlock_on) return fail("Pick the day."); }
  if (!message) return fail("Write your message.");
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = S.spFile ? "Uploading the photo…" : "Hiding…";
  try {
    const photo = S.spFile ? await uploadPhoto(S.spFile) : S.spPhoto;
    const row = { for_name: S.partner.name, spot, secret, unlock_on, message, photo: photo || null };
    const id = form.dataset.id;
    const saved = id
      ? await run(sb.from("surprises").update(row).eq("id", id).select().single())
      : await run(sb.from("surprises").insert(row).select().single());
    upsertRow("surprises", saved);
    toast("Hidden ✨");
    openSurprises();
  } catch (e) {
    btn.disabled = false;
    btn.textContent = form.dataset.id ? "Save" : "Hide it";
    fail("Couldn't save. Check your connection and try again.");
  }
}

async function deleteSurprise(btn) {
  if (!btn.dataset.sure) {
    btn.dataset.sure = "1";
    btn.classList.add("sure");
    toast("Tap the bin again to delete it");
    return;
  }
  const x = S.surprises.find((s) => s.id === btn.dataset.id);
  if (!x) return;
  await run(sb.from("surprises").delete().eq("id", x.id), "Couldn't delete. Check your connection.");
  removeRow("surprises", x);
  if (x.photo) sb.storage.from("photos").remove([x.photo]);
  openSurprises();
}

// ═══ Our story: the timeline ═════════════════════════════════════
const arriveCity = (t) => t.arrive_city || destOf(t).city;
const leaveCity = (t) => t.leave_city || arriveCity(t);
const ORDINAL_WORDS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
function visitLabel(t) {
  const n = S.trips.filter((x) => x.traveler === t.traveler && x.reunion <= t.reunion).length;
  const who = t.traveler === S.me.name ? "Your" : `${t.traveler}'s`;
  return `${who} ${ORDINAL_WORDS[n - 1] || ordinal(n)} visit`;
}
const dayDiff = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / DAY);

// Visits are shown as journeys: arrival, everything that happened in between, departure
function storyHTML() {
  const now = Date.now(), today = dayKey(new Date());
  const trips = S.trips.slice().sort((a, b) => a.reunion.localeCompare(b.reunion)).map((t) => {
    const tz = destOf(t).tz;
    return { t, tz, start: dayKey(new Date(t.reunion), tz), end: dayKey(new Date(t.goodbye), tz), events: [] };
  });
  const loose = [];
  const place = (ev) => {
    const trip = trips.find((x) => ev.date >= x.start && ev.date <= x.end);
    (trip ? trip.events : loose).push(ev);
  };
  S.moments.forEach((m) => place({ kind: "moment", date: m.happened_on, m }));
  S.surprises.filter((x) => x.for_name === S.me.name && x.found_at).forEach((x) => place({ kind: "surprise", date: dayKey(new Date(x.found_at)), x }));

  const entries = [
    ...loose.map((ev) => ({ type: "event", date: ev.date, ev })),
    ...trips.map((tr) => ({ type: "trip", date: tr.start, tr })),
  ];
  const inTrip = trips.find((x) => Date.parse(x.t.reunion) <= now && now < Date.parse(x.t.goodbye));
  if (!inTrip) entries.push({ type: "now", date: today });
  entries.sort((a, b) => a.date.localeCompare(b.date) || ({ event: 0, trip: 1, now: 2 }[a.type] - { event: 0, trip: 1, now: 2 }[b.type]));
  if (!entries.some((e) => e.type !== "now")) return `<div class="empty"><span>Add your first memory.</span></div>`;

  const shortDay = (k) => fmt(new Date(k + "T12:00:00Z"), "UTC", { weekday: "short", day: "numeric", month: "short" });
  const longDay = (k) => fmt(new Date(k + "T12:00:00Z"), "UTC", { day: "numeric", month: "long", year: "numeric" });
  const photos = (list) => (list.length ? `<div class="thumbs">${list.map((p) => `<button data-zoom-btn="${esc(p)}" aria-label="Open photo"><img data-path="${esc(p)}" alt=""></button>`).join("")}</div>` : "");
  const eventBody = (ev) => {
    if (ev.kind === "surprise") {
      const x = ev.x;
      return `<div class="tl-title"><h3>${ico("us")} A surprise from ${esc(x.created_by)}</h3></div>
        <p class="tl-note">${esc(x.message)}</p>${x.photo ? photos([x.photo]) : ""}`;
    }
    const m = ev.m;
    return `<div class="tl-title"><h3>${esc(m.title)}</h3><button class="icon-btn" data-act="moment-edit" data-id="${m.id}" aria-label="Edit memory">${ico("dots")}</button></div>
      ${m.note ? `<p class="tl-note">${esc(m.note)}</p>` : ""}${photos(m.photos)}`;
  };
  const evClass = (ev) => (ev.kind === "surprise" || ev.m.kind ? "milestone" : "");

  let html = "", year = "", prevTrip = null, gapShown = null;
  const nextTrip = trips.find((x) => x.start > today);
  const lastTrip = [...trips].reverse().find((x) => x.end < today);
  for (const e of entries) {
    // "84 days apart" goes between two visits, before any new year heading
    if (e.type === "trip" && prevTrip && gapShown !== e.tr) html += `<div class="tl-gap">${plural(dayDiff(prevTrip.end, e.tr.start), "day")} apart</div>`;
    if (e.type === "now" && lastTrip && nextTrip && prevTrip === lastTrip) {
      html += `<div class="tl-gap">${plural(dayDiff(lastTrip.end, nextTrip.start), "day")} apart</div>`;
      gapShown = nextTrip;
    }
    const y = e.date.slice(0, 4);
    if (y !== year) { html += `<div class="tl-year">${y}</div>`; year = y; }
    if (e.type === "event") {
      html += `<div class="tl ${evClass(e.ev)} ${e.ev.kind === "surprise" ? "surprise" : ""}"><div class="tl-date">${longDay(e.date)}</div>${eventBody(e.ev)}</div>`;
    } else if (e.type === "now") {
      const next = nextTrip, last = lastTrip;
      const bits = [];
      if (last) bits.push(`${plural(dayDiff(last.end, today), "day")} since ${esc(leaveCity(last.t))}`);
      if (next) bits.push(`${plural(dayDiff(today, next.start), "day")} to go`);
      html += `<div class="tl-now"><div class="tl-date">Today · ${shortDay(today)}</div><b>${bits.join(" · ") || "Our story so far"}</b></div>`;
    } else {
      const { t, tz, start, end, events } = e.tr;
      prevTrip = e.tr;
      const r = Date.parse(t.reunion), g = Date.parse(t.goodbye);
      const future = now < r, together = r <= now && now < g;
      const who = t.traveler === S.me.name ? "You" : esc(t.traveler);
      const timeOf = (iso) => (t.flights ? ` · ${fTime(new Date(iso), tz)}` : "");
      const shared = isTogetherTime(t);
      const arriveText = shared
        ? `Our time in ${esc(arriveCity(t))} ${now < r ? "begins" : "began"}`
        : `${who} ${now < r ? (who === "You" ? "land" : "lands") : (who === "You" ? "landed" : "arrived")} in ${esc(arriveCity(t))}${timeOf(t.reunion)}`;
      const steps = [
        // a together-time block opens with its first memory when there is one that day (like the day you met)
        ...(shared && events.some((ev) => ev.date === start) ? [] : [{ date: start, cls: "arrive", body: `<b>${arriveText}</b>` }]),
        ...events.slice().sort((a, b) => a.date.localeCompare(b.date)).map((ev) => ({ date: ev.date, cls: evClass(ev), body: eventBody(ev) })),
      ];
      if (together) { const ph = tripPhase(); steps.push({ date: today, cls: "now", body: `<b>Today · day ${ph.day} of ${ph.total}</b>` }); }
      steps.sort((a, b) => a.date.localeCompare(b.date) || (a.cls === "arrive" ? -1 : b.cls === "arrive" ? 1 : 0));
      steps.push({ date: end, cls: "leave", body: shared
        ? `<b>Last day together in ${esc(leaveCity(t))}</b>`
        : `<b>${who} ${now < g ? (who === "You" ? "fly" : "flies") : "flew"} home from ${esc(leaveCity(t))}${timeOf(t.goodbye)}</b>` });
      const route = arriveCity(t) === leaveCity(t) ? esc(arriveCity(t)) : `${esc(arriveCity(t))} → ${esc(leaveCity(t))}`;
      html += `<div class="tl-trip ${future ? "future" : ""} ${together ? "together" : ""}">
        <div class="trip-head">
          <div class="tl-date">${future ? "Coming up · " : ""}${esc(tripWhen(t))}</div>
          <div class="tl-title"><h3>${ico(shared ? "heart" : "plane")} ${esc(t.title)}</h3></div>
          <div class="trip-meta">${shared ? `Together every day · ${route}` : `${esc(visitLabel(t))} · ${route}`}</div>
          <div class="row">${tripStatus(t)}<button class="link" data-act="trip-open" data-id="${t.id}" data-go="1">Open trip</button></div>
        </div>
        <ol class="trip-steps">${steps.map((st) => `<li class="step ${st.cls}"><span class="step-date">${shortDay(st.date)}</span>${st.body}</li>`).join("")}</ol>
      </div>`;
    }
  }
  return `<div class="timeline">${html}</div>`;
}

// ═══ Us: stats and timeline ══════════════════════════════════════

function viewUs() {
  const now = Date.now();
  const dateOf = (m) => (m ? new Date(m.happened_on + "T12:00:00") : null);
  const sorted = S.moments.slice().sort((a, b) => a.happened_on.localeCompare(b.happened_on));
  const couple = dateOf(S.moments.find((m) => m.kind === "couple"));
  const met = dateOf(S.moments.find((m) => m.kind === "met") || sorted[0]);
  const daysSince = (d) => Math.floor((now - d) / DAY);
  const together = S.trips.reduce((sum, t) => sum + Math.max(0, Math.min(now, Date.parse(t.goodbye)) - Date.parse(t.reunion)), 0);
  const past = S.trips.filter((t) => Date.parse(t.reunion) <= now);
  const visits = S.members.map((m) => ({ name: m.name, n: past.filter((t) => t.traveler === m.name).length }));
  const dist = distance();
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  return `<div class="page">
    <div class="stats">
      ${couple ? `<div class="stat wide"><b>${daysSince(couple).toLocaleString()} days</b><span>a couple since ${fDate(couple)}</span></div>` : ""}
      ${met ? `<div class="stat"><b>${daysSince(met).toLocaleString()}</b><span>days since we met</span></div>` : ""}
      <div class="stat"><b>${Math.floor(together / DAY)}</b><span>days side by side</span></div>
      <div class="stat"><b>${visits.reduce((a, v) => a + v.n, 0)}</b><span>${visits.reduce((a, v) => a + v.n, 0) === 1 ? "visit" : "visits"} · ${visits.map((v) => `${esc(v.name)} ${v.n}`).join(", ")}</span></div>
      <div class="stat"><b>${S.msgCount.toLocaleString()}</b><span>messages</span></div>
      <div class="stat wide dist">
        <div class="row" style="justify-content:space-between;align-items:flex-end">
          <div class="dist-main"><b>${dist ? (dist.together ? "Together ♥" : `${dist.value.toLocaleString()} ${dist.unit}`) : "–"}</b><span>${dist && !dist.together ? "between you" : ""}${dist && dist.live ? ` · live, updated ${agoText(dist.oldest)}` : " · between your cities"}</span></div>
          ${ico("pin")}
        </div>
        ${sharing()
          ? `<button class="link" data-act="loc-stop">Stop sharing my distance</button>`
          : `<button class="btn soft small" data-act="loc-share">${ico("pin")}Share my live distance</button><span class="fine">Your position is rounded to about 1 km. Only the distance is shown.</span>`}
      </div>
    </div>
    ${standalone ? "" : `<div class="card install"><b>Put M&amp;M's on your Home Screen</b><p class="muted" style="font-size:14px">In Safari, tap the Share button, then <b>Add to Home Screen</b>. It then opens like a normal app.</p></div>`}
    <div class="sec-h"><h2>Our story</h2><button class="btn small" data-act="moment-new">${ico("plus")}Add memory</button></div>
    ${storyHTML()}
    ${savedCardHTML()}
    <div class="card notif-card">
      <div class="row" style="justify-content:space-between;align-items:center">
        <div class="notif-main">${ico("bell")}<div><b>Notifications</b><span>${esc(pushStatusText())}</span></div></div>
        <button class="btn soft small" data-act="push-settings">Settings</button>
      </div>
    </div>
    <div class="foot"><span class="foot-me" data-act="secret-tap">Signed in as ${esc(S.me.name)}</span><button class="link" data-act="signout">Sign out</button></div>
  </div>`;
}

function openMomentSheet(m) {
  S.momentPhotos = m ? [...m.photos] : [];
  S.momentFiles = [];
  openSheet(`
    <h3>${m ? "Edit memory" : "Add a memory"}</h3>
    <form class="form" data-form="moment" data-id="${m?.id || ""}">
      <label class="f">Date<input class="in" id="mo-date" type="date" required value="${m?.happened_on || dayKey(new Date())}"></label>
      <label class="f">Title<input class="in" id="mo-title" maxlength="120" required placeholder="First dinner in Boston" value="${esc(m?.title || "")}"></label>
      <label class="f">Note (optional)<textarea class="in" id="mo-note" rows="3" maxlength="2000">${esc(m?.note || "")}</textarea></label>
      <div id="mo-photos"></div>
      <label class="btn soft">${ico("photo")}Add photos<input type="file" accept="image/*" multiple hidden data-file="moment"></label>
      <div class="msg bad" id="mo-msg" hidden></div>
      <button class="btn" type="submit">Save memory</button>
      ${m ? `<button class="btn danger" type="button" data-act="moment-del" data-id="${m.id}">${ico("trash")}Delete memory</button>` : ""}
      <button class="btn ghost" type="button" data-act="sheet-close">Cancel</button>
    </form>`);
  renderMomentPhotos();
}

function renderMomentPhotos() {
  const box = $("#mo-photos");
  if (!box) return;
  box.innerHTML = (S.momentPhotos.length ? `<div class="thumbs">${S.momentPhotos.map((p, i) => `<button type="button" data-act="mo-photo-del" data-i="${i}" aria-label="Remove photo"><img data-path="${esc(p)}" alt=""></button>`).join("")}</div>` : "")
    + (S.momentFiles.length ? `<div class="picked">${S.momentFiles.map((f) => `<span>${esc(f.name || "photo")}</span>`).join("")}</div>` : "");
  hydratePhotos(box);
}

async function saveMoment(form) {
  const title = $("#mo-title").value.trim(), happened_on = $("#mo-date").value;
  const msg = $("#mo-msg");
  if (!title || !happened_on) { msg.hidden = false; msg.textContent = "Add a date and a title."; return; }
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = S.momentFiles.length ? "Uploading photos…" : "Saving…";
  try {
    const uploaded = [];
    for (const f of S.momentFiles) uploaded.push(await uploadPhoto(f));
    const row = { title, happened_on, note: $("#mo-note").value.trim() || null, photos: [...S.momentPhotos, ...uploaded] };
    const id = form.dataset.id;
    const saved = id
      ? await run(sb.from("moments").update(row).eq("id", id).select().single())
      : await run(sb.from("moments").insert(row).select().single());
    upsertRow("moments", saved);
    closeSheet();
    renderView();
    toast("Memory saved ♥");
  } catch (e) {
    msg.hidden = false;
    msg.textContent = "Couldn't save. Check your connection and try again.";
    btn.disabled = false;
    btn.textContent = "Save memory";
  }
}

async function deleteMoment(btn) {
  if (!btn.dataset.sure) { btn.dataset.sure = "1"; btn.innerHTML = `${ico("trash")}Tap again to delete`; return; }
  const id = btn.dataset.id;
  await run(sb.from("moments").delete().eq("id", id));
  removeRow("moments", { id });
  closeSheet();
  renderView();
}

// ═══ Events ══════════════════════════════════════════════════════
document.addEventListener("click", async (e) => {
  const zoomBtn = e.target.closest("[data-zoom-btn]");
  if (zoomBtn) return openLightbox(zoomBtn.dataset.zoomBtn);
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act, id = el.dataset.id;
  if (act === "sheet-close") { if (e.target === el || el.tagName === "BUTTON") closeSheet(); return; }
  try {
    switch (act) {
      case "auth-mode": return renderLogin(el.dataset.mode);
      case "signout": return sb.auth.signOut();
      case "reload": return location.reload();
      case "tab": return setTab(el.dataset.tab);
      case "send-heart": return await sendHeart();
      case "push-settings": return openPushSheet();
      case "push-on": return await pushOn(el);
      case "push-off": return await pushOff();
      case "push-test": return await pushTest(el);
      case "say": return speak(el.dataset.text, el.dataset.lang);
      case "word-share": return await shareWord();
      case "word-del": return await deleteWord(el);
      case "emoji-panel": return toggleEmojiPanel();
      case "emoji-add": return addEmoji(el.dataset.emoji);
      case "heart-tap": return heartTap(el);
      case "secret-tap": return secretTap();
      case "reveal-close": return closeReveal(el);
      case "surprise-list": return openSurprises();
      case "surprise-new": return openSurpriseForm(null);
      case "surprise-edit": return openSurpriseForm(S.surprises.find((x) => x.id === id));
      case "surprise-del": return await deleteSurprise(el);
      case "sp-photo-del": S.spPhoto = null; S.spFile = null; return renderSpPhoto();
      case "earlier": return await loadEarlier();
      case "react": return await react(id, el.dataset.emoji);
      case "copy-msg": closeSheet(); return copyText(S.posts.find((p) => p.id === id)?.body || "");
      case "reply": return startReply(id);
      case "edit-msg": return startEdit(id);
      case "ctx-cancel": cancelCtx(); return $("#composer")?.focus();
      case "jump": return await jumpTo(id);
      case "goto-msg": closeSheet(); if (S.tab !== "chat") setTab("chat"); return await jumpTo(id);
      case "save-msg": return await toggleSave(id);
      case "saved-list": return openSavedSheet();
      case "chat-search": return openSearch();
      case "send-later": return openSendLater();
      case "sched-change": return openSendLater(id);
      case "sched-pick": return id ? await reschedule(id, new Date(el.dataset.at)) : await scheduleNote(new Date(el.dataset.at));
      case "sched-custom": {
        const d = customSchedDate();
        if (!d || d.getTime() <= Date.now() + MIN) return toast("Pick a time in the future");
        return id ? await reschedule(id, d) : await scheduleNote(d);
      }
      case "sched-now": return await sendNow(id);
      case "voice-start": return await voiceStart();
      case "voice-send": return await voiceFinish(true);
      case "voice-cancel": return await voiceFinish(false);
      case "voice-play": return await voicePlay(id);
      case "voice-seek": return await voiceSeek(id, e, el);
      case "voice-speed": return voiceSpeed();
      case "del-msg": return await deleteMsg(el);
      case "copy": return copyText(el.dataset.text);
      case "trip-new": return openTripSheet(null);
      case "trip-edit": return openTripSheet(S.trips.find((t) => t.id === id));
      case "trip-del": return await deleteTrip(el);
      case "trip-open":
        S.tripId = id;
        S.tripSub = "plan";
        if (el.dataset.go) return setTab("trips");
        renderView(); $("#view").scrollTop = 0; return;
      case "trip-back": S.tripId = null; renderView(); return;
      case "trip-sub": S.tripSub = el.dataset.sub; renderView(); return;
      case "pack-owner": S.packOwner = el.dataset.owner; renderView(); return;
      case "idea-done": {
        const x = S.ideas.find((i) => i.id === id);
        upsertRow("ideas", { ...x, done: !x.done }); renderView();
        return await run(sb.from("ideas").update({ done: !x.done }).eq("id", id));
      }
      case "idea-like": {
        const x = S.ideas.find((i) => i.id === id);
        const liked_by = x.liked_by.includes(S.me.name) ? x.liked_by.filter((n) => n !== S.me.name) : [...x.liked_by, S.me.name];
        upsertRow("ideas", { ...x, liked_by }); renderView();
        return await run(sb.from("ideas").update({ liked_by }).eq("id", id));
      }
      case "idea-del": removeRow("ideas", { id }); renderView(); return await run(sb.from("ideas").delete().eq("id", id));
      case "pack-done": {
        const x = S.packing.find((i) => i.id === id);
        upsertRow("packing", { ...x, done: !x.done }); renderView();
        return await run(sb.from("packing").update({ done: !x.done }).eq("id", id));
      }
      case "pack-del": removeRow("packing", { id }); renderView(); return await run(sb.from("packing").delete().eq("id", id));
      case "avail-add": return openAvailSheet();
      case "avail-day": el.setAttribute("aria-pressed", el.getAttribute("aria-pressed") !== "true"); return;
      case "avail-del": removeRow("availability", { id }); renderView(); return await run(sb.from("availability").delete().eq("id", id));
      case "slot-pick": {
        const s = new Date(+el.dataset.start);
        S.prefill = { date: dayKey(s), time: toTimeInput(s, LOCAL_TZ) };
        renderView();
        updateCallPreview();
        $("#propose")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      case "call-accept": return await setCall(id, "accepted");
      case "call-decline": return await setCall(id, "declined");
      case "call-cancel": return await cancelCall(id);
      case "loc-share": return shareLocation(true);
      case "loc-stop": return await stopSharing();
      case "moment-new": return openMomentSheet(null);
      case "moment-edit": return openMomentSheet(S.moments.find((m) => m.id === id));
      case "moment-del": return await deleteMoment(el);
      case "mo-photo-del": S.momentPhotos.splice(+el.dataset.i, 1); return renderMomentPhotos();
    }
  } catch (err) {
    console.error(err);
  }
});

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("[data-form]");
  if (!form) return;
  e.preventDefault();
  try {
    switch (form.dataset.form) {
      case "auth": return await submitAuth(form);
      case "send": return await sendNote();
      case "trip": return await saveTrip(form);
      case "call": return await proposeCall();
      case "avail": return await saveAvail();
      case "moment": return await saveMoment(form);
      case "surprise": return await saveSurprise(form);
      case "teach": return await teachWord();
      case "idea": {
        const text = $("#idea-text").value.trim();
        if (!text) return;
        const row = await run(sb.from("ideas").insert({ trip_id: form.dataset.trip, text, place: $("#idea-place").value.trim() || null, created_by: S.me.name }).select().single());
        $("#idea-text").value = ""; $("#idea-place").value = "";
        delete $("#idea-text").dataset.dirty; delete $("#idea-place").dataset.dirty;
        upsertRow("ideas", row); renderView();
        return;
      }
      case "pack": {
        const input = $("#pack-text"), text = input.value.trim();
        if (!text) return;
        const row = await run(sb.from("packing").insert({ trip_id: form.dataset.trip, owner: S.packOwner, text }).select().single());
        input.value = ""; delete input.dataset.dirty;
        upsertRow("packing", row); renderView();
        return;
      }
    }
  } catch (err) {
    console.error(err);
  }
});

document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.id) el.dataset.dirty = "1";
  if (el.id === "composer") {
    if (S.editing) S.editText = el.value;
    else S.draft = el.value;
    autosize(el);
    syncComposer();
  }
  if (el.id === "search-q") { clearTimeout(S.searchT); S.searchT = setTimeout(() => runSearch(el.value), 250); }
  if (el.id === "sched-date" || el.id === "sched-time") updateSchedPreview();
  if (el.dataset.plan) queuePlan(el);
  if (el.id === "call-date" || el.id === "call-time") updateCallPreview();
});

document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.plan) savePlan(el);
  if (el.dataset.file === "chat" && el.files?.length) { sendPhotos([...el.files]); el.value = ""; }
  if (el.dataset.file === "moment" && el.files?.length) { S.momentFiles.push(...el.files); el.value = ""; renderMomentPhotos(); }
  if (el.dataset.file === "surprise" && el.files?.length) { S.spFile = el.files[0]; el.value = ""; renderSpPhoto(); }
  if (el.id === "sp-spot") renderSpExtra(el.value);
  if (el.dataset.pushPref === "quiet") {
    $("#quiet-times").hidden = !el.checked;
    setPushPref("quiet_from", el.checked ? $("#quiet-from").value : null);
    setPushPref("quiet_to", el.checked ? $("#quiet-to").value : null);
  } else if (el.dataset.pushPref) setPushPref(el.dataset.pushPref, el.checked);
  if ((el.id === "quiet-from" || el.id === "quiet-to") && el.value) setPushPref(el.id === "quiet-from" ? "quiet_from" : "quiet_to", el.value);
  if (el.id === "trip-traveler") {
    const note = $("#trip-tz-note");
    if (note) note.innerHTML = tzNote(el.value);
  }
});

document.addEventListener("focusout", (e) => { if (e.target.dataset?.plan) savePlan(e.target); });

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!$("#sheet-root .scrim") && (S.replyTo || S.editing)) cancelCtx();
    closeSheet();
  }
  if (e.target.id === "composer" && e.key === "Enter" && !e.shiftKey && FINE_POINTER) {
    e.preventDefault();
    sendNote();
  }
});

// Press and hold the countdown at the top (a hiding place for surprises)
document.addEventListener("pointerdown", (e) => {
  const el = e.target.closest?.(".top-days");
  if (!el || e.button > 0) return;
  clearTimeout(S.holdT);
  S.holdAt = [e.clientX, e.clientY];
  S.holdT = setTimeout(() => {
    S.holdFired = true;
    setTimeout(() => { S.holdFired = false; }, 900);
    navigator.vibrate?.(12);
    seek("hold");
  }, 1500);
});
["pointerup", "pointercancel"].forEach((ev) => document.addEventListener(ev, () => clearTimeout(S.holdT)));
document.addEventListener("pointermove", (e) => { if (S.holdAt && Math.hypot(e.clientX - S.holdAt[0], e.clientY - S.holdAt[1]) > 12) clearTimeout(S.holdT); });
// Emoji panel: keep the cursor in the message on a computer; on the phone the panel replaces the keyboard
document.addEventListener("mousedown", (e) => { if (e.target.closest?.(".emoji-panel")) e.preventDefault(); });
document.addEventListener("focusin", (e) => { if (e.target.id === "composer" && !FINE_POINTER) toggleEmojiPanel(false); });
document.addEventListener("focusout", (e) => { if (e.target.id === "composer") S.caret = [e.target.selectionStart, e.target.selectionEnd]; });

// Coming back to the app after a while: catch up
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && S.rec) voiceFinish(false); // a recording doesn't survive leaving the app
  if (document.visibilityState === "visible" && S.started && S.me) {
    // back in the chat: show where the new messages start
    loadAll().then(() => { if (S.tab === "chat") showChatUpdates(); else refresh("all"); checkDrop(); greetToday(); seekOnOpen(); }).catch(() => {});
    navigator.clearAppBadge?.().catch(() => {});
    shareLocation(false);
  }
});

boot();
