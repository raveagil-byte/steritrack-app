
# Inovasi Alternatif: AR Vision & Data Matrix Tracking
Dokumen ini membahas inovasi teknologi visual (AR & QR) sebagai alternatif cerdas dan murah pengganti RFID untuk SteriTrack.

## 1. Masalah Utama RFID
*   **Biaya Tinggi**: Tag RFID UHF tahan panas (autoclavable) sangat mahal ($2-$5 per tag) dan memiliki masa pakai terbatas.
*   **Interferensi Logam**: Instrumen bedah terbuat dari stainless steel yang memantulkan sinyal radio, membuat pembacaan RFID kadang tidak akurat jika tertumpuk.

## 2. Solusi: "AR Multi-Scan" & Data Matrix
Alih-alih RFID, kita menggunakan **Computer Vision + AR** pada smartphone/tablet yang sudah ada.

### A. Teknologi Data Matrix (Laser Marked)
*   **Inovasi**: Menggunakan *Direct Part Marking (DPM)*. Kode Data Matrix 2D diukir langsung ke instrumen stainless steel menggunakan laser.
*   **Keunggulan**:
    *   **Tahan Lama**: Tidak akan lepas atau luntur kena panas/kimia (karena ukiran laser).
    *   **Ukuran Mikro**: Bisa sekecil 3mm x 3mm, muat di gagang gunting kecil.
    *   **Biaya Nol**: Tidak perlu beli tag terus menerus, hanya butuh mesin laser marking sekali di awal.

### B. Augmented Reality (AR) Overlay
Menggunakan kamera HP/Tablet untuk "melihat" isi set instrumen secara digital.

*   **Fitur "X-Ray Vision" Packing**:
    1.  Staf mengarahkan kamera HP ke meja packing yang berisi 50 alat.
    2.  Sistem Computer Vision mendeteksi seluruh 50 Data Matrix code sekaligus dalam satu *frame*.
    3.  Layar HP menampilkan **Overlay AR (Hijau/Merah)** di atas setiap alat fisik.
        *   **Hijau**: Alat ini benar milik set ini.
        *   **Merah**: Alat ini tidak seharusnya ada di sini (salah masuk).
        *   **Indikator Kurang**: Menampilkan hologram alat yang "Hilang/Belum Ada" di meja.

### C. Alur Kerja Baru dengan AR
1.  **Saat Cuci (Decontam)**:
    *   Staf scan tumpukan alat kotor. AR langsung menampilkan highlight merah pada alat yang "Biohazard Risk" tinggi atau butuh perlakuan khusus.
2.  **Saat Operasi (Di Kamar OK)**:
    *   Perawat scan nampan mayo. AR menampilkan nama alat di layar saat ditunjuk, membantu perawat junior menghafal nama instrumen bedah yang rumit.

## 3. Perbandingan Biaya & Efektivitas

| Fitur | RFID (Radio Frequency) | AR Vision (Kamera + QR Laser) |
| :--- | :--- | :--- |
| **Investasi Hardware** | Mahal (Reader, Antena, Tag) | Murah (Hanya HP/Tablet + Mesin Laser) |
| **Biaya Operasional** | Biaya ganti Tag rusak rutin | Hampir Nol (Kode Laser permanen) |
| **Akurasi di Logam** | Sering terganggu pantulan logam | Sangat baik (Visual), asal ada cahaya |
| **Kecepatan Scan** | Sangat Cepat (Tanpa lihat) | Cepat (Harus terlihat kamera) |
| **Nilai Tambah** | Hanya pelacakan | Edukasi & QC Visual (Bisa lihat nama alat di layar) |

## 4. Rekomendasi Implementasi Teknis (SteriTrack 2.0)
Untuk menerapkan ini di SteriTrack tanpa merombak total:

1.  **Frontend (React/Vite)**:
    *   Integrasi library **Scandit** atau **Dynamsoft** (Software barcode scanner kelas industri yang bisa scan 100 kode sekaligus dalam 1 detik lewat kamera).
    *   Gunakan **WebXR** atau **MindAR.js** untuk menampilkan overlay titik hijau di layar HP via browser.

2.  **Backend**:
    *   Tetap sama, hanya saja endpoint API menerima array 50 ID sekaligus dalam satu *request*.

## Kesimpulan
Jika tujuan Anda adalah efisiensi biaya namun tetap canggih, **Laser Marking Data Matrix + AR Scanner** adalah solusi paling modern. Ini mengubah HP Android biasa menjadi alat *Quality Control* canggih tanpa perlu membeli perangkat RFID mahal.
