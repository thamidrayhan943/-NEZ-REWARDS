(() => {
  // ===============================
  // CONFIG
  // ===============================
  const SUPABASE_URL = "https://fzwdvhwdttbnhyjsicvr.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_fityqW08sdQfCHfmvlQUSQ_CQRZlPPW";
  const API_BASE = "https://rewardplay-api.rt954110.workers.dev";

  // 1000 coins = $1 (display)
  const COINS_PER_DOLLAR = 1000;

  // ===============================
  // SAFE SUPABASE CLIENT (NO REDECLARE)
  // ===============================
  const sb =
    window.__sbClient ||
    (window.__sbClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    ));

  // ===============================
  // DOM HELPERS (your ids)
  // ===============================
  const el = (id) => document.getElementById(id);

  const balanceCoinsEl = el("balanceCoins");
  const balanceUsdEl = el("balanceUsd");
  const userEmailEl = el("userEmail");
  const userIdShortEl = el("userIdShort");

  const emailEl = el("email");
  const passwordEl = el("password");

  const btnSignUp = el("btnSignUp");
  const btnSignIn = el("btnSignIn");
  const btnSignOut = el("btnSignOut");

  const btnEarn = el("btnEarn");
  const btnRefresh = el("btnRefresh");
  const btnLoadPosts = el("btnLoadPosts");
  const btnPost = el("btnPost");

  const authMsg = el("authMsg");
  const earnMsg = el("earnMsg");
  const postMsg = el("postMsg");

  const postText = el("postText");
  const postsWrap = el("posts");

  function setMsg(target, text, kind = "info") {
    if (!target) return;
    target.textContent = text || "";
    target.className = `msg ${kind}`;
  }

  function setBalance(balance) {
    const coins = Number(balance || 0);
    if (balanceCoinsEl) balanceCoinsEl.textContent = `${coins.toLocaleString()} coins`;
    if (balanceUsdEl) balanceUsdEl.textContent = `$${(coins / COINS_PER_DOLLAR).toFixed(2)}`;
  }

  function setUser(session) {
    const user = session?.user || null;
    if (!user) {
      if (userEmailEl) userEmailEl.textContent = "Not logged in";
      if (userIdShortEl) userIdShortEl.textContent = "—";
      setBalance(null);
      return;
    }
    if (userEmailEl) userEmailEl.textContent = user.email || "(no email)";
    if (userIdShortEl) userIdShortEl.textContent = (user.id || "").slice(0, 8) + "…";
  }

  function setEnabled(isAuthed) {
    if (btnSignOut) btnSignOut.disabled = !isAuthed;
    if (btnEarn) btnEarn.disabled = !isAuthed;
    if (btnRefresh) btnRefresh.disabled = !isAuthed;
    if (btnLoadPosts) btnLoadPosts.disabled = !isAuthed;
    if (btnPost) btnPost.disabled = !isAuthed;
  }

  async function getToken() {
    const { data } = await sb.auth.getSession();
    return data?.session?.access_token || null;
  }

  // ===============================
  // BACKEND CALLS
  // ===============================
  async function refreshBalance() {
    const token = await getToken();
    if (!token) return;

    setMsg(earnMsg, "Loading balance…");
    const res = await fetch(`${API_BASE}/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMsg(earnMsg, data.error || "Balance failed", "error");
      return;
    }

    setBalance(data.balance);
    setMsg(earnMsg, "Balance updated.", "ok");
  }

  async function earnRewarded() {
    const token = await getToken();
    if (!token) return;

    setMsg(earnMsg, "Playing rewarded ad (demo)…");
    const res = await fetch(`${API_BASE}/earn/rewarded`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMsg(earnMsg, data.error || "Earn failed", "error");
      return;
    }

    setMsg(earnMsg, `✅ Earned +${data.earned} coins`, "ok");
    await refreshBalance();
  }

  // ===============================
  // COMMUNITY (optional – stub UI)
  // ===============================
  async function loadPosts() {
    setMsg(postMsg, "Posts loading is not wired yet (optional).", "info");
  }

  async function createPost() {
    const text = (postText?.value || "").trim();
    if (!text) return setMsg(postMsg, "Write something first.", "error");
    setMsg(postMsg, "Posting is not wired yet (optional).", "info");
  }

  // ===============================
  // AUTH BUTTONS
  // ===============================
  btnSignUp?.addEventListener("click", async () => {
    const email = (emailEl?.value || "").trim();
    const password = passwordEl?.value || "";
    if (!email || !password) return setMsg(authMsg, "Enter email + password.", "error");

    setMsg(authMsg, "Creating account…");
    const { error } = await sb.auth.signUp({ email, password });
    setMsg(authMsg, error ? error.message : "✅ Signed up. Check email if confirmation is enabled.", error ? "error" : "ok");
  });

  btnSignIn?.addEventListener("click", async () => {
    const email = (emailEl?.value || "").trim();
    const password = passwordEl?.value || "";
    if (!email || !password) return setMsg(authMsg, "Enter email + password.", "error");

    setMsg(authMsg, "Signing in…");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setMsg(authMsg, error ? error.message : "✅ Signed in!", error ? "error" : "ok");
  });

  btnSignOut?.addEventListener("click", async () => {
    await sb.auth.signOut();
    setMsg(authMsg, "Signed out.", "info");
  });

  btnRefresh?.addEventListener("click", refreshBalance);
  btnEarn?.addEventListener("click", earnRewarded);

  btnLoadPosts?.addEventListener("click", loadPosts);
  btnPost?.addEventListener("click", createPost);

  // ===============================
  // INITIALIZE STATE
  // ===============================
  sb.auth.getSession().then(({ data }) => {
    const session = data?.session || null;
    setUser(session);
    setEnabled(!!session);
    if (session) refreshBalance();
  });

  sb.auth.onAuthStateChange((_event, session) => {
    setUser(session);
    setEnabled(!!session);
    setMsg(authMsg, "", "info");
    setMsg(earnMsg, "", "info");
    if (session) refreshBalance();
  });
})();
