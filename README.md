# Kasir Kue

Aplikasi kasir sederhana untuk toko kue & minuman. Berjalan langsung di browser
sebagai PWA (Progressive Web App), lalu bisa dibungkus jadi file APK Android
lewat PWABuilder — tanpa perlu coding.

Data (produk, transaksi, shift) disimpan **hanya di HP tempat aplikasi ini
dibuka**, tidak ada server. Karena itu, gunakan hanya di **satu HP/tablet**
untuk semua shift, dan rutin unduh cadangan lewat menu Pengaturan.

## Setup Firebase (wajib sebelum login bisa dipakai)

Aplikasi ini pakai Firebase Authentication supaya tombol **Daftar**, **Masuk**, dan **Masuk dengan Google** benar-benar berfungsi. Tanpa langkah ini, tombol-tombol tersebut akan menampilkan pesan "Firebase belum dikonfigurasi".

1. Buka [console.firebase.google.com](https://console.firebase.google.com), masuk dengan akun Google kamu, klik **Add project** (gratis, tidak perlu kartu kredit untuk paket Spark).
2. Di dashboard project, klik ikon web **`</>`** untuk mendaftarkan aplikasi web. Beri nama bebas, klik **Register app**.
3. Firebase akan menampilkan kode `firebaseConfig` — salin semua nilainya.
4. Buka file `js/firebase-config.js` di folder ini, ganti nilai-nilai `GANTI_DENGAN_...` dengan nilai yang kamu salin tadi.
5. Di menu kiri Firebase Console: **Build → Authentication → Get started**. Di tab **Sign-in method**, aktifkan provider **Email/Password** dan **Google**.
6. Masih di Authentication, buka tab **Settings → Authorized domains**, tambahkan domain GitHub Pages kamu (contoh: `namakamu.github.io`) supaya Google Sign-In diizinkan jalan di sana.
7. Upload ulang file `js/firebase-config.js` yang sudah diisi ke GitHub (timpa file lama), lalu coba lagi.

Setelah ini, akun Firebase hanya berfungsi sebagai **gerbang masuk aplikasi** — data toko (produk, transaksi, laporan) tetap tersimpan lokal di HP tempat aplikasi dibuka, bukan disinkronkan ke cloud. Kalau nanti butuh data tersinkron ke banyak HP, itu perlu penambahan Firestore secara terpisah.

## Alur & navigasi

Saat pertama kali dibuka, aplikasi menampilkan layar **Kasir Kue** dengan tombol **Buat Akun** / **Masuk** (pakai email+password atau Google, lewat Firebase). Setelah berhasil masuk, kalau ini pemakaian pertama, akan diminta mengisi **nama toko**, lalu masuk ke layar **pilih/isi nama kasir + kas awal** sebelum mulai berjualan — mirip alur login aplikasi kasir pada umumnya.

Navigasi utama memakai **menu hamburger (☰)** di kiri atas, bukan tab di bawah:
- **Transaksi Penjualan** — layar kasir utama
- **Manajemen** — Barang atau jasa, Kategori barang, Manajemen stok (opname), Pelanggan dan Supplier, Hutang dan Piutang
- **Pembelian dari Supplier** — catat pembelian bahan/produk dari supplier, stok otomatis bertambah
- **Keuangan** — catat kas masuk/keluar di luar penjualan (modal, bayar biaya, dll)
- **Laporan** — Performa Penjualan, Laporan Laba Rugi, Laporan Penjualan (Transaksi, Penjualan Barang, Penjualan Kategori, Metode Pembayaran), Riwayat Shift
- **Absensi** — catat jam masuk/pulang staf
- **Shift** — status shift aktif & tutup shift
- **Pengaturan** — info toko, struk, metode pembayaran, daftar kasir, Manajemen Staff, cadangan data

Saat berada di halaman turunan, tombol di kiri atas berubah jadi panah kembali (←). Menutup shift lewat menu akan membawa kembali ke layar pilih kasir (bukan keluar akun); "Keluar akun" di bagian bawah drawer benar-benar keluar dari sesi Firebase.

## Yang belum dibuat

Beberapa modul di aplikasi referensi sengaja tidak dibuat karena butuh infrastruktur berizin/berbayar yang tidak bisa disediakan lewat kode saja:
- **PPOB** (bayar pulsa/listrik/dll) dan **E-Wallet** — perlu kerja sama resmi dengan penyedia pembayaran
- **Diskon, Pajak, dan Biaya** serta **Marketing** (promosi otomatis) — bisa ditambahkan belakangan kalau dibutuhkan, sengaja disederhanakan dulu

## Fitur

**Kasir super cepat**
- Cari produk dengan nama/SKU, kategori bisa dibuat sendiri
- Tap produk langsung masuk keranjang; produk dengan varian (mis. ukuran cake) menampilkan pilihan varian dulu
- Diskon per transaksi, tahan transaksi (hold) untuk dilanjutkan nanti
- Bayar Tunai/QRIS/Transfer/Debit/E-wallet (metode bisa diaktif/nonaktifkan), tombol nominal cepat untuk tunai, kembalian otomatis
- Nomor invoice otomatis (format INV-YYYYMMDD-XXXX), cetak/bagikan struk
- Batalkan (void) transaksi dengan alasan — stok otomatis dikembalikan

**Produk**
- Kelola kategori sendiri (tambah/hapus)
- Produk biasa (harga + stok + HPP) atau produk dengan varian (ukuran/rasa dengan harga & stok masing-masing)
- Peringatan stok menipis, tandai produk "selalu tersedia" untuk item seperti minuman

**Laporan**
- Dashboard: omzet, jumlah transaksi, produk terjual, laba kotor (otomatis dari HPP)
- Filter hari ini/7 hari/30 hari/semua, ekspor ke CSV
- Produk terlaris, penjualan per kategori, per metode bayar, per kasir
- Riwayat transaksi lengkap dengan status (selesai/dibatalkan)

**Shift kasir**
- Buka shift (kas awal) & tutup shift (hitung selisih kas otomatis dari penjualan tunai)
- Daftar nama kasir bisa disimpan di Pengaturan supaya tinggal pilih saat buka shift

**Pengaturan**
- Info toko (nama, alamat, telepon) untuk kop struk
- Format nomor invoice & catatan kaki struk
- Aktif/nonaktifkan metode pembayaran
- Kelola daftar nama kasir
- Cadangkan & pulihkan semua data (unduh/unggah file .json)

Bisa dipakai offline setelah pertama kali dibuka (PWA).

**Belum ada (rencana pengembangan lanjutan):** modul Produksi (catat batch produksi harian), Pesanan/pre-order custom cake dengan DP, dan modul Keuangan (kas masuk/keluar di luar penjualan). Tinggal minta kalau sudah siap ditambahkan.

## Langkah 1 — Coba dulu di browser laptop/HP

Buka `index.html` langsung di browser untuk melihat tampilannya. (Beberapa
browser membatasi fitur saat dibuka langsung dari file; cara paling akurat
adalah lewat hosting di langkah 2.)

## Langkah 2 — Host secara online (gratis, perlu untuk PWABuilder)

Pakai **GitHub Pages** (paling mudah untuk pemula):

1. Buat akun di [github.com](https://github.com) kalau belum punya.
2. Buat repository baru, misalnya `kasir-kue`, pilih **Public**.
3. Upload semua isi folder ini (index.html, manifest.json, sw.js, folder css/, js/, icons/) ke repository tersebut lewat tombol "Add file → Upload files".
4. Masuk ke tab **Settings → Pages** di repository, pada bagian "Branch" pilih `main` dan folder `/ (root)`, lalu simpan.
5. Tunggu 1–2 menit. Link aplikasimu akan muncul, biasanya berbentuk:
   `https://namakamu.github.io/kasir-kue/`

Alternatif lain yang juga gratis dan drag-and-drop: [Netlify Drop](https://app.netlify.com/drop) — tinggal seret folder ini ke halaman tersebut.

## Langkah 3 — Ubah jadi APK dengan PWABuilder

1. Buka [pwabuilder.com](https://www.pwabuilder.com)
2. Masukkan link aplikasi dari Langkah 2, klik **Start**
3. Tunggu PWABuilder menganalisis (pastikan skor manifest & service worker hijau/oke)
4. Klik **Package for Stores → Android**
5. Unduh file APK yang dihasilkan
6. Pindahkan APK ke HP Android (lewat kabel USB, Google Drive, atau WhatsApp ke diri sendiri), lalu install (aktifkan "Izinkan dari sumber tidak dikenal" jika diminta)

## Cara pakai sehari-hari di toko

1. Buka aplikasi → tab **Shift** → **Buka shift** → isi nama kasir dan hitung kas awal di laci
2. Tab **Kasir** → tap produk untuk masuk ke keranjang → **Lihat keranjang** → **Lanjut bayar** → pilih metode bayar → **Selesaikan transaksi**
3. Di akhir hari/shift: tab **Shift** → **Tutup shift** → hitung kas akhir aktual di laci → sistem otomatis hitung selisihnya
4. Cek performa penjualan di tab **Laporan**
5. Sesekali buka ⚙ **Pengaturan → Unduh cadangan** supaya data tidak hilang

## Struktur file

```
index.html          Halaman utama (semua layar dalam satu file)
css/style.css        Semua styling
js/storage.js         Lapisan data (localStorage)
js/ui.js               Fungsi render tampilan
js/app.js              Logika aplikasi & event
manifest.json         Konfigurasi PWA (nama, ikon, warna)
sw.js                  Service worker (mode offline)
icons/                Ikon aplikasi
```

## Menambah fitur nanti

Karena semua kode ada dalam file JavaScript biasa yang mudah dibaca, kamu bisa
minta bantuan lagi kapan saja untuk menambah fitur seperti: multi-kasir dengan
PIN, cetak ke printer thermal Bluetooth, sinkronisasi banyak device, member
pelanggan, atau promo otomatis.
