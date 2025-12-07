# ANALISA: Sistem Set Instrumen vs Instrumen Single

## 📊 STATUS IMPLEMENTASI SAAT INI

### ✅ **Yang Sudah Ada:**

#### 1. **Database Schema**
```sql
-- Tabel untuk Set
instrument_sets (id, name, description, is_active)

-- Tabel untuk Item dalam Set
instrument_set_items (setId, instrumentId, quantity)
```

#### 2. **Admin Panel**
- ✅ Bisa membuat Set baru
- ✅ Bisa menambahkan instrumen ke dalam Set dengan quantity
- ✅ Bisa edit Set (nama, deskripsi, items)
- ✅ Bisa delete Set

#### 3. **Request System (Nurse → CSSD)**
- ✅ Nurse bisa request **SINGLE** instrument
- ✅ Nurse bisa request **SET** instrument
- ✅ System membedakan `itemType: 'SINGLE' | 'SET'`
- ✅ CSSD bisa lihat request dengan detail item

---

## ❌ **MASALAH KRITIS: Tidak Ada Perhitungan Stok untuk SET**

### **Analisa Detail:**

#### **1. Transaksi Distribusi/Pengambilan**
**File:** `components/TransactionForm.tsx`

**Masalah:**
```tsx
// Hanya menampilkan SINGLE instruments
const availableInstruments = useMemo(() => {
    return instruments.filter((inst: Instrument) => {
        if (type === TransactionType.DISTRIBUTE) {
            return inst.cssdStock > 0;
        } else {
            return (inst.unitStock[unit.id] || 0) > 0;
        }
    });
}, [instruments, type, unit.id]);
```

**❌ TIDAK ADA:**
- Tidak ada pilihan untuk memilih SET
- Tidak ada logic untuk "expand" SET menjadi individual instruments
- Tidak ada validasi stok untuk semua item dalam SET

---

#### **2. Database Transaction Items**
**File:** `backend/schema.sql`

```sql
CREATE TABLE transaction_items (
    transactionId VARCHAR(50),
    instrumentId VARCHAR(50),  -- ❌ Hanya untuk single instrument
    count INT NOT NULL,
    PRIMARY KEY (transactionId, instrumentId)
);
```

**❌ TIDAK ADA:**
- Tidak ada field `itemType` untuk membedakan SINGLE vs SET
- Tidak ada field `setId` untuk track set yang didistribusikan
- Tidak ada mekanisme untuk "expand" set menjadi individual items

---

#### **3. Stock Calculation**
**File:** `backend/controllers/transactionsController.js`

**Masalah:**
```javascript
// Hanya update stok individual instrument
if (type === 'DISTRIBUTE') {
    await connection.query(
        'UPDATE instruments SET cssdStock = cssdStock - ?, totalStock = totalStock - ? WHERE id = ?',
        [item.count, item.count, item.instrumentId]
    );
}
```

**❌ TIDAK ADA:**
- Tidak ada logic untuk mengurangi stok semua item dalam SET
- Tidak ada validasi apakah semua item dalam SET tersedia
- Tidak ada tracking berapa kali SET didistribusikan

---

## 🔴 **DAMPAK MASALAH INI:**

### **Skenario Bermasalah:**

**Contoh Set:** "Set Operasi Minor"
- Gunting Bedah x2
- Pinset x3
- Klem x1

**Jika CSSD mendistribusikan "Set Operasi Minor" x1:**

❌ **Yang Terjadi Sekarang:**
- Stok Gunting Bedah **TIDAK BERKURANG**
- Stok Pinset **TIDAK BERKURANG**
- Stok Klem **TIDAK BERKURANG**
- **STOK TIDAK AKURAT!**

✅ **Yang Seharusnya Terjadi:**
- Stok Gunting Bedah berkurang 2
- Stok Pinset berkurang 3
- Stok Klem berkurang 1

---

## 💡 **SOLUSI YANG DIBUTUHKAN:**

### **1. Update Database Schema**

```sql
-- Tambah kolom di transaction_items
ALTER TABLE transaction_items 
ADD COLUMN itemType VARCHAR(20) DEFAULT 'SINGLE',
ADD COLUMN setId VARCHAR(50) NULL,
ADD FOREIGN KEY (setId) REFERENCES instrument_sets(id);

-- Atau buat tabel baru untuk set transactions
CREATE TABLE transaction_set_items (
    transactionId VARCHAR(50),
    setId VARCHAR(50),
    quantity INT NOT NULL,
    PRIMARY KEY (transactionId, setId),
    FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (setId) REFERENCES instrument_sets(id)
);
```

### **2. Update TransactionForm.tsx**

```tsx
// Tambahkan Sets ke pilihan
const availableSets = useMemo(() => {
    return sets.filter(set => {
        // Cek apakah semua item dalam set tersedia
        return set.items.every(item => {
            const inst = instruments.find(i => i.id === item.instrumentId);
            if (!inst) return false;
            const required = item.quantity;
            const available = type === TransactionType.DISTRIBUTE 
                ? inst.cssdStock 
                : (inst.unitStock[unit.id] || 0);
            return available >= required;
        });
    });
}, [sets, instruments, type, unit.id]);
```

