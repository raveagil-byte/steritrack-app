import React, { useState, useMemo } from 'react';
import { Truck, Trash2, CheckCircle2, ClipboardCheck, QrCode, Package } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Transaction, TransactionItem, TransactionStatus, TransactionType, Instrument } from '../types';
import QRScanner from '../components/QRScanner';
import { NurseRequest } from './nurse/NurseRequest';

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
                alert(`Transaksi sudah ${found.status.toLowerCase()}.`);
                setIsScanning(false);
                return;
            }
            setScannedTxId(found.id);
            setIsScanning(false);
        } else {
            alert("QR Transaksi Tidak Valid. Silakan coba lagi.");
        }
    };

    const handleValidate = async () => {
        if (scannedTxId) {
            const success = await validateTransaction(scannedTxId, currentUser?.name || "Perawat");
            if (success) {
                setScannedTxId(null);
                alert("Transaksi Berhasil Divalidasi! Inventaris Diperbarui.");
            }
        }
    };

    const [activeTab, setActiveTab] = useState<'VALIDATE' | 'REQUEST' | 'INVENTORY'>('VALIDATE');

    if (isScanning) {
        return <QRScanner title="Scan QR Transaksi CSSD" onScan={handleScan} onClose={() => setIsScanning(false)} expectedPrefix="TX-" />;
    }

    return (
        <div className="space-y-6">
            {/* Mobile-friendly Tab Switcher */}
            <div className="flex flex-col items-center mb-6 gap-4">
                {/* Admin / No Unit Selector */}
                {(!currentUser?.unitId || currentUser.role === 'ADMIN') && (
                    <div className="w-full max-w-xs">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pilih Unit (Mode Admin)</label>
                        <select
                            value={selectedUnitId}
                            onChange={(e) => setSelectedUnitId(e.target.value)}
                            className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold"
                        >
                            <option value="">-- Pilih Unit --</option>
                            {units.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
                    <button
                        onClick={() => setActiveTab('VALIDATE')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'VALIDATE' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Terima Barang
                    </button>
                    <button
                        disabled={!selectedUnitId}
                        onClick={() => setActiveTab('REQUEST')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'REQUEST' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'} disabled:opacity-50`}
                    >
                        Buat Permintaan
                    </button>
                    <button
                        disabled={!selectedUnitId}
                        onClick={() => setActiveTab('INVENTORY')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'INVENTORY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'} disabled:opacity-50`}
                    >
                        Inventaris Unit
                    </button>
                </div>
            </div>


            {activeTab === 'INVENTORY' ? (
                // INVENTORY TAB - Show unit inventory
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-600 text-white rounded-lg">
                                    <Package size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">Inventaris Unit</h2>
                                    <p className="text-sm text-slate-600">{currentUnit?.name || 'Unit Anda'}</p>
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm mt-2">
                                Instrumen yang tersedia di unit Anda saat ini
                            </p>
                        </div>

                        {/* Inventory List */}
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
                                                    <div className="text-2xl font-bold text-blue-600">
                                                        {inst.unitQuantity}
                                                    </div>
                                                    <div className="text-xs text-slate-400 uppercase tracking-wide">
                                                        Tersedia
                                                    </div>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${inst.unitQuantity > 10
                                                    ? 'bg-green-100 text-green-700'
                                                    : inst.unitQuantity > 5
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {inst.unitQuantity > 10 ? 'Cukup' : inst.unitQuantity > 5 ? 'Sedang' : 'Rendah'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer Stats */}
                        {unitInventory.length > 0 && (
                            <div className="p-4 bg-slate-50 border-t border-slate-200">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600 font-medium">
                                        Total Jenis Instrumen:
                                    </span>
                                    <span className="text-slate-900 font-bold">
                                        {unitInventory.length} jenis
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm mt-2">
                                    <span className="text-slate-600 font-medium">
                                        Total Kuantitas:
                                    </span>
                                    <span className="text-slate-900 font-bold">
                                        {unitInventory.reduce((sum: number, inst: any) => sum + inst.unitQuantity, 0)} pcs
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : activeTab === 'REQUEST' ? (
                <NurseRequest unitId={selectedUnitId} />
            ) : scannedTxId && pendingTx ? (

                // EXISTING VALIDATION UI CODE
                <div className="max-w-xl mx-auto space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-blue-50">
                            <div className="flex items-center gap-2 text-blue-600 mb-2">
                                {pendingTx.type === TransactionType.DISTRIBUTE ? <Truck size={20} /> : <Trash2 size={20} />}
                                <span className="font-bold tracking-wide text-xs uppercase">{pendingTx.type}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Validasi Item</h2>
                            <p className="text-slate-500 text-sm">Mohon periksa item di bawah ini sesuai dengan yang Anda terima.</p>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {/* Single Instruments */}
                            {pendingTx.items && pendingTx.items.length > 0 && (
                                <>
                                    <div className="p-3 bg-slate-50">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Instrumen Satuan</h4>
                                    </div>
                                    {pendingTx.items.map((item: TransactionItem) => {
                                        const inst = instruments.find((i: Instrument) => i.id === item.instrumentId);
                                        return (
                                            <div key={item.instrumentId} className="p-4 flex justify-between items-center">
                                                <span className="font-medium">{inst?.name || 'Item Tidak Diketahui'}</span>
                                                <span className="bg-slate-100 px-3 py-1 rounded-full text-sm font-bold">{item.count}x</span>
                                            </div>
                                        );
                                    })}
                                </>
                            )}

                            {/* Instrument Sets */}
                            {pendingTx.setItems && pendingTx.setItems.length > 0 && (
                                <>
                                    <div className="p-3 bg-indigo-50">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600">Set Instrumen</h4>
                                    </div>
                                    {pendingTx.setItems.map((setItem: any) => {
                                        const set = sets.find((s: any) => s.id === setItem.setId);
                                        return (
                                            <div key={setItem.setId} className="p-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold text-indigo-700">{set?.name || 'Set Tidak Diketahui'}</span>
                                                    <span className="bg-indigo-100 px-3 py-1 rounded-full text-sm font-bold text-indigo-700">{setItem.quantity}x</span>
                                                </div>
                                                {set && set.items && (
                                                    <div className="ml-4 mt-2 space-y-1">
                                                        {set.items.map((si: any) => {
                                                            const inst = instruments.find((i: Instrument) => i.id === si.instrumentId);
                                                            return (
                                                                <div key={si.instrumentId} className="text-xs text-slate-600 flex justify-between">
                                                                    <span>• {inst?.name || 'Unknown'}</span>
                                                                    <span className="text-slate-400">{si.quantity * setItem.quantity}x</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </>
                            )}

                            {/* Empty State */}
                            {(!pendingTx.items || pendingTx.items.length === 0) && (!pendingTx.setItems || pendingTx.setItems.length === 0) && (
                                <div className="p-8 text-center text-slate-400">
                                    <p>Tidak ada item dalam transaksi ini</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-50">
                            <button onClick={handleValidate} className={`w-full bg-green-600 hover:bg-green-700 ${BTN_PRIMARY_CLASSES}`}>
                                <CheckCircle2 className="inline mr-2" size={20} />
                                Konfirmasi & Validasi
                            </button>
                            <button onClick={() => setScannedTxId(null)} className="mt-3 w-full text-center text-slate-400 text-sm hover:text-slate-600">
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                // EXISTING DEFAULT VIEW CODE
                <div className="max-w-xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                        <ClipboardCheck size={48} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Stasiun Perawat / Unit</h2>
                        <p className="text-slate-500 mt-2">Menunggu pengiriman atau pengambilan?</p>
                    </div>
                    <button
                        onClick={() => setIsScanning(true)}
                        className={`w-full max-w-sm flex items-center justify-center gap-3 py-4 text-lg shadow-xl shadow-indigo-200 ${BTN_PRIMARY_CLASSES}`}
                    >
                        <QrCode />
                        Scan QR Transaksi
                    </button>

                    {/* Simple helper for demo to show pending transactions without scanning if camera fails */}
                    <div className="mt-8 w-full">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Transaksi Pending Terbaru</p>
                        <div className="space-y-2">
                            {/* ... filter logic ... */}
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
