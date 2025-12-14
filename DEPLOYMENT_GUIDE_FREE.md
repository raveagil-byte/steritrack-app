# Panduan Deployment Gratis (Free Tier)

Panduan ini akan membantu Anda men-deploy aplikasi SteriTrack ke server gratis.
Kita akan menggunakan kombinasi layanan berikut agar tetap valid dalam "Free Tier":

1.  **Database**: **Aiven Cloud** (MySQL Free Tier) atau **TiDB Cloud** (Serverless MySQL).
2.  **Backend**: **Render** (Web Service Free Tier).
3.  **Frontend**: **Vercel** (Hobby Plan).

---

## Langkah 1: Persiapan Database (MySQL)

Karena Render tidak menyediakan MySQL gratis, kita gunakan layanan pihak ketiga.

1.  Daftar di [Aiven](https://aiven.io/) atau [TiDB Cloud](https://tidbcloud.com/).
2.  Buat **MySQL Database** baru (pilih opsi Free/Developer/Hobby).
3.  Setelah aktif, cari **Connection Details**. Anda akan membutuhkan:
    -   **Host** (misal: `mysql-service-account.aivencloud.com`)
    -   **Port** (biasanya `3306` atau port khusus)
    -   **User**
    -   **Password**
    -   **Database Name** (misal: `defaultdb` atau buat baru `steritrack`)

> **Catatan**: Pastikan untuk menyalin *connection string* atau detail di atas.

---

## Langkah 2: Persiapan Kode (GitHub)

Pastikan kode Anda sudah ada di GitHub. Jika belum:
1.  Login ke GitHub dan buat repository baru (misal: `steritrack-app`).
2.  Push kode lokal Anda ke sana.

---

## Langkah 3: Deploy Backend ke Render

1.  Daftar/Login ke [Render.com](https://render.com/).
2.  Klik **New +** -> **Web Service**.
3.  Hubungkan akun GitHub Anda dan pilih repository `steritrack-app`.
4.  Konfigurasi:
    -   **Name**: `steritrack-backend` (bebas)
    -   **Region**: Singapore (terdekat) atau sesuai preferensi.
    -   **Branch**: `main` (atau branch aktif Anda).
    -   **Root Directory**: `.` (biarkan kosong atau titik).
    -   **Runtime**: `Node`.
    -   **Build Command**: `npm install`
    -   **Start Command**: `node backend/server.js`
    -   **Instance Type**: Free.

5.  **Environment Variables** (Wjib Diisi di menu Advanced):
    Masukkan detail dari Langkah 1:
    -   `DB_HOST`: (Host dari Aiven/TiDB)
    -   `DB_USER`: (User database)
    -   `DB_PASSWORD`: (Password database)
    -   `DB_NAME`: (Nama database)
    -   `DB_PORT`: (Port database, misal `3306` atau `port lain`)
    -   `NODE_ENV`: `production`

6.  Klik **Create Web Service**.
    -   Render akan mulai membangun. Tunggu sampai status "Live".
    -   Salin URL backend Anda (misal: `https://steritrack-backend.onrender.com`).

---

## Langkah 4: Deploy Frontend ke Vercel

1.  Daftar/Login ke [Vercel.com](https://vercel.com/).
2.  Klik **Add New...** -> **Project**.
3.  Import repository `steritrack-app` dari GitHub.
4.  Konfigurasi Project:
    -   **Framework Preset**: Vite (biasanya terdeteksi otomatis).
    -   **Build Command**: `npm run build` (default).
    -   **Output Directory**: `dist` (default).
    
5.  **Environment Variables**:
    -   Tambahkan variabel baru agar Frontend bisa bicara ke Backend.
    -   Nama: `VITE_API_URL`
    -   Value: `https://steritrack-backend.onrender.com/api`
        -   *(Ganti URL dengan URL backend Render Anda, jangan lupa tambahkan `/api` di ujungnya jika kode mengharapkannya, atau cek `apiService.ts`)*.
        -   **PENTING**: Di `services/apiService.ts`, kode Anda menggunakan `VITE_API_URL || '/api'`.
        -   Jika Anda set `VITE_API_URL` menjadi `https://.../api`, maka request ke 'units' akan menjadi `https://.../api/units`. Ini BENAR.

6.  Klik **Deploy**.

---

## Langkah 5: Finalisasi & Migrasi Database

Karena database di Cloud masih kosong, Anda perlu menjalankan skrip migrasi atau import data.

**Opsi A (Manual via Koneksi Lokal)**:
1.  Di komputer lokal, ubah file `.env` sementara untuk mengarah ke Database Cloud (Host, User, Pass cloud).
2.  Jalankan skrip inisialisasi tabel:
    ```bash
    node backend/schema.sql  # (Ini file SQL, jalankan via MySQL Client)
    # ATAU jika ada script JS migration:
    node backend/check_audit_schema.js
    ```
    *Saran: Gunakan tool seperti DBeaver atau HeidiSQL di laptop Anda, konek ke Database Cloud, lalu jalankan isi file `backend/schema.sql`.*

**Opsi B (Via Backend Endpoint - Jika Ada)**:
-   Jika Anda memiliki endpoint setup, Anda bisa akses via Postman.

---

## Troubleshooting Umum

1.  **CORS Error**:
    -   Jika Frontend gagal fetch data, pastikan di `backend/server.js` bagian `cors()` mengizinkan domain Vercel Anda.
    -   Ubah `app.use(cors())` menjadi konfigurasi spesifik jika perlu, atau biarkan kosong (default allow all) untuk tes awal.
    
2.  **Database Error**:
    -   Cek Logs di Dashboard Render. Pastikan koneksi sukses.
    -   Free Tier MySQL (Aiven) kadang membutuhkan SSL (`ssl: { rejectUnauthorized: false }`) di konfigurasi `mysql2`. Jika gagal konek, cek `backend/db.js`.

Selamat mencoba!
