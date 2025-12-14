# 📋 PENJELASAN ALUR REQUEST (PERMINTAAN) PERAWAT

**Tanggal:** 10 Desember 2024  
**Topik:** Bagaimana Request Perawat Diproses dan Instrumen Masuk ke Inventaris Unit

---

## 🔍 PERTANYAAN ANDA:

> "Ketika perawat membuat permintaan dan sudah divalidasi, apakah instrumen otomatis ada di inventaris unit tersebut?"

---

## ⚠️ JAWABAN SINGKAT:

**TIDAK OTOMATIS!** ❌

Request (permintaan) dari perawat **TIDAK langsung menambahkan instrumen ke inventaris unit**. 

Request hanya mencatat **permintaan** yang perlu **diproses manual oleh CSSD** dengan membuat **transaksi distribusi**.

---

## 📊 ALUR LENGKAP REQUEST

### **STEP 1: Perawat Membuat Request** 📝

**Location:** Nurse View → Tab "Buat Permintaan"

**Proses:**
```
1. Perawat pilih instrumen/set yang dibutuhkan
2. Tentukan quantity
3. Klik "Kirim Permintaan"
4. System:
   ✅ INSERT ke tabel `requests` (status: PENDING)
   ✅ INSERT ke tabel `request_items`
   ❌ TIDAK update stok apapun
   ❌ TIDAK buat transaksi
```

**Database Changes:**
```sql
-- Tabel: requests
INSERT INTO requests (id, timestamp, unitId, status, requestedBy)
VALUES ('REQ-xxx', 1702234567890, 'unit-igd', 'PENDING', 'Siti');

-- Tabel: request_items
INSERT INTO request_items (requestId, itemId, itemType, quantity)
VALUES ('REQ-xxx', 'i1', 'SINGLE', 10);
```

**Status:** `PENDING` (Menunggu diproses CSSD)

---

### **STEP 2: CSSD Melihat Request** 👀

**Location:** CSSD View → Tab "Permintaan Unit"

**Yang Terlihat:**
```
┌─────────────────────────────────────┐
│ Permintaan dari Unit IGD            │
├─────────────────────────────────────┤
│ Diminta oleh: Siti                  │
│ Waktu: 10 Des 2024, 14:30           │
│                                     │
│ Items:                              │
│ • Gunting Bedah: 10 pcs             │
│ • Pinset: 5 pcs                     │
│                                     │
│ [Approve] [Reject]                  │
└─────────────────────────────────────┘
```

**Pilihan CSSD:**
- **Approve** → Lanjut ke Step 3
- **Reject** → Request ditolak, selesai

---

### **STEP 3: CSSD Approve Request** ✅

**Proses:**
```
1. CSSD klik "Approve"
2. System:
   ✅ UPDATE requests SET status = 'APPROVED'
   ❌ MASIH BELUM update stok
   ❌ MASIH BELUM buat transaksi
```

**Database Changes:**
```sql
UPDATE requests 
SET status = 'APPROVED' 
WHERE id = 'REQ-xxx';
```

**Status:** `APPROVED` (Disetujui, tapi belum diproses)

---

### **STEP 4: CSSD Membuat Transaksi Distribusi** 📦

**PENTING:** Ini step MANUAL yang harus dilakukan CSSD!

**Location:** CSSD View → Tab "Distribusi Steril"

**Proses:**
```
1. CSSD scan QR unit (IGD)
2. CSSD pilih instrumen yang akan dikirim
   (Bisa sesuai request, bisa berbeda)
3. CSSD klik "Buat Transaksi"
4. System:
   ✅ INSERT ke tabel `transactions` (status: PENDING)
   ✅ INSERT ke tabel `transaction_items`
   ✅ UPDATE stok CSSD (dikurangi)
   ❌ BELUM update stok unit (masih pending)
   ✅ Generate QR code transaksi
```

**Database Changes:**
```sql
-- Tabel: transactions
INSERT INTO transactions (id, timestamp, type, status, unitId, qrCode, createdBy)
VALUES ('TX-xxx', 1702234567890, 'DISTRIBUTE', 'PENDING', 'unit-igd', 'QR-xxx', 'Admin CSSD');

-- Tabel: transaction_items
INSERT INTO transaction_items (transactionId, instrumentId, count, itemType)
VALUES ('TX-xxx', 'i1', 10, 'SINGLE');

-- Update stok CSSD (dikurangi)
UPDATE instruments 
SET cssdStock = cssdStock - 10 
WHERE id = 'i1';
```

**Status Transaksi:** `PENDING` (Menunggu validasi perawat)

**QR Code:** Digenerate untuk validasi

---

### **STEP 5: Perawat Validasi Transaksi** ✅

**Location:** Nurse View → Tab "Terima Barang" → Scan QR

