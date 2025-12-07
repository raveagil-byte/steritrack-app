# TROUBLESHOOTING: Detail Instrumen Tidak Menampilkan Lokasi Unit

## 🔴 MASALAH
Saat klik instrumen di InventoryView, modal detail tidak menampilkan breakdown lokasi per unit.

## 🔍 DIAGNOSIS

### Yang Sudah Benar:
1. ✅ Backend `attachUnitStock()` - Sudah query `instrument_unit_stock`
2. ✅ Frontend `InstrumentDetailModal` - Sudah render breakdown per unit
3. ✅ Database schema - Tabel `instrument_unit_stock` sudah ada

### Masalah Ditemukan:
❌ **Tabel `instrument_unit_stock` KOSONG** - Tidak ada data

## 🎯 PENYEBAB

Ada 2 kemungkinan:

### 1. Belum Ada Transaksi yang Berhasil
- User belum melakukan distribusi
- Atau distribusi gagal di tengah jalan

### 2. Insert Items Gagal (Lebih Mungkin)
- Ada 1 transaksi di database
- Tapi 0 items (seharusnya ada items)
- Berarti `createTransaction` gagal insert items

## 🔧 SOLUSI

### Solusi 1: Test Manual Insert

Jalankan di MySQL:

```sql
USE steritrack;

-- Ambil ID instrument dan unit
SELECT id, name FROM instruments LIMIT 1;
SELECT id, name FROM units LIMIT 1;

-- Insert manual (ganti dengan ID yang sebenarnya)
INSERT INTO instrument_unit_stock (instrumentId, unitId, quantity) 
VALUES ('i-xxx', 'u1', 10);

-- Verifikasi
SELECT * FROM instrument_unit_stock;
```

Kemudian **refresh browser** dan cek apakah lokasi muncul di modal detail.

### Solusi 2: Buat Transaksi Baru

1. **Hapus transaksi yang gagal:**
```sql
DELETE FROM transactions;
DELETE FROM transaction_items;
DELETE FROM transaction_set_items;
```

2. **Buat transaksi baru dari aplikasi:**
   - Login CSSD
   - Distribusi item ke unit
   - Pastikan ada items yang dipilih
   - Submit

3. **Cek database:**
```sql
-- Harus ada data
SELECT * FROM transaction_items;

-- Harus ada data
SELECT * FROM instrument_unit_stock;
```

### Solusi 3: Debug Frontend

Buka browser console (F12) saat create transaction, cek:

1. **Request payload:**
```javascript
{
  "items": [...],  // Harus ada isi, tidak boleh []
  "setItems": [...] // Boleh kosong jika tidak pakai set
}
```

2. **Response dari backend:**
```javascript
{ "message": "Transaction created" }
```

3. **Cek error di console** - Jika ada error, catat dan perbaiki

## 📊 VERIFIKASI SETELAH FIX

### 1. Cek Database:
```sql
-- Harus ada data
SELECT 
    i.name as instrument,
    u.name as unit,
    ius.quantity
FROM instrument_unit_stock ius
JOIN instruments i ON ius.instrumentId = i.id
JOIN units u ON ius.unitId = u.id;
```

### 2. Cek API Response:
```bash
# Test endpoint
curl http://localhost:3000/api/instruments
```

Response harus include `unitStock`:
```json
[
  {
    "id": "i-123",
    "name": "Gunting",
    "unitStock": {
      "u1": 5,
      "u2": 3
    }
  }
]
```

### 3. Cek UI:
- Klik instrumen di InventoryView
- Modal muncul
- Section "Lokasi Saat Ini" harus menampilkan:
  ```
  IGD (Instalasi Gawat Darurat)    5
  Kamar Operasi 1 (OK)              3
  ```

## 🎯 NEXT STEPS

1. **Jalankan test manual insert** (Solusi 1)
2. **Jika berhasil tampil** → Masalah di create transaction
3. **Debug create transaction** → Cek console browser
4. **Fix bug** → Test lagi

## 📝 CATATAN

Jika setelah insert manual data tampil dengan benar, berarti:
- ✅ Backend query berfungsi
- ✅ Frontend render berfungsi
- ❌ **Masalah di create transaction**

Fokus perbaikan di:
- `hooks/useQueries.ts` - mutation createTransaction
- `components/TransactionForm.tsx` - saat submit
- `backend/controllers/transactionsController.js` - saat insert items

---

**Dibuat:** 7 Desember 2024, 18:10 WIB
**Status:** Menunggu test manual
