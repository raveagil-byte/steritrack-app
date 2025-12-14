# Panduan Deployment Gratis (VERCEL ONLY - No Credit Card)

Panduan ini telah diperbarui untuk menggunakan **Vercel** sebagai "One-Stop Solution" (Frontend + Backend), karena layanan lain membutuhkan Kartu Kredit.

1.  **Database**: **Aiven Cloud** (MySQL Free Tier) atau **TiDB Cloud**.
2.  **App Hosting**: **Vercel** (Hobby Plan).

---

## Langkah 1: Persiapan Database (MySQL)

Sama seperti sebelumnya, kita butuh database eksternal gratis.

1.  Daftar di [Aiven](https://aiven.io/) atau [TiDB Cloud](https://tidbcloud.com/).
2.  Buat **MySQL Database** baru.
3.  Simpan detail koneksi (Host, Port, User, Password, DB Name).

---

## Langkah 2: Persiapan Kode (GitHub)

Kode sudah saya sesuaikan agar kompatibel dengan Vercel Serverless.
Pastikan Anda melakukan *Push* terakhir ke GitHub.

1.  `git add .`
2.  `git commit -m "Setup for Vercel Serverless Backend"`
3.  `git push`

---

## Langkah 3: Deploy ke Vercel

1.  Login ke [Vercel.com](https://vercel.com/).
2.  Klik **Add New...** -> **Project**.
3.  Import repository `steritrack-app` dari GitHub.
4.  **Framework Preset**: Biarkan `Vite`.
5.  **Root Directory**: Biarkan `./`.

6.  **Environment Variables**:
    Masukkan semua variabel di sini (Gabungan Backend & Frontend):
    
    **Database (Dari Aiven/TiDB):**
    -   `DB_HOST`: ...
    -   `DB_PORT`: ...
    -   `DB_USER`: ...
    -   `DB_PASSWORD`: ...
    -   `DB_NAME`: ...
    -   `DB_SSL`: `true`
    -   `NODE_ENV`: `production`

    **Frontend:**
    -   `VITE_API_URL`: `/api`
        *(Catatan: Karena frontend dan backend di domain yang sama, kita cukup gunakan `/api`, tidak perlu URL lengkap).*

7.  Klik **Deploy**.

---

## Langkah 4: Verifikasi

Setelah deploy sukses (Status "Ready"):
1.  Buka aplikasi Anda (klik thumbnail/link domain vercel.app).
2.  Coba login atau daftar user baru.
3.  Jika berhasil, maka backend (serverless function) sudah berjalan.

---

## Troubleshooting

1.  **Error 500 saat Login/Register**:
    -   Cek **Logs** di dashboard Vercel -> tab **Functions**.
    -   Biasanya karena koneksi database gagal. Pastikan `DB_SSL` = `true`.

2.  **Git Permission Error**:
    -   Lihat panduan sebelumnya jika mengalami masalah push.

Selamat mencoba free deploy tanpa kartu kredit!
