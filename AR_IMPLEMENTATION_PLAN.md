
# Rencana Teknis Implementasi: SteriTrack AR Scanner (IN PROGRESS)

Dokumen ini berisi panduan teknis untuk menambahkan fitur Augmented Reality (AR) Scanner ke dalam aplikasi web SteriTrack yang sudah ada.

## 1. Konsep "Web AR" untuk SteriTrack
Kita tidak membuat objek 3D rumit, melainkan **HUD (Heads-Up Display)** cerdas.
*   **Input**: Kamera Video Stream (Webcam/HP).
*   **Proses**: Deteksi QR/DataMatrix frame-by-frame.
*   **Output**: Menggambar "Bounding Box" (Kotak) di atas video secara real-time.
    *   **Kotak Hijau**: Instrumen dikenali & status Valid.
    *   **Kotak Merah**: Instrumen Expired / Salah Ruangan / Belum Dicuci.

## 2. Stack Teknologi (Environment Saat Ini)
*   **Frontend**: React + Vite (Sudah ada).
*   **Library Scanner**: `html5-qrcode` atau `zxing-js/library` (Open Source).
    *   *Catatan*: Library ini mampu memberikan koordinat `(x, y, width, height)` dari kode yang terdeteksi di layar. Koordinat inilah kunci fitur AR.

## 3. Tahap Implementasi Coding

### Tahap A: Setup Komponen Kamera & Canvas
Kita membutuhkan layer transparan (`<canvas>`) tepat di atas layer kamera (`<video>`).

```tsx
// Struktur Component JSX
<div style={{ position: 'relative' }}>
    {/* 1. Layer Video (Belakang) */}
    <video id="scan-video" style={{ width: '100%', height: '100%' }} />
    
    {/* 2. Layer AR Overlay (Depan - Transparan) */}
    <canvas id="ar-overlay" style={{ position: 'absolute', top: 0, left: 0 }} />
</div>
```

### Tahap B: Logic Deteksi & Drawing (The "AR" Magic)
Logika utama untuk menggambar kotak AR:

```javascript
/* Pseudocode Logic */
onScanResult(decodedText, resultObj) {
    // 1. Dapatkan koordinat kode dari hasil scan
    const { x, y, width, height } = resultObj.location;
    
    // 2. Cek Validitas Data ke Database Lokal (Context)
    const instrument = findInstrumentByQR(decodedText);
    const isValid = instrument && instrument.status === 'STERILE';
    
    // 3. Gambar Kotak di Canvas
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = isValid ? '#00FF00' : '#FF0000'; // Hijau atau Merah
    ctx.rect(x, y, width, height); // Gambar kotak pas di posisi QR fisik
    ctx.stroke();
    
    // 4. Tambah Label Melayang (Floating Label)
    ctx.fillStyle = isValid ? '#00FF00' : '#FF0000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(instrument ? instrument.name : "Unknown", x, y - 10);
}
```

## 4. Tantangan & Solusi (Multi-Scan)
Library standar Web biasanya hanya scan 1 kode per frame.
*   **Tantangan**: Jika ada 50 alat di meja, scan satu-satu agak lama meskipun visualnya bagus.
*   **Solusi Pro**: Menggunakan **Dynamsoft Barcode Reader SDK** (Berbayar tapi Powerful) atau optimasi **OpenCV.js** (Gratis, rumit) untuk deteksi multi-code dalam satu frame.
*   **Solusi Hemat (Recommended)**: Mode "Rapid Fire". User menggerakkan HP menyapu meja. Sistem mengunci (lock) kode yang sudah discan dan membiarkannya tetap berwarna hijau di layar (tracking) sampai semua alat ter-highlight.

## 5. Estimasi Pengembangan
1.  **Minggu 1**: Prototipe Scanner dengan Overlay Canvas sederhana.
2.  **Minggu 2**: Integrasi data instrumen (Validasi Hijau/Merah).
3.  **Minggu 3**: Optimasi performa agar tidak lag di HP Android menengah.

## Kesimpulan
Fitur ini **SANGAT MEMUNGKINKAN** dibangun di atas kode SteriTrack yang sekarang. Anda tidak perlu membeli hardware baru, cukup investasi waktu coding (software) untuk membuat modul "Packing Station AR".
