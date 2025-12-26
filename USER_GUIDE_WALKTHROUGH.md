
# Panduan Jalan Cerita (Walkthrough) Aplikasi SteriTrack

Jangan khawatir, sistem ini memang terdengar rumit karena banyak istilah medis, tapi logikanya sebenarnya sangat sederhana mirip **Siklus Laundry Hotel** atau **Sewa Barang**.

## 1. Analogi Sederhana (Konsep Restoran)
Bayangkan Rumah Sakit ini sebuah Restoran Besar:
*   **CSSD** adalah **Dapur Cuci Piring**.
*   **Ruang Rawat (Unit)** adalah **Meja Makan Pelanggan**.
*   **Instrumen (Gunting/Pinset)** adalah **Sendok & Garpu**.

**Aturan Mainnya:**
Sendok tidak boleh dicuci sembarangan di meja makan. Sendok kotor harus dibawa ke dapur, dicuci dengan mesin khusus (steril), dibungkus plastik, baru boleh dikasih lagi ke pelanggan. **SteriTrack** adalah aplikasi untuk mencatat semua perpindahan itu agar tidak ada sendok yang hilang.

---

## 2. Langkah Demi Langkah (Praktek Langsung)

Berikut adalah urutan cara mencoba aplikasi ini dari awal sampai akhir (Satu Putaran Penuh):

### A. Tahap Awal: Distribusi (Mengirim Barang Bersih)
*Posisi: Barang bersih menumpuk di Rak Dapur (CSSD). Meja Makan (Unit) kosong.*

1.  **Login sebagai Staf CSSD**.
2.  Masuk ke menu **"Distribusi Steril"** (Ikon Truk).
3.  Aplikasi minta "Scan QR Tujuan". Anggap saja Anda scan QR **"IGD"** (Unit Gawat Darurat).
4.  Pilih barang yang mau dikirim: Misal **10 Gunting**.
5.  Klik **"Kirim / Buat Transaksi"**.
    *   *Hasil*: Stok di Dapur berkurang 10. Stok di IGD bertambah 10.

### B. Tahap Pemakaian: Perawat Pakai Barang
*Posisi: Barang sudah ada di Meja Makan (IGD). Perawat memakainya untuk pasien.*

1.  **Login sebagai Nurse (Perawat)**.
2.  Perawat pura-puranya baru selesai operasi. Ada **3 Gunting** yang berdarah/kotor.
3.  Perawat Scan QR Ruangannya sendiri (IGD).
4.  Pilih menu **"Return / Lapor Kotor"**.
5.  Input: **3 Gunting**.
6.  Klik Simpan.
    *   *Hasil*: Di sistem tercatat "IGD punya 7 Gunting Bersih, dan 3 Gunting Kotor menunggu diambil".

### C. Tahap Penjemputan: Ambil Piring Kotor (Collection)
*Posisi: Staf Dapur (CSSD) keliling bawa troli.*

1.  **Login sebagai Staf CSSD**.
2.  Pilih menu **"Ambil Kotor"** (Ikon Sampah/Troli).
3.  Scan QR **"IGD"**.
4.  Aplikasi otomatis memberitahu: *"Eh, di IGD ada 3 Gunting kotor lho, ambil sekalian ya?"*
5.  Staf klik **"Terima Barang"**.
    *   *Hasil*: 3 Gunting Kotor itu hilang dari data IGD, dan berpindah ke status "Barang Kotor di CSSD".

### D. Tahap Cuci & Masak (Sterilisasi)
*Posisi: Barang kotor sudah sampai kembali di Dapur (CSSD).*

**Langkah 1: Cuci (Dekontaminasi)**
1.  Masuk menu **"Sterilisasi Central"** (Ikon Api).
2.  Pilih Tab **"Dekontaminasi"** (Gambar Air).
3.  Akan muncul daftar barang kotor (3 Gunting tadi).
4.  Centang semua, klik **"Proses Cuci"**.
    *   *Logika*: Barang dicuci sabun, dikeringkan. Sekarang statusnya "Bersih tapi belum Steril" (disebut tahap Packing).

**Langkah 2: Masak (Sterilisasi Autoclave)**
1.  Pindah ke Tab **"Cloud Sterilisasi"** (Gambar Api).
2.  Akan muncul daftar barang bersih (3 Gunting tadi) yang siap "dimasak".
3.  Centang semua. Pilih Mesin (Autoclave 1).
4.  Klik **"Mulai Autoclave"**.
5.  Tunggu... (Ceritanya mesin berjalan 1 jam dengan suhu 134°C).
6.  Klik Selesai.
    *   *Hasil Akhir*: 3 Gunting tadi statusnya kembali menjadi **"Stok Steril CSSD"**.
    *   *Loop*: Sekarang Gunting ini siap didistribusikan lagi (Kembali ke Tahap A).

---

## 3. Fitur Tambahan (Yang Bikin Keren)
*   **Tracking**: Kalau Gunting hilang, Admin bisa cek "Terakhir ada di IGD, diserahkan ke Dapur jam 10.00".
*   **Packing Station**: Di tahap masak (D), Staf bisa scan satu-satu alat untuk memastikan set lengkap (seperti puzzle).
*   **Scan QR**: Semua proses "Pilih Menu" di atas bisa digantikan dengan **Tembak QR Code** di dinding/barang agar cepat.

Semoga analogi Restoran ini membantu! Intinya hanya: **Kirim -> Pakai -> Ambil -> Cuci -> Masak Ulang.**
