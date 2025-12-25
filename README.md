# SIAPPMEN - Sistem Aplikasi Pengambilan dan Pendistribusian Instrumen (v2.0)

Aplikasi manajemen dan pelacakan instrumen medis steril untuk Central Sterile Supply Department (CSSD) rumah sakit. Versi 2.0 menghadirkan peningkatan keamanan, logika stok yang lebih presisi, dan audit trail yang komprehensif.

## 📋 Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Prasyarat Instalasi](#prasyarat-instalasi)
- [Instalasi & Setup](#instalasi--setup)
- [Menjalankan Aplikasi](#menjalankan-aplikasi)
- [Struktur Proyek](#struktur-proyek)
- [Panduan Penggunaan](#panduan-penggunaan)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Fitur Utama (v2.0)

### 1. **Manajemen Pengguna & Keamanan (Enhanced)**
- **Secure Authentication**: Login dengan JWT (24 jam) + BCrypt auto-hash upgrade.
- **Security Hardening**: Proteksi terhadap Brute Force (Rate Limit), XSS/Headers (Helmet), dan Strict CORS Policy.
- **Role-Based Access**: Granular control untuk Admin, Staf CSSD, dan Perawat Unit.
- **Privacy First**: Error masking di production untuk mencegah kebocoran informasi sistem.

### 2. **Manajemen Inventori Cerdas (V2 Logic)**
- **Snapshot Inventori**: Pelacakan stok instrumen di setiap unit secara real-time menggunakan sistem snapshot database, bukan kalkulasi manual.
- **Multi-Unit Support**: Dukungan satuan instrumen (Pcs, Set, Box) yang fleksibel.
- **Set Versioning**: Melacak riwayat perubahan isi instrument set (Dressing Set v1 -> v2).
- **QR Code Tracking**: Identifikasi unik untuk Unit dan Transaksi.

### 3. **Alur Distribusi Terintegrasi**
- **Permintaan (Request)**: Perawat request barang -> Approval CSSD -> Auto-Transaction.
- **Distribusi (CSSD to Unit)**: Validasi QR Code, pengurangan stok CSSD, penambahan stok Unit otomatis.
- **Pengambilan (Unit to CSSD)**: Pencatatan barang kotor/rusak dari unit, otomatis masuk antrian sterilisasi.
- **Audit Trail**: Mencatat siapa (Who), kapan (When), dan apa (What) yang berubah dalam setiap transaksi.

### 4. **Dashboard & Analytics**
- **Visualisasi Data**: Grafik tren pemakaian dan status sterilisasi (Recharts).
- **AI Analytics**: Asisten cerdas (Gemini/HuggingFace) untuk analisis pola kerusakan atau kebutuhan stok.

### 5. **Skema Database V2**
- Struktur database yang dinormalisasi untuk performa tinggi.
- Dokumentasi visual: [Diagram Database SIAPPMEN](https://dbdiagram.io/d/impruvedbsiappmen-694cd7feb8f7d86886185816)

---

## 🛠 Teknologi yang Digunakan

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS v4** (Modern Styling)
- **React Query** (Server State Management)
- **Zod** (Schema Validation)
- **PWA Ready** (Bisa diinstall di HP)

### Backend
- **Node.js** + **Express**
- **MySQL 8.0** (Relational Database)
- **Security**: `helmet`, `express-rate-limit`, `cors`, `bcryptjs`, `jsonwebtoken`
- **AI**: Google Gemini API / Hugging Face

---

## 📦 Prasyarat Instalasi

1. **Node.js** (v18+)
2. **MySQL Server** (v8.0+)
3. **Git**

---

## 🚀 Instalasi & Setup

### Langkah 1: Clone & Install
```bash
git clone <repository-url>
cd steritrack---simple-cssd
npm install
```

### Langkah 2: Setup Database (Schema V2)
Aplikasi ini menggunakan **Schema V2**. 

**Untuk Instalasi Baru:**
```bash
# Import full schema
mysql -u root -p steritrack < backend/schema.sql
```

**Untuk Update dari Versi Lama:**
Gunakan file `backend/migration_v2.sql` untuk migrasi data tanpa menghapus database lama.

### Langkah 3: Environment Variables
Copy `.env.example` ke `backend/.env` dan isi konfigurasi:
```env
NODE_ENV=development # Ganti 'production' saat deploy
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=steritrack
JWT_SECRET=rahasia_super_panjang_dan_acak
FRONTEND_URL=http://localhost:5173
```

---

## ▶️ Menjalankan Aplikasi

```bash
npm run start
```
Akses di: `http://localhost:5173`

---

## 🔐 Akun Demo

| Role | Username | Password |
|------|----------|----------|
| **Admin** | `admin` | `123` |
| **CSSD Staff** | `staff` | `123` |
| **Nurse (IGD)**| `nurse` | `123` |

---

## � Troubleshooting Deployment

### 1. CORS Error di Production
Pastikan `FRONTEND_URL` di env backend sesuai dengan domain frontend Vercel Anda (tanpa slash di akhir).

### 2. Database Error "Column not found"
Pastikan Anda sudah menjalankan migrasi V2. Cek apakah tabel `inventory_snapshots` ada di database.

### 3. API Error 500
Cek logs server. Jika di production, error detail disembunyikan. Cek console server/Vercel logs untuk detailnya.

---

## � Lisensi
open source

**Versi Sistem**: 2.0.0 (Hardened & Optimized)
**Tanggal Rilis**: 25 Desember 2025
