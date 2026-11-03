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
  trips: [], trip_days: [], ideas: [], packing: [], availability: [], calls: [], moments: [], locations: [], surprises: [], words: [],
  tab: tabFromHash(), tripId: null, tripSub: "plan", packOwner: null,
  urls: new Map(), uploading: 0, channel: null, prefill: null,
};
const KEYS = {
  posts: (r) => r.id, reactions: (r) => `${r.post_id}|${r.author}`, trip_days: (r) => `${r.trip_id}|${r.day}`,
  trips: (r) => r.id, ideas: (r) => r.id, packing: (r) => r.id, availability: (r) => r.id, calls: (r) => r.id, moments: (r) => r.id,
  locations: (r) => r.name, surprises: (r) => r.id, words: (r) => r.id,
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
  if (t === "posts") S.reactions = S.reactions.filter((r) => r.post_id !== row.id);
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
  Object.assign(S, { started: false, channel: null, me: null, partner: null, posts: [], reactions: [], trips: [], trip_days: [], ideas: [], packing: [], availability: [], calls: [], moments: [], locations: [], surprises: [], words: [], tripId: null, dropSeen: null });
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
  ]);
  S.posts = posts.slice().reverse();
  S.more = posts.length === PAGE;
  Object.assign(S, { trips, trip_days: days, ideas, packing, availability, calls, moments, locations, surprises, words });
  S.msgCount = count?.count ?? posts.filter((p) => p.kind === "note").length;
  S.reactions = posts.length ? await run(sb.from("reactions").select("*").in("post_id", posts.map((p) => p.id))) : [];
}

function subscribe() {
  const ch = sb.channel("mm-live");
  for (const t of Object.keys(KEYS)) {
    ch.on("postgres_changes", { event: "*", schema: "public", table: t }, (p) => {
      if (t === "surprises" && p.eventType === "UPDATE") noticeFound(p.new);
      if (t === "posts" && p.eventType === "INSERT" && p.new.author !== S.me?.name && p.new.kind === "note" && !S.posts.some((x) => x.id === p.new.id)) builtInEggs(p.new.body, false);
      if (p.eventType === "DELETE") removeRow(t, p.old);
      else upsertRow(t, p.new);
      refresh(t);
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
  if (S.tab === "chat" && (t === "posts" || t === "reactions" || t === "all")) renderMsgs();
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
  view.innerHTML = `
    <div class="msgs" id="msgs" aria-label="Messages"></div>
    <div class="emoji-panel" id="emoji-panel" hidden></div>
    <form class="composer" data-form="send">
      <label class="icon-btn" aria-label="Send a photo">${ico("camera")}<input type="file" accept="image/*" hidden data-file="chat"></label>
      <button type="button" class="icon-btn" data-act="send-heart" aria-label="Send a heart">${ico("heart")}</button>
      <button type="button" class="icon-btn" data-act="emoji-panel" aria-label="Emojis" aria-expanded="false" aria-controls="emoji-panel">${ico("smile")}</button>
      <textarea id="composer" rows="1" maxlength="2000" placeholder="Message ${esc(S.partner.name)}" aria-label="Message"></textarea>
      <button class="send" type="submit" aria-label="Send" disabled>${ico("send")}</button>
    </form>`;
  const ta = $("#composer");
  ta.value = S.draft || "";
  autosize(ta);
  $(".send").disabled = !ta.value.trim();
  renderMsgs(true);
  bindPress($("#msgs"));
}

function autosize(ta) { ta.style.height = "auto"; ta.style.height = Math.min(120, ta.scrollHeight) + "px"; }

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
    const d = new Date(p.created_at), k = dayKey(d);
    if (k !== last) { html += `<div class="day-sep">${esc(dayLabel(d))}</div>`; last = k; }
    html += msgHTML(p);
  }
  if (S.uploading) html += `<div class="uploading">Sending ${S.uploading > 1 ? `${S.uploading} photos` : "photo"}…</div>`;
  box.innerHTML = html;
  hydratePhotos(box);
  if (forceBottom === "keep-top") box.scrollTop = box.scrollHeight - prevH + prevTop;
  else if (forceBottom || atBottom) box.scrollTop = box.scrollHeight;
  else box.scrollTop = prevTop;
}

function msgHTML(p) {
  const mine = p.author === S.me.name;
  const who = mine ? "You" : esc(p.author);
  const time = fTime(new Date(p.created_at));
  if (p.kind === "heart") return `<div class="event">${ico("heart")}${who} sent a heart · ${time}</div>`;
  if (p.kind === "trip") return `<div class="event">${ico("plane")}${who} updated the trip dates · ${time}</div>`;
  const reacts = S.reactions.filter((r) => r.post_id === p.id);
  const groups = {};
  for (const r of reacts) (groups[r.emoji] ||= []).push(r.author === S.me.name ? "You" : r.author);
  const reactHTML = reacts.length
    ? `<div class="reacts">${Object.entries(groups).map(([e, names]) => `<span class="react" title="${esc(names.join(", "))}">${e}${names.length > 1 ? " " + names.length : ""}</span>`).join("")}</div>`
    : "";
  const body = p.kind === "photo"
    ? `<div class="bubble photo" data-press="${p.id}"><img data-path="${esc(p.body)}" alt="Photo from ${who}" data-zoom="${esc(p.body)}"></div>`
    : `<div class="bubble${emojiOnly(p.body) ? ` emoji n${emojiOnly(p.body)}${/^[\s❤️♥️💖💗💓💕💞💘🩷]+$/u.test(p.body) ? " beat" : ""}` : ""}" data-press="${p.id}">${esc(p.body)}</div>`;
  return `<div class="m ${mine ? "mine" : ""}">${body}${reactHTML}<div class="meta">${time}</div></div>`;
}

// Press and hold a message to react or delete
function bindPress(box) {
  let press = null, suppressClick = false;
  const cancel = () => { if (press) { clearTimeout(press.t); press.el.classList.remove("pressing"); press = null; } };
  box.addEventListener("pointerdown", (e) => {
    const el = e.target.closest("[data-press]");
    if (!el || e.button > 0) return;
    el.classList.add("pressing");
    press = { el, x: e.clientX, y: e.clientY, t: setTimeout(() => {
      el.classList.remove("pressing");
      press = null;
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 500);
      navigator.vibrate?.(8);
      openMsgSheet(el.dataset.press);
    }, 430) };
  });
  box.addEventListener("pointermove", (e) => { if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) cancel(); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => box.addEventListener(ev, cancel));
  box.addEventListener("contextmenu", (e) => {
    const el = e.target.closest("[data-press]");
    if (!el) return;
    e.preventDefault();
    cancel();
    openMsgSheet(el.dataset.press);
  });
  box.addEventListener("click", (e) => {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
    const z = e.target.closest("[data-zoom]");
    if (z) openLightbox(z.dataset.zoom);
  }, true);
}