### **3. Update Backend Transaction Logic**

```javascript
// Saat create transaction dengan SET
if (item.itemType === 'SET') {
    // 1. Ambil semua items dalam set
    const [setItems] = await connection.query(
        'SELECT instrumentId, quantity FROM instrument_set_items WHERE setId = ?',
        [item.setId]
    );
    
    // 2. Update stok untuk setiap instrument dalam set
    for (const setItem of setItems) {
        const totalQty = setItem.quantity * item.count; // count = berapa set
        
        if (type === 'DISTRIBUTE') {
            await connection.query(
                'UPDATE instruments SET cssdStock = cssdStock - ? WHERE id = ?',
                [totalQty, setItem.instrumentId]
            );
            
            await connection.query(
                'INSERT INTO instrument_unit_stock (instrumentId, unitId, quantity) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE quantity = quantity + ?',
                [setItem.instrumentId, unitId, totalQty, totalQty]
            );
        }
    }
    
    // 3. Simpan record bahwa ini adalah SET transaction
    await connection.query(
        'INSERT INTO transaction_set_items (transactionId, setId, quantity) VALUES (?, ?, ?)',
        [transactionId, item.setId, item.count]
    );
}
```

### **4. Update Validation Logic**

```javascript
// Validasi sebelum create transaction
async function validateSetAvailability(setId, quantity, type, unitId) {
    const [setItems] = await db.query(
        'SELECT instrumentId, quantity FROM instrument_set_items WHERE setId = ?',
        [setId]
    );
    
    for (const item of setItems) {
        const [instruments] = await db.query(
            'SELECT cssdStock FROM instruments WHERE id = ?',
            [item.instrumentId]
        );
        
        const required = item.quantity * quantity;
        const available = instruments[0].cssdStock;
        
        if (available < required) {
            throw new Error(`Stok ${item.instrumentId} tidak cukup. Dibutuhkan: ${required}, Tersedia: ${available}`);
        }
    }
    
    return true;
}
```

---

## 📋 **CHECKLIST IMPLEMENTASI:**

### **Phase 1: Database**
- [ ] Tambah kolom `itemType` dan `setId` di `transaction_items`
- [ ] Atau buat tabel baru `transaction_set_items`
- [ ] Migrate existing data (jika ada)

### **Phase 2: Backend**
- [ ] Update `transactionsController.js` untuk handle SET
- [ ] Implement stock calculation untuk SET
- [ ] Implement validation untuk SET availability
- [ ] Update `validateTransaction` untuk SET

### **Phase 3: Frontend**
- [ ] Update `TransactionForm.tsx` untuk show Sets
- [ ] Add UI untuk pilih antara SINGLE vs SET
- [ ] Show detail items dalam SET saat dipilih
- [ ] Update validation di frontend

### **Phase 4: Testing**
- [ ] Test distribusi SET
- [ ] Test pengambilan SET
- [ ] Test validasi stok SET
- [ ] Test mixed transaction (SINGLE + SET)

---

## 🎯 **REKOMENDASI:**

### **Opsi 1: Full Implementation (Recommended)**
Implementasi lengkap seperti dijelaskan di atas. Ini akan membuat sistem benar-benar support SET dengan perhitungan stok yang akurat.

**Kelebihan:**
- ✅ Stok akurat
- ✅ Tracking lengkap
- ✅ Bisa distribusi SET dan SINGLE dalam 1 transaksi

**Kekurangan:**
- ⚠️ Butuh waktu implementasi ~2-3 jam
- ⚠️ Perlu migration database

### **Opsi 2: Quick Fix (Temporary)**
Disable fitur SET di transaksi, hanya gunakan untuk Request saja.

**Kelebihan:**
- ✅ Cepat (15 menit)
- ✅ Tidak perlu migration

**Kekurangan:**
- ❌ SET tidak bisa digunakan di transaksi
- ❌ Hanya bisa request SET, tidak bisa distribusi

### **Opsi 3: Hybrid**
SET otomatis di-expand menjadi individual items saat transaksi.

**Kelebihan:**
- ✅ Stok tetap akurat
- ✅ Implementasi lebih simple

**Kekurangan:**
- ❌ Tidak ada tracking "ini dari SET mana"
- ❌ Laporan kurang detail

---

## 📊 **KESIMPULAN:**

**Status Saat Ini:**
- ✅ Set bisa dibuat di Admin Panel
- ✅ Set bisa di-request oleh Nurse
- ❌ **Set TIDAK bisa didistribusikan dengan benar**
- ❌ **Stok TIDAK dihitung saat distribusi SET**
- ❌ **Tidak ada validasi stok untuk SET**

**Rekomendasi:** Implementasi **Opsi 1 (Full Implementation)** untuk sistem yang robust dan akurat.

---

**Dibuat:** 7 Desember 2024
**Status:** CRITICAL - Perlu implementasi segera untuk akurasi stok
