/* ==========================================================================
   Firebase configuration
   ==========================================================================
   GANTI nilai-nilai di bawah ini dengan milik project Firebase kamu sendiri.
   Cara mendapatkannya:
   1. Buka https://console.firebase.google.com → buat project baru (gratis)
   2. Di dashboard project → klik ikon web "</>" untuk daftarkan aplikasi web
   3. Firebase akan menampilkan objek firebaseConfig persis seperti di bawah
      ini — salin nilainya ke sini
   4. Di menu Build → Authentication → Sign-in method, aktifkan:
      - Email/Password
      - Google
   Tanpa langkah ini, tombol Daftar/Masuk di aplikasi tidak akan berfungsi.
   ========================================================================== */

const firebaseConfig = {
  apiKey: "GANTI_DENGAN_API_KEY_KAMU",
  authDomain: "GANTI_DENGAN_PROJECT_ID.firebaseapp.com",
  projectId: "GANTI_DENGAN_PROJECT_ID",
  storageBucket: "GANTI_DENGAN_PROJECT_ID.appspot.com",
  messagingSenderId: "GANTI_DENGAN_SENDER_ID",
  appId: "GANTI_DENGAN_APP_ID",
};

let firebaseReady = false;
let firebaseCheckDone = false;

function tryInitFirebase() {
  if (firebaseReady) return true;
  try {
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== 'GANTI_DENGAN_API_KEY_KAMU') {
      if (!firebase.apps || firebase.apps.length === 0) {
        firebase.initializeApp(firebaseConfig);
      }
      firebaseReady = true;
    }
  } catch (e) {
    console.error('Firebase init error', e);
    firebaseReady = false;
  }
  return firebaseReady;
}

function markFirebaseCheckDone() {
  if (firebaseCheckDone) return;
  firebaseCheckDone = true;
  window.dispatchEvent(new Event('firebase-check-done'));
}

// Coba langsung dulu.
tryInitFirebase();

// Kalau SDK-nya belum siap saat ini (jaringan lambat atau resource
// eksternal butuh waktu lebih lama), terus coba ulang sampai 25 detik
// sebelum benar-benar menyerah.
let retries = 0;
const MAX_RETRIES = 165; // ~25 detik (150ms x 165)
const retryTimer = setInterval(() => {
  retries++;
  if (tryInitFirebase() || retries >= MAX_RETRIES) {
    clearInterval(retryTimer);
    markFirebaseCheckDone();
  }
}, 150);

// Jaring pengaman terakhir: begitu seluruh halaman selesai dimuat.
window.addEventListener('load', () => {
  tryInitFirebase();
  if (retries >= MAX_RETRIES || firebaseReady) markFirebaseCheckDone();
});
