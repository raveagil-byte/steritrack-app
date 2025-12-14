# 🚀 QUICK START GUIDE - Enhanced Validation

**Fitur Baru:** Verifikasi Fisik Item dengan Tracking Discrepancy

---

## 📱 UNTUK PERAWAT (NURSE)

### Langkah 1: Scan QR Transaksi
```
1. Buka aplikasi → Tab "Terima Barang"
2. Klik "Scan QR Transaksi"
3. Scan QR code dari CSSD
```

### Langkah 2: Verifikasi Setiap Item
```
Untuk setiap instrumen, isi:

┌─────────────────────────────────┐
│ Gunting Bedah                   │
├─────────────────────────────────┤
│ Diharapkan:     [10]            │
│ Diterima (OK):  [8]  ← Input    │
│ Rusak:          [2]  ← Input    │
│ Hilang:         [0]  ← Input    │
│ Total: 10 ✓                     │
│ Catatan: [Kemasan rusak]        │
└─────────────────────────────────┘

⚠️ Total HARUS sama dengan Diharapkan!
```

### Langkah 3: Submit
```
1. Pastikan semua item sudah diverifikasi
2. Tambahkan catatan umum (opsional)
3. Klik "Konfirmasi & Validasi"
4. Lihat hasil validasi
```

---

## 💡 CONTOH KASUS

### ✅ Kasus 1: Semua Item Baik
```
Input:
- Diharapkan: 10
- Diterima: 10
- Rusak: 0
- Hilang: 0

Hasil:
✅ Status: VERIFIED
✅ Stok unit +10
✅ Semua OK!
```

### ⚠️ Kasus 2: Ada Item Rusak
```
Input:
- Diharapkan: 10
- Diterima: 8
- Rusak: 2
- Hilang: 0
- Catatan: "Kemasan rusak"

Hasil:
⚠️ Status: PARTIAL
⚠️ Stok unit +8 (bukan +10!)
⚠️ Broken stock +2
⚠️ Laporan discrepancy dibuat
```

### ❌ Kasus 3: Ada Item Hilang
```
Input:
- Diharapkan: 10
- Diterima: 7
- Rusak: 1
- Hilang: 2
- Catatan: "2 item tidak ditemukan"

Hasil:
❌ Status: PARTIAL
❌ Stok unit +7
❌ Broken stock +1
❌ Total stock -2 (hilang permanen)
❌ Alert ke CSSD
```

---

## ⚠️ PENTING!

### ✅ DO (Lakukan):
- ✅ Periksa fisik setiap item
- ✅ Hitung dengan teliti
- ✅ Catat kondisi item rusak
- ✅ Beri catatan jelas
- ✅ Pastikan total sesuai

### ❌ DON'T (Jangan):
- ❌ Asal klik tanpa cek fisik
- ❌ Input semua "Diterima" tanpa verifikasi
- ❌ Lewati item rusak/hilang
- ❌ Submit jika total tidak sesuai

---

## 🎯 TIPS

1. **Periksa Kemasan**
   - Pastikan kemasan tidak rusak
   - Cek seal/segel sterilisasi

2. **Hitung Ulang**
   - Hitung 2x untuk memastikan
   - Jangan terburu-buru

3. **Catat Detail**
   - Tulis kondisi spesifik
   - Contoh: "Berkarat", "Patah", "Kemasan sobek"

4. **Laporkan Segera**
   - Item hilang → Lapor CSSD
   - Item rusak → Dokumentasi foto

---

## 🆘 TROUBLESHOOTING

### Problem: "Total tidak sesuai!"
**Solution:** 
```
Diterima + Rusak + Hilang = Diharapkan

Contoh:
8 + 2 + 0 = 10 ✓
7 + 2 + 0 = 9 ✗ (salah!)
```

### Problem: "Tidak bisa submit"
**Solution:**
- Pastikan semua item sudah diisi
- Cek total setiap item
- Lihat pesan error (merah)

### Problem: "Transaksi tidak ditemukan"
**Solution:**
- Scan ulang QR code
- Pastikan transaksi status PENDING
- Hubungi CSSD jika masih error

---

## 📞 BANTUAN

**Jika ada masalah:**
1. Screenshot error message
2. Catat transaction ID
3. Hubungi IT Support / CSSD

**Contact:**
- IT Support: ext. XXX
- CSSD: ext. XXX

---

**Version:** 1.0  
**Last Updated:** 10 Desember 2024  
**Status:** Active
