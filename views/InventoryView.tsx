import React, { useState, useMemo } from 'react';
import { RefreshCw, AlertCircle, ChevronRight, MapPin, Building2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Role, Instrument } from '../types';
import InstrumentDetailModal from '../components/InstrumentDetailModal';

const InventoryView = () => {
    const { instruments, units, transactions, sterilizeDirtyStock, currentUser } = useAppContext();
    const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<string>('ALL');

    const totalDirty = instruments.reduce((acc: number, curr: Instrument) => acc + curr.dirtyStock, 0);

    const canSterilize = currentUser?.role === Role.ADMIN || currentUser?.role === Role.CSSD;

    // Filter instruments based on selected unit
    const filteredInstruments = useMemo(() => {
        if (selectedUnitId === 'ALL') {
            return instruments;
        }

        if (selectedUnitId === 'CSSD') {
            // Show instruments with CSSD stock
            return instruments.filter((inst: Instrument) => inst.cssdStock > 0);
        }

        // Show instruments in selected unit
        return instruments.filter((inst: Instrument) => {
            const unitStock = inst.unitStock || {};
            return (unitStock[selectedUnitId] || 0) > 0;
        });
    }, [instruments, selectedUnitId]);

    // Get selected unit info
    const selectedUnit = useMemo(() => {
        if (selectedUnitId === 'ALL' || selectedUnitId === 'CSSD') return null;
        return units.find(u => u.id === selectedUnitId);
    }, [units, selectedUnitId]);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Status Inventaris</h2>
                    <p className="text-slate-500">Tampilan real-time dari semua aset steril</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Unit Selector Dropdown */}
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={selectedUnitId}
                            onChange={(e) => setSelectedUnitId(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-medium min-w-[200px]"
                        >
                            <option value="ALL">Semua Lokasi</option>
                            <option value="CSSD">CSSD (Steril)</option>
                            {units.filter(u => u.is_active).map(unit => (
                                <option key={unit.id} value={unit.id}>
                                    {unit.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {canSterilize && totalDirty > 0 && (
                        <button onClick={sterilizeDirtyStock} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition whitespace-nowrap">
                            <RefreshCw size={18} className="animate-spin-slow" />
                            Sterilkan Semua ({totalDirty})
                        </button>
                    )}
                </div>
            </header>

            {selectedInstrument && (
                <InstrumentDetailModal
                    instrument={selectedInstrument}
                    units={units}
                    transactions={transactions}
                    onClose={() => setSelectedInstrument(null)}
                />
            )}

            {/* Info Banner for Unit Filter */}
            {selectedUnitId !== 'ALL' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                    <Building2 className="text-blue-600" size={20} />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">
                            {selectedUnitId === 'CSSD'
                                ? 'Menampilkan instrumen steril di CSSD'
                                : `Menampilkan instrumen di ${selectedUnit?.name}`
                            }
                        </p>
                        <p className="text-xs text-blue-600 mt-0.5">
                            {filteredInstruments.length} instrumen ditemukan
                        </p>
                    </div>
                    <button
                        onClick={() => setSelectedUnitId('ALL')}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Lihat Semua
                    </button>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium uppercase tracking-wider">
                            <tr>
                                <th className="p-4">Instrumen</th>
                                {selectedUnitId === 'ALL' && (
                                    <>
                                        <th className="p-4 text-center">Di CSSD (Steril)</th>
                                        <th className="p-4 text-center">Di CSSD (Kotor)</th>
                                        <th className="p-4 text-right">Terdistribusi (Di Unit)</th>
                                    </>
                                )}
                                {selectedUnitId === 'CSSD' && (
                                    <th className="p-4 text-center">Stok Steril</th>
                                )}
                                {selectedUnitId !== 'ALL' && selectedUnitId !== 'CSSD' && (
                                    <th className="p-4 text-center">Stok di Unit</th>
                                )}
                                <th className="p-4 w-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredInstruments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        Tidak ada instrumen ditemukan di lokasi ini
                                    </td>
                                </tr>
                            ) : (
                                filteredInstruments.map((inst: Instrument) => {
                                    const unitStock = inst.unitStock || {};
                                    const values = Object.values(unitStock) as number[];
                                    const totalInUnits: number = values.reduce((a, b) => a + b, 0);
                                    const isLowStock = inst.cssdStock < 10;
                                    const currentUnitStock = selectedUnitId !== 'ALL' && selectedUnitId !== 'CSSD'
                                        ? (unitStock[selectedUnitId] || 0)
                                        : 0;

                                    return (
                                        <tr
                                            key={inst.id}
                                            onClick={() => setSelectedInstrument(inst)}
                                            className="cursor-pointer transition-colors hover:bg-blue-50/50"
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{inst.name}</div>
                                                        <div className="text-xs text-slate-400">{inst.category}</div>
                                                    </div>
                                                    {isLowStock && selectedUnitId === 'ALL' && (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200 ml-2">
                                                            <AlertCircle size={10} /> RENDAH
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {selectedUnitId === 'ALL' && (
                                                <>
                                                    <td className="p-4 text-center">
                                                        <span className={`inline-block px-3 py-1 rounded-full font-bold ${isLowStock ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-100 text-green-600'}`}>
                                                            {inst.cssdStock}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center text-slate-600">
                                                        {inst.dirtyStock > 0 ? <span className="text-orange-500 font-bold">{inst.dirtyStock}</span> : '-'}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {totalInUnits > 0 ? (
                                                            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                                                {totalInUnits}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                </>
                                            )}

                                            {selectedUnitId === 'CSSD' && (
                                                <td className="p-4 text-center">
                                                    <span className={`inline-block px-4 py-2 rounded-full font-bold text-lg ${isLowStock ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-100 text-green-600'}`}>
                                                        {inst.cssdStock}
                                                    </span>
                                                </td>
                                            )}

                                            {selectedUnitId !== 'ALL' && selectedUnitId !== 'CSSD' && (
                                                <td className="p-4 text-center">
                                                    <span className="inline-block px-4 py-2 rounded-full font-bold text-lg bg-blue-100 text-blue-600">
                                                        {currentUnitStock}
                                                    </span>
                                                </td>
                                            )}

                                            <td className="p-4 text-slate-400">
                                                <ChevronRight size={20} />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InventoryView;
