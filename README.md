# SteriTrack - Sistem Pelacakan Instrumen Steril CSSD

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
- AI Assistant (Google Gemini / Ollama) untuk analisis sistem

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

### Backend
- **Node.js** + **Express.js**
- **MySQL** (Database)
- **bcryptjs** (Password hashing)
- **dotenv** (Environment variables)

### AI Integration
- **Google Gemini API** (Primary)
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

# Atau download ZIP dan extract
```

### Langkah 2: Install Dependencies

```bash
# Install dependencies frontend
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

#### A. Backend Environment
Buat file `backend/.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=steritrack
PORT=3000
```

**⚠️ Sesuaikan `DB_PASSWORD` dengan password MySQL Anda!**

#### B. Frontend Environment (Opsional - untuk AI)
Buat file `.env.local` di root folder:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**Cara mendapatkan Gemini API Key:**
1. Kunjungi https://aistudio.google.com/app/apikey
2. Login dengan Google Account
3. Klik "Create API Key"
4. Copy dan paste ke `.env.local`

---

## ▶️ Menjalankan Aplikasi

### Metode 1: Manual (2 Terminal)

**Terminal 1 - Backend:**
```bash
cd backend
node server.js
```
Output yang benar:
```
Database ensured.
Backend server running on http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```
Output yang benar:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

### Metode 2: Menggunakan Script (Windows)

Buat file `start.bat`:
```batch
@echo off
start cmd /k "cd backend && node server.js"
timeout /t 2
start cmd /k "npm run dev"
```

Double-click `start.bat` untuk menjalankan keduanya sekaligus.

### Akses Aplikasi

Buka browser dan kunjungi: **http://localhost:5173**

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
steritrack---simple-cssd/
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
├── public/                    # Static assets
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
3. **Users**: Kelola pengguna
   - Tambah user baru
   - Assign perawat ke unit
   - Toggle status aktif/nonaktif
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
   - Tambah ke keranjang
   - Kirim permintaan ke CSSD
3. **Terima Barang**:
   - Scan QR transaksi dari CSSD
   - Validasi item yang diterima
   - Konfirmasi penerimaan

---

## 🔧 Troubleshooting

### 1. Backend tidak bisa connect ke database

**Error**: `ER_ACCESS_DENIED_ERROR` atau `ECONNREFUSED`

**Solusi**:
- Pastikan MySQL server sudah running
- Cek `backend/.env`:
  - `DB_USER` dan `DB_PASSWORD` sesuai dengan MySQL Anda
  - `DB_NAME=steritrack` sudah dibuat
- Test koneksi: `mysql -u root -p` di terminal

### 2. Frontend tidak bisa connect ke backend

**Error**: `Failed to fetch` atau `Network Error`

**Solusi**:
- Pastikan backend running di `http://localhost:3000`
- Cek `services/apiService.ts` → `API_URL` harus `http://localhost:3000/api`
- Disable antivirus/firewall sementara

### 3. Password tidak bisa login

**Error**: "Username atau password salah"

**Solusi**:
- Gunakan password default: `123`
- Jika sudah ganti password, reset via database:
  ```sql
  UPDATE users SET password='123' WHERE username='admin';
  ```
- Restart backend untuk trigger auto-hash

### 4. Tailwind CSS tidak muncul

**Error**: Styling tidak tampil / plain HTML

**Solusi**:
- Pastikan `npm install` sudah selesai
- Restart dev server: `Ctrl+C` → `npm run dev`
- Clear browser cache: `Ctrl+Shift+R`

### 5. Port sudah digunakan

**Error**: `EADDRINUSE: address already in use`

**Solusi Backend (Port 3000)**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Atau ganti port di backend/.env
PORT=3001
```

**Solusi Frontend (Port 5173)**:
- Vite akan otomatis pakai port lain (5174, 5175, dst)
- Atau edit `vite.config.ts` → `server.port`

### 6. AI Assistant tidak berfungsi

**Error**: "Cannot connect to AI service"

**Solusi**:
- **Gemini**: Pastikan `VITE_GEMINI_API_KEY` di `.env.local` valid
- **Ollama** (fallback):
  1. Install Ollama: https://ollama.ai/download
  2. Pull model: `ollama pull llama2`
  3. Run: `ollama serve`
- Restart frontend setelah update `.env.local`

### 7. QR Scanner tidak berfungsi

**Error**: Kamera tidak muncul

**Solusi**:
- Browser harus HTTPS atau localhost
- Izinkan akses kamera di browser
- Gunakan Chrome/Edge (Firefox kadang bermasalah)
- Fallback: Klik transaksi pending di list

---

## 🔄 Update & Maintenance

### Update Dependencies
```bash
npm update
```

### Backup Database
```bash
mysqldump -u root -p steritrack > backup_$(date +%Y%m%d).sql
```

### Reset Database (HATI-HATI: Hapus semua data!)
```bash
mysql -u root -p steritrack < backend/schema.sql
```

---

## 📞 Support & Kontribusi

Jika menemukan bug atau ingin request fitur:
1. Buat issue di repository
2. Atau hubungi developer

---

## 📄 Lisensi

Proyek ini dibuat untuk keperluan internal rumah sakit.

---

**Terakhir diupdate**: 7 Desember 2024
**Versi**: 1.0.0
