# PR & Future Roadmap (Pekerjaan Rumah)

Dokumen ini mencatat fitur-fitur yang direncanakan untuk pengembangan selanjutnya ("PR") agar tidak hilang dari fokus pengembangan saat ini.

## 1. Integrasi WhatsApp Grup Otomatis (WA Bot)
**Status:** ⏳ Pending (Disimpan untuk nanti)
**Tujuan:** Agar sistem dapat mengirim notifikasi otomatis ke grup WhatsApp `Dbb6Zgp1OdvEdLOkvMo8Db` tanpa intervensi manual user.

**Rencana Implementasi:**
*   **Use Case:**
    *   Notifikasi saat sterilisasi selesai ("Set Bedah Mayor A siap diambil").
    *   Notifikasi saat stok kritis.
    *   Laporan harian otomatis.
*   **Opsi Teknis:**
    *   *Paid API:* Twilio / WABlas (Lebih stabil).
    *   *Self-Hosted:* `whatsapp-web.js` (Gratis, butuh HP/Server standby).

---

## 2. Fitur Augmented Reality (AR)
**Status:** 🚀 IN PROGRESS (Tahap 1: HUD Component Created)
**Tujuan:** Mempermudah staf mencari instrumen atau melihat status sterilisasi dengan mengarahkan kamera HP ke ruangan/rak.

**Rencana Implementasi:**
*   **Marker-based AR:** Scan label rak untuk melihat isi.
*   **Indoor Navigation:** Petunjuk arah ke lokasi instrumen (jika memungkinkan).
*   *Lihat detail teknis lengkap di file `AR_IMPLEMENTATION_PLAN.md`.*

---

## 3. Peningkatan Mobile Experience (PWA)
**Status:** ✅ Selesai Tahap 1 (Tampilan & Akses)
**Next Steps:**
*   Offline Mode (Service Workers lebih lanjut).
*   Push Notification (Native Mobile).
