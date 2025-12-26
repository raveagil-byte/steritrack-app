# Database Backup Guide (PostgreSQL)

Karena aplikasi telah migrasi ke **PostgreSQL**, mekanisme backup lama (`mysqldump`) tidak lagi berlaku. Gunakan panduan ini untuk melakukan backup.

## 1. Persiapan

Pastikan **PostgreSQL** sudah terinstall di komputer Anda (biasanya terinstall terpisah atau via Laragon Extension).
Anda harus memastikan command `pg_dump` bisa dijalankan dari terminal.

### Cek `pg_dump`:
Buka terminal dan ketik:
```bash
pg_dump --version
```
Jika error (not recognized), tambahkan folder `bin` PostgreSQL ke **Environment Variables > Path**.
*Contoh Path:* `C:\Program Files\PostgreSQL\16\bin`

## 2. Cara Backup (Manual)

Telah disediakan script otomatis untuk memudahkan backup.

1. Jalankan file `backup_db.bat` (Double click).
2. Script akan membuat folder `backups/` jika belum ada.
3. File SQL akan dibuat dengan nama `steritrack_backup_YYYYMMDD_HHMMSS.sql`.

## 3. Cara Restore

Untuk mengembalikan data dari file backup:

**Via Terminal:**
```bash
psql -h localhost -U postgres -d steritrack < backups/nama_file_backup.sql
```

**Via Adminer/DBeaver:**
1. Buka Adminer/DBeaver.
2. Connect ke database `steritrack`.
3. Pilih menu **Import** atau **Execute SQL Script**.
4. Pilih file `.sql` dari folder `backups/`.

---
**Catatan:** Script `backup_db.bat` menggunakan default user `postgres` dan database `steritrack`. Edit file tersebut jika konfigurasi Anda berbeda.