**Proses LAMA (Sebelum Enhancement):**
```
1. Perawat scan QR transaksi
2. Lihat daftar items
3. Klik "Konfirmasi & Validasi"
4. System:
   ✅ UPDATE transactions SET status = 'COMPLETED'
   ✅ UPDATE stok unit (ditambah)
   ✅ Instrumen MASUK ke inventaris unit
```

**Proses BARU (Setelah Enhancement):** ⭐
```
1. Perawat scan QR transaksi
2. Verifikasi FISIK setiap item:
   - Input: Diterima (OK)
   - Input: Rusak
   - Input: Hilang
   - Catatan kondisi
3. Klik "Konfirmasi & Validasi"
4. System:
   ✅ UPDATE transactions SET status = 'COMPLETED'
   ✅ UPDATE transaction_items (verification data)
   ✅ UPDATE stok unit (sesuai ACTUAL received)
   ✅ UPDATE broken stock (jika ada rusak)
   ✅ UPDATE total stock (kurangi jika hilang)
   ✅ CREATE audit log
   ✅ Instrumen MASUK ke inventaris unit (AKURAT!)
```

**Database Changes (Proses Baru):**
```sql
-- Update transaction
UPDATE transactions 
SET status = 'COMPLETED',
    validatedBy = 'Siti',
    validatedAt = 1702234567890,
    validationStatus = 'VERIFIED'  -- atau 'PARTIAL' jika ada discrepancy
WHERE id = 'TX-xxx';

-- Update verification data
UPDATE transaction_items
SET receivedCount = 8,      -- Yang diterima OK
    verifiedBroken = 2,     -- Yang rusak
    verifiedMissing = 0,    -- Yang hilang
    verificationNotes = 'Kemasan rusak'
WHERE transactionId = 'TX-xxx' AND instrumentId = 'i1';

-- Update stok unit (HANYA yang diterima OK!)
INSERT INTO instrument_unit_stock (instrumentId, unitId, quantity)
VALUES ('i1', 'unit-igd', 8)  -- Bukan 10!
ON DUPLICATE KEY UPDATE quantity = quantity + 8;

-- Update broken stock
UPDATE instruments
SET brokenStock = brokenStock + 2
WHERE id = 'i1';

-- Create audit log
INSERT INTO audit_logs (id, timestamp, userId, action, entityType, entityId, changes, severity)
VALUES ('AUD-xxx', 1702234567890, 'Siti', 'VALIDATE_TRANSACTION', 'transaction', 'TX-xxx', 
        '{"validationStatus":"PARTIAL","totalBroken":2}', 'WARNING');
```

**Status Transaksi:** `COMPLETED`

**✅ INSTRUMEN SEKARANG ADA DI INVENTARIS UNIT!**

---

## 📊 RINGKASAN ALUR LENGKAP

```
┌─────────────────────────────────────────────────────────────┐
│                    ALUR REQUEST LENGKAP                     │
└─────────────────────────────────────────────────────────────┘

STEP 1: PERAWAT BUAT REQUEST
┌──────────────────────┐
│ Nurse: Buat Request  │
│ Status: PENDING      │
│ Stok Unit: BELUM +   │ ❌ Belum ada di inventaris
└──────────┬───────────┘
           │
           ▼
STEP 2: CSSD REVIEW
┌──────────────────────┐
│ CSSD: Lihat Request  │
│ Pilih: Approve/Reject│
└──────────┬───────────┘
           │
           ▼
STEP 3: CSSD APPROVE
┌──────────────────────┐
│ Status: APPROVED     │
│ Stok Unit: BELUM +   │ ❌ Masih belum ada
└──────────┬───────────┘
           │
           ▼
STEP 4: CSSD BUAT TRANSAKSI (MANUAL!)
┌──────────────────────┐
│ CSSD: Distribusi     │
│ Scan QR Unit         │
│ Pilih Items          │
│ Buat Transaksi       │
│ Status: PENDING      │
│ Stok CSSD: -10       │ ✅ Dikurangi dari CSSD
│ Stok Unit: BELUM +   │ ❌ Masih belum di unit
└──────────┬───────────┘
           │
           ▼
STEP 5: PERAWAT VALIDASI (DENGAN VERIFIKASI FISIK!)
┌──────────────────────┐
│ Nurse: Scan QR TX    │
│ Verifikasi Fisik:    │
│ - Diterima: 8 ✅     │
│ - Rusak: 2 ⚠️        │
│ - Hilang: 0          │
│ Submit Validasi      │
│ Status: COMPLETED    │
│ Stok Unit: +8        │ ✅ SEKARANG ADA DI INVENTARIS!
└──────────────────────┘

✅ INSTRUMEN MASUK KE INVENTARIS UNIT
```

---

## 🎯 KESIMPULAN

### ❌ **Yang TIDAK Terjadi:**
1. Request **TIDAK** langsung menambah stok unit
2. Approve request **TIDAK** langsung menambah stok unit
3. Buat transaksi **TIDAK** langsung menambah stok unit

