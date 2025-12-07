# 📊 CARA MELIHAT INSTRUMEN DALAM SET

## 🎯 **OVERVIEW:**

Ada beberapa cara untuk melihat instrumen yang sudah dimasukkan ke dalam Set Instrumen:

---

## 1️⃣ **VIA DATABASE (SQL Query)**

### **Quick Summary:**
```sql
SELECT 
    s.name as set_name,
    COUNT(DISTINCT isi.instrumentId) as total_items,
    SUM(isi.quantity) as total_quantity
FROM instrument_sets s
LEFT JOIN instrument_set_items isi ON s.id = isi.setId
WHERE s.is_active = 1
GROUP BY s.id, s.name;
```

### **Detail Isi Set:**
```sql
SELECT 
    s.name as set_name,
    i.name as instrument_name,
    isi.quantity,
    i.category
FROM instrument_sets s
JOIN instrument_set_items isi ON s.id = isi.setId
JOIN instruments i ON isi.instrumentId = i.id
WHERE s.is_active = 1
ORDER BY s.name, i.name;
```

### **Instrumen Usage (Berapa Kali Masuk Set):**
```sql
SELECT 
    i.name as instrument_name,
    COUNT(DISTINCT isi.setId) as used_in_sets,
    SUM(isi.quantity) as total_quantity,
    GROUP_CONCAT(s.name SEPARATOR ', ') as set_names
FROM instruments i
LEFT JOIN instrument_set_items isi ON i.id = isi.instrumentId
LEFT JOIN instrument_sets s ON isi.setId = s.id
GROUP BY i.id
HAVING used_in_sets > 0
ORDER BY used_in_sets DESC;
```

### **Instrumen yang Belum Masuk Set:**
```sql
SELECT 
    i.name,
    i.category,
    i.cssdStock
FROM instruments i
WHERE i.id NOT IN (
    SELECT DISTINCT instrumentId FROM instrument_set_items
)
AND i.is_active = 1;
```

---

## 2️⃣ **VIA APLIKASI (Admin Panel)**

### **Lokasi:**
```
Admin Panel → Set Instrumen → [Pilih Set] → Lihat Detail
```

### **Informasi yang Ditampilkan:**
- ✅ Nama Set
- ✅ Deskripsi Set
- ✅ Daftar Instrumen dalam Set
- ✅ Quantity per Instrumen
- ✅ Total Items
- ✅ Status (Active/Inactive)

### **Cara Akses:**
1. Login sebagai **Admin**
2. Klik menu **"Admin"**
3. Pilih **"Set Instrumen"**
4. Klik pada set yang ingin dilihat
5. Modal detail akan muncul menampilkan semua instrumen

---

## 3️⃣ **VIA PHPMY ADMIN**

