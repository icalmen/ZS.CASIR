/* ==========================================================================
   Firebase configuration (via REST API — tidak memuat SDK dari gstatic.com)
   ==========================================================================
   GANTI nilai apiKey di bawah dengan milik project Firebase kamu sendiri.
   Cara mendapatkannya:
   1. Buka https://console.firebase.google.com → buat project baru (gratis)
   2. Di dashboard project → klik ikon web "</>" untuk daftarkan aplikasi web
   3. Firebase akan menampilkan objek firebaseConfig — salin nilai apiKey-nya
      ke sini
   4. Di menu Build → Authentication → Sign-in method, aktifkan "Email/Password"
   Tanpa langkah ini, tombol Daftar/Masuk di aplikasi tidak akan berfungsi.

   CATATAN: Versi ini memakai REST API Firebase (identitytoolkit.googleapis.com)
   langsung lewat fetch(), bukan SDK JavaScript dari gstatic.com. Ini dipilih
   karena di sebagian jaringan/perangkat, domain gstatic.com/firebasejs
   diblokir sehingga SDK gagal dimuat. Konsekuensinya: fitur "Masuk dengan
   Google" tidak tersedia di versi ini (fitur itu butuh SDK/skrip tambahan
   dari Google) — Daftar/Masuk dengan email & password tetap berfungsi penuh.
   ========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyDKhiKSei86v8v-IsnMVJoxCGeqoij0Otw",
};

const firebaseReady = !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('GANTI_DENGAN_');
const firebaseCheckDone = true; // tidak perlu menunggu skrip eksternal lagi

const IDENTITY_TOOLKIT_BASE = 'https://identitytoolkit.googleapis.com/v1';

function identityToolkitErrorMessage(code) {
  const map = {
    EMAIL_EXISTS: 'Email ini sudah terdaftar. Coba menu Masuk.',
    OPERATION_NOT_ALLOWED: 'Login Email/Password belum diaktifkan di Firebase Console kamu (Authentication → Sign-in method).',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.',
    EMAIL_NOT_FOUND: 'Email belum terdaftar. Coba menu Daftar.',
    INVALID_PASSWORD: 'Password salah.',
    INVALID_LOGIN_CREDENTIALS: 'Email atau password salah.',
    USER_DISABLED: 'Akun ini dinonaktifkan.',
    WEAK_PASSWORD: 'Password minimal 6 karakter.',
    INVALID_EMAIL: 'Format email tidak valid.',
  };
  const key = (code || '').split(':')[0].trim();
  return map[key] || ('Gagal: ' + code);
}

async function identityToolkitRequest(endpoint, body) {
  const res = await fetch(`${IDENTITY_TOOLKIT_BASE}/accounts:${endpoint}?key=${firebaseConfig.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const code = data && data.error ? data.error.message : 'UNKNOWN_ERROR';
    throw new Error(identityToolkitErrorMessage(code));
  }
  return data;
}

async function firebaseSignUp(email, password, displayName) {
  const data = await identityToolkitRequest('signUp', { email, password, returnSecureToken: true });
  await identityToolkitRequest('update', { idToken: data.idToken, displayName, returnSecureToken: false });
  return { email: data.email, localId: data.localId, idToken: data.idToken, displayName };
}

async function firebaseSignIn(email, password) {
  const data = await identityToolkitRequest('signInWithPassword', { email, password, returnSecureToken: true });
  return { email: data.email, localId: data.localId, idToken: data.idToken, displayName: data.displayName || '' };
}

const AUTH_SESSION_KEY = 'kasirkue_authuser';

function saveAuthSession(user) { localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user)); }
function getAuthSession() {
  try { return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY)); } catch (e) { return null; }
}
function clearAuthSession() { localStorage.removeItem(AUTH_SESSION_KEY); }
