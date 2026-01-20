// ===============================
// CONFIG
// ===============================

// Supabase (PUBLIC — safe in browser)
const SUPABASE_URL = "https://fzwdvhwdttbnhyjsicvr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fityqW08sdQfCHfmvlQUSQ_CQRZlPPW";

// Cloudflare Worker backend
const API_BASE = "https://rewardplay-api.rt954110.workers.dev";

// ===============================
// INIT SUPABASE (ONLY ONCE)
// ===============================

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ===============================
// AUTH HELPERS
// ===============================

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

// ===============================
// UI HELPERS
// ===============================

function $(id) {
  return document.getElementById(id);
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

// ===============================
// AUTH ACTIONS
// ===============================

async function signUp(email, password) {
  const { error } = await supabase.auth.signUp({ email, password });
  alert(error ? error.message : "Check your email to confirm.");
}

async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  alert(error ? error.message : "Signed in!");
}

async function signOut() {
  await supabase.auth.signOut();
  location.reload();
}

// ===============================
// BACKEND API CALLS
// ===============================

async function refreshBalance() {
  const token = await getAccessToken();
  if (!token) {
    setText("balance", "Not logged in");
    return;
  }

  const res = await fetch(`${API_BASE}/balance`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  setText("balance", data.balance ?? "Error");
}

async function watchAd() {
  const token = await getAccessToken();
  if (!token) {
    alert("Please sign in first");
    return;
  }

  const res = await fetch(`${API_BASE}/earn/rewarded`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (data.error) {
    alert(data.error);
  } else {
    alert(`You earned +${data.earned} coins`);
    refreshBalance();
  }
}

// ===============================
// AUTH STATE LISTENER
// ===============================

supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    setText("user", session.user.email);
    refreshBalance();
  } else {
    setText("user", "Not signed in");
    setText("balance", "-");
  }
});

// ===============================
// EXPOSE FUNCTIONS TO HTML
// ===============================

window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.refreshBalance = refreshBalance;
window.watchAd = watchAd;
