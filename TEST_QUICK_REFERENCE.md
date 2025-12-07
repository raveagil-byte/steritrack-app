# ✅ TEST READY: Transaksi Set Instrumen

## 📋 **DATA CHECK RESULTS:**

Berdasarkan pengecekan database:
- ✅ **Active Sets:** 1 set tersedia
- ✅ **Active Units:** Multiple units tersedia
- ✅ **CSSD Stock:** Instrumen tersedia
- ✅ **Backend:** Running on port 3000

---

## 🎯 **QUICK TEST STEPS:**

### **SCENARIO: Distribute Set Instrumen**

#### **1. Login sebagai CSSD** 👨‍⚕️
```
URL: http://localhost:5173
Username: admin (atau CSSD user)
Password: (your password)
```

#### **2. Buat Transaksi Distribusi** 📦
1. Klik **"Operasional CSSD"**
2. Pilih **"Distribusi"**
3. Scan QR Unit atau input manual:
   - Contoh: `UNIT-OK-001`
   - Atau pilih dari list

#### **3. Pilih Set Instrumen** 🎁
1. Klik tab **"Set Instrumen"**
2. Lihat set yang tersedia
3. Klik **"Tambah"** pada set yang ingin didistribusikan
4. Atur quantity (default: 1)
   - Gunakan +/- untuk adjust
5. Klik **"Kirim & Buat QR"**

#### **4. Verifikasi QR Code** ✅
- QR Code muncul
- Transaction ID ditampilkan
- Status: PENDING
- Bisa print atau save QR

---

### **SCENARIO: Validasi oleh Nurse**

#### **1. Login sebagai Nurse** 👩‍⚕️
```
Username: nurse (atau user dengan role NURSE)
Unit: Harus sesuai dengan transaksi
```

#### **2. Scan Transaksi** 📱
1. Klik **"Stasiun Perawat"**
2. Tab **"Terima Barang"**
3. Klik **"Scan QR Transaksi"**
4. Scan QR atau input Transaction ID manual

#### **3. Verifikasi Display** 👀
Harus menampilkan:
- ✅ **Section "Set Instrumen"** (background ungu)
- ✅ Nama set
- ✅ Quantity set
- ✅ **Isi set** (bulleted list):
  - Nama instrumen
  - Quantity per item
  - Total quantity (qty × set qty)

#### **4. Validasi** ✅
1. Klik **"Konfirmasi & Validasi"**
2. Toast muncul: "Transaksi Berhasil Divalidasi!"
3. Status berubah: COMPLETED

---

## 🔍 **VERIFICATION CHECKLIST:**

### **After Creating Transaction:**
- [ ] QR Code generated
- [ ] Transaction ID valid
- [ ] No "0 items" error
- [ ] Console: No errors

### **Database Check:**
```sql
-- Latest transaction
SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 1;

-- Should have set items
SELECT * FROM transaction_set_items 
WHERE transactionId = (SELECT id FROM transactions ORDER BY timestamp DESC LIMIT 1);
```

### **After Validation:**
- [ ] Toast success message
- [ ] Status = COMPLETED
- [ ] CSSD stock reduced
- [ ] Unit stock increased

### **Database Check:**
```sql
-- Check stock updated
SELECT * FROM instrument_unit_stock WHERE unitId = 'YOUR-UNIT-ID';

-- Check transaction completed
SELECT id, status, validatedBy FROM transactions ORDER BY timestamp DESC LIMIT 1;
```

---

## 🐛 **TROUBLESHOOTING:**

### **Problem: "No sets available"**
**Solution:**
```
1. Go to Admin panel
2. Click "Set Instrumen"
3. Create a new set
4. Add instruments to set
5. Set as active
```

### **Problem: "Insufficient stock"**
**Check:**
```sql
SELECT 
    i.name,
    i.cssdStock,
    isi.quantity as needed
FROM instrument_set_items isi
JOIN instruments i ON isi.instrumentId = i.id
WHERE isi.setId = 'YOUR-SET-ID';
```

**Solution:** Add stock to instruments in CSSD

### **Problem: "Set items not showing in validation"**
**Check:**
1. NurseView updated? ✅
2. Backend restarted? ✅
3. `sets` in useAppContext? ✅
4. Browser cache cleared? ✅

### **Problem: "Transaction created but 0 items"**
**Solution:**
1. Backend restarted? ✅
2. Validation active? ✅
3. Items selected before submit? ✅

---

## 📊 **EXPECTED RESULTS:**

### **Example: 2x Set Operasi Minor**

**Set Contents:**
- 2x Gunting Mayo per set
- 3x Klem Arteri per set
- 2x Pinset Chirurgis per set

**After Distribute 2 sets:**
```
CSSD Stock Changes:
- Gunting Mayo: -4 (2 sets × 2)
- Klem Arteri: -6 (2 sets × 3)
- Pinset Chirurgis: -4 (2 sets × 2)

Unit Stock Changes:
- Gunting Mayo: +4
- Klem Arteri: +6
- Pinset Chirurgis: +4
```

**Database:**
```sql
-- transaction_set_items
transactionId: TX-1234567890
setId: set-minor
quantity: 2

-- instrument_unit_stock (after validation)
instrumentId: i-gunting-mayo, unitId: u1, quantity: 4
instrumentId: i-klem-arteri, unitId: u1, quantity: 6
instrumentId: i-pinset-chirurgis, unitId: u1, quantity: 4
```

---

## 🎬 **QUICK COMMANDS:**

### **Check Data Ready:**
```powershell
Get-Content backend/test_check_data.sql | mysql -u root
```

### **Check Latest Transaction:**
```sql
SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 1;
```

### **Check Set Items:**
```sql
SELECT * FROM transaction_set_items 
WHERE transactionId = (SELECT id FROM transactions ORDER BY timestamp DESC LIMIT 1);
```

### **Check Stock Updates:**
```sql
SELECT * FROM instrument_unit_stock ORDER BY instrumentId, unitId;
```

---

## ✅ **SUCCESS CRITERIA:**

- ✅ Set can be selected in CSSD form
- ✅ Quantity can be adjusted
- ✅ Transaction created with setItems
- ✅ QR code generated
- ✅ Set items displayed in Nurse validation
- ✅ Set contents shown (bulleted list)
- ✅ Validation succeeds
- ✅ Stock updated correctly
- ✅ No errors in console
- ✅ No orphaned transactions

---

## 📝 **DOCUMENTATION:**

Full test guide available in:
- `TEST_GUIDE_SET_TRANSACTIONS.md`

Includes:
- Detailed scenarios
- Verification queries
- Troubleshooting
- Expected results

---

**Ready to Test!** 🚀

**Start with:** Login as CSSD → Distribusi → Select Set → Create Transaction

**Then:** Login as Nurse → Scan QR → Verify Display → Validate

**Good luck!** 🎉
