(() => {
  // ===============================
  // CONFIG
  // ===============================
  const SUPABASE_URL = "https://fzwdvhwdttbnhyjsicvr.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_fityqW08sdQfCHfmvlQUSQ_CQRZlPPW";
  const API_BASE = "https://rewardplay-api.rt954110.workers.dev";

  // ===============================
  // INIT SUPABASE (no global const)
  // Store client on window so re-loading won't crash
  // ===============================
  const sb =
    window.__sbClient ||
    (window.__sbClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    ));

  // ===============================
  // HELPERS
  // ===============================
  function $(id) {
    return document.getElementById(id);
  }
  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = String(text);
  }

  async function getAccessToken() {
    const { data } = await sb.auth.getSession();
    return data?.session?.access_token || null;
  }

  // ===============================
  // AUTH
  // ===============================
  async function signUp(email, password) {
    const { error } = await sb.auth.signUp({ email, password });
    alert(error ? error.message : "Check your email to confirm (if enabled).");
  }

  async function signIn(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    alert(error ? error.message : "Signed in!");
  }

  async function signOut() {
    await sb.auth.signOut();
    location.reload();
  }

  // ===============================
  // BACKEND API
  // ===============================
  async function refreshBalance() {
    const token = await getAccessToken();
    if (!token) {
      setText("balance", "Not logged in");
      return;
    }

    const res = await fetch(`${API_BASE}/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) {
      setText("balance", "Error");
      console.error("Balance error:", data);
      return;
    }

    setText("balance", data.balance ?? 0);
  }

  async function watchAd() {
    const token = await getAccessToken();
    if (!token) return alert("Please sign in first.");

    const res = await fetch(`${API_BASE}/earn/rewarded`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || "Earn failed");

    alert(`You earned +${data.earned} coins`);
    refreshBalance();
  }

  // ===============================
  // AUTH STATE
  // ===============================
  sb.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      setText("user", session.user.email);
      refreshBalance();
    } else {
      setText("user", "Not logged in");
      setText("balance", "—");
    }
  });

  // ===============================
  // EXPOSE FOR BUTTONS
  // ===============================
  window.signUp = (email, password) => signUp(email, password);
  window.signIn = (email, password) => signIn(email, password);
  window.signOut = () => signOut();
  window.refreshBalance = () => refreshBalance();
  window.watchAd = () => watchAd();
})();
