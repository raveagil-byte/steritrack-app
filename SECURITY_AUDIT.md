# Laporan Audit Keamanan dan Performa Aplikasi SteriTrack

## Ringkasan
Aplikasi SteriTrack telah diaudit untuk potensi kebocoran data (*data leaks*) dan kebocoran memori (*memory leaks*). Secara umum, arsitektur aplikasi (Node.js/Express + React/Vite) dibangun dengan praktik modern yang baik. Namun, ditemukan satu kerentanan keamanan kritis yang perlu segera diperbaiki.

---

## 1. Analisis Keamanan (Data Leak)

### Temuan Kritis (High Severity) - [RESOLVED]
- **JWT Secret Fallback**: Telah diperbaiki. Aplikasi sekarang menggunakan `process.env.JWT_SECRET` secara eksklusif dan akan gagal start jika tidak ada. File `.env` telah diperbarui dengan secret yang aman.


### Temuan Menengah (Medium Severity)
- **Penyimpanan Token di LocalStorage**: Token JWT disimpan di `localStorage` browser (via `StorageService`).
  **Risiko**: Jika terdapat kerentanan XSS (Cross-Site Scripting) di aplikasi, penyerang dapat mencuri token ini.
  **Mitigasi**: Pastikan sanitasi input yang ketat. Untuk keamanan lebih tinggi di masa depan, pertimbangkan menggunakan `HttpOnly Cookies`.

### Praktik Baik (Security Wins)
- **Password Hashing**: Menggunakan `bcryptjs` untuk menyandikan password. Tidak ada password yang disimpan sebagai *plain text*.
- **Parameterisasi SQL**: Kode menggunakan `mysql2` dengan *parameterized queries* (tanda tanya `?`), yang melindungi dari SQL Injection.
- **Helmet**: Middleware `helmet` aktif, memberikan header keamanan HTTP standar.
- **Rate Limiting**: Terdapat pembatasan jumlah request (100 request/15 menit) untuk mencegah serangan brute-force.
- **Filtered Responses**: Password user dihapus dari respons API sebelum dikirim ke frontend.

---

## 2. Analisis Performa (Memory Leak)

### Frontend (React)
- **Manajemen State**: Aplikasi menggunakan `@tanstack/react-query` (`useQuery`, `useMutation`).
  **Status**: **Sangat Baik**. Library ini menangani *caching*, *garbage collection* data lama, dan *deduplication* request secara otomatis. Ini menghilangkan sumber kebocoran memori paling umum di aplikasi React (seperti `useEffect` yang tidak dibersihkan saat fetch data manual).
- **Event Listeners**: Tidak ditemukan penggunaan event listener global yang berisiko (seperti `window.addEventListener` tanpa `removeEventListener`) dalam komponen utama.

### Backend (Node.js)
- **Koneksi Database**: Menggunakan `mysql2.createPool`. Koneksi dikelola secara otomatis dan efisien. Koneksi `initPool` di `db.js` ditutup dengan benar (`initPool.end()`).
- **Global Variables**: Tidak ditemukan variabel global yang menampung data besar (array/object) yang tumbuh tanpa batas seiring waktu.

---

## Kesimpulan
Aplikasi ini **AMAN dari Memory Leak** berkat arsitektur modernnya. Namun, aplikasi **BELUM 100% AMAN dari Data Leak** karena adanya *fallback key* pada autentikasi JWT.

### Langkah Selanjutnya
Apakah Anda ingin saya memperbaiki kerentanan `JWT_SECRET` sekarang? (Ini akan mengubah kode backend agar mewajibkan file `.env`).
