import React, { useState } from 'react';
import { Truck, Trash2, CheckCircle2, Mail, Flame, Package, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ApiService } from '../services/apiService';
import { useAppContext } from '../context/AppContext';
import { LogEntry, Transaction, TransactionItem, TransactionSetItem, TransactionType, Unit } from '../types';
import QRScanner from '../components/QRScanner';
import TransactionForm from '../components/TransactionForm';
import QRCodeGenerator from '../components/QRCodeGenerator';
import { SterilizationView } from './cssd/SterilizationView';
import { RequestInbox } from './cssd/RequestInbox';
import { PackingStation } from './cssd/PackingStation';

const BTN_PRIMARY_CLASSES = "bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2";

const CSSDView = () => {
    const { units, createTransaction, logs, requests } = useAppContext();
    const [mode, setMode] = useState<'HOME' | 'DISTRIBUTE_SCAN' | 'COLLECT_SCAN' | 'FORM' | 'SUCCESS' | 'INBOX' | 'STERILIZATION' | 'PACKING'>('HOME');
    const [scannedUnit, setScannedUnit] = useState<Unit | null>(null);
    const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.DISTRIBUTE);
    const [generatedTx, setGeneratedTx] = useState<Transaction | null>(null);

    const pendingCount = requests.filter(r => r.status === 'PENDING').length;

    const handleUnitScan = async (code: string) => {
        // Trim whitespace just in case
        const cleanCode = code.trim();
        const unit = units.find((u: Unit) => u.qrCode === cleanCode);

        if (unit) {
            // BLOCKING LOGIC: Check for Overdue Instruments
            if (transactionType === TransactionType.DISTRIBUTE) {
                try {
                    const check = await ApiService.checkUnitOverdue(unit.id);
                    if (check && check.hasOverdue) {
                        toast.error(`BLOCKED: Unit ${unit.name} memiliki instrumen BELUM KEMBALI (Overdue). Selesaikan pengembalian terlebih dahulu!`, {
                            duration: 5000,
                            className: 'bg-red-100 text-red-800 border border-red-200'
                        });
                        // Strictly block distribution
                        return;
                    }
                } catch (e) {
                    console.error("Failed to check overdue", e);
                    // Optionally warn if offline, but for safety we proceed if check fails? 
                    // Or block? Let's proceed with warning if check fails to avoid lockout during network issues.
                    toast.warning("Gagal memperbarui status overdue. Melanjutkan dengan risiko.");
                }
            }

            setScannedUnit(unit);
            setMode('FORM');
        } else {
            toast.error('QR Code Unit Tidak Dikenal: ' + cleanCode);
        }
    };

    const handleCreateTx = async (items: TransactionItem[], setItems: TransactionSetItem[], packIds?: string[], expectedReturnDate?: number | null) => {
        if (!scannedUnit) return;
        const tx = await createTransaction(transactionType, scannedUnit.id, items, setItems, packIds, expectedReturnDate);
        if (tx) {
            setGeneratedTx(tx);
            setMode('SUCCESS');
        }
    };

    const reset = () => {
        setMode('HOME');
        setScannedUnit(null);
        setGeneratedTx(null);
    };

    if (mode === 'HOME') {
        return (
            <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="mb-8">
                    <h2 className="text-3xl font-bold text-slate-800">Operasional CSSD</h2>
                    <p className="text-slate-500">Pilih tindakan untuk memulai alur kerja</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Section: External Transactions */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Transaksi Eksternal</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <button
                                onClick={() => { setTransactionType(TransactionType.DISTRIBUTE); setMode('DISTRIBUTE_SCAN'); }}
                                className="flex items-center p-6 bg-blue-600 text-white rounded-2xl shadow-lg hover:bg-blue-700 hover:scale-[1.02] transition transform group"
                            >
                                <div className="p-3 bg-white/20 rounded-xl mr-4 group-hover:bg-white/30 transition">
                                    <Truck size={28} />
                                </div>
                                <div className="text-left">
                                    <span className="block text-xl font-bold">Distribusi Steril</span>
                                    <span className="text-blue-100 text-sm">Kirim barang ke unit</span>
                                </div>
                            </button>

                            <button
                                onClick={() => { setTransactionType(TransactionType.COLLECT); setMode('COLLECT_SCAN'); }}
                                className="flex items-center p-6 bg-orange-500 text-white rounded-2xl shadow-lg hover:bg-orange-600 hover:scale-[1.02] transition transform group"
                            >
                                <div className="p-3 bg-white/20 rounded-xl mr-4 group-hover:bg-white/30 transition">
                                    <Trash2 size={28} />
                                </div>
                                <div className="text-left">
                                    <span className="block text-xl font-bold">Ambil Kotor</span>
                                    <span className="text-orange-100 text-sm">Ambil barang dari unit</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Section: Internal Processing */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Proses Internal</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <button
                                onClick={() => setMode('PACKING')}
                                className="flex items-center p-6 bg-white border-2 border-purple-100 rounded-2xl shadow-sm hover:border-purple-500 hover:shadow-md transition group"
                            >
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl mr-4 group-hover:scale-110 transition">
                                    <Package size={28} />
                                </div>
                                <div className="text-left">
                                    <span className="block text-xl font-bold text-slate-800">Packing Station</span>
                                    <span className="text-slate-500 text-sm">Buat Set & Pouch</span>
                                </div>
                            </button>

                            <button
                                onClick={() => setMode('STERILIZATION')}
                                className="flex items-center p-6 bg-white border-2 border-indigo-100 rounded-2xl shadow-sm hover:border-indigo-500 hover:shadow-md transition group"
                            >
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl mr-4 group-hover:scale-110 transition">
                                    <Flame size={28} />
                                </div>
                                <div className="text-left">
                                    <span className="block text-xl font-bold text-slate-800">Sterilisasi Central</span>
                                    <span className="text-slate-500 text-sm">Cuci, Packing & Autoclave</span>
                                </div>
                            </button>

                            <button
                                onClick={() => setMode('INBOX')}
                                className="flex items-center p-6 bg-white border-2 border-slate-100 rounded-2xl shadow-sm hover:border-blue-400 hover:shadow-md transition group relative overflow-hidden"
                            >
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl mr-4 group-hover:scale-110 transition">
                                    <Mail size={28} />
                                </div>
                                <div className="text-left z-10">
                                    <span className="block text-xl font-bold text-slate-800">Permintaan Masuk</span>
                                    <span className="text-slate-500 text-sm">Cek request dari unit</span>
                                </div>
                                {pendingCount > 0 && (
                                    <div className="absolute top-0 right-0 p-3">
                                        <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-lg">
                                            {pendingCount} Pending
                                        </span>
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                {/* ... existing logs ... */}

                {/* Recent Activity Mini-Feed */}
                <div className="mt-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Aktivitas Sistem Terbaru</h3>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3 max-h-60 overflow-y-auto">
                        {logs.slice(0, 5).map((log: LogEntry) => (
                            <div key={log.id} className="flex gap-3 text-sm">
                                <span className="text-slate-400 font-mono text-xs whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className={`flex-1 ${log.type === 'SUCCESS' ? 'text-green-600' : 'text-slate-700'}`}>{log.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'PACKING') {
        return (
            <div>
                <button onClick={() => setMode('HOME')} className="mb-6 flex items-center gap-2 px-4 py-2 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-all group">
                    <ArrowLeft size={18} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                    <span className="font-medium">Kembali ke Beranda</span>
                </button>
                <PackingStation />
            </div>
        );
    }

    if (mode === 'INBOX') {
        return (
            <div>
                <button onClick={() => setMode('HOME')} className="mb-6 flex items-center gap-2 px-4 py-2 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-all group">
                    <ArrowLeft size={18} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                    <span className="font-medium">Kembali ke Beranda</span>
                </button>
                <RequestInbox />
            </div>
        );
    }

    if (mode === 'DISTRIBUTE_SCAN' || mode === 'COLLECT_SCAN') {
        return (
            <QRScanner
                title={`Scan QR Unit ${mode === 'DISTRIBUTE_SCAN' ? 'Tujuan' : 'Sumber'}`}
                onScan={handleUnitScan}
                onClose={reset}
                expectedPrefix="UNIT-"
            />
        );
    }

    if (mode === 'FORM' && scannedUnit) {
        return (
            <TransactionForm
                unit={scannedUnit}
                type={transactionType}
                onSubmit={handleCreateTx}
                onCancel={reset}
            />
        );
    }

    if (mode === 'STERILIZATION') {
        return (
            <div>
                <button onClick={() => setMode('HOME')} className="mb-6 flex items-center gap-2 px-4 py-2 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-all group">
                    <ArrowLeft size={18} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                    <span className="font-medium">Kembali ke Beranda</span>
                </button>
                <SterilizationView />
            </div>
        );
    }

    if (mode === 'SUCCESS' && generatedTx) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Transaksi Dibuat!</h2>
                <p className="text-slate-500 mb-8 max-w-xs mx-auto">
                    Tunjukkan kode QR ini kepada perawat di <span className="font-semibold text-slate-800">{scannedUnit?.name}</span> untuk validasi.
                </p>

                <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 mb-8">
                    <QRCodeGenerator value={generatedTx.qrCode} size={256} />
                    <p className="text-center text-xs font-mono mt-4 text-slate-400">{generatedTx.id}</p>
                </div>

                <div className="mb-8 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                    <p className="font-semibold">Batas Pengembalian:</p>
                    <p>{generatedTx.expectedReturnDate ? new Date(generatedTx.expectedReturnDate).toLocaleDateString() : 'Tidak ditentukan'}</p>
                </div>

                <button onClick={reset} className={`max-w-sm w-full ${BTN_PRIMARY_CLASSES}`}>
                    Selesai / Kembali ke Beranda
                </button>
            </div>
        );
    }

    return null;
};

export default CSSDView;
