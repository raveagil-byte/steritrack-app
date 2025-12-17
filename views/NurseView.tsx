import React, { useState, useMemo } from 'react';
import { Truck, Trash2, CheckCircle2, ClipboardCheck, QrCode, Package, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Transaction, TransactionItem, TransactionStatus, TransactionType, Instrument } from '../types';
import { toast } from 'sonner';
import QRScanner from '../components/QRScanner';
import QRCodeGenerator from '../components/QRCodeGenerator';
import { ApiService } from '../services/apiService';
import { NurseRequest } from './nurse/NurseRequest';
import { ValidationForm } from './nurse/ValidationForm';
import { NurseReturn } from './nurse/NurseReturn';
import { NurseUsage } from './nurse/NurseUsage';

const BTN_PRIMARY_CLASSES = "bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2";

const NurseView = () => {
    const { validateTransaction, transactions, instruments, currentUser, units, sets } = useAppContext();
    const [isScanning, setIsScanning] = useState(false);
    const [scannedTxId, setScannedTxId] = useState<string | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<string>(currentUser?.unitId || '');


    const pendingTx = useMemo(() => {
        return transactions.find((t: Transaction) => t.id === scannedTxId);
    }, [transactions, scannedTxId]);

    // Get instruments available in selected unit
    const unitInventory = useMemo(() => {
        const targetUnitId = selectedUnitId;
        if (!targetUnitId) return [];

        return instruments
            .map((inst: Instrument) => ({
                ...inst,
                unitQuantity: inst.unitStock[targetUnitId] || 0
            }))
            .filter(inst => inst.unitQuantity > 0)
            .sort((a, b) => b.unitQuantity - a.unitQuantity);
    }, [instruments, selectedUnitId]);

    const currentUnit = useMemo(() => {
        return units.find(u => u.id === selectedUnitId);
    }, [units, selectedUnitId]);


    const handleScan = (code: string) => {
        // Attempt to match QR code directly or Transaction ID if user manually entered
        const found = transactions.find((t: Transaction) => t.qrCode === code || t.id === code);

        if (found) {
            if (found.status !== TransactionStatus.PENDING) {
                toast.error(`Transaksi sudah ${found.status.toLowerCase()}.`);
                setIsScanning(false);
                return;
            }
            setScannedTxId(found.id);
            setIsScanning(false);
        } else {
            toast.error("QR Transaksi Tidak Valid. Silakan coba lagi.");
        }
    };

    // LEGACY: Simple validation (for backward compatibility)
    const handleValidate = async () => {
        if (scannedTxId) {
            const success = await validateTransaction(scannedTxId, currentUser?.name || "Perawat");
            if (success) {
                setScannedTxId(null);
                toast.success("Transaksi Berhasil Divalidasi! Inventaris Diperbarui.");
            }
        }
    };

    // NEW: Enhanced validation with physical verification
    const handleValidateWithVerification = async (verifications: any[], generalNotes: string) => {
        if (!scannedTxId) return;

        try {
            const data = {
                validatedBy: currentUser?.name || 'Perawat',
                items: verifications
                    .filter((v: any) => v.type === 'SINGLE')
                    .map((v: any) => ({
                        instrumentId: v.id,
                        expectedCount: v.expectedCount,
                        receivedCount: v.receivedCount,
                        brokenCount: v.brokenCount,
                        missingCount: v.missingCount,
                        notes: v.notes
                    })),
                setItems: verifications
                    .filter((v: any) => v.type === 'SET')
                    .map((v: any) => ({
                        setId: v.id,
                        expectedQuantity: v.expectedCount,
                        receivedQuantity: v.receivedCount,
                        brokenCount: v.brokenCount,
                        missingCount: v.missingCount,
                        notes: v.notes
                    })),
                notes: generalNotes
            };

            const result: any = await ApiService.validateTransactionWithVerification(scannedTxId, data);

            // Show success message with discrepancy info
            if (result.hasDiscrepancy) {
                toast.success(
                    `Validasi berasil dengan discrepancy (Rusak: ${result.discrepancySummary.totalBroken}, Hilang: ${result.discrepancySummary.totalMissing})`,
                    { duration: 5000 }
                );
            } else {
                toast.success('Validasi berhasil! Semua item sesuai dan stok telah diperbarui.');
            }

            // Reset and refresh
            setScannedTxId(null);

            // Reload transactions to get updated data
            window.location.reload();

        } catch (error) {
            console.error('Validation error:', error);
            toast.error('Gagal validasi: ' + (error as Error).message);
            throw error; // Re-throw to let ValidationForm handle it
        }
    };

    const [activeTab, setActiveTab] = useState<'VALIDATE' | 'REQUEST' | 'INVENTORY' | 'RETURN' | 'USAGE'>('USAGE');

    const [showUnitQR, setShowUnitQR] = useState(false);

    if (isScanning) {
        return <QRScanner title="Scan QR Transaksi CSSD" onScan={handleScan} onClose={() => setIsScanning(false)} expectedPrefix="TX-" />;
    }

    return (
        <div className="space-y-6">
            {/* Unit QR Modal - Unchanged // FORCE UPDATE TRIGGER */}
            {showUnitQR && currentUnit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-lg text-slate-800">QR Code Unit</h3>
                            <button onClick={() => setShowUnitQR(false)} className="p-1 rounded-full hover:bg-slate-100 transition">
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>
                        <div className="flex justify-center p-4 bg-white rounded-xl border-2 border-dashed border-blue-200">
                            {/* Ensure we use QR CODE, fallback to ID only if missing */}
                            <QRCodeGenerator value={currentUnit.qrCode || currentUnit.id} size={200} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-blue-600">{currentUnit.name}</h2>
                            <p className="text-lg font-mono font-bold text-slate-700 mt-2 bg-slate-100 py-1 rounded">{currentUnit.qrCode || currentUnit.id}</p>
                            <p className="text-[10px] text-slate-400 mt-1">ID: {currentUnit.id}</p>
                        </div>
                        <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                            Tunjukkan QR ini kepada petugas CSSD saat pengambilan barang kotor atau penerimaan barang steril.
                        </p>
                        <button onClick={() => setShowUnitQR(false)} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">Tutup</button>
                    </div>
                </div>
            )}

            {/* Mobile-friendly Tab Switcher */}
            <div className="flex flex-col items-center mb-6 gap-4">
                {/* Unit Info & QR Button - Unchanged */}
                {selectedUnitId && (
                    <div className="w-full max-w-md bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                {currentUnit?.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase">Unit Anda</p>
                                <h3 className="text-sm font-bold text-slate-800">{currentUnit?.name || 'Loading...'}</h3>
                            </div>
                        </div>
                        <button onClick={() => setShowUnitQR(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors">
                            <QrCode size={16} />
                            Lihat QR
                        </button>
                    </div>
                )}

                {/* Admin / No Unit Selector - Unchanged */}
                {(!currentUser?.unitId || currentUser.role === 'ADMIN') && (
                    <div className="w-full max-w-xs">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pilih Unit (Mode Admin)</label>
                        <select value={selectedUnitId} onChange={(e) => setSelectedUnitId(e.target.value)} className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold">
                            <option value="">-- Pilih Unit --</option>
                            {units.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}
                        </select>
                    </div>
                )}

                {/* TABS */}
                <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex flex-wrap justify-center gap-1">
                    <button
                        onClick={() => setActiveTab('VALIDATE')}
                        className={`px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'VALIDATE' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Terima
                    </button>
                    <button
                        onClick={() => setActiveTab('USAGE')}
                        className={`px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'USAGE' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Pakai / Usage
                    </button>
                    <button
                        disabled={!selectedUnitId}
                        onClick={() => setActiveTab('REQUEST')}
                        className={`px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'REQUEST' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'} disabled:opacity-50`}
                    >
                        Minta
                    </button>
                    <button
                        disabled={!selectedUnitId}
                        onClick={() => setActiveTab('RETURN')}
                        className={`px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'RETURN' ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'} disabled:opacity-50`}
                    >
                        Kembalikan
                    </button>
                    <button
                        disabled={!selectedUnitId}
                        onClick={() => setActiveTab('INVENTORY')}
                        className={`px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'INVENTORY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'} disabled:opacity-50`}
                    >
                        Inventaris
                    </button>
                </div>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'INVENTORY' ? (
                // INVENTORY TAB - Show unit inventory (Using existing code structure, simplified for replacement)
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-600 text-white rounded-lg"><Package size={24} /></div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">Inventaris Unit</h2>
                                    <p className="text-sm text-slate-600">{currentUnit?.name || 'Unit Anda'}</p>
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm mt-2">Instrumen yang tersedia di unit Anda saat ini</p>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {unitInventory.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Package className="mx-auto mb-4 text-slate-300" size={48} />
                                    <p className="text-slate-400 font-medium">Tidak ada instrumen di unit ini</p>
                                    <p className="text-slate-300 text-sm mt-1">Silakan request item dari CSSD</p>
                                </div>
                            ) : (
                                unitInventory.map((inst: any) => (
                                    <div key={inst.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-slate-900">{inst.name}</h3>
                                                <p className="text-xs text-slate-500 mt-1">{inst.category}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-blue-600">{inst.unitQuantity}</div>
                                                    <div className="text-xs text-slate-400 uppercase tracking-wide">Tersedia</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : activeTab === 'USAGE' ? (
                <NurseUsage unitId={selectedUnitId} />
            ) : activeTab === 'REQUEST' ? (
                <NurseRequest unitId={selectedUnitId} />
            ) : activeTab === 'RETURN' ? (
                <NurseReturn unitId={selectedUnitId} onSuccess={() => {
                    alert('Pengembalian berhasil!');
                    setActiveTab('VALIDATE');
                }} />
            ) : scannedTxId && pendingTx ? (
                <ValidationForm
                    transaction={pendingTx}
                    instruments={instruments}
                    sets={sets}
                    onSubmit={handleValidateWithVerification}
                    onCancel={() => setScannedTxId(null)}
                />
            ) : (
                <div className="max-w-xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4"><ClipboardCheck size={48} /></div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Stasiun Perawat / Unit</h2>
                        <p className="text-slate-500 mt-2">Menunggu pengiriman atau pengambilan?</p>
                    </div>
                    <button onClick={() => setIsScanning(true)} className={`w-full max-w-sm flex items-center justify-center gap-3 py-4 text-lg shadow-xl shadow-indigo-200 ${BTN_PRIMARY_CLASSES}`}>
                        <QrCode />
                        Scan QR Transaksi
                    </button>
                    <div className="mt-8 w-full">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Transaksi Pending Terbaru</p>
                        <div className="space-y-2">
                            {transactions.filter((t: Transaction) => t.status === TransactionStatus.PENDING).length === 0 && <p className="text-sm text-slate-300 italic">Tidak ada transaksi pending</p>}
                            {transactions.filter((t: Transaction) => t.status === TransactionStatus.PENDING).map((t: Transaction) => (
                                <div key={t.id} onClick={() => setScannedTxId(t.id)} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-400 transition">
                                    <div className="text-left">
                                        <div className="font-mono text-xs text-slate-400">{t.id}</div>
                                        <div className="font-medium text-sm">{t.type}</div>
                                    </div>
                                    <div className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">PENDING</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NurseView;