function openMsgSheet(id) {
  const p = S.posts.find((x) => x.id === id);
  if (!p) return;
  const mine = p.author === S.me.name;
  const current = S.reactions.find((r) => r.post_id === id && r.author === S.me.name)?.emoji;
  openSheet(`
    <div class="emoji-row" role="group" aria-label="React">
      ${EMOJIS.map((e) => `<button data-act="react" data-id="${id}" data-emoji="${e}" aria-pressed="${current === e}" aria-label="React with ${e}">${e}</button>`).join("")}
    </div>
    <details class="more-emoji"><summary>More emojis</summary>
      <div class="ep-grid">${[...new Set(EMOJI_SETS.flatMap(([, l]) => l))].map((e) => `<button data-act="react" data-id="${id}" data-emoji="${e}" aria-pressed="${current === e}" aria-label="React with ${e}">${e}</button>`).join("")}</div>
    </details>
    <div class="sheet-actions">
      ${p.kind === "note" ? `<button class="btn soft" data-act="copy-msg" data-id="${id}">${ico("copy")}Copy text</button>` : ""}
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
  if (!btn.dataset.sure) {
    btn.dataset.sure = "1";
    btn.innerHTML = `${ico("trash")}Tap again to delete for both of you`;
    return;
  }
  const p = S.posts.find((x) => x.id === btn.dataset.id);
  closeSheet();
  if (!p) return;
  await run(sb.from("posts").delete().eq("id", p.id), "Couldn't delete the message.");
  removeRow("posts", p);
  renderMsgs();
  if (p.kind === "photo") sb.storage.from("photos").remove([p.body]);
  toast("Message deleted");
}

async function sendNote() {
  const ta = $("#composer");
  const body = ta.value.trim();
  if (!body) return;
  ta.value = "";
  S.draft = "";
  autosize(ta);
  $(".send").disabled = true;
  try {
    const row = await run(sb.from("posts").insert({ author: S.me.name, kind: "note", body }).select().single(), "Couldn't send. Check your connection and try again.");
    upsertRow("posts", row);
    renderMsgs(true);
    seek("word", body).then((found) => { if (!found) builtInEggs(body, true); });
  } catch (e) {
    ta.value = body;
    autosize(ta);
    $(".send").disabled = false;
  }
}

async function sendHeart() {
  const row = await run(sb.from("posts").insert({ author: S.me.name, kind: "heart", body: null }).select().single(), "Couldn't send the heart.");
  upsertRow("posts", row);
  renderMsgs(true);
  navigator.vibrate?.(8);
}

async function sendPhotos(files) {
  for (const file of files) {
    S.uploading++;
    renderMsgs(true);
    try {
      const path = await uploadPhoto(file);
      const row = await run(sb.from("posts").insert({ author: S.me.name, kind: "photo", body: path }).select().single());
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
  }
  renderMsgs("keep-top");
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
  S.draft = ta.value;
  autosize(ta);
  $(".send").disabled = !ta.value.trim();
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
const LOVE_WORDS = /(^|[^\p{L}])(i love you|love you|ich liebe dich|hab dich lieb|je t['’]?aime|te amo|ti amo)($|[^\p{L}])/iu;
const word = (w) => new RegExp(`(^|[^\\p{L}])(${w})($|[^\\p{L}])`, "iu");
const EGGS = [
  // using the word of the day, or a word your partner taught you, in your own message
  { mine: true, test: (t) => usedWord(t), run: (t) => { const w = usedWord(t); rain(["✨", "📖"], 16, "up"); toast(w.from ? `📖 ${w.from} taught you “${w.word}” ♥` : `📖 Nice, today's word: “${w.word}”`); } },
  { test: (t) => word("paris").test(t), run: () => {
    rain(["💋", "🗼", "♥"], 21, "up");
    const k = S.moments.find((m) => m.kind === "kiss");
    if (k) toast(`${k.title} · ${fDate(new Date(k.happened_on + "T12:00:00"))} ♥`);
  } },
  { test: (t) => word("munich|münchen|muenchen").test(t), run: () => {
    rain(["🥨", "🍺", "♥"], 18, "up");
    const met = S.moments.find((m) => m.kind === "met");
    if (met) toast(`Where it all began · ${fDate(new Date(met.happened_on + "T12:00:00"))} ♥`);
  } },
  { test: (t) => word("boston").test(t), run: () => {
    rain(["🦆", "🦞", "☕"], 18, "up");
    const ph = tripPhase();
    if (ph.kind === "countdown") toast(`${plural(ph.days, "day")} to go ✈️`);
  } },
  { test: (t) => word("helau|alaaf").test(t), run: () => rain(["🎭", "🎉", "🎊"], 26) },
  { test: (t) => word("prost|cheers|santé|sante|zum wohl").test(t), run: () => rain(["🍻", "🥂"], 14, "up") },
  { test: (t) => /(^|[^\p{L}])m ?& ?m'?s?($|[^\p{L}])/iu.test(t), run: () => rain(["🔴", "🟡", "🟢", "🔵", "🟠", "🟤"], 36) },
  { test: (t) => /miss you|vermisse dich|fehlst mir|tu me manques/iu.test(t), run: () => {
    rain("♥", 14, "up");
    const d = distance(), ph = tripPhase();
    if (d && !d.together) toast(`${d.value.toLocaleString()} ${d.unit} apart${ph.kind === "countdown" ? `, only ${plural(ph.days, "day")} to go` : ""} ♥`);
  } },
  { test: (t) => /good ?night|gute nacht|bonne nuit|schlaf gut|sleep well|nighty/iu.test(t), when: () => { const h = new Date().getHours(); return h >= 20 || h < 4; }, run: () => rain(["🌙", "✨", "⭐"], 18) },
  { test: (t) => /good ?morning|guten morgen|bonjour|morgen ☀|^gm\b/iu.test(t), when: () => { const h = new Date().getHours(); return h >= 4 && h < 12; }, run: () => rain(["☀️", "🌤️", "☕"], 14, "up") },
  { test: (t) => /kiss|kuss|küsschen|bisou|😘|💋/iu.test(t), run: () => rain(["💋", "😘"], 20) },
  { test: (t) => LOVE_WORDS.test(t), run: () => rain("♥", 28) },
];
// The first little thing that fits a message happens; nothing is announced beforehand
function builtInEggs(text, mine = false) {
  const t = String(text || "");
  const egg = EGGS.find((e) => (!e.mine || mine) && e.test(t) && (!e.when || e.when()));
  if (egg) egg.run(t);
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
    S.draft = el.value;
    autosize(el);
    $(".send").disabled = !el.value.trim();
  }
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
  if (e.key === "Escape") closeSheet();
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
  if (document.visibilityState === "visible" && S.started && S.me) {
    loadAll().then(() => { refresh("all"); checkDrop(); greetToday(); seekOnOpen(); }).catch(() => {});
    navigator.clearAppBadge?.().catch(() => {});
    shareLocation(false);
  }
});

boot();
