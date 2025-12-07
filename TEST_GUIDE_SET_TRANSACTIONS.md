# 🧪 TEST GUIDE: Transaksi dengan Set Instrumen

## 📋 **PRE-REQUISITES:**

### **Check Available Data:**
```sql
-- 1. Check instrument sets
SELECT id, name, is_active FROM instrument_sets WHERE is_active = 1;

-- 2. Check set contents
SELECT 
    iss.setId,
    s.name as set_name,
    iss.instrumentId,
    i.name as instrument_name,
    iss.quantity
FROM instrument_set_items iss
JOIN instrument_sets s ON iss.setId = s.id
JOIN instruments i ON iss.instrumentId = i.id
WHERE s.is_active = 1;

-- 3. Check units
SELECT id, name FROM units WHERE is_active = 1;

-- 4. Check CSSD stock
SELECT id, name, cssdStock FROM instruments WHERE cssdStock > 0 LIMIT 5;
```

---

## 🎯 **TEST SCENARIO 1: Distribute Set Only**

### **Steps:**
1. **Login sebagai CSSD**
   - Username: `admin` atau CSSD user
   - Password: (your password)

2. **Klik "Operasional CSSD"**

3. **Pilih "Distribusi"**

4. **Scan QR Unit atau Input Manual**
   - Contoh: `UNIT-OK-001` (Kamar Operasi)
   - Atau scan QR unit yang tersedia

5. **Pilih Tab "Set Instrumen"**
   - Lihat daftar set yang tersedia
   - Contoh: "Set Operasi Minor", "Set Bedah Umum", dll

6. **Klik "Tambah" pada Set**
   - Pilih set yang ingin didistribusikan
   - Set quantity (default: 1)
   - Bisa tambah quantity dengan tombol +/-

7. **Klik "Kirim & Buat QR"**

8. **Verifikasi:**
   - ✅ QR Code muncul
   - ✅ Transaction ID ditampilkan
   - ✅ Status: PENDING

---

## 🎯 **TEST SCENARIO 2: Distribute Mixed (Single + Set)**

### **Steps:**
1. **Login sebagai CSSD**

2. **Klik "Operasional CSSD" → "Distribusi"**

3. **Scan/Input Unit**

4. **Pilih Tab "Instrumen Satuan"**
   - Tambah beberapa instrumen satuan
   - Contoh: 5x Gunting, 3x Pinset

5. **Pilih Tab "Set Instrumen"**
   - Tambah 1 atau lebih set
   - Contoh: 2x Set Operasi Minor

6. **Klik "Kirim & Buat QR"**

7. **Verifikasi:**
   - ✅ QR Code muncul
   - ✅ Menampilkan total items (single + sets)

---

## 🎯 **TEST SCENARIO 3: Nurse Validation**

### **Steps:**
1. **Login sebagai Nurse**
   - Unit harus sesuai dengan transaksi yang dibuat

2. **Klik "Stasiun Perawat"**

3. **Tab "Terima Barang"**

4. **Klik "Scan QR Transaksi"**
   - Scan QR yang dibuat CSSD
   - Atau input manual Transaction ID

5. **Verifikasi Display:**
   - ✅ **Section "Instrumen Satuan"** (jika ada single items)
     - Nama instrumen
     - Quantity
   
   - ✅ **Section "Set Instrumen"** (jika ada sets)
     - Nama set
     - Quantity set
     - **Isi set** (bulleted list)
     - Quantity per item (calculated)

6. **Klik "Konfirmasi & Validasi"**

7. **Verifikasi:**
   - ✅ Toast: "Transaksi Berhasil Divalidasi!"
   - ✅ Status berubah: COMPLETED
   - ✅ Stock updated

---

## 🔍 **VERIFICATION QUERIES:**

### **After Creating Transaction:**
```sql
-- Check transaction created
SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 1;

-- Check transaction items (single)
SELECT * FROM transaction_items WHERE transactionId = 'TX-ID-HERE';

-- Check transaction set items
SELECT * FROM transaction_set_items WHERE transactionId = 'TX-ID-HERE';

-- Should have at least one of the above!
```

### **After Validation:**
```sql
-- Check transaction status
SELECT id, type, status, validatedBy 
FROM transactions 
WHERE id = 'TX-ID-HERE';
-- Status should be COMPLETED

-- Check stock updates
SELECT 
    i.id,
    i.name,
    i.cssdStock,
    i.dirtyStock,
    i.totalStock
FROM instruments i
WHERE i.id IN (
    SELECT instrumentId FROM transaction_items WHERE transactionId = 'TX-ID-HERE'
);

-- Check unit stock
SELECT * FROM instrument_unit_stock WHERE unitId = 'UNIT-ID-HERE';
```

