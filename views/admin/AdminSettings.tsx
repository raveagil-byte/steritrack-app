import React from 'react';
import { Database, AlertTriangle, Download, Trash2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'sonner';
import { ApiService } from '../../services/apiService';

export const AdminSettings = () => {
    const { resetSystem, users, units, instruments, sets, transactions, logs } = useAppContext();

    const handleExport = () => {
        const data = {
            timestamp: new Date().toISOString(),
            users,
            units,
            instruments,
            sets,
            transactions,
            logs
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `steritrack_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Backup data berhasil diunduh");
    };

    const handleReset = async () => {
        // High Risk Action - Using prompt for safety instead of simple native confirm
        const confirmation = prompt("Peringatan: Reset Pabrik akan MENGHAPUS SEMUA DATA PERMANEN.\nKetik 'RESET' untuk melanjutkan:");

        if (confirmation === 'RESET') {
            try {
                await resetSystem();
                toast.success("Sistem berhasil di-reset ke pengaturan pabrik");
            } catch (e) {
                toast.error("Gagal melakukan reset sistem");
            }
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backup Card */}
                <div className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition bg-white">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                            <Database size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">Cadangan Data Sistem</h3>
                            <p className="text-slate-500 text-sm">Ekspor semua log, transaksi, dan data master ke format JSON.</p>
                        </div>
                    </div>
                    <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-slate-200 rounded-lg font-bold text-slate-700 hover:border-blue-500 hover:text-blue-600 transition">
                        <Download size={18} />
                        Unduh Cadangan JSON
                    </button>
                </div>

                {/* Reset Cards Column */}
                <div className="space-y-6">
                    {/* Activity Reset Card (Go-Live Prep) */}
                    <div className="border border-orange-200 bg-orange-50 rounded-xl p-6 hover:shadow-md transition">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-orange-800">Persiapan Go-Live</h3>
                                <p className="text-orange-700 text-sm">Hapus aktivitas (transaksi & log), tapi <span className="font-bold underline">SIMPAN</span> data Instrumen, Unit & User.</p>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                const confirmation = prompt("Peringatan: Hapus Riwayat Transaksi untuk Go-Live??\nData Master (Instrumen/User) TETAP ADA.\n\nKetik 'SIAP' untuk konfirmasi:");
                                if (confirmation === 'SIAP') {
                                    try {
                                        const res = await ApiService.resetActivityData();
                                        if (!res.ok) throw new Error("Gagal reset data");

                                        toast.success("Riwayat transaksi telah dibersihkan. Data Master aman.");
                                        setTimeout(() => window.location.reload(), 1500);
                                    } catch (e) {
                                        toast.error("Gagal melakukan pembersihan data.");
                                    }
                                }
                            }}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-orange-200 rounded-lg font-bold text-orange-700 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition"
                        >
                            <Trash2 size={18} />
                            Hapus Riwayat Transaksi
                        </button>
                    </div>

                    {/* Full Factory Reset Card */}
                    <div className="border border-red-200 bg-red-50 rounded-xl p-6 hover:shadow-md transition opacity-80 hover:opacity-100">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-red-100 text-red-600 rounded-full">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-red-700">Reset Total (Pabrik)</h3>
                                <p className="text-red-500 text-sm">Hapus SEMUA data termasuk Instrumen dan User secara permanen.</p>
                            </div>
                        </div>
                        <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-red-200 rounded-lg font-bold text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition">
                            <Trash2 size={18} />
                            Hapus Total (Factory Reset)
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-slate-100 p-4 rounded-lg text-xs text-slate-500 font-mono">
                <p>Versi Sistem: 1.0.0 (Production Ready)</p>
                <p>Backend Status: Connected</p>
            </div>
        </div>
    );
};
