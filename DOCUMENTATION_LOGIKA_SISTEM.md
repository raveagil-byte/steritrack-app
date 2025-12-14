# Dokumentasi Logika Sistem & Keputusan Desain
**Dibuat pada:** 08 Desember 2025

## 1. Mekanisme Perhitungan Stok Set (Set Calculation Logic)
Sistem menggunakan logika **Multiplikasi & Dekomposisi** untuk menangani transaksi Set Instrumen.

### Cara Kerja
Ketika pengguna melakukan transaksi pada sebuah Set (misal: "Dressing Set"), sistem tidak memindahkan set tersebut sebagai satu kesatuan "black box". Sebaliknya, sistem "membuka" resep set tersebut dan memproses setiap item di dalamnya.

**Rumus:**
> `Total Item` = `Jumlah Set yang Ditransaksikan` x `Jumlah Item per Set`

### Contoh Simulasi
**Skenario:** Distribusi 5 buah "Dressing Set".
**Definisi Set (Resep):**
- 2x Gunting Bedah
- 1x Pinset Anatomis

**Proses Backend:**
1.  **Input:** User memilih "Dressing Set" @ 5 Pcs.
2.  **Kalkulasi Gunting:** `5 Set` x `2 item` = **10 Pcs** dipindahkan.
3.  **Kalkulasi Pinset:** `5 Set` x `1 item` = **5 Pcs** dipindahkan.
4.  **Validasi Stok:** Sistem memastikan stok Gunting (min. 10) dan Pinset (min. 5) tersedia di CSSD sebelum mengizinkan transaksi.

**Keunggulan:**
*   Akurasi inventaris per item tetap terjaga.
*   Memungkinkan pelacakan item yang hilang/rusak sebagian (misal: kembali 1 set tapi Guntingnya hilang 1).

---

## 2. Strategi QR Code (Unik vs SKU)
Sistem ini menggunakan pendekatan **SKU-Based Tracking (Inventory Tracking)**, bukan Individual Serial Number.

### Keputusan Desain
*   **SKU Tracking:** Satu jenis barang memiliki satu kode QR yang sama.
    *   *Contoh:* Semua "Gunting Bedah Lurus" menggunakan kode QR yang sama (misal: `INST-GB-001`).
*   **Kuantitas:** Identifikasi unit dilakukan saat pemindaian dengan memasukkan jumlah.

### Alasan Penggunaan
1.  **Efisiensi Operasional:** Petugas tidak perlu memindai 50 kali untuk memproses 50 instrumen yang sama. Cukup scan 1 kali dan input angka "50".
2.  **Kendala Fisik:** Menempelkan stiker QR unik pada instrumen bedah kecil (seperti klem arteri atau pinset) sangat sulit karena faktor sterilisasi suhu tinggi, pencucian, dan ukuran alat.
3.  **Wadah Set:** Untuk Set, QR Code ditempelkan pada **Wadah/Container** set tersebut.

### Kapan QR Unik (Serialisasi) Diperlukan?
QR Unik hanya disarankan untuk aset bernilai tinggi (High Value Assets) seperti:
*   Endoscope
*   Bor Tulang (Power Tools)
*   Lensa Laparoskopi
*   *Untuk sistem Simple CSSD saat ini, fitur ini belum diaktifkan demi kemudahan penggunaan.*

---

## 3. Fitur Sterilisasi Otomatis (Sterilize All)
Fitur `Sterilize All` ditambahkan untuk mempercepat alur kerja di CSSD untuk instrumen standar.

### Alur Proses (Workflow)
Ketika tombol **"Sterilkan Semua"** ditekan:
1.  **Identifikasi:** Sistem mencari semua item dengan status `Dirty` (Kotor) di CSSD.
2.  **Pencucian (Washing):** Status diubah dari `Dirty` -> `Packing` (Bersih/Siap Packing).
3.  **Sterilisasi (Sterilizing):** Status diubah dari `Packing` -> `Sterile` (Siap Distrubusi).
4.  **Logging:** Semua aktivitas tercatat atas nama pengguna yang sedang login.

*Catatan: Pada implementasi dunia nyata, proses ini memakan waktu (Pencucian ~1 jam, Autoclave ~1-2 jam). Fitur ini mempercepat perubahan status di sistem setelah proses fisik selesai.*
 X. instrumen set pengembalian kotor tracking