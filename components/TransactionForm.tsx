import React, { useState } from 'react';
import { Instrument, InstrumentSet, TransactionItem, TransactionSetItem, TransactionType, Unit } from '../types';
import QRScanner from './QRScanner';
import { Minus, Plus, QrCode, X, Package, Layers, Clock } from 'lucide-react';
import { useTransactionLogic } from '../hooks/useTransactionLogic';
import { BUTTON_CLASSES, DISCREPANCY_TYPES, TRANSACTION_TYPES, VIEW_MODES } from '../constants';

interface TransactionFormProps {
    unit: Unit;
    type: TransactionType;
    onSubmit: (items: TransactionItem[], setItems: TransactionSetItem[], packIds?: string[], expectedReturnDate?: number | null) => void;
    onCancel: () => void;
}

const TransactionForm = ({ unit, type, onSubmit, onCancel }: TransactionFormProps) => {
    // 🔥 CLEAN CODE: All logic moved to Custom Hook
    const logic = useTransactionLogic({ unit, type, onSubmit, onClose: onCancel });

    // UI Local State (View logic only)
    const [viewMode, setViewMode] = useState<keyof typeof VIEW_MODES>(VIEW_MODES.SINGLE);

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-6rem)] md:h-auto">
            {logic.isScanning && (
                <QRScanner
                    title="Scan Instrumen"
                    onScan={logic.handleScan}
                    onClose={() => logic.setIsScanning(false)}
                />
            )}

            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0 z-10">
                <div>
                    <h3 className="font-bold text-lg">{type === TRANSACTION_TYPES.DISTRIBUTE ? 'Kirim Item Steril' : 'Ambil Item Kotor'}</h3>
                    <p className="text-sm text-slate-500">Target: <span className="font-medium text-slate-900">{unit.name}</span></p>
                </div>
                <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>

            {/* Return Date Selector */}
            {type === TRANSACTION_TYPES.DISTRIBUTE && (
                <div className="p-4 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-orange-800">
                        <Clock size={18} />
                        <span className="font-semibold text-sm">Batas Waktu Kembali:</span>
                    </div>
                    <select
                        value={logic.returnDuration}
                        onChange={(e) => logic.setReturnDuration(Number(e.target.value))}
                        className="bg-white border border-orange-200 text-orange-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block p-2 font-bold"
                    >
                        <option value={1}>1 Hari (Besok)</option>
                        <option value={2}>2 Hari</option>
                        <option value={3}>3 Hari</option>
                        <option value={7}>1 Minggu</option>
                    </select>
                </div>
            )}

            {/* Scan Button */}
            <div className="p-4 bg-white border-b border-slate-100">
                <button
                    onClick={() => logic.setIsScanning(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition border border-blue-100"
                >
                    <QrCode size={20} />
                    Scan QR Instrumen
                </button>
            </div>

            {/* Toggle View Mode */}
            <div className="p-4 bg-white border-b border-slate-100">
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode(VIEW_MODES.SINGLE)}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${viewMode === VIEW_MODES.SINGLE ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        <Package size={18} />
                        Item Satuan
                    </button>
                    <button
                        onClick={() => setViewMode(VIEW_MODES.SET)}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${viewMode === VIEW_MODES.SET ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        <Layers size={18} />
                        Set Instrumen
                    </button>
                </div>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {viewMode === VIEW_MODES.SINGLE ? (
                    logic.availableInstruments.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <Package className="mx-auto mb-2 text-slate-300" size={32} />
                            <p>Tidak ada item satuan tersedia.</p>
                        </div>
                    ) : (
                        logic.availableInstruments.map((inst: Instrument) => {
                            const max = type === TRANSACTION_TYPES.DISTRIBUTE ? inst.cssdStock : (inst.unitStock[unit.id] || 0);
                            const current = logic.quantities[inst.id] || 0;
                            return (
                                <div key={inst.id} className={`p-4 rounded-xl border transition-all ${current > 0 || (logic.discrepancies[inst.id]?.broken || 0) > 0 || (logic.discrepancies[inst.id]?.missing || 0) > 0 ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-300'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-slate-800">{inst.name}</h4>
                                            <p className="text-xs text-slate-500">Tersedia: {max}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {inst.is_serialized ? (
                                                <button
                                                    onClick={() => {
                                                        logic.setInputModal({
                                                            title: "Input Serial Number",
                                                            message: "Masukkan/Scan Serial Number:",
                                                            value: "",
                                                            onConfirm: (sn) => {
                                                                logic.addSerialNumber(inst.id, sn, max);
                                                                logic.setInputModal(null);
                                                            },
                                                            onCancel: () => logic.setInputModal(null)
                                                        });
                                                    }}
                                                    className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                                                    disabled={current >= max}
                                                >
                                                    + Add Asset
                                                </button>
                                            ) : (
                                                <>
                                                    <button onClick={() => logic.updateQuantity(inst.id, -1, DISCREPANCY_TYPES.OK, max)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50" disabled={current === 0}><Minus size={16} /></button>
                                                    <span className="w-8 text-center font-bold text-lg">{current}</span>
                                                    <button onClick={() => logic.updateQuantity(inst.id, 1, DISCREPANCY_TYPES.OK, max)} className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" disabled={current + (logic.discrepancies[inst.id]?.broken || 0) + (logic.discrepancies[inst.id]?.missing || 0) >= max}><Plus size={16} /></button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Serial Number List */}
                                    {inst.is_serialized && (logic.serialNumbers[inst.id]?.length || 0) > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2 p-2 bg-slate-50 rounded-lg">
                                            {logic.serialNumbers[inst.id].map(sn => (
                                                <span key={sn} className="bg-white border border-indigo-200 text-indigo-700 px-2 py-1 rounded text-xs font-mono flex items-center gap-1">
                                                    {sn}
                                                    <button onClick={() => logic.removeSerialNumber(inst.id, sn)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Discrepancies (COLLECT ONLY) */}
                                    {type === TRANSACTION_TYPES.COLLECT && (
                                        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-blue-100">
                                            {/* BROKEN */}
                                            <div className="flex items-center justify-between bg-white/50 p-2 rounded-lg">
                                                <span className="text-xs font-bold text-orange-600">Rusak</span>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => logic.updateQuantity(inst.id, -1, DISCREPANCY_TYPES.BROKEN, max)} disabled={(logic.discrepancies[inst.id]?.broken || 0) === 0} className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 disabled:opacity-50"><Minus size={12} /></button>
                                                    <span className="w-4 text-center text-sm font-bold">{logic.discrepancies[inst.id]?.broken || 0}</span>
                                                    <button onClick={() => logic.updateQuantity(inst.id, 1, DISCREPANCY_TYPES.BROKEN, max)} disabled={current + (logic.discrepancies[inst.id]?.broken || 0) + (logic.discrepancies[inst.id]?.missing || 0) >= max} className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 disabled:opacity-50"><Plus size={12} /></button>
                                                </div>
                                            </div>
                                            {/* MISSING */}
                                            <div className="flex items-center justify-between bg-white/50 p-2 rounded-lg">
                                                <span className="text-xs font-bold text-red-600">Hilang</span>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => logic.updateQuantity(inst.id, -1, DISCREPANCY_TYPES.MISSING, max)} disabled={(logic.discrepancies[inst.id]?.missing || 0) === 0} className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 disabled:opacity-50"><Minus size={12} /></button>
                                                    <span className="w-4 text-center text-sm font-bold">{logic.discrepancies[inst.id]?.missing || 0}</span>
                                                    <button onClick={() => logic.updateQuantity(inst.id, 1, DISCREPANCY_TYPES.MISSING, max)} disabled={current + (logic.discrepancies[inst.id]?.broken || 0) + (logic.discrepancies[inst.id]?.missing || 0) >= max} className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 disabled:opacity-50"><Plus size={12} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )
                ) : (
                    // SETS View
                    logic.availableSets.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <Layers className="mx-auto mb-2 text-slate-300" size={32} />
                            <p>Tidak ada set tersedia.</p>
                        </div>
                    ) : (
                        logic.availableSets.map((set: InstrumentSet) => {
                            const current = logic.selectedSets[set.id] || 0;
                            // Calculate max sets available (simple version)
                            let maxSets = Infinity;
                            for (const item of set.items) {
                                const inst = logic.availableInstruments.find(i => i.id === item.instrumentId); // Use logic.available to be safe, or just context
                                // Re-find from available instruments might be safer for scope
                                // Or better, just use logic.availableInstruments logic inside loop? 
                                // Actually logic.availableInstruments is filtered by type/unit. So if found there, use it.
                                if (inst) {
                                    const available = type === TRANSACTION_TYPES.DISTRIBUTE ? inst.cssdStock : (inst.unitStock[unit.id] || 0);
                                    const possibleSets = Math.floor(available / item.quantity);
                                    maxSets = Math.min(maxSets, possibleSets);
                                } else {
                                    // If instrument not in available list (e.g. 0 stock and filtered out?), treat as 0?
                                    // But we allowed 0 stock items in availableInstruments.
                                    // If strictly not found, means inactive?
                                    // maxSets = 0; but let's assume if it passed 'availableSets' filter, items exist.
                                }
                            }

                            return (
                                <div key={set.id} className={`p-4 rounded-xl border transition-all ${current > 0 ? 'border-green-500 bg-green-50' : 'border-slate-100 hover:border-slate-300'}`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-slate-800 flex items-center gap-2"><Layers size={16} className="text-green-600" />{set.name}</h4>
                                            <p className="text-xs text-green-600 font-medium mt-1">Tersedia: {maxSets} set</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => logic.updateSetQuantity(set.id, -1, DISCREPANCY_TYPES.OK, maxSets)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50" disabled={current === 0}><Minus size={16} /></button>
                                            <span className="w-8 text-center font-bold text-lg">{current}</span>
                                            <button onClick={() => logic.updateSetQuantity(set.id, 1, DISCREPANCY_TYPES.OK, maxSets)} className="w-8 h-8 flex items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50" disabled={current >= maxSets}><Plus size={16} /></button>
                                        </div>
                                    </div>
                                    {/* Set Breakdown */}
                                    <div className="bg-white rounded-lg p-3 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Isi Set:</p>
                                        <div className="space-y-1">
                                            {set.items.map(item => (
                                                <div key={item.instrumentId} className="flex justify-between text-xs">
                                                    <span className="text-slate-600">{item.instrumentId}</span>
                                                    <span className="font-bold text-slate-700">x{item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )
                )}
            </div>

            {/* Footer Submit */}
            <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0 z-10">
                <button
                    onClick={logic.submitTransaction}
                    disabled={logic.totalItems === 0}
                    className={`w-full ${BUTTON_CLASSES.PRIMARY} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {type === TRANSACTION_TYPES.DISTRIBUTE ? 'Kirim & Buat QR' : 'Ambil & Buat QR'}
                    {logic.totalItems > 0 && ` (${logic.totalItems} item)`}
                </button>
            </div>

            {/* Modals */}
            {logic.confirmModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <h3 className="font-bold text-lg text-slate-800">{logic.confirmModal.title}</h3>
                        <p className="text-slate-600 whitespace-pre-line">{logic.confirmModal.message}</p>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={logic.confirmModal.onCancel} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition">Batal</button>
                            <button onClick={logic.confirmModal.onConfirm} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">Ya, Lanjutkan</button>
                        </div>
                    </div>
                </div>
            )}

            {logic.inputModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <h3 className="font-bold text-lg text-slate-800">{logic.inputModal.title}</h3>
                        {logic.inputModal.message && <p className="text-slate-600">{logic.inputModal.message}</p>}
                        <input
                            autoFocus
                            type="text"
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center text-lg"
                            placeholder="Ketik disini..."
                            value={logic.inputModal.value}
                            onChange={(e) => logic.setInputModal(prev => prev ? { ...prev, value: e.target.value } : null)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && logic.inputModal) logic.inputModal.onConfirm(logic.inputModal.value); }}
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={logic.inputModal.onCancel} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition">Batal</button>
                            <button onClick={() => logic.inputModal?.onConfirm(logic.inputModal.value)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">Simpan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionForm;
