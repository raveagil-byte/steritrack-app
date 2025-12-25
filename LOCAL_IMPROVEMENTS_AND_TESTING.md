# Laporan Perbaikan Sistem Lokal & Panduan Pengujian
**Sistem:** SIAPPMEN (SteriTrack)  
**Tanggal:** 25 Desember 2025  
**Lingkungan:** Lokal (Laragon)

## 1. Ringkasan Perbaikan (Local Improvements)

Kami telah melakukan peningkatan besar pada struktur database dan logika backend untuk mendukung skalabilitas, audit trail yang lebih baik, dan performa yang optimal.

### A. Perubahan Struktur Database (Schema)
Kami melakukan migrasi ke versi 2 (`migration_v2.sql`) yang mencakup:

1.  **Manajemen Role & User yang Lebih Baik:**
    *   **Baru:** Tabel `roles` dan `user_roles`. Sekarang satu user bisa memiliki banyak role, dan struktur role lebih baku.
2.  **Optimasi Stok (Inventory Snapshots):**
    *   **Baru:** Tabel `inventory_snapshots`. Ini adalah tabel cache yang mencatat stok per unit secara instan. Menggantikan ketergantungan pada perhitungan manual yang lambat.
3.  **Pelacakan Transaksi (End-to-End Tracking):**
    *   **Update:** Tabel `transactions` kini memiliki kolom `source_unit_id` dan `destination_unit_id`.
    *   **Manfaat:** Kita sekarang tahu persis dari mana barang berasal (misal: "CSSD") dan kemana tujuannya (misal: "Unit OK"). Dulu hanya ada satu `unitId` yang ambigu.
4.  **Standarisasi Data:**
    *   **Baru:** Tabel master `transaction_types` (DISTRIBUTE, COLLECT, STERILIZATION) dan `transaction_statuses` (PENDING, COMPLETED).
    *   **Baru:** Tabel `measurement_units` untuk standarisasi satuan (Pcs, Set, Box).
5.  **Versioning Set Instrumen:**
    *   **Baru:** Tabel `instrument_set_versions`. Memungkinkan kita melacak perubahan isi Set dari waktu ke waktu (revisi set).

### B. Perubahan Logika Backend (Node.js)
Kode backend (`controllers`) telah diperbarui untuk mengakomodasi struktur baru ini:

1.  **`instrumentsController.js`**:
    *   Saat mengambil daftar alat (`getAllInstruments`), sistem kini membaca stok unit dari tabel `inventory_snapshots`.
    *   Saat membuat alat baru, sistem dapat menyimpan `measure_unit_id`.
2.  **`transactionsController.js`**:
    *   Logika Transaksi Distribusi & Pengambilan (Collect) ditulis ulang sepenuhnya.
    *   **Distribusi:** Mengurangi stok CSSD -> Menambah `inventory_snapshots` di Unit Tujuan (Destination).
    *   **Pengambilan:** Mengurangi `inventory_snapshots` di Unit Asal (Source) -> Menambah stok Kotor (Dirty) di CSSD.

---

## 2. Cara Pengujian (Testing Guide)

Berikut adalah langkah-langkah untuk memverifikasi bahwa perubahan ini berfungsi dengan baik di komputer lokal Anda.

### Persiapan
Pastikan server backend berjalan:
```bash
npm run server
```

### Skenario 1: Verifikasi Struktur Database
**Tujuan:** Memastikan tabel-tabel baru sudah terbentuk.
1.  Buka **HeidiSQL** atau **Adminer** (via Laragon).
2.  Buka database `steritrack`.
3.  Cek apakah tabel-tabel berikut ada:
    *   `inventory_snapshots`
    *   `transaction_types`
    *   `user_roles`
    *   `instrument_set_versions`
4.  **Hasil yang diharapkan:** Tabel-tabel tersebut harus ada.

### Skenario 2: Tes Transaksi Distribusi (Distribute)
**Tujuan:** Memastikan stok berpindah dari CSSD ke Unit menggunakan logika baru.

**Langkah:**
1.  Buka Aplikasi Frontend atau gunakan **Postman**.
2.  Lakukan Transaksi Distribusi:
    *   **Pilih Alat:** (Misal: Gunting Bedah)
    *   **Jumlah:** 5
    *   **Unit Tujuan:** Unit OK (Pastikan ID unitnya benar, misal `u2`)
    *   **Tipe:** Distribute
3.  **Verifikasi Database:**
    *   Cek tabel `transactions`: Cari transaksi terakhir. Pastikan kolom `source_unit_id` berisi ID CSSD (default `u-cssd`) dan `destination_unit_id` berisi ID Unit OK (`u2`).
    *   Cek tabel `inventory_snapshots`:
        ```sql
        SELECT * FROM inventory_snapshots WHERE instrumentId = 'ID_ALAT' AND unitId = 'u2';
        ```
    *   **Hasil yang diharapkan:** Jumlah stok di snapshot harus bertambah 5.

### Skenario 3: Tes Melihat Stok (Dashboard Nurse)
**Tujuan:** Memastikan backend membaca `inventory_snapshots` dengan benar.

**Langkah:**
1.  Login sebagai **Nurse** (User Unit OK).
2.  Buka halaman **Request / Dashboard**.
3.  Lihat daftar alat yang tersedia.
4.  **Hasil yang diharapkan:** Jumlah stok yang tampil di layar harus sesuai dengan angka yang ada di tabel `inventory_snapshots` database. Tidak boleh 0 (kecuali memang kosong).

---

## 3. Catatan Teknis untuk Developer

*   **File Migrasi:** Tersimpan di `backend/migration_v2.sql`. Gunakan file ini jika ingin mereset database atau deploy ke server baru.
*   **Env Config:** Konfigurasi database lokal ada di `backend/.env`. Pastikan `DB_HOST=localhost`.
