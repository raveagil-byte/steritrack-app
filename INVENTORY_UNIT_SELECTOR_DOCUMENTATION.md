# 📍 UNIT SELECTOR DI INVENTORY VIEW - DOKUMENTASI

## ✅ FITUR BARU: Dropdown Unit Selector untuk Admin

### 🎯 **Deskripsi:**
Admin sekarang bisa memilih unit tertentu untuk melihat instrumen yang tersedia di unit tersebut melalui dropdown selector di InventoryView.

---

## 🚀 **FITUR UTAMA:**

### **1. Dropdown Unit Selector** ✅
**Lokasi:** Header InventoryView (kanan atas)

**Options:**
- ✅ **Semua Lokasi** - Tampilan default (semua instrumen)
- ✅ **CSSD (Steril)** - Hanya instrumen steril di CSSD
- ✅ **[Unit 1]** - Instrumen di unit spesifik (IGD, OK, dll)
- ✅ **[Unit 2]** - dst...

### **2. Dynamic Table Columns** ✅
Table columns berubah sesuai filter:

**Semua Lokasi:**
- Instrumen
- Di CSSD (Steril)
- Di CSSD (Kotor)
- Terdistribusi (Di Unit)

**CSSD (Steril):**
- Instrumen
- Stok Steril (angka besar)

**Unit Spesifik:**
- Instrumen
- Stok di Unit (angka besar)

### **3. Info Banner** ✅
Saat filter aktif, muncul banner biru:
- Icon Building2
- Pesan: "Menampilkan instrumen di [Nama Unit]"
- Jumlah instrumen ditemukan
- Button "Lihat Semua" untuk reset filter

### **4. Empty State** ✅
Jika tidak ada instrumen di lokasi:
- Pesan: "Tidak ada instrumen ditemukan di lokasi ini"

---

## 📊 **FILTER LOGIC:**

### **"Semua Lokasi" (ALL):**
```tsx
// Tampilkan semua instrumen
instruments
```

### **"CSSD (Steril)":**
```tsx
// Hanya instrumen dengan cssdStock > 0
instruments.filter(inst => inst.cssdStock > 0)
```

### **Unit Spesifik (e.g., "IGD"):**
```tsx
// Hanya instrumen dengan unitStock[unitId] > 0
instruments.filter(inst => 
  (inst.unitStock[selectedUnitId] || 0) > 0
)
```

---

## 🎨 **UI/UX:**

### **Dropdown Design:**
```
┌─────────────────────────┐
│ 📍 Semua Lokasi        ▼│
├─────────────────────────┤
│   Semua Lokasi          │
│   CSSD (Steril)         │
│   IGD                   │
│   Kamar Operasi 1 (OK)  │
│   ICU                   │
└─────────────────────────┘
```

### **Info Banner:**
```
┌──────────────────────────────────────────┐
│ 🏢 Menampilkan instrumen di IGD          │
│    5 instrumen ditemukan    [Lihat Semua]│
└──────────────────────────────────────────┘
```

### **Table View - Unit Spesifik:**
```
┌────────────────────────────────────┐
│ Instrumen          │ Stok di Unit  │
├────────────────────────────────────┤
│ Gunting Bedah      │      5        │
│ Surgical Scissors  │               │
├────────────────────────────────────┤
│ Pinset             │     12        │
│ Forceps            │               │
└────────────────────────────────────┘
```

---

## 💻 **IMPLEMENTASI:**

### **Files Modified:**

**`views/InventoryView.tsx`**

**Changes:**
1. Import `useMemo`, `MapPin`, `Building2` icons
2. Add `selectedUnitId` state (default: 'ALL')
3. Add `filteredInstruments` useMemo - filter by unit
4. Add `selectedUnit` useMemo - get unit info
5. Add dropdown selector in header
6. Add info banner when filter active
7. Dynamic table columns based on filter
8. Show appropriate stock column

**Key Code:**
```tsx
// Filter instruments
const filteredInstruments = useMemo(() => {
    if (selectedUnitId === 'ALL') return instruments;
    if (selectedUnitId === 'CSSD') {
        return instruments.filter(inst => inst.cssdStock > 0);
    }
    return instruments.filter(inst => 
        (inst.unitStock[selectedUnitId] || 0) > 0
    );
}, [instruments, selectedUnitId]);
```

