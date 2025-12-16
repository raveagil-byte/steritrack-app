// SECURITY TEST SCRIPT (SteryTrack)
// Usage: node security_test.js <YOUR_WEBSITE_URL>
// Example: node security_test.js https://steritrack.vercel.app

const baseUrl = process.argv[2] || 'http://localhost:3000';

console.log(`\n🔒 MEMULAI UJI KEAMANAN (SECURITY TEST)`);
console.log(`Target: ${baseUrl}\n`);

async function runTest() {
    try {
        // TEST 1: Unauthorized Access (Hacker Simulation)
        console.log(`[TEST 1] Mencoba akses data sensitif TANPA Login (Simulasi Hacker)...`);
        const res1 = await fetch(`${baseUrl}/api/users`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (res1.status === 401) {
            console.log(`✅ SUKSES: Server menolak akses! (Status: ${res1.status} Unauthorized)`);
            console.log(`   -> Sistem keamanan berjalan. Hacker tidak bisa masuk.\n`);
        } else if (res1.status === 200) {
            console.log(`❌ BAHAYA: Server mengizinkan akses tanpa token! (Status: 200 OK)`);
            console.log(`   -> API Anda TIDAK AMAN.\n`);
        } else {
            console.log(`⚠️  Mencurigakan: Status ${res1.status} ${res1.statusText}\n`);
        }

        // TEST 2: Login Flow (Get Token)
        console.log(`[TEST 2] Mencoba Login Resmi (admin/4dm1n123)...`);
        const resLogin = await fetch(`${baseUrl}/api/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: '4dm1n123' })
        });

        if (!resLogin.ok) {
            console.log(`❌ Gagal Login. Pastikan username/password benar dan server hidup.`);
            return;
        }

        const data = await resLogin.json();
        const token = data.token;

        if (token) {
            console.log(`✅ Login Berhasil. Token diterima: ${token.substring(0, 15)}...\n`);
        } else {
            console.log(`❌ Login Berhasil tapi TIDAK ADA TOKEN. Cek backend.\n`);
            return;
        }

        // TEST 3: Authorized Access (Valid User Simulation)
        console.log(`[TEST 3] Mencoba akses data DENGAN Token Valid...`);
        const resAuth = await fetch(`${baseUrl}/api/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (resAuth.status === 200) {
            const users = await resAuth.json();
            console.log(`✅ SUKSES: Data berhasil diambil (${users.length} users found).`);
            console.log(`   -> Server mengenali User Asli.\n`);
        } else {
            console.log(`❌ GAGAL: Token ditolak? (Status: ${resAuth.status})\n`);
        }

        console.log(`=============================================`);
        console.log(`KESIMPULAN:`);
        if (res1.status === 401 && resAuth.status === 200) {
            console.log(`🎉 SISTEM AMAN! Endpoint terlindungi "authMiddleware".`);
        } else {
            console.log(`⚠️  ADA MASALAH. Periksa kembali konfigurasi.`);
        }
        console.log(`=============================================`);

    } catch (error) {
        console.error("Critical Error during test:", error.message);
        console.log("Pastikan URL benar dan server sedang berjalan.");
    }
}

runTest();
