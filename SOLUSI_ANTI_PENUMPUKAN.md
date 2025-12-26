
# Solusi Masalah Lapangan: Penumpukan & Kekurangan Stok (Anti-Hoarding)

## Masalah Lapangan
1.  **Invisible Stock**: Unit A menyimpan stok berlebih "di laci tersembunyi" untuk jaga-jaga, tidak melaporkan ke sistem.
2.  **Salah Kamar**: Instrumen milik Unit IGD tidak sengaja terbawa ke Unit OK saat transfer pasien, lalu tertukar selamanya.
3.  **Panic Request**: Unit B minta 50 set padahal pemakaian rata-rata cuma 5 set (karena takut kehabisan).

## Solusi Sistem SteriTrack

### 1. Fitur "Stock Opname Digital" (Audit Harian)
Mencegah stok gaib yang tercatat di sistem tapi tidak ada fisiknya (atau sebaliknya).

*   **Logic**:
    *   Setiap pergantian shift (Pagi/Siang/Malam), Kepala Ruangan (Head Nurse) wajib melakukan "Quick Scan Audit".
    *   **Caranya**: Scan QR Ruangan -> Sistem menampilkan "Seharusnya ada 10 Gunting di sini" -> Perawat menghitung fisik -> Input "Ada 12" (Surplus) atau "Cuma 8" (Minus).
    *   **Hasil**: Sistem langsung tahu ada *2 Gunting Nyasar* di ruangan tersebut.

### 2. Fitur "Par Level Logic" (Batas Kewajaran)
Mencegah unit minta barang terlalu banyak (Menimbun).

*   **Logic**:
    *   Setiap Unit diset **Maximum Stock (Par Level)**. Contoh: IGD maksimal pegang 20 Gunting.
    *   Sistem mencatat saat ini IGD punya 15 Gunting bersih.
    *   Jika Perawat IGD request minta tambah 10 lagi (Total jadi 25), Sistem **OTOMATIS MENOLAK** atau butuh Approval Admin.
    *   *Pesan Warning*: "Stok Anda masih cukup (15/20). Request dibatasi maksimal 5 item."

### 3. Fitur "Cross-Unit Tracking" (Pelacakan Salah Kamar)
Mendeteksi barang yang tersesat.

*   **Logic**:
    *   Saat CSSD melakukan "Collection" (Ambil Kotor) di Unit OK.
    *   Staf scan satu alat, ternyata alat itu terdaftar milik IGD (bukan OK).
    *   **Action Sistem**: 
        1.  Bunyi "BEEP BEDA!".
        2.  Otomatis mencatat "Mutasi Otomatis: Barang IGD ditemukan di OK".
        3.  Saat dicuci dan steril nanti, sistem akan menyuruh Staf CSSD: "Kembalikan barang ini ke IGD, jangan ke OK".

### 4. Dashboard "Heatmap Kebutuhan" (Untuk Manajer)
Melihat distribusi yang tidak adil.

*   **Visualisasi**:
    *   Menampilkan grafik batang per ruangan.
    *   Jika Ruang VIP stoknya selalu 100% tapi pemakaian (Putaran) rendah (Jarang dipakai), bar berwarna Merah (Indikasi Penimbunan).
    *   Jika Ruang Kelas 3 stoknya selalu 0% tapi pemakaian sangat tinggi, bar berwarna Hitam (Kritis).
    *   **Tindakan**: Manajer bisa memerintahkan "Tarik 5 set dari VIP, pindahkan ke Kelas 3 sekarang".

---

## Rekomendasi Implementasi Cepat

Agar ini berjalan tanpa alat canggih:
1.  **Aktifkan Aturan "Par Level"**: Minta admin set kuota per ruangan.
2.  **Wajibkan Scan Terima**: Jangan biarkan Unit terima barang tanpa scan. Jika tidak discan, di sistem barang itu statusnya masih "Di Jalan (In Transit)", bukan "Milik Unit". Jadi Unit tidak bisa menyembunyikannya.