---

## 🧪 **TESTING:**

### **Test Scenarios:**

#### **1. Default View:**
- ✅ Load InventoryView
- ✅ Dropdown default: "Semua Lokasi"
- ✅ Table shows all columns
- ✅ All instruments visible

#### **2. Filter by CSSD:**
- ✅ Select "CSSD (Steril)"
- ✅ Info banner muncul
- ✅ Table hanya 2 kolom (Instrumen, Stok Steril)
- ✅ Hanya instrumen dengan cssdStock > 0

#### **3. Filter by Unit:**
- ✅ Select "IGD"
- ✅ Info banner: "Menampilkan instrumen di IGD"
- ✅ Table hanya 2 kolom (Instrumen, Stok di Unit)
- ✅ Hanya instrumen dengan unitStock[IGD] > 0
- ✅ Angka stok besar & jelas

#### **4. Reset Filter:**
- ✅ Klik "Lihat Semua" di banner
- ✅ Dropdown kembali ke "Semua Lokasi"
- ✅ Table kembali normal

#### **5. Empty State:**
- ✅ Select unit tanpa instrumen
- ✅ Pesan "Tidak ada instrumen ditemukan"

#### **6. Responsive:**
- ✅ Mobile: Dropdown & button stack vertical
- ✅ Desktop: Horizontal layout

---

## 📈 **BENEFITS:**

### **Untuk Admin:**
1. ✅ **Quick View** - Lihat stok per unit dengan cepat
2. ✅ **Monitoring** - Monitor distribusi per lokasi
3. ✅ **Planning** - Identifikasi unit yang perlu restock
4. ✅ **Efficiency** - Tidak perlu scroll panjang

### **Untuk Sistem:**
1. ✅ **Flexibility** - Filter dinamis tanpa reload
2. ✅ **Performance** - Client-side filtering (fast)
3. ✅ **Usability** - Interface yang intuitif

---

## 🎯 **USE CASES:**

### **Scenario 1: Cek Stok CSSD**
Admin ingin tahu instrumen steril yang ready:
1. Pilih "CSSD (Steril)"
2. Lihat daftar instrumen steril
3. Identifikasi yang perlu sterilisasi

### **Scenario 2: Cek Stok Unit**
Admin ingin tahu apa saja di IGD:
1. Pilih "IGD"
2. Lihat instrumen yang ada
3. Decide apakah perlu distribusi tambahan

### **Scenario 3: Overview Lengkap**
Admin ingin lihat big picture:
1. Pilih "Semua Lokasi"
2. Lihat distribusi global
3. Identifikasi bottleneck

---

## 🔗 **NAVIGATION:**

### **Akses:**
1. Login sebagai **Admin** (atau role lain)
2. Klik **"Inventaris"** di sidebar
3. Gunakan **dropdown** di kanan atas

### **Workflow:**
```
[Inventaris] → [Dropdown: Pilih Unit] → [Filtered View]
                        ↓
              [Info Banner] → [Lihat Semua]
```

---

## 🎨 **DESIGN DETAILS:**

### **Colors:**
- Dropdown: White background, blue focus ring
- Info Banner: Blue-50 background, blue-200 border
- CSSD Stock: Green badge (large)
- Unit Stock: Blue badge (large)

### **Icons:**
- Dropdown: MapPin (location icon)
- Banner: Building2 (building icon)

### **Typography:**
- Dropdown: Small, medium weight
- Banner: Small title, extra-small count
- Stock numbers: Large, bold

---

## ✅ **KESIMPULAN:**

**Status:** ✅ **SELESAI & SIAP DIGUNAKAN**

**Fitur yang Tersedia:**
- ✅ Dropdown unit selector
- ✅ Filter by ALL/CSSD/Specific Unit
- ✅ Dynamic table columns
- ✅ Info banner with reset button
- ✅ Empty state handling
- ✅ Responsive design
- ✅ Client-side filtering (fast)

**Accessible by:** Semua user (Admin, CSSD, Nurse)

**Default View:** Semua Lokasi

---

**Dibuat:** 7 Desember 2024, 19:14 WIB
**Status:** Production Ready
**Version:** 1.0