### **Cara:**
1. Buka **phpMyAdmin** (http://localhost/phpmyadmin)
2. Pilih database **`steritrack`**
3. Klik tabel **`instrument_set_items`**
4. Lihat data atau jalankan query custom

### **Useful Views:**
```sql
-- View 1: Set dengan Instrumennya
SELECT 
    s.name as 'Set Name',
    i.name as 'Instrument',
    isi.quantity as 'Qty'
FROM instrument_set_items isi
JOIN instrument_sets s ON isi.setId = s.id
JOIN instruments i ON isi.instrumentId = i.id
ORDER BY s.name, i.name;

-- View 2: Count per Set
SELECT 
    s.name as 'Set Name',
    COUNT(*) as 'Item Count',
    SUM(isi.quantity) as 'Total Pieces'
FROM instrument_sets s
LEFT JOIN instrument_set_items isi ON s.id = isi.setId
GROUP BY s.id;
```

---

## 4️⃣ **VIA COMMAND LINE**

### **Run Query Script:**
```powershell
# Run comprehensive query
Get-Content backend/query_instruments_in_sets.sql | mysql -u root

# Or specific query
mysql -u root -e "USE steritrack; SELECT s.name, COUNT(*) as items FROM instrument_sets s JOIN instrument_set_items isi ON s.id = isi.setId GROUP BY s.id;"
```

---

## 📊 **STATISTIK YANG TERSEDIA:**

### **1. Summary per Set:**
- Nama Set
- Jumlah jenis instrumen
- Total quantity (pieces)

### **2. Detail Isi Set:**
- Nama instrumen
- Quantity per instrumen
- Kategori instrumen

### **3. Instrumen Usage:**
- Instrumen digunakan di berapa set
- Total quantity across all sets
- Nama-nama set yang menggunakan

### **4. Instrumen Belum Masuk Set:**
- Instrumen yang tersedia tapi belum masuk set
- Kategori
- Stock CSSD

### **5. Global Statistics:**
- Total active sets
- Total instrumen dalam sets
- Average items per set
- Instrumen yang belum masuk set

---

## 🎨 **UI ENHANCEMENT (Optional):**

### **Tambahan di Admin Panel:**

**Feature 1: Set Detail Modal**
- Tampilkan isi set saat diklik
- List instrumen dengan quantity
- Total items & pieces

**Feature 2: Instrument Usage View**
- Tampilkan instrumen
- Badge: "Used in X sets"
- List set names

**Feature 3: Statistics Dashboard**
- Card: Total Sets
- Card: Total Instruments in Sets
- Card: Average Items per Set
- Chart: Set Distribution

---

## 📝 **EXAMPLE OUTPUT:**

### **Set: "Set Operasi Minor"**
```
Instrumen dalam Set:
1. Gunting Mayo          - 2 pcs
2. Klem Arteri           - 3 pcs
3. Pinset Chirurgis      - 2 pcs
4. Scalpel Handle        - 1 pcs
5. Needle Holder         - 2 pcs

Total: 5 jenis instrumen, 10 pieces
```

### **Instrumen: "Gunting Mayo"**
```
Digunakan dalam Set:
1. Set Operasi Minor     - 2 pcs
2. Set Bedah Umum        - 3 pcs
3. Set Emergency         - 1 pcs

Total: Digunakan di 3 set, 6 pieces
```

---

## 🔍 **QUICK COMMANDS:**

### **Lihat Semua Set dengan Isinya:**
```powershell
mysql -u root -e "USE steritrack; SELECT s.name as 'Set', i.name as 'Instrument', isi.quantity as 'Qty' FROM instrument_set_items isi JOIN instrument_sets s ON isi.setId = s.id JOIN instruments i ON isi.instrumentId = i.id ORDER BY s.name;"
```

### **Count Items per Set:**
```powershell
mysql -u root -e "USE steritrack; SELECT s.name, COUNT(*) as items, SUM(isi.quantity) as pieces FROM instrument_sets s JOIN instrument_set_items isi ON s.id = isi.setId GROUP BY s.id;"
```

### **Instrumen Paling Sering Digunakan:**
```powershell
mysql -u root -e "USE steritrack; SELECT i.name, COUNT(DISTINCT isi.setId) as sets FROM instruments i JOIN instrument_set_items isi ON i.id = isi.instrumentId GROUP BY i.id ORDER BY sets DESC LIMIT 10;"
```

---

## ✅ **FILES CREATED:**

**`backend/query_instruments_in_sets.sql`**
- Comprehensive queries
- 7 different views
- Statistics
- Export data

**Usage:**
```powershell
Get-Content backend/query_instruments_in_sets.sql | mysql -u root
```

---

## 🎯 **RECOMMENDATIONS:**

### **For Admin:**
1. **Regular Review** - Check set contents regularly
2. **Update Sets** - Add/remove items as needed
3. **Monitor Usage** - See which instruments are most used
4. **Identify Gaps** - Find instruments not in any set

### **For Planning:**
1. **Stock Planning** - Based on set usage
2. **Set Optimization** - Combine frequently used items
3. **Inventory Management** - Track set vs single usage

---

**Dibuat:** 7 Desember 2024, 19:56 WIB
**Status:** Ready to Use
**Version:** 1.0
