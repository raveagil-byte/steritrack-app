import React from 'react';
import { Database, AlertTriangle, Download, Trash2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'sonner';

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
        // Double confirmation for safety
        if (confirm("PERINGATAN KERAS:\n\nSemua data (Transaksi, User, Unit, Instrumen, Log) akan dihapus PERMANEN.\n\nDatabase akan kembali bersih seperti baru.\n\nApakah Anda yakin ingin melanjutkan?")) {
            if (confirm("Apakah Anda benar-benar yakin? Tindakan ini tidak dapat dibatalkan.")) {
                try {
                    await resetSystem();
                    toast.success("Sistem berhasil di-reset ke pengaturan pabrik");
                } catch (e) {
                    toast.error("Gagal melakukan reset sistem");
                }
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

                {/* Reset Factory Card */}
                <div className="border border-red-100 bg-red-50/30 rounded-xl p-6 hover:shadow-md transition">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-full">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-red-700">Reset Pabrik</h3>
                            <p className="text-red-500 text-sm">Hapus semua data secara permanen dan kosongkan database.</p>
                        </div>
                    </div>
                    <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-red-200 rounded-lg font-bold text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition">
                        <Trash2 size={18} />
                        Reset Semua Data
                    </button>
                </div>
            </div>

            <div className="bg-slate-100 p-4 rounded-lg text-xs text-slate-500 font-mono">
                <p>Versi Sistem: 1.0.0 (Production Ready)</p>
                <p>Backend Status: Connected</p>
            </div>
        </div>
    );
};
