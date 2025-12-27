import React, { useState, useMemo } from 'react';
import { Transaction, Instrument, InstrumentSet } from '../../types';
import { CheckCircle2, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'sonner';
import { ITEM_TYPES } from '../../constants';

interface ItemVerification {
    id: string; // instrumentId or setId
    type: 'SINGLE' | 'SET';
    name: string;
    expectedCount: number;
    receivedCount: number;
    brokenCount: number;
    missingCount: number;
    notes: string;
    internalItems?: {
        instrumentId: string;
        name: string;
        expected: number;
        actual: number;
    }[];
}

interface Props {
    transaction: Transaction;
    instruments: Instrument[];
    sets: InstrumentSet[];
    onSubmit: (verifications: ItemVerification[], generalNotes: string) => Promise<void>;
    onCancel: () => void;
}

export const ValidationForm: React.FC<Props> = ({ transaction, instruments, sets, onSubmit, onCancel }) => {
    const [verifications, setVerifications] = useState<ItemVerification[]>(() => {
        const singleItems = transaction.items.map(item => {
            const instrument = instruments.find(i => i.id === item.instrumentId);
            return {
                id: item.instrumentId,
                type: ITEM_TYPES.SINGLE,
                name: instrument?.name || 'Unknown Instrument',
                expectedCount: item.count,
                receivedCount: item.count,
                brokenCount: 0,
                missingCount: 0,
                notes: ''
            };
        });

        const setItems = (transaction.setItems || []).map(item => {
            const set = sets?.find(s => s.id === item.setId);
            const internalItems = set?.items.map(si => ({
                instrumentId: si.instrumentId,
                name: instruments.find(i => i.id === si.instrumentId)?.name || si.instrumentId,
                expected: si.quantity,
                actual: si.quantity
            }));

            return {
                id: item.setId,
                type: ITEM_TYPES.SET,
                name: set?.name || 'Unknown Set',
                expectedCount: item.quantity,
                receivedCount: item.quantity,
                brokenCount: 0,
                missingCount: 0,
                notes: '',
                internalItems: internalItems
            };
        });

        return [...singleItems, ...setItems];
    });

    const [generalNotes, setGeneralNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateVerification = (index: number, field: keyof ItemVerification, value: any) => {
        const updated = [...verifications];
        updated[index] = { ...updated[index], [field]: value };

        // Auto-calculate receivedCount when broken or missing changes
        if (field === 'brokenCount' || field === 'missingCount') {
            const broken = field === 'brokenCount' ? parseInt(value) || 0 : updated[index].brokenCount;
            const missing = field === 'missingCount' ? parseInt(value) || 0 : updated[index].missingCount;
            updated[index].receivedCount = Math.max(0, updated[index].expectedCount - broken - missing);
        }

        // Auto-calculate broken/missing when receivedCount changes
        if (field === 'receivedCount') {
            const received = parseInt(value) || 0;
            const remaining = updated[index].expectedCount - received;
            // Keep existing broken/missing ratio if possible
            if (remaining >= 0) {
                updated[index].receivedCount = received;
            }
        }

        setVerifications(updated);
    };

    const updateInternalItem = (verificationIndex: number, itemIndex: number, newActual: number) => {
        const updated = [...verifications];
        const verification = { ...updated[verificationIndex] };

        if (verification.internalItems) {
            const newInternalItems = [...verification.internalItems];
            newInternalItems[itemIndex] = { ...newInternalItems[itemIndex], actual: newActual };
            verification.internalItems = newInternalItems;

            // Check for discrepancies in internal items
            const missingItems = newInternalItems.filter(i => i.actual < i.expected);
            if (missingItems.length > 0) {
                const notes = missingItems.map(i => `Kurang ${i.expected - i.actual}x ${i.name}`).join(', ');
                verification.notes = `⚠️ Tidak Lengkap: ${notes}`;
            } else {
                if (verification.notes.startsWith('⚠️')) verification.notes = '';
            }

            updated[verificationIndex] = verification;
            setVerifications(updated);
        }
    };

    const isValid = useMemo(() => {
        return verifications.every(v => {
            const total = v.receivedCount + v.brokenCount + v.missingCount;
            return total === v.expectedCount && total >= 0;
        });
    }, [verifications]);

    const hasDiscrepancy = useMemo(() => {
        return verifications.some(v => v.brokenCount > 0 || v.missingCount > 0);
    }, [verifications]);

    const totalDiscrepancy = useMemo(() => {
        return {
            broken: verifications.reduce((sum, v) => sum + v.brokenCount, 0),
            missing: verifications.reduce((sum, v) => sum + v.missingCount, 0)
        };
    }, [verifications]);

    const handleSubmit = async () => {
        if (!isValid) {
            toast.error('Total (Diterima + Rusak + Hilang) harus sama dengan jumlah yang Diharapkan.');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(verifications, generalNotes);
        } catch (error) {
            console.error('Validation error:', error);
            // Error handling is likely done in parent, but duplicate toast is fine or handle specific error here
            // Parent NurseView already toasts on error.
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-600 text-white rounded-lg">
                        <Package size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Verifikasi Fisik Item</h2>
                        <p className="text-sm text-slate-600">
                            Periksa setiap item dan catat kondisinya
                        </p>
                    </div>
                </div>

                {/* Summary */}
                <div className="mt-4 flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-600">Total Items:</span>
                        <span className="font-bold text-slate-900">{verifications.length}</span>
                    </div>
                    {hasDiscrepancy && (
                        <>
                            <div className="flex items-center gap-2 text-red-600">
                                <AlertTriangle size={16} />
                                <span className="font-bold">
                                    {totalDiscrepancy.broken} Rusak, {totalDiscrepancy.missing} Hilang
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Verification Items */}
            <div className="space-y-4">
                {verifications.map((verification, index) => {
                    const total = verification.receivedCount + verification.brokenCount + verification.missingCount;
                    const isItemValid = total === verification.expectedCount;

                    return (
                        <div
                            key={`${verification.type}-${verification.id}`}
                            className={`bg-white rounded-xl border-2 p-5 transition-all ${!isItemValid
                                ? 'border-red-300 bg-red-50'
                                : verification.brokenCount > 0 || verification.missingCount > 0
                                    ? 'border-amber-300 bg-amber-50'
                                    : 'border-slate-200 hover:border-blue-300'
                                }`}
                        >
                            {/* Item Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900">
                                        {verification.name}
                                    </h3>
                                    <div className="flex gap-2 text-xs font-mono items-center mt-1">
                                        <span className={`px-2 py-0.5 rounded text-white ${verification.type === ITEM_TYPES.SET ? 'bg-purple-500' : 'bg-blue-500'}`}>
                                            {verification.type}
                                        </span>
                                        <span className="text-slate-500">ID: {verification.id}</span>
                                    </div>
                                    {verification.type === ITEM_TYPES.SET && verification.internalItems && (
                                        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Cek Kelengkapan Isi:</p>
                                            <div className="space-y-2">
                                                {verification.internalItems.map((item, iIdx) => (
                                                    <div key={iIdx} className="flex items-center justify-between text-sm">
                                                        <span className={item.actual < item.expected ? 'text-red-600 font-medium' : 'text-slate-700'}>
                                                            {item.name}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-slate-400">Jml:</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={item.expected}
                                                                value={item.actual}
                                                                onChange={(e) => updateInternalItem(index, iIdx, parseInt(e.target.value))}
                                                                className={`w-12 p-1 text-center border rounded font-bold ${item.actual < item.expected ? 'border-red-300 bg-red-50 text-red-600' : 'border-slate-300'}`}
                                                            />
                                                            <span className="text-slate-400">/ {item.expected}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {!isItemValid && (
                                    <div className="flex items-center gap-2 text-red-600 text-sm font-bold">
                                        <AlertTriangle size={18} />
                                        Total tidak sesuai!
                                    </div>
                                )}
                            </div>

                            {/* Input Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                {/* Expected */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Diharapkan
                                    </label>
                                    <div className="text-3xl font-bold text-blue-600 bg-blue-50 rounded-lg p-3 text-center">
                                        {verification.expectedCount}
                                    </div>
                                </div>

                                {/* Received (OK) */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Diterima (OK)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={verification.expectedCount}
                                        value={verification.receivedCount}
                                        onChange={(e) => updateVerification(index, 'receivedCount', e.target.value)}
                                        className="w-full text-2xl font-bold text-center rounded-lg border-2 border-green-300 bg-green-50 text-green-700 p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                    />
                                </div>

                                {/* Broken */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Rusak
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={verification.expectedCount}
                                        value={verification.brokenCount}
                                        onChange={(e) => updateVerification(index, 'brokenCount', e.target.value)}
                                        className="w-full text-2xl font-bold text-center rounded-lg border-2 border-red-300 bg-red-50 text-red-700 p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                                    />
                                </div>

                                {/* Missing */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Hilang
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={verification.expectedCount}
                                        value={verification.missingCount}
                                        onChange={(e) => updateVerification(index, 'missingCount', e.target.value)}
                                        className="w-full text-2xl font-bold text-center rounded-lg border-2 border-amber-300 bg-amber-50 text-amber-700 p-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Total Indicator */}
                            <div className={`text-sm font-bold mb-3 p-2 rounded-lg ${isItemValid
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                                }`}>
                                Total: {total} / {verification.expectedCount} {isItemValid ? '✓' : '✗'}
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Catatan (opsional)
                                </label>
                                <input
                                    type="text"
                                    value={verification.notes}
                                    onChange={(e) => updateVerification(index, 'notes', e.target.value)}
                                    placeholder="Contoh: Kemasan rusak, instrumen berkarat, dll"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* General Notes */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    Catatan Umum Transaksi
                </label>
                <textarea
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    rows={3}
                    placeholder="Catatan tambahan untuk transaksi ini..."
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
                <button
                    onClick={handleSubmit}
                    disabled={!isValid || isSubmitting}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${!isValid || isSubmitting
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : hasDiscrepancy
                            ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-200'
                            : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                        }`}
                >
                    <CheckCircle2 size={24} />
                    {isSubmitting ? 'Memproses...' : hasDiscrepancy ? 'Konfirmasi dengan Discrepancy' : 'Konfirmasi & Validasi'}
                </button>
                <button
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="px-6 py-4 border-2 border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                    Batal
                </button>
            </div>

            {/* Warning if has discrepancy */}
            {hasDiscrepancy && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                        <div className="flex-1">
                            <h4 className="font-bold text-amber-900 mb-1">Perhatian: Discrepancy Terdeteksi</h4>
                            <p className="text-sm text-amber-800">
                                Transaksi ini memiliki {totalDiscrepancy.broken} item rusak dan {totalDiscrepancy.missing} item hilang.
                                Pastikan Anda sudah memeriksa dengan teliti sebelum konfirmasi.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