### ✅ **Yang TERJADI:**
1. Request hanya **mencatat permintaan** (status: PENDING)
2. Approve hanya **menyetujui permintaan** (status: APPROVED)
3. CSSD **manual buat transaksi** distribusi (status: PENDING)
4. Perawat **validasi dengan verifikasi fisik** (status: COMPLETED)
5. **BARU SETELAH VALIDASI**, instrumen masuk ke inventaris unit

---

## 📋 TABEL PERUBAHAN STOK

| Step | CSSD Stock | Unit Stock | Status |
|------|------------|------------|--------|
| **Initial** | 100 | 0 | - |
| **1. Request Created** | 100 | 0 | ❌ Belum berubah |
| **2. Request Approved** | 100 | 0 | ❌ Belum berubah |
| **3. Transaction Created** | 90 | 0 | ⚠️ CSSD -10, Unit belum + |
| **4. Transaction Validated** | 90 | 8 | ✅ Unit +8 (actual received) |

**Catatan:** 
- 2 item rusak → masuk `brokenStock`
- Stok unit hanya +8 (bukan +10) karena verifikasi fisik

---

## 💡 REKOMENDASI

### Untuk Mempermudah Proses:

**Option 1: Auto-Create Transaction dari Approved Request**
```javascript
// Ketika CSSD approve request, otomatis buat draft transaction
exports.approveRequest = async (req, res) => {
    // 1. Update request status
    await db.query('UPDATE requests SET status = "APPROVED" WHERE id = ?', [requestId]);
    
    // 2. Auto-create draft transaction
    const draftTxId = generateId();
    await db.query('INSERT INTO transactions (id, ..., status) VALUES (?, ..., "DRAFT")', [draftTxId]);
    
    // 3. Copy items from request to transaction
    // ...
    
    res.json({ message: 'Request approved and draft transaction created', draftTxId });
};
```

**Option 2: Link Request to Transaction**
```sql
-- Add column to transactions table
ALTER TABLE transactions ADD COLUMN requestId VARCHAR(50);
ALTER TABLE transactions ADD FOREIGN KEY (requestId) REFERENCES requests(id);

-- When creating transaction, link to request
INSERT INTO transactions (id, requestId, ...)
VALUES ('TX-xxx', 'REQ-xxx', ...);
```

**Option 3: Notification System**
```javascript
// Notify CSSD when request is created
// Notify nurse when request is approved
// Notify nurse when transaction is ready for validation
```

---

## 🔍 CARA CEK STOK UNIT

### Query untuk Cek Stok Unit:
```sql
-- Cek stok instrumen di unit tertentu
SELECT 
    i.id,
    i.name,
    ius.quantity as unitStock
FROM instruments i
LEFT JOIN instrument_unit_stock ius ON i.id = ius.instrumentId AND ius.unitId = 'unit-igd'
WHERE i.id = 'i1';

-- Cek semua stok di unit
SELECT 
    i.name,
    ius.quantity
FROM instrument_unit_stock ius
JOIN instruments i ON ius.instrumentId = i.id
WHERE ius.unitId = 'unit-igd'
ORDER BY i.name;
```

### Query untuk Trace Request ke Transaction:
```sql
-- Lihat request dan transaksi terkait
SELECT 
    r.id as requestId,
    r.status as requestStatus,
    r.requestedBy,
    t.id as transactionId,
    t.status as transactionStatus,
    t.validatedBy
FROM requests r
LEFT JOIN transactions t ON t.unitId = r.unitId 
    AND t.timestamp >= r.timestamp
WHERE r.id = 'REQ-xxx';
```

---

## 📞 FAQ

**Q: Kenapa tidak otomatis saja?**
A: Karena:
1. CSSD perlu **cek ketersediaan fisik** dulu
2. CSSD mungkin **kirim partial** (tidak semua yang diminta)
3. CSSD perlu **prepare & sterilize** instrumen
4. Perlu **QR code** untuk tracking

**Q: Bagaimana jika request tidak diproses?**
A: Request akan tetap status `PENDING` atau `APPROVED` tanpa transaksi. Tidak ada perubahan stok.

**Q: Apakah bisa satu transaksi untuk multiple requests?**
A: Bisa, tapi saat ini tidak ada linking otomatis. CSSD manual pilih items.

**Q: Bagaimana tracking request yang sudah dipenuhi?**
A: Saat ini tidak ada linking langsung. Rekomendasi: tambah `requestId` di tabel `transactions`.

---

**Kesimpulan:**

**Instrumen HANYA masuk ke inventaris unit SETELAH:**
1. ✅ CSSD buat transaksi distribusi
2. ✅ Perawat validasi transaksi (dengan verifikasi fisik)
3. ✅ Status transaksi = COMPLETED

**Request hanya mencatat permintaan, TIDAK mengubah stok!**

---

**Dibuat:** 10 Desember 2024, 22:26 WIB  
**Topik:** Alur Request & Inventaris Unit  
**Status:** Dokumentasi Lengkap
