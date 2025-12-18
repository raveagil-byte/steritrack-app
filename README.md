# SIAPPMEN - Sistem Aplikasi Pengambilan dan Pendistribusian Instrumen

Aplikasi manajemen dan pelacakan instrumen medis steril untuk Central Sterile Supply Department (CSSD) rumah sakit.

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

## 🎯 Fitur Utama

### 1. **Manajemen Pengguna**
- Sistem login dengan autentikasi password terenkripsi (bcrypt)
- 3 Role: Admin, Staf CSSD, Perawat Unit
- Penugasan perawat ke unit spesifik (IGD, OK, ICU, dll)
- Manajemen status aktif/nonaktif user

### 2. **Manajemen Inventori**
- Kelola instrumen medis (single items & instrument sets)
- Tracking stok real-time (CSSD, Unit, Kotor)
- Manajemen unit/ruangan rumah sakit
- QR Code untuk setiap item dan unit

### 3. **Sistem Permintaan (Request)**
- Perawat dapat membuat permintaan barang steril untuk unit mereka
- CSSD menerima dan menyetujui permintaan
- Otomatis membuat transaksi distribusi setelah approval

### 4. **Distribusi & Pengambilan**
- **Distribusi Steril**: CSSD mengirim instrumen steril ke unit
- **Ambil Kotor**: CSSD mengambil instrumen kotor dari unit
- QR Code untuk validasi transaksi
- Tracking status: Pending → Completed

### 5. **Dashboard & Analytics**
- Dashboard visual dengan chart (Recharts)
- Statistik inventori, transaksi, dan aktivitas
- AI Assistant (Gemini / HuggingFace / Ollama) untuk analisis sistem

### 6. **Keamanan**
- Password hashing dengan bcryptjs
- Auto-upgrade password lama ke hash saat login
- Session management dengan localStorage

---

## 🛠 Teknologi yang Digunakan

### Frontend
- **React 18** + **TypeScript**
- **Vite** (Build tool)
- **Tailwind CSS v4** (Styling)
- **React Router** (Routing)
- **React Query** (State management & caching)
- **React Hook Form** + **Zod** (Form validation)
- **Recharts** (Data visualization)
- **Lucide React** (Icons)
- **Sonner** (Toast notifications)
- **PWA Support** (Manifest & Icons)

### Backend
- **Node.js** + **Express.js**
- **MySQL** (Database)
- **bcryptjs** (Password hashing)
- **dotenv** (Environment variables)

### AI Integration
- **Google Gemini API** (Primary)
- **Hugging Face API** (Secondary)
- **Ollama** (Local fallback)

---

## 📦 Prasyarat Instalasi

Pastikan komputer Anda sudah terinstal:

1. **Node.js** (v18 atau lebih baru)
   - Download: https://nodejs.org/
   - Verifikasi: `node --version` dan `npm --version`

