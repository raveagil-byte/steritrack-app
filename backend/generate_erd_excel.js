
const XLSX = require("xlsx");
const path = require("path");

function generateExcel() {
    console.log("Generating System Documentation Excel file...");

    // 1. Data for "Struktur Tabel" Sheet
    const tableStructureData = [
        ["Nama Tabel", "Nama Kolom", "Tipe Data", "Key", "Keterangan"],

        // measurement_units
        ["measurement_units", "id", "VARCHAR(50)", "PK", "ID Satuan (e.g., mu1)"],
        ["", "name", "VARCHAR(50)", "", "Nama Satuan (Pcs, Set, Box)"],
        ["", "description", "TEXT", "", "Deskripsi"],

        // roles
        ["roles", "id", "VARCHAR(50)", "PK", "ID Role (e.g., r-admin)"],
        ["", "name", "VARCHAR(50)", "", "Nama Role (ADMIN, CSSD, NURSE)"],
        ["", "description", "TEXT", "", "Deskripsi Role"],

        // users
        ["users", "id", "VARCHAR(50)", "PK", "ID User"],
        ["", "username", "VARCHAR(50)", "", "Username Login"],
        ["", "password", "VARCHAR(255)", "", "Password (Hashed)"],
        ["", "name", "VARCHAR(100)", "", "Nama Lengkap User"],
        ["", "role", "VARCHAR(20)", "", "Role User (Legacy)"],
        ["", "unitId", "VARCHAR(50)", "FK", "Unit tempat user bertugas"],
        ["", "is_active", "BOOLEAN", "", "Status aktif user"],

        // user_roles
        ["user_roles", "userId", "VARCHAR(50)", "PK, FK", "Link ke Users"],
        ["", "roleId", "VARCHAR(50)", "PK, FK", "Link ke Roles"],

        // units
        ["units", "id", "VARCHAR(50)", "PK", "ID Unit (e.g., u1, u-cssd)"],
        ["", "name", "VARCHAR(100)", "", "Nama Unit (IGD, OK, CSSD)"],
        ["", "type", "VARCHAR(20)", "", "Tipe Unit"],
        ["", "qrCode", "VARCHAR(100)", "", "Kode QR Unit"],

        // instruments
        ["instruments", "id", "VARCHAR(50)", "PK", "ID Instrumen"],
        ["", "name", "VARCHAR(100)", "", "Nama Instrumen"],
        ["", "category", "VARCHAR(50)", "", "Kategori (Sets, Single)"],
        ["", "totalStock", "INT", "", "Stok Total (Global)"],
        ["", "cssdStock", "INT", "", "Stok di CSSD"],
        ["", "dirtyStock", "INT", "", "Stok Kotor"],
        ["", "measure_unit_id", "VARCHAR(50)", "FK", "Satuan Pegukuran"],

        // instrument_sets
        ["instrument_sets", "id", "VARCHAR(50)", "PK", "ID Set Instrumen"],
        ["", "name", "VARCHAR(100)", "", "Nama Set"],
        ["", "description", "TEXT", "", "Deskripsi Set"],

        // instrument_set_items
        ["instrument_set_items", "setId", "VARCHAR(50)", "PK, FK", "ID Set"],
        ["", "instrumentId", "VARCHAR(50)", "PK, FK", "ID Instrumen dalam Set"],
        ["", "quantity", "INT", "", "Jumlah per Set"],

        // inventory_snapshots
        ["inventory_snapshots", "unitId", "VARCHAR(50)", "PK, FK", "ID Unit"],
        ["", "instrumentId", "VARCHAR(50)", "PK, FK", "ID Instrumen"],
        ["", "quantity", "INT", "", "Jumlah Stok di Unit Tersebut"],
        ["", "last_updated", "TIMESTAMP", "", "Waktu Update Terakhir"],

        // transactions
        ["transactions", "id", "VARCHAR(50)", "PK", "ID Transaksi"],
        ["", "timestamp", "BIGINT", "", "Waktu Transaksi"],
        ["", "type", "VARCHAR(20)", "", "Tipe (DISTRIBUTE, COLLECT)"],
        ["", "status", "VARCHAR(20)", "", "Status (PENDING, COMPLETED)"],
        ["", "source_unit_id", "VARCHAR(50)", "FK", "Unit Asal"],
        ["", "destination_unit_id", "VARCHAR(50)", "FK", "Unit Tujuan"],
        ["", "created_by_user_id", "VARCHAR(50)", "FK", "Pembuat Transaksi"],

        // transaction_items
        ["transaction_items", "transactionId", "VARCHAR(50)", "PK, FK", "ID Transaksi"],
        ["", "instrumentId", "VARCHAR(50)", "PK, FK", "ID Instrumen"],
        ["", "count", "INT", "", "Jumlah Barang"],
        ["", "condition", "VARCHAR(20)", "", "Kondisi (GOOD, BROKEN)"],

        // sterilization_batches
        ["sterilization_batches", "id", "VARCHAR(50)", "PK", "ID Batch Sterilisasi"],
        ["", "timestamp", "BIGINT", "", "Waktu Mulai"],
        ["", "machine", "VARCHAR(50)", "", "Nama Mesin"],
        ["", "operator", "VARCHAR(100)", "", "Nama Operator"],
        ["", "status", "VARCHAR(20)", "", "Status Sterilisasi"],

        // sterilization_batch_items
        ["sterilization_batch_items", "batchId", "VARCHAR(50)", "PK, FK", "Link ke Batch"],
        ["", "itemId", "VARCHAR(50)", "PK, FK", "Link ke Instrumen/Set"],
        ["", "quantity", "INT", "", "Jumlah Item"],

        // sterile_packs
        ["sterile_packs", "id", "VARCHAR(50)", "PK", "ID Pack Steril"],
        ["", "name", "VARCHAR(100)", "", "Label Pack"],
        ["", "targetUnitId", "VARCHAR(50)", "FK", "Unit Tujuan Pack"],
        ["", "expiresAt", "BIGINT", "", "Tanggal Kedaluwarsa"],
        ["", "qrCode", "VARCHAR(100)", "", "QR Code Pack"],

        // sterile_pack_items
        ["sterile_pack_items", "packId", "VARCHAR(50)", "PK, FK", "ID Pack"],
        ["", "instrumentId", "VARCHAR(50)", "PK, FK", "Isi Pack"],
        ["", "quantity", "INT", "", "Jumlah"],

        // requests
        ["requests", "unitId", "VARCHAR(50)", "FK", "Request dari Unit"]
    ];

    // 2. Data for "Relasi" Sheet
    const relationData = [
        ["Tabel Asal (Child)", "Kolom Asal (FK)", "Tabel Tujuan (Parent)", "Kolom Tujuan (PK)", "Relasi"],
        ["users", "unitId", "units", "id", "User milik Unit"],
        ["user_roles", "userId", "users", "id", "User punya banyak Role"],
        ["user_roles", "roleId", "roles", "id", "Role punya banyak User"],
        ["instruments", "measure_unit_id", "measurement_units", "id", "Instrumen punya Satuan"],
        ["instrument_set_items", "setId", "instrument_sets", "id", "Item milik Set"],
        ["instrument_set_items", "instrumentId", "instruments", "id", "Item adalah Instrumen"],
        ["inventory_snapshots", "unitId", "units", "id", "Stok milik Unit"],
        ["inventory_snapshots", "instrumentId", "instruments", "id", "Stok adalah Instrumen"],
        ["transactions", "source_unit_id", "units", "id", "Transaksi dari Unit"],
        ["transactions", "destination_unit_id", "units", "id", "Transaksi ke Unit"],
        ["transactions", "created_by_user_id", "users", "id", "Transaksi dibuat User"],
        ["transaction_items", "transactionId", "transactions", "id", "Item milik Transaksi"],
        ["transaction_items", "instrumentId", "instruments", "id", "Item adalah Instrumen"],
        ["sterilization_batch_items", "batchId", "sterilization_batches", "id", "Item milik Batch"],
        ["sterile_packs", "targetUnitId", "units", "id", "Pack untuk Unit"],
        ["sterile_pack_items", "packId", "sterile_packs", "id", "Item dalam Pack"],
        ["sterile_pack_items", "instrumentId", "instruments", "id", "Item adalah Instrumen"],
        ["requests", "unitId", "units", "id", "Request dari Unit"]
    ];

    // 3. Data for "Use Cases" Sheet
    const useCaseData = [
        ["ID", "Aktor", "Nama Use Case", "Deskripsi", "Pre-Kondisi", "Post-Kondisi"],

        // NURSE
        ["UC-01", "Perawat (Nurse)", "Login", "Masuk ke sistem aplikasi", "Aplikasi terbuka", "Dashboard Perawat tampil"],
        ["UC-02", "Perawat (Nurse)", "Scan QR Unit", "Identifikasi lokasi unit kerja", "Login sukses", "Unit aktif terpilih"],
        ["UC-03", "Perawat (Nurse)", "Request Instrumen", "Meminta stok steril ke CSSD", "Unit terpilih", "Request terkirim ke CSSD"],
        ["UC-04", "Perawat (Nurse)", "Return Instrumen Kotor", "Menyiapkan instrumen kotor untuk diambil", "Instrumen sudah dipakai", "Status instrumen 'Dirty'"],

        // CSSD
        ["UC-05", "Staf CSSD", "Login", "Masuk ke sistem aplikasi", "Aplikasi terbuka", "Dashboard CSSD tampil"],
        ["UC-06", "Staf CSSD", "Terima Kotor (Collection)", "Mengambil & scan barang kotor dari unit", "Ada jadwal pengambilan", "Stok 'Dirty' di CSSD bertambah"],
        ["UC-07", "Staf CSSD", "Pencucian (Washing)", "Proses dekontaminasi instrumen", "Stok Dirty tersedia", "Instrumen bersih siap packing"],
        ["UC-08", "Staf CSSD", "Packing Instrumen/Set", "Menyusun instrumen & melabeli pack", "Instrumen bersih", "Terbentuk 'Sterile Pack' (Pending)"],
        ["UC-09", "Staf CSSD", "Proses Sterilisasi", "Memasukkan pack ke mesin Autoclave", "Pack siap steril", "Batch Sterilisasi tercatat"],
        ["UC-10", "Staf CSSD", "Validasi Sterilisasi", "Memverifikasi hasil mesin steril", "Proses mesin selesai", "Status Pack menjadi 'Sterile'"],
        ["UC-11", "Staf CSSD", "Distribusi", "Mengirim barang steril ke unit", "Permintaan / Jadwal Rutin", "Stok Unit bertambah, Stok CSSD berkurang"],

        // ADMIN
        ["UC-12", "Admin", "Manajemen User", "Tambah/Edit/Hapus User", "Login Admin", "Data User terupdate"],
        ["UC-13", "Admin", "Manajemen Master Data", "Kelola Data Instrumen/Set", "Login Admin", "Katalog Instrumen terupdate"],
        ["UC-14", "Admin", "Lihat Laporan", "Melihat riwayat transaksi & stok", "Login Admin", "Laporan ditampilkan"]
    ];

    // 4. Data for "Activity Flow" (Siklus Instrumen)
    const activityData = [
        ["Fase", "Langkah", "Aktor", "Aksi Sistem", "Status Barang"],

        // 1. PENGGUNAAN & PENGEMBALIAN
        ["1. Collection", "1. Perawat memakai instrumen", "Perawat", "Tidak ada pencatatan (fisik)", "Terpakai"],
        ["1. Collection", "2. Perawat lapor barang kotor", "Perawat", "Update status unit stok -> Dirty", "Dirty (di Unit)"],
        ["1. Collection", "3. CSSD datang scan barang", "CSSD", "Pindah stok Unit -> Stok CSSD (Dirty)", "Dirty (di CSSD)"],

        // 2. PENCUCIAN
        ["2. Washing", "4. CSSD melakukan dekontaminasi", "CSSD", "Tidak ada pencatatan item per item", "Dalam Pencucian (Wash)"],

        // 3. PACKING
        ["3. Packing", "5. CSSD menyusun instrumen (Packing)", "CSSD", "Create 'Sterile Pack' ID baru", "Packing (Non-Sterile)"],
        ["3. Packing", "6. Cetak QR Code Label Pack", "Sistem", "Generate QR Unique untuk Pack", "Packing"],

        // 4. STERILISASI
        ["4. Sterilization", "7. Scan Pack masuk Mesin (Load)", "CSSD", "Create Batch ID, Status 'Processing'", "Dalam Mesin"],
        ["4. Sterilization", "8. Mesin Selesai & Validasi OK", "CSSD", "Update Batch -> Completed, Pack -> Sterile", "Steril (Di Penyimpanan)"],

        // 5. DISTRIBUSI
        ["5. Distribution", "9. CSSD Scan Pack untuk Distribusi", "CSSD", "Pindah Stok CSSD -> Stok Unit", "Steril (Dalam Perjalanan)"],
        ["5. Distribution", "10. Unit Terima Barang", "Perawat/Sistem", "Konfirmasi penerimaan (Otomatis/Manual)", "Ready (Di Unit)"]
    ];

    // Create Workbook
    const wb = XLSX.utils.book_new();

    // Create Sheets
    const ws1 = XLSX.utils.aoa_to_sheet(tableStructureData);
    const ws2 = XLSX.utils.aoa_to_sheet(relationData);
    const ws3 = XLSX.utils.aoa_to_sheet(useCaseData);
    const ws4 = XLSX.utils.aoa_to_sheet(activityData);

    // Auto-width for columns
    ws1['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 40 }];
    ws2['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 30 }];
    ws3['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 40 }, { wch: 25 }, { wch: 25 }];
    ws4['!cols'] = [{ wch: 20 }, { wch: 35 }, { wch: 15 }, { wch: 40 }, { wch: 25 }];

    // Append Sheets
    XLSX.utils.book_append_sheet(wb, ws1, "Struktur Tabel");
    XLSX.utils.book_append_sheet(wb, ws2, "Relasi");
    XLSX.utils.book_append_sheet(wb, ws3, "Use Cases");
    XLSX.utils.book_append_sheet(wb, ws4, "Alur Aktivitas");

    // Write file
    const outputPath = path.join(__dirname, "ERD_Database.xlsx");
    XLSX.writeFile(wb, outputPath);

    console.log(`Excel file updated successfully at: ${outputPath}`);
}

generateExcel();
