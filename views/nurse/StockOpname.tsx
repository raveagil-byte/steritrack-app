
import React, { useState, useEffect } from 'react';
import { Package, Check, AlertTriangle, History } from 'lucide-react';
import { Instrument } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { ApiService } from '../../services/apiService';
import { toast } from 'sonner';

interface StockOpnameProps {
    unitId: string;
}

export const StockOpname = ({ unitId }: StockOpnameProps) => {
    const { instruments, currentUser } = useAppContext();
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [lastAuditResult, setLastAuditResult] = useState<any>(null);

    // Filter instruments relevant to this unit (or all instruments if we want full audit)
    // Usually audit includes everything that *could* be there.
    const auditItems = instruments;

    const handleCountChange = (id: string, val: string) => {
        const num = parseInt(val) || 0;
        setCounts(prev => ({ ...prev, [id]: num }));
    };

    const handleSubmit = async () => {
        if (!unitId) return toast.error("Unit tidak valid");

        setSubmitting(true);
        try {
            const items = Object.entries(counts).map(([instId, qty]) => ({
                instrumentId: instId,
                physicalQty: qty
            }));

            // Only send items that were actually counted (non-zero or explicitly entered)
            // But for full audit, maybe we want to send 0s too?
            // Let's send everything that user touched or initialized.
            // Simplified: Send ALL instruments with 0 if not entered? 
            // Better: Provide a "Pre-fill with System Stock" button? No, that defeats the purpose of blind audit.

            // Let's just map all known instruments, defaulting to 0 if not entered.
            const payloadItems = auditItems.map(inst => ({
                instrumentId: inst.id,
                physicalQty: counts[inst.id] || 0
            }));

            const result: any = await ApiService.apiCall('audit/stock-take', 'POST', {
                id: `AUDIT-${Date.now()}`,
                unitId,
                userId: currentUser?.id,
                items: payloadItems,
                notes
            });

            setLastAuditResult(result);
            toast.success("Stock Opname Berhasil Disimpan!");
            setCounts({}); // Reset logic
            setNotes('');
        } catch (err: any) {
            toast.error("Gagal simpan opname: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (lastAuditResult) {
        return (
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Audit Selesai</h2>
                    <p className="text-slate-500">ID: {lastAuditResult.auditId}</p>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-slate-700">Ringkasan Selisih (Discrepancy)</h3>
                    {lastAuditResult.summary.length === 0 ? (
                        <div className="p-4 bg-green-50 text-green-700 rounded-lg text-center">
                            Sempurna! Tidak ada selisih antara Fisik dan Sistem.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                            {lastAuditResult.summary.map((res: any) => (
                                <div key={res.instrumentId} className="p-3 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={16} className={res.discrepancy > 0 ? "text-blue-500" : "text-red-500"} />
                                        <span className="font-medium text-sm">{instruments.find((i: any) => i.id === res.instrumentId)?.name || res.instrumentId}</span>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="text-xs font-mono">
                                            Sys: {res.systemQty} | Fisik: <span className="font-bold">{res.physicalQty}</span>
                                            <span className={`ml-2 px-2 py-0.5 rounded ${res.discrepancy > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                {res.discrepancy > 0 ? `+${res.discrepancy}` : res.discrepancy}
                                            </span>
                                        </div>
                                        {res.quotaStatus === 'OVERSTOCK' && (
                                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                                Overstock (Max: {res.maxStock})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setLastAuditResult(null)}
                    className="mt-6 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                    Tutup / Audit Baru
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 bg-slate-50 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <History className="text-blue-600" />
                        Stock Opname Harian
                    </h2>
                    <p className="text-sm text-slate-500">Masukkan jumlah fisik barang yang ada di ruangan ini.</p>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {auditItems.map(inst => (
                            <div key={inst.id} className="p-4 rounded-lg border border-slate-200 hover:border-blue-400 transition bg-white shadow-sm group">
                                <label className="block text-sm font-semibold text-slate-700 mb-2 truncate" title={inst.name}>
                                    {inst.name}
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={counts[inst.id] || ''}
                                        onChange={(e) => handleCountChange(inst.id, e.target.value)}
                                        className="w-full text-center text-xl font-bold p-2 rounded border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                    <span className="text-xs text-slate-400">pcs</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Catatan Audit (Opsional)</label>
                        <textarea
                            className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Contoh: Rak B rusak, atau perawat shift pagi tadi..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 disabled:opacity-50 transition transform active:scale-[0.98]"
                    >
                        {submitting ? 'Menyimpan...' : 'Simpan Hasil Audit'}
                    </button>
                </div>
            </div>
        </div>
    );
};
