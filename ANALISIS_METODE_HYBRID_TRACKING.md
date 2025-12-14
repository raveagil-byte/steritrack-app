# Analisis Implementasi Metode Hybrid Tracking (Unit & Serial Quantity)
**Tanggal:** 11 Desember 2025
**Proyek:** SteriTrack CSSD System

## 1. Ringkasan Eksekutif
Dokumen ini menganalisis keputusan arsitektur untuk menerapkan pendekatan **Hybrid Tracking** dalam manajemen inventaris SteriTrack. Pendekatan ini menggabungkan pencatatan berbasis jumlah (*Quantity-based*) untuk instrumen umum dan pencatatan berbasis unit unik (*Serialized/Asset-based*) untuk instrumen bernilai tinggi atau kritis.

## 2. Definisi Masalah
Dalam sistem manajemen CSSD, terdapat dilema antara keakuratan data (Traceability) dan efisiensi operasional (Speed):

1.  **Pendekatan Full Serialization (Satu Alat = Satu QR):**
    *   *Kelebihan:* Pelacakan sangat detail, riwayat pemakaian per alat jelas.
    *   *Kekurangan:* Beban kerja operasional sangat tinggi. Perawat harus memindai ratusan alat kecil satu per satu. Biaya penandaan (laser etching/tags) sangat mahal.

2.  **Pendekatan Bulk Quantity (Modul Saat Ini):**
    *   *Kelebihan:* Cepat, mudah, biaya rendah. Cukup hitung total.
    *   *Kekurangan:* Tidak bisa melacak riwayat perawatan alat spesifik. Tidak bisa membedakan mana gunting yang baru dibeli dan mana yang sudah tumpul.

## 3. Solusi Terpilih: Metode Hybrid
Metode ini membagi inventaris menjadi dua kategori yang diperlakukan berbeda oleh sistem:

### Kategori A: General Instruments (Non-Serialized)
*   **Jenis Barang:** Instrumen dasar, jumlah banyak, harga relatif murah, durable tapi consumable jangka panjang.
*   **Contoh:** Gunting perban, Klem arteri, Pinset, Kom, Bengkok.
*   **Metode Tracking:** Berdasarkan Jumlah (Quantity).
*   **Input User:** "Pinset Anatomis: 50 pcs".

### Kategori B: Critical/High-Value Assets (Serialized)
*   **Jenis Barang:** Alat mahal, butuh maintenance berkala, memiliki batasan masa pakai (*lifespan*), atau alat elektromedik.
*   **Contoh:** Endoskop, Lensa Laparoskopi, Power Drill Orthopaedi, Kabel Fiber Optik.
*   **Metode Tracking:** Berdasarkan Serial Number/Unique ID.
*   **Input User:** Wajib scan QR Code unik atau input Serial Number pabrikan.

## 4. Analisis Dampak & Manfaat

### A. Dampak Operasional (User Experience)
| Aspek | Full Serialization | Hybrid Method (Terpilih) |
| :--- | :--- | :--- |
| **Waktu Packing Set** | Sangat Lambat (30-45 menit/set) | Cepat (5-10 menit/set) |
| **Beban Validasi** | Scan tiap item | Hitung jumlah, Scan hanya item mahal |
| **Kemudahan** | Rumit (Rentan Error Humanis) | Intuitif |

### B. Manfaat Data (Traceability)
Dengan metode Hybrid, kita mendapatkan "Best of Both Worlds":
1.  **Maintenance Tracking:** Kita bisa mencatat bahwa "Lensa Laparoskopi SN:12345" sudah dipakai 50 kali dan perlu servis.
2.  **Efisiensi:** Kita tidak perlu membuang resource database untuk melacak riwayat "Mangkok Stainless" yang tidak krusial.

## 5. Rancangan Teknis & Skema Database

Untuk mendukung fitur ini, skema database perlu dikembangkan tanpa merusak struktur yang sudah ada.

### Perubahan Tabel `instruments`
Menambahkan penanda (flag) untuk menentukan perilaku sistem terhadap instrumen tersebut.
*   `is_serialized` (BOOLEAN):
    *   `FALSE` (Default): Perilaku standar (input jumlah).
    *   `TRUE`: Sistem mewajibkan pemilihan aset spesifik.

### Tabel Baru `instrument_assets`
Menyimpan data unik untuk item yang `is_serialized = TRUE`.
*   `id` (PK): Unique ID sistem.
*   `instrumentId`: Referensi ke tipe instrumen induk.
*   `serialNumber`: Nomor seri fisik/pabrikan.
*   `usageCount`: Counter otomatis setiap kali masuk dalam transaksi selesai.
*   `lastMaintenance`: Tanggal perawatan terakhir.
*   `status`: READY, IN_USE, MAINTENANCE, BROKEN.

## 6. Kesimpulan dan Rekomendasi
Penerapan metode **Hybrid Tracking** adalah solusi paling optimal untuk SteriTrack. Metode ini menyeimbangkan kebutuhan manajemen aset rumah sakit (untuk alat mahal) dengan realita beban kerja lapangan yang membutuhkan kecepatan tinggi.

**Rekomendasi Langkah Selanjutnya:**
1.  Jalankan migrasi database (SQL terlampir).
2.  Update halaman "Master Data Instrumen" untuk opsi centang "Wajib Serial Number".
3.  Update halaman Transaksi untuk memunculkan input Serial Number pop-up hanya jika item tersebut bertipe serialized.
