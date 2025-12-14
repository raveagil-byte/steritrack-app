import React, { useState, useMemo } from 'react';
import { Package, Send, Plus, Minus, User, FileText, Search, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Instrument } from '../../types';
import { toast } from 'sonner';

interface NurseReturnProps {
    unitId: string;
    onSuccess: () => void;
}

export const NurseReturn: React.FC<NurseReturnProps> = ({ unitId, onSuccess }) => {
    const { instruments, createTransaction, currentUser, units } = useAppContext();
    const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({});
    const [patientName, setPatientName] = useState('');
    const [notes, setNotes] = useState('');
    const [filter, setFilter] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get instruments available In THIS Unit
    const unitInventory = useMemo(() => {
        if (!unitId) return [];
        return instruments
            .map((inst: Instrument) => ({
                ...inst,
                unitQuantity: inst.unitStock[unitId] || 0
            }))
            .filter(inst => inst.unitQuantity > 0)
            .filter(inst => inst.name.toLowerCase().includes(filter.toLowerCase()));
    }, [instruments, unitId, filter]);

    const handleQuantityChange = (id: string, delta: number, max: number) => {
        setSelectedItems(prev => {
            const current = prev[id] || 0;
            const next = Math.min(Math.max(0, current + delta), max);

            if (next === 0) {
                const { [id]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [id]: next };
        });
    };

    const handleSubmit = async () => {
        if (Object.keys(selectedItems).length === 0) {
            toast.error('Pilih minimal satu alat untuk dikembalikan.');
            return;
        }

        if (!patientName.trim()) {
            toast.error('Mohon isi nama pasien atau ID prosedur.');
            return;
        }

        // Removed native confirm, assumption: User clicks 'Kirim ke CSSD' is confirmation enough or we can add a confirmation modal later if strictly needed.
        // For 'Improve browser notifications', removing native confirm is key. 
        // We can rely on the distinct action button or toast success feedback.

        setIsSubmitting(true);
        try {
            const items = Object.entries(selectedItems).map(([id, qty]) => ({
                instrumentId: id,
                itemType: 'SINGLE' as const,
                count: qty
            }));

            const response = await fetch('http://localhost:3000/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'RETURN_DIRTY',
                    unitId: unitId,
                    items: items,
                    setItems: [],
                    createdBy: currentUser?.name || 'Perawat',
                    patientName: patientName,
                    notes: notes
                })
            });

            if (!response.ok) throw new Error('Gagal membuat transaksi');

            toast.success('Pengembalian alat berhasil dilaporkan. CSSD akan segera mengambil.');
            setSelectedItems({});
            setPatientName('');
            setNotes('');
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error('Gagal: ' + (error as any).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalSelected = Object.values(selectedItems).reduce((a, b) => a + b, 0);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-red-50 to-orange-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                            <Package size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Pengembalian Alat Kotor</h2>
                            <p className="text-sm text-slate-600">Laporkan alat yang sudah selesai dipakai untuk sterilisasi ulang</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left: Inventory List */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari alat..."
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                            />
                        </div>

                        <div className="bg-slate-50 rounded-xl border border-slate-200 h-[400px] overflow-y-auto">
                            {unitInventory.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                                    <AlertCircle size={32} className="mb-2 opacity-50" />
                                    <p>Tidak ada inventaris yang tersedia untuk dikembalikan.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {unitInventory.map(inst => (
                                        <div key={inst.id} className="p-3 hover:bg-white transition-colors flex items-center justify-between">
                                            <div>
                                                <div className="font-medium text-slate-900">{inst.name}</div>
                                                <div className="text-xs text-slate-500">Stok Unit: {inst.unitQuantity}</div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-1">
                                                <button
                                                    onClick={() => handleQuantityChange(inst.id, -1, inst.unitQuantity)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-50"
                                                    disabled={!selectedItems[inst.id]}
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span className="w-6 text-center font-bold text-slate-900">
                                                    {selectedItems[inst.id] || 0}
                                                </span>
                                                <button
                                                    onClick={() => handleQuantityChange(inst.id, 1, inst.unitQuantity)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-md bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                                                    disabled={(selectedItems[inst.id] || 0) >= inst.unitQuantity}
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Form & Summary */}
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Nama Pasien / ID MR
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        value={patientName}
                                        onChange={e => setPatientName(e.target.value)}
                                        placeholder="Contoh: Tn. Budi / MR-123"
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Catatan Tambahan
                                </label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 text-slate-400" size={16} />
                                    <textarea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="Kds. alat, keluhan, dll..."
                                        rows={3}
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                    <div className="space-y-3">
                        <button
                            onClick={handleSubmit}
                            disabled={totalSelected === 0 || !patientName || isSubmitting}
                            className="w-full py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? 'Memproses...' : (
                                <>
                                    <Send size={18} />
                                    Kirim ke CSSD
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => onSuccess()}
                            className="w-full py-2 bg-white text-slate-600 font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                        >
                            Batal / Kembali
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
