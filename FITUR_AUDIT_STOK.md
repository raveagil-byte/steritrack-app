# Fitur Audit Kewajaran Stok

## Tujuan
Fitur ini membantu Admin untuk memvalidasi konsistensi data stok antara **Instrumen Set** dan **Instrumen Tunggal (Single)**.

## Cara Kerja

### Logika Validasi
Sistem memeriksa apakah stok instrumen tunggal mencukupi untuk membentuk jumlah set yang terdata.

**Rumus:**
```
Stok Dibutuhkan = Stok Set × Qty Item per Set
```

**Contoh:**
- **Dressing Set** memiliki stok: **50 set**
- Resep Dressing Set: 2× Gunting + 1× Pinset
- **Kebutuhan:**
  - Gunting: 50 × 2 = **100 pcs**
  - Pinset: 50 × 1 = **50 pcs**

**Hasil Audit:**
- ✅ **WAJAR** jika Stok Gunting ≥ 100 dan Stok Pinset ≥ 50
- ❌ **TIDAK WAJAR** jika Stok Gunting < 100 atau Stok Pinset < 50

## Cara Menggunakan

1. Login sebagai **Admin**
2. Buka menu **Admin > Audit Stok**
3. Klik tombol **"Jalankan Audit"**
4. Sistem akan menampilkan hasil:
   - **Hijau:** Semua stok wajar
   - **Kuning:** Ada ketidakwajaran (dengan detail tabel)

## Interpretasi Hasil

### Jika Ada Ketidakwajaran
Tabel akan menampilkan:
- **Nama Set:** Set yang bermasalah
- **Item yang Kurang:** Instrumen tunggal yang stoknya kurang
- **Stok Set:** Jumlah set yang terdata
- **Qty/Set:** Jumlah item per set
- **Dibutuhkan:** Total item yang seharusnya ada
- **Tersedia:** Stok aktual item tunggal
- **Selisih:** Kekurangan stok (angka negatif)

### Tindakan yang Disarankan
1. **Koreksi Stok Set:** Kurangi jumlah set hingga sesuai dengan ketersediaan item
2. **Tambah Stok Single:** Beli/tambah stok instrumen tunggal yang kurang
3. **Verifikasi Data:** Pastikan data import dari Excel sudah benar

## Catatan Teknis
- Audit bersifat **read-only** (tidak mengubah data)
- Dapat dijalankan kapan saja tanpa mengganggu operasional
- Hasil audit tidak disimpan (harus dijalankan ulang untuk update)

## API Endpoint
```
GET /api/audit/stock-consistency
```

**Response:**
```json
{
  "status": "success",
  "issuesCount": 2,
  "issues": [
    {
      "SetName": "Dressing Set",
      "ItemName": "Gunting Littauer",
      "SetStock": 50,
      "QtyPerSet": 2,
      "RequiredTotal": 100,
      "AvailableSingleStock": 80
    }
  ],
  "message": "Ditemukan 2 ketidakwajaran stok..."
}
```
