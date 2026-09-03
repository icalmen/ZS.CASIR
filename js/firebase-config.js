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
try {
  if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== 'GANTI_DENGAN_API_KEY_KAMU') {
    firebase.initializeApp(firebaseConfig);
    firebaseReady = true;
  }
} catch (e) {
  console.error('Firebase init error', e);
  firebaseReady = false;
}