2. **MySQL Server** (v8.0 atau lebih baru)
   - **Opsi 1**: Install [XAMPP](https://www.apachefriends.org/) atau [Laragon](https://laragon.org/)
   - **Opsi 2**: Install [MySQL Community Server](https://dev.mysql.com/downloads/mysql/)
   - Verifikasi: `mysql --version`

3. **Git** (opsional, untuk clone repository)
   - Download: https://git-scm.com/

---

## 🚀 Instalasi & Setup

### Langkah 1: Clone/Download Proyek

```bash
# Jika menggunakan Git
git clone <repository-url>
cd steritrack---simple-cssd
# (Atau nama folder SIAPPMEN Anda)

# Atau download ZIP dan extract
```

### Langkah 2: Install Dependencies

```bash
# Install dependencies
npm install
```

### Langkah 3: Setup Database MySQL

#### A. Jalankan MySQL Server
- **Jika pakai XAMPP/Laragon**: Start MySQL dari control panel
- **Jika standalone**: Pastikan service MySQL sudah running

#### B. Buat Database & Import Schema

**Opsi 1: Via MySQL Command Line**
```bash
# Login ke MySQL (password default biasanya kosong atau 'root')
mysql -u root -p

# Buat database
CREATE DATABASE steritrack;

# Keluar dari MySQL
exit;

# Import schema
mysql -u root -p steritrack < backend/schema.sql
```

**Opsi 2: Via phpMyAdmin** (jika pakai XAMPP/Laragon)
1. Buka http://localhost/phpmyadmin
2. Klik "New" → Nama database: `steritrack` → Create
3. Pilih database `steritrack`
4. Klik tab "Import"
5. Choose file: `backend/schema.sql`
6. Klik "Go"

### Langkah 4: Konfigurasi Environment Variables

#### Backend Environment
Buat file `backend/.env` (atau di root folder `.env.local` untuk Vercel/Simple Setup):

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=steritrack
PORT=3000
# JWT Secret (Ganti dengan string acak yang panjang)
JWT_SECRET=rahasia_super_aman_banget_12345
# Hugging Face Token (Opsional untuk AI)
HF_API_KEY=hf_xxxxxxxxxxxxxxxxx
```

**⚠️ Sesuaikan `DB_PASSWORD` dengan password MySQL Anda!**

---

## ▶️ Menjalankan Aplikasi

### Metode 1: Manual (Recommended)

**Terminal 1:**
```bash
npm run start
```
Perintah ini akan menjalankan backend (port 3000) dan frontend (port 5173) secara bersamaan menggunakan `concurrently`.

### Akses Aplikasi

Buka browser dan kunjungi: **http://localhost:5173**
Atau di HP (jika satu Wi-Fi): **http://<IP-KOMPUTER>:5173**

---

## 🔐 Login Default

Setelah import `schema.sql`, gunakan akun berikut:

| Role | Username | Password | Deskripsi |
|------|----------|----------|-----------|
| Admin | `admin` | `123` | Akses penuh ke semua fitur |
| CSSD | `staff` | `123` | Operasional CSSD (distribusi, ambil kotor) |
| Perawat | `nurse` | `123` | Terima barang & buat permintaan |

**⚠️ PENTING:** Ganti password default setelah login pertama kali!

---

## 📁 Struktur Proyek

```
SIAPPMEN/
├── backend/                    # Backend API (Express + MySQL)
│   ├── controllers/           # Logic untuk setiap endpoint
│   ├── routes/                # Definisi route API
│   ├── db.js                  # Koneksi database MySQL
│   ├── schema.sql             # Schema database & data awal
│   ├── server.js              # Entry point backend
│   └── .env                   # Config database (BUAT MANUAL)
│
├── src/                       # Frontend React
│   ├── components/            # Komponen reusable
│   ├── context/               # React Context (AppContext, ThemeContext)
│   ├── hooks/                 # Custom hooks (useQueries, dll)
│   ├── services/              # API calls & business logic
│   ├── views/                 # Halaman utama aplikasi
│   │   ├── admin/            # Admin panel components
│   │   ├── cssd/             # CSSD view components
│   │   └── nurse/            # Nurse view components
│   ├── types.ts              # TypeScript type definitions
│   ├── App.tsx               # Root component
│   └── main.tsx              # Entry point
│
├── public/                    # Static assets (Icon, Manifest)
├── index.html                 # HTML template
├── index.css                  # Global styles (Tailwind)
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind configuration
├── package.json              # Dependencies
└── README.md                 # Dokumentasi ini
```

---

## 📖 Panduan Penggunaan

### Untuk Admin

1. **Login** dengan `admin` / `123`
2. **Dashboard**: Lihat overview sistem
3. **Users**: Kelola pengguna (Tambah user baru, assign perawat)
4. **Units**: Kelola ruangan/unit rumah sakit
5. **Instruments**: Kelola instrumen medis
6. **Sets**: Kelola instrument sets (kits)

### Untuk Staf CSSD

1. **Login** dengan `staff` / `123`
2. **Permintaan Masuk**: 
   - Lihat request dari unit
   - Approve/Reject permintaan
   - Otomatis buat transaksi distribusi
3. **Distribusi Steril**:
   - Scan QR unit tujuan
   - Pilih instrumen yang akan dikirim
   - Generate QR transaksi
4. **Ambil Kotor**:
   - Scan QR unit sumber
   - Catat instrumen kotor yang diambil

### Untuk Perawat Unit

1. **Login** dengan `nurse` / `123`
2. **Buat Permintaan**:
   - Pilih instrumen/set yang dibutuhkan
   - Kirim permintaan ke CSSD
3. **Terima Barang**:
   - Scan QR transaksi dari CSSD
   - Validasi item yang diterima

---

## 🔧 Troubleshooting

### 1. Backend tidak bisa connect ke database
**Error**: `ER_ACCESS_DENIED_ERROR` atau `ECONNREFUSED`
**Solusi**: Pastikan MySQL server running, cek user/password di `.env` atau `.env.local`, pastikan database `steritrack` ada.

### 2. Password tidak bisa login
**Solusi**: Gunakan password default `123`.

### 3. AI Assistant tidak berfungsi
**Error**: "Access Denied" atau "Service Unavailable"
**Solusi**: Pastikan `HF_API_KEY` ada di `.env.local` dan restart server (`npm run start`).

### 4. QR Scanner tidak berfungsi
**Solusi**: Gunakan HTTPS atau localhost. Izinkan akses kamera.

---

## 📞 Support & Kontribusi

Jika menemukan bug atau ingin request fitur, silakan hubungi tim IT Rumah Sakit.

---

## 📄 Lisensi

Proyek ini dibuat untuk keperluan internal Rumah Sakit.

---

**Terakhir diupdate**: 18 Desember 2025
**Versi**: 1.1.0 (Rebranded to SIAPPMEN)
