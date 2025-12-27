import React, { useState } from 'react';
import { Mail, CheckCircle, XCircle, Package, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Request, RequestStatus, TransactionType } from '../../types';
import { toast } from 'sonner';

export const RequestInbox = () => {
    const { requests, units, updateRequestStatus, createTransaction } = useAppContext();
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'HISTORY'>('PENDING');

    const filteredRequests = requests.filter(r => {
        if (filter === 'PENDING') return r.status === RequestStatus.PENDING;
        if (filter === 'HISTORY') return r.status !== RequestStatus.PENDING;
        return true;
    }).sort((a, b) => b.timestamp - a.timestamp);

    const handleApprove = async (req: Request) => {
        // Removed native confirm. 
        // Improvement: We could add a small inline "Are you sure?" or just process it. 
        // For streamlined CSSD workflow, on-click processing is faster. 
        // We will show a toast loading state if needed, or just success.

        try {
            await updateRequestStatus(req.id, RequestStatus.APPROVED);

            const txItems = req.items.map(i => ({
                instrumentId: i.itemId,
                count: i.quantity
            }));

            await createTransaction(TransactionType.DISTRIBUTE, req.unitId, txItems);

            toast.success("Permintaan disetujui & Transaksi distribusi dibuat");
        } catch (e) {
            toast.error("Gagal memproses permintaan");
        }
    };

    const handleReject = async (id: string) => {
        // Removed native confirm
        try {
            await updateRequestStatus(id, RequestStatus.REJECTED);
            toast.success("Permintaan ditolak");
        } catch (e) {
            toast.error("Gagal menolak permintaan");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Kotak Masuk Permintaan</h2>
                    <p className="text-slate-500">Kelola permintaan sterilisasi dari unit.</p>
                </div>
                <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                    <button
                        onClick={() => setFilter('PENDING')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${filter === 'PENDING' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => setFilter('HISTORY')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${filter === 'HISTORY' ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Riwayat
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-4">
                {filteredRequests.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                        <Mail className="mx-auto text-slate-300 mb-2" size={32} />
                        <p className="text-slate-500">Tidak ada permintaan {filter === 'PENDING' ? 'baru' : 'dalam riwayat'}.</p>
                    </div>
                )}

                {filteredRequests.map(req => {
                    const unitName = units.find(u => u.id === req.unitId)?.name || 'Unit Tidak Dikenal';

                    return (
                        <div key={req.id} className={`bg-white rounded-xl p-5 border shadow-sm transition-all ${req.status === RequestStatus.PENDING ? 'border-blue-100 shadow-blue-50' : 'border-slate-200'}`}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 border-b border-slate-100 pb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${req.status === RequestStatus.PENDING ? 'bg-yellow-100 text-yellow-700' :
                                            req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {req.status}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">{new Date(req.timestamp).toLocaleString()}</span>
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800">{unitName}</h3>
                                    <p className="text-sm text-slate-500">Oleh: <span className="font-medium text-slate-700">{req.requestedBy}</span></p>
                                </div>

                                {req.status === RequestStatus.PENDING && (
                                    <div className="flex gap-2 w-full md:w-auto">
                                        <button
                                            onClick={() => handleReject(req.id)}
                                            className="flex-1 md:flex-none px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-bold transition"
                                        >
                                            Tolak
                                        </button>
                                        <button
                                            onClick={() => handleApprove(req)}
                                            className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold shadow-lg shadow-blue-100 transition"
                                        >
                                            Setujui & Kirim
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Item Diminta:</p>
                                <div className="space-y-2">
                                    {req.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <Package size={14} className="text-slate-400" />
                                                <span className="text-slate-700 font-medium">
                                                    {/* Ideally we look up the name from instruments/sets context, but for MVP we might need to rely on ID if not pre-fetched or fetch name in component */}
                                                    {/* For now let's just show ID or assume we can find it. actually Name was not stored in request item, only ID. */}
                                                    {/* We need to lookup name from Context instruments/sets */}
                                                    <ItemNameLookup id={item.itemId} type={item.itemType} />
                                                </span>
                                            </div>
                                            <span className="font-bold bg-white border px-2 rounded text-slate-600">x{item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Helper component to display name
const ItemNameLookup = ({ id, type }: { id: string, type: string }) => {
    const { instruments, sets } = useAppContext();
    if (type === 'SET') {
        const s = sets.find(x => x.id === id);
        return <>{s ? s.name : id} <span className="text-[10px] text-slate-400 ml-1">(Set)</span></>;
    } else {
        const i = instruments.find(x => x.id === id);
        return <>{i ? i.name : id}</>;
    }
};
