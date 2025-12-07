import React, { useState } from 'react';
import { Truck, Trash2, CheckCircle2, Mail } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { LogEntry, Transaction, TransactionItem, TransactionSetItem, TransactionType, Unit } from '../types';
import QRScanner from '../components/QRScanner';
import TransactionForm from '../components/TransactionForm';
import QRCodeGenerator from '../components/QRCodeGenerator';
import { SterilizationView } from './cssd/SterilizationView';
import { RequestInbox } from './cssd/RequestInbox';

const BTN_PRIMARY_CLASSES = "bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2";

const CSSDView = () => {
    const { units, createTransaction, logs, requests } = useAppContext();
    const [mode, setMode] = useState<'HOME' | 'DISTRIBUTE_SCAN' | 'COLLECT_SCAN' | 'FORM' | 'SUCCESS' | 'INBOX' | 'STERILIZATION'>('HOME');
    const [scannedUnit, setScannedUnit] = useState<Unit | null>(null);
    const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.DISTRIBUTE);
    const [generatedTx, setGeneratedTx] = useState<Transaction | null>(null);

    const pendingCount = requests.filter(r => r.status === 'PENDING').length;

    const handleUnitScan = (code: string) => {
        const unit = units.find((u: Unit) => u.qrCode === code);
        if (unit) {
            setScannedUnit(unit);
            setMode('FORM');
        } else {
            alert('QR Code Unit Tidak Dikenal: ' + code);
        }
    };

    const handleCreateTx = async (items: TransactionItem[], setItems: TransactionSetItem[]) => {
        if (!scannedUnit) return;
        const tx = await createTransaction(transactionType, scannedUnit.id, items, setItems);
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Request Inbox Button (Wide) */}
                    <button
                        onClick={() => setMode('INBOX')}
                        className="md:col-span-2 flex items-center justify-between p-6 bg-white border-2 border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 hover:shadow-md transition group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                                <Mail size={24} />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition">Permintaan Masuk</h3>
                                <p className="text-sm text-slate-400">Kelola request dari unit</p>
                            </div>
                        </div>
                        {pendingCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-red-200 shadow-lg">
                                {pendingCount} Pending
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => { setTransactionType(TransactionType.DISTRIBUTE); setMode('DISTRIBUTE_SCAN'); }}
                        className="flex flex-col items-center justify-center p-8 bg-blue-600 text-white rounded-2xl shadow-lg hover:bg-blue-700 hover:scale-[1.02] transition transform"
                    >
                        {/* ... existing button content ... */}
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                            <Truck size={32} />
                        </div>
                        <span className="text-xl font-bold">Distribusi Steril</span>
                        <span className="text-sm opacity-80 mt-1">Kirim ke Unit</span>
                    </button>

                    <button
                        onClick={() => { setTransactionType(TransactionType.COLLECT); setMode('COLLECT_SCAN'); }}
                        className="flex flex-col items-center justify-center p-8 bg-orange-500 text-white rounded-2xl shadow-lg hover:bg-orange-600 hover:scale-[1.02] transition transform"
                    >
                        {/* ... existing button content ... */}
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                            <Trash2 size={32} />
                        </div>
                        <span className="text-xl font-bold">Ambil Kotor</span>
                        <span className="text-sm opacity-80 mt-1">Ambil dari Unit</span>
                    </button>
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

    if (mode === 'INBOX') {
        return (
            <div>
                <button onClick={() => setMode('HOME')} className="mb-4 text-slate-500 hover:text-slate-800 flex items-center gap-2">
                    &larr; Kembali ke Beranda
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
                <button onClick={() => setMode('HOME')} className="mb-4 text-slate-500 hover:text-slate-800 flex items-center gap-2">
                    &larr; Kembali ke Beranda
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

                <button onClick={reset} className={`max-w-sm w-full ${BTN_PRIMARY_CLASSES}`}>
                    Selesai / Kembali ke Beranda
                </button>
            </div>
        );
    }

    return null;
};

export default CSSDView;
