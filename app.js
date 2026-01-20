/***********************
  CONFIG - YOU MUST EDIT
************************/
// Supabase (public – safe in browser)
const SUPABASE_URL = "https://fzwdvhwdttbnhyjsicvr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fityqW08sdQfCHfmvlQUSQ_CQRZlPPW";

// Cloudflare Worker backend
const API_BASE = "https://rewardplay-api.rt954110.workers.dev";


const COINS_PER_DOLLAR = 1000;

/***********************
  DOM helpers
************************/
const $ = (id) => document.getElementById(id);

const elBalanceCoins = $("balanceCoins");
const elBalanceUsd = $("balanceUsd");
const elUserEmail = $("userEmail");
const elUserIdShort = $("userIdShort");

const authMsg = $("authMsg");
const earnMsg = $("earnMsg");
const postMsg = $("postMsg");

function setMsg(el, text, type) {
  el.classList.remove("ok", "bad");
  el.textContent = text || "";
  if (type === "ok") el.classList.add("ok");
  if (type === "bad") el.classList.add("bad");
}

function formatUsdFromCoins(coins) {
  return `$${(coins / COINS_PER_DOLLAR).toFixed(2)}`;
}

/***********************
  Supabase client
************************/
if (!SUPABASE_URL.startsWith("http") || SUPABASE_ANON_KEY.includes("PASTE_")) {
  setMsg(authMsg, "⚠️ Edit app.js and paste your Supabase URL + Anon key.", "bad");
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/***********************
  Auth
************************/
async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

async function getToken() {
  const session = await getSession();
  return session?.access_token || null;
}

async function refreshUserUI() {
  const session = await getSession();
  const user = session?.user || null;

  const loggedIn = !!user;
  $("btnSignOut").disabled = !loggedIn;
  $("btnEarn").disabled = !loggedIn;
  $("btnRefresh").disabled = !loggedIn;
  $("btnPost").disabled = !loggedIn;
  $("btnLoadPosts").disabled = !loggedIn;

  if (!user) {
    elUserEmail.textContent = "Not logged in";
    elUserIdShort.textContent = "—";
    elBalanceCoins.textContent = "—";
    elBalanceUsd.textContent = "—";
    return;
  }

  elUserEmail.textContent = user.email || "Logged in";
  elUserIdShort.textContent = `${user.id.slice(0, 8)}…`;

  // load balance immediately
  await refreshBalance();
}

/***********************
  Backend API calls (Worker)
************************/
async function apiFetch(path, options = {}) {
  const token = await getToken();
  if (!token) throw new Error("Not logged in");

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "content-type": "application/json",
      "authorization": `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function refreshBalance() {
  try {
    if (API_BASE.includes("PASTE_")) {
      setMsg(earnMsg, "⚠️ Paste your Worker URL into app.js (API_BASE).", "bad");
      return;
    }
    const data = await apiFetch("/balance", { method: "GET" });
    const coins = Number(data.balance || 0);
    elBalanceCoins.textContent = `${coins.toLocaleString()} coins`;
    elBalanceUsd.textContent = formatUsdFromCoins(coins);
  } catch (e) {
    setMsg(earnMsg, `Balance error: ${e.message}`, "bad");
  }
}

async function earnRewarded() {
  const data = await apiFetch("/earn/rewarded", { method: "POST" });
  return Number(data.earned || 0);
}

/***********************
  Community posts (Supabase direct)
  NOTE: Coins should not be direct. Posts are okay with RLS.
************************/
async function createPost(text) {
  const session = await getSession();
  if (!session?.user) throw new Error("Not logged in");

  const { error } = await supabase.from("posts").insert([
    { user_id: session.user.id, text }
  ]);
  if (error) throw new Error(error.message);
}

async function loadPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select("id, text, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) throw new Error(error.message);
  return data || [];
}

/***********************
  Wire up buttons
************************/
$("btnSignUp").addEventListener("click", async () => {
  try {
    const email = $("email").value.trim();
    const password = $("password").value.trim();
    if (!email || !password) return setMsg(authMsg, "Enter email + password.", "bad");

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    setMsg(authMsg, "✅ Signed up. Check your email if confirmation is enabled.", "ok");
    await refreshUserUI();
  } catch (e) {
    setMsg(authMsg, `Sign up error: ${e.message}`, "bad");
  }
});

$("btnSignIn").addEventListener("click", async () => {
  try {
    const email = $("email").value.trim();
    const password = $("password").value.trim();
    if (!email || !password) return setMsg(authMsg, "Enter email + password.", "bad");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    setMsg(authMsg, "✅ Signed in.", "ok");
    await refreshUserUI();
  } catch (e) {
    setMsg(authMsg, `Sign in error: ${e.message}`, "bad");
  }
});

$("btnSignOut").addEventListener("click", async () => {
  await supabase.auth.signOut();
  setMsg(authMsg, "Signed out.", "ok");
  await refreshUserUI();
});

$("btnEarn").addEventListener("click", async () => {
  try {
    setMsg(earnMsg, "▶ Playing ad (demo)…", "");
    // Simulate delay so it feels like an ad
    await new Promise((r) => setTimeout(r, 1200));

    const earned = await earnRewarded();
    setMsg(earnMsg, `✨ Earned +${earned} coins (server).`, "ok");
    await refreshBalance();
  } catch (e) {
    setMsg(earnMsg, `Earn error: ${e.message}`, "bad");
  }
});

$("btnRefresh").addEventListener("click", async () => {
  await refreshBalance();
});

$("btnPost").addEventListener("click", async () => {
  try {
    const text = $("postText").value.trim();
    if (!text) return;

    await createPost(text);
    $("postText").value = "";
    setMsg(postMsg, "✅ Posted!", "ok");
    await renderPosts();
  } catch (e) {
    setMsg(postMsg, `Post error: ${e.message}`, "bad");
  }
});

$("btnLoadPosts").addEventListener("click", async () => {
  await renderPosts();
});

async function renderPosts() {
  try {
    const list = await loadPosts();
    const container = $("posts");
    container.innerHTML = "";

    if (list.length === 0) {
      container.innerHTML = `<div class="muted">No posts yet.</div>`;
      return;
    }

    for (const p of list) {
      const div = document.createElement("div");
      div.className = "post";

      const dt = new Date(p.created_at);
      div.innerHTML = `
        <div class="meta">
          <span>Post #${p.id} • ${p.user_id.slice(0, 8)}…</span>
          <span>${dt.toLocaleString()}</span>
        </div>
        <div class="text"></div>
      `;
      div.querySelector(".text").textContent = p.text;
      container.appendChild(div);
    }
  } catch (e) {
    setMsg(postMsg, `Load posts error: ${e.message}`, "bad");
  }
}

/***********************
  Init
************************/
supabase.auth.onAuthStateChange(async () => {
  await refreshUserUI();
});

refreshUserUI();