---

## ⚠️ **COMMON ISSUES & SOLUTIONS:**

### **Issue 1: "No sets available"**
**Solution:** Create a set first in Admin panel
```
Admin → Set Instrumen → Buat Set Baru
```

### **Issue 2: "Insufficient stock"**
**Solution:** Check CSSD stock for instruments in the set
```sql
SELECT 
    i.id,
    i.name,
    i.cssdStock,
    isi.quantity as needed_per_set
FROM instrument_set_items isi
JOIN instruments i ON isi.instrumentId = i.id
WHERE isi.setId = 'SET-ID-HERE';
```

### **Issue 3: "Transaction created but 0 items"**
**Solution:** 
- Backend restarted? ✅
- Validation active? ✅
- Items selected before submit? ✅

### **Issue 4: "Set items not showing in validation"**
**Solution:**
- NurseView updated? ✅
- `sets` in useAppContext? ✅
- Backend returns setItems? ✅

---

## 📊 **EXPECTED RESULTS:**

### **Database After Distribute Set:**
```sql
-- transactions table
id: TX-1234567890
type: DISTRIBUTE
status: PENDING
unitId: u1
setItems: (should exist)

-- transaction_set_items table
transactionId: TX-1234567890
setId: set-minor
quantity: 2

-- instrument_unit_stock table (after validation)
instrumentId: i-gunting
unitId: u1
quantity: 4  (2 sets × 2 per set)
```

### **Stock Changes After Validation:**
```
BEFORE:
- CSSD Stock: 20
- Unit Stock: 0

AFTER (2x Set with 2 gunting per set):
- CSSD Stock: 16  (20 - 4)
- Unit Stock: 4   (0 + 4)
```

---

## ✅ **SUCCESS CRITERIA:**

### **Transaction Creation:**
- ✅ Set can be selected
- ✅ Quantity can be adjusted
- ✅ Transaction created with setItems
- ✅ QR code generated
- ✅ No "0 items" transactions

### **Nurse Validation:**
- ✅ Set items displayed
- ✅ Set contents shown (bulleted)
- ✅ Quantities calculated correctly
- ✅ Validation succeeds
- ✅ Stock updated correctly

### **Database:**
- ✅ transaction_set_items populated
- ✅ instrument_unit_stock updated
- ✅ CSSD stock reduced
- ✅ No orphaned transactions

---

## 🎬 **QUICK TEST COMMANDS:**

### **1. Check Current State:**
```sql
SELECT COUNT(*) as total_sets FROM instrument_sets WHERE is_active = 1;
SELECT COUNT(*) as total_units FROM units WHERE is_active = 1;
SELECT COUNT(*) as total_transactions FROM transactions;
```

### **2. After Test:**
```sql
-- Latest transaction
SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 1;

-- Its items
SELECT 'Single Items' as type, COUNT(*) as count FROM transaction_items WHERE transactionId = (SELECT id FROM transactions ORDER BY timestamp DESC LIMIT 1)
UNION ALL
SELECT 'Set Items', COUNT(*) FROM transaction_set_items WHERE transactionId = (SELECT id FROM transactions ORDER BY timestamp DESC LIMIT 1);
```

### **3. Cleanup Test Data (if needed):**
```sql
-- Delete test transactions
DELETE FROM transactions WHERE createdBy = 'TEST';
-- Or specific ID
DELETE FROM transactions WHERE id = 'TX-TEST-123';
```

---

## 📝 **TEST CHECKLIST:**

- [ ] Set tersedia di database
- [ ] Set memiliki items (instrument_set_items)
- [ ] CSSD stock cukup untuk set
- [ ] Unit tersedia dan aktif
- [ ] Backend running dan updated
- [ ] Frontend running
- [ ] Login sebagai CSSD
- [ ] Buat transaksi dengan set
- [ ] QR code muncul
- [ ] Transaction ID valid
- [ ] Login sebagai Nurse
- [ ] Scan QR / input ID
- [ ] Set items ditampilkan dengan detail
- [ ] Validasi berhasil
- [ ] Stock updated di database
- [ ] Unit stock bertambah
- [ ] CSSD stock berkurang
- [ ] No errors in console

---

**Dibuat:** 7 Desember 2024, 19:46 WIB
**Status:** Ready for Testing
**Version:** 1.0
