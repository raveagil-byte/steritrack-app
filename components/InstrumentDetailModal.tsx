import React from 'react';
import { Instrument, Transaction, TransactionItem, TransactionType, Unit } from '../types';
import { X, MapPin, History, Truck, Trash2 } from 'lucide-react';

interface InstrumentDetailModalProps {
    instrument: Instrument;
    units: Unit[];
    transactions: Transaction[];
    onClose: () => void;
}

const InstrumentDetailModal = ({ instrument, units, transactions, onClose }: InstrumentDetailModalProps) => {
    // Filter transactions for this instrument
    const history = transactions.filter((t: Transaction) =>
        t.items.some((i: TransactionItem) => i.instrumentId === instrument.id)
    ).sort((a: Transaction, b: Transaction) => b.timestamp - a.timestamp);

    const unitStock = instrument.unitStock || {};
    const activeUnits = Object.entries(unitStock).filter(([_, count]) => (count as number) > 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 rounded-t-2xl">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">{instrument.category}</span>
                            <span className="text-slate-400 text-xs font-mono">ID: {instrument.id}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">{instrument.name}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500">
                        <X size={24} />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 space-y-8">

                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-center">
                            <div className="text-green-600 font-bold text-2xl">{instrument.cssdStock}</div>
                            <div className="text-xs text-green-700 uppercase font-semibold mt-1">Steril (Siap)</div>
                        </div>
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-center">
                            <div className="text-orange-600 font-bold text-2xl">{instrument.dirtyStock}</div>
                            <div className="text-xs text-orange-700 uppercase font-semibold mt-1">Kotor (CSSD)</div>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-center">
                            <div className="text-blue-600 font-bold text-2xl">
                                {(Object.values(instrument.unitStock || {}).reduce((a, b: any) => a + b, 0))}
                            </div>
                            <div className="text-xs text-blue-700 uppercase font-semibold mt-1">Di Unit</div>
                        </div>
                    </div>

                    {/* Current Distribution */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <MapPin size={16} /> Lokasi Saat Ini
                        </h3>
                        {activeUnits.length === 0 ? (
                            <p className="text-slate-400 italic text-sm">Saat ini tidak didistribusikan ke unit manapun.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {activeUnits.map(([unitId, count]) => {
                                    const unit = units.find((u: Unit) => u.id === unitId);
                                    return (
                                        <div key={unitId} className="flex justify-between items-center p-3 border border-slate-200 rounded-lg">
                                            <span className="font-medium text-slate-700">{unit?.name || unitId}</span>
                                            <span className="bg-slate-100 text-slate-800 font-bold px-3 py-1 rounded-md">{count as number}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Transaction History */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <History size={16} /> Riwayat Penggunaan
                        </h3>
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <p className="text-slate-400 italic text-sm">Tidak ada riwayat transaksi ditemukan.</p>
                            ) : (
                                history.map((tx: Transaction) => {
                                    const itemDetails = tx.items.find((i: TransactionItem) => i.instrumentId === instrument.id);
                                    const unit = units.find((u: Unit) => u.id === tx.unitId);
                                    return (
                                        <div key={tx.id} className="flex items-center justify-between text-sm p-3 hover:bg-slate-50 rounded-lg border-b border-slate-100 last:border-0 transition">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-full ${tx.type === TransactionType.DISTRIBUTE ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                                    {tx.type === TransactionType.DISTRIBUTE ? <Truck size={14} /> : <Trash2 size={14} />}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-800">
                                                        {tx.type === TransactionType.DISTRIBUTE ? 'Didistribusikan ke' : 'Diambil dari'} {unit?.name || 'Unit Tidak Diketahui'}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {new Date(tx.timestamp).toLocaleDateString()} jam {new Date(tx.timestamp).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="font-bold text-slate-700">
                                                {tx.type === TransactionType.DISTRIBUTE ? '-' : '+'}{itemDetails?.count}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default InstrumentDetailModal;
