# Panduan Deployment Gratis & Mudah (SteriTrack)

Untuk aplikasi dengan arsitektur **React (Frontend)** + **Express (Backend)** + **MySQL (Database)**, berikut adalah rekomendasi strategi deployment "Free Tier" terbaik saat ini.

---

## Opsi 1: Paling Mudah & Cepat (Untuk Demo Sementara)
Jika Anda hanya ingin menunjukkan aplikasi ke teman/klien tanpa memindahkan database atau coding ulang, gunakan **Tunneling**.
Komputer Anda harus tetap menyala.

1.  **Download Ngrok**: [https://ngrok.com/download](https://ngrok.com/download)
2.  **Jalankan Backend & Frontend** di terminal seperti biasa (`npm run dev` dan `node server.js`).
3.  **Expose Port**:
    *   Buka terminal baru: `ngrok http 3000` (Ini untuk Backend) -> Copy URL (misal: `https://api-xyz.ngrok-free.app`).
    *   Update `services/apiService.ts` di frontend: Ganti `API_URL` dengan URL ngrok tersebut.
    *   Buka terminal lain: `ngrok http 5173` (Ini untuk Frontend).
4.  **Selesai**: Bagikan Link Ngrok Frontend 5173 ke orang lain.

---

## Opsi 2: Deployment Permanen (Cloud Free Tier)

Ini membutuhkan pemisahan 3 layanan (karena gratis).

### 1. Database MySQL (TiDB Cloud atau Aiven)
Karena PlanetScale sudah berbayar, opsi MySQL gratis terbaik adalah **TiDB Cloud** atau **Aiven**.
1.  Daftar di [TiDB Cloud](https://tidbcloud.com/).
2.  Buat Cluster "Serverless" (Gratis).
3.  Ambil **Connection String** (Host, User, Password, Port).
4.  Update file `.env` di backend Anda dengan kredensial baru ini.
5.  Jalankan script migrasi SQL (`schema.sql`) ke database cloud tersebut (bisa pakai DBeaver/HeidiSQL dari laptop konek ke Cloud).

### 2. Backend (Render.com)
Render memiliki free tier untuk Web Service (Node.js).
1.  Push folder project ini ke **GitHub**.
2.  Daftar di [Render.com](https://render.com/).
3.  Buat "New Web Service".
4.  Connect ke Repo GitHub Anda.
5.  **Root Directory**: `backend` (Penting! karena server ada di folder backend).
6.  **Build Command**: `npm install`.
7.  **Start Command**: `node server.js`.
8.  **Environment Variables**: Masukkan `DB_HOST`, `DB_USER`, dll dari TiDB tadi.
9.  Setelah deploy, Anda dapat URL (misal: `https://steritrack-api.onrender.com`).

### 3. Frontend (Vercel)
Vercel adalah tempat terbaik untuk React/Vite.
1.  Daftar di [Vercel](https://vercel.com/).
2.  "Add New Project" -> Import dari GitHub yang sama.
3.  **Framework Preset**: Vite (biasanya otomatis terdeteksi).
4.  **Root Directory**: `./` (root folder).
5.  **Environment Variables**:
    *   Buat variable `VITE_API_URL` di Vercel, isi dengan URL Backend Render tadi (misal: `https://steritrack-api.onrender.com/api`).
    *   *Note*: Anda perlu update `apiService.ts` agar membaca `import.meta.env.VITE_API_URL` alih-alih hardcode localhost.
6.  Deploy!

---

## Ringkasan Perubahan Kode yang Diperlukan

Untuk Metode 2 (Cloud), Anda perlu sedikit update code agar dinamis:

**1. Update `services/apiService.ts`**
```typescript
// Ganti hardcode localhost dengan env variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
```

**2. Update `backend/db.js`**
Pastikan koneksi database menggunakan `process.env` (ini sudah Anda lakukan, jadi aman).

**3. Update `package.json` (Root)**
Vercel butuh script build. Pastikan:
```json
"scripts": {
  "build": "tsc && vite build" // atau sesuaikan dengan vite anda
}
```
((Project Anda sudah punya script build default Vite, jadi ini aman)).
