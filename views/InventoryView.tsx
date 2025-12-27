import React, { useState, useMemo } from 'react';
import { RefreshCw, AlertCircle, ChevronRight, MapPin, Building2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Role, Instrument } from '../types';
import InstrumentDetailModal from '../components/InstrumentDetailModal';
import { INVENTORY_FILTERS } from '../constants';

const InventoryView = () => {
    const { instruments, units, transactions, sterilizeDirtyStock, currentUser } = useAppContext();
    const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<string>(INVENTORY_FILTERS.ALL);

    const totalDirty = instruments.reduce((acc: number, curr: Instrument) => acc + curr.dirtyStock, 0);

    const canSterilize = currentUser?.role === Role.ADMIN || currentUser?.role === Role.CSSD;
    const isNurse = currentUser?.role === Role.NURSE;

    // Default to Nurse's unit if applicable
    React.useEffect(() => {
        if (isNurse && currentUser?.unitId) {
            setSelectedUnitId(currentUser.unitId);
        }
    }, [isNurse, currentUser?.unitId]);

    // Filter instruments based on selected unit
    const filteredInstruments = useMemo(() => {
        if (selectedUnitId === INVENTORY_FILTERS.ALL) {
            return instruments;
        }

        if (selectedUnitId === INVENTORY_FILTERS.CSSD) {
            // Show instruments with CSSD stock
            return instruments.filter((inst: Instrument) => inst.cssdStock > 0);
        }

        // Show instruments in selected unit
        return instruments.filter((inst: Instrument) => {
            const unitStock = inst.unitStock || {};
            return (unitStock[selectedUnitId] || 0) > 0;
        });
    }, [instruments, selectedUnitId]);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Reset to page 1 when filter changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [selectedUnitId]);

    const paginatedInstruments = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredInstruments.slice(start, start + itemsPerPage);
    }, [filteredInstruments, currentPage]);

    const totalPages = Math.ceil(filteredInstruments.length / itemsPerPage);

    // Get selected unit info
    const selectedUnit = useMemo(() => {
        if (selectedUnitId === INVENTORY_FILTERS.ALL || selectedUnitId === INVENTORY_FILTERS.CSSD) return null;
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
                            {/* Admin/CSSD can see Aggregate view */}
                            {!isNurse && <option value={INVENTORY_FILTERS.ALL}>Semua Lokasi</option>}

                            <option value={INVENTORY_FILTERS.CSSD}>CSSD (Steril)</option>

                            {units
                                .filter(u => u.is_active)
                                .filter(u => !isNurse || u.id === currentUser?.unitId) // Nurses only see their own unit
                                .map(unit => (
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
            {selectedUnitId !== INVENTORY_FILTERS.ALL && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                    <Building2 className="text-blue-600" size={20} />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">
                            {selectedUnitId === INVENTORY_FILTERS.CSSD
                                ? 'Menampilkan instrumen steril di CSSD'
                                : `Menampilkan instrumen di ${selectedUnit?.name}`
                            }
                        </p>
                        <p className="text-xs text-blue-600 mt-0.5">
                            {filteredInstruments.length} instrumen ditemukan
                        </p>
                    </div>
                    <button
                        onClick={() => setSelectedUnitId(INVENTORY_FILTERS.ALL)}
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
                                {selectedUnitId === INVENTORY_FILTERS.ALL && (
                                    <>
                                        <th className="p-4 text-center">Di CSSD (Steril)</th>
                                        {!isNurse && <th className="p-4 text-center">Di CSSD (Kotor)</th>}
                                        <th className="p-4 text-right">Terdistribusi (Di Unit)</th>
                                    </>
                                )}
                                {selectedUnitId === INVENTORY_FILTERS.CSSD && (
                                    <th className="p-4 text-center">Stok Steril</th>
                                )}
                                {selectedUnitId !== INVENTORY_FILTERS.ALL && selectedUnitId !== INVENTORY_FILTERS.CSSD && (
                                    <>
                                        <th className="p-4 text-center">Stok di Unit</th>
                                        <th className="p-4 text-center text-slate-400 font-normal text-xs">Tersedia di Pusat</th>
                                    </>
                                )}
                                <th className="p-4 w-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedInstruments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        Tidak ada instrumen ditemukan di lokasi ini
                                    </td>
                                </tr>
                            ) : (
                                paginatedInstruments.map((inst: Instrument) => {
                                    const unitStock = inst.unitStock || {};
                                    const values = Object.values(unitStock) as number[];
                                    const totalInUnits: number = values.reduce((a, b) => a + b, 0);
                                    const isLowStock = inst.cssdStock < 10;
                                    const currentUnitStock = selectedUnitId !== INVENTORY_FILTERS.ALL && selectedUnitId !== INVENTORY_FILTERS.CSSD
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
                                                    {isLowStock && selectedUnitId === INVENTORY_FILTERS.ALL && (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200 ml-2">
                                                            <AlertCircle size={10} /> RENDAH
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {selectedUnitId === INVENTORY_FILTERS.ALL && (
                                                <>
                                                    <td className="p-4 text-center">
                                                        <span className={`inline-block px-3 py-1 rounded-full font-bold ${isLowStock ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-100 text-green-600'}`}>
                                                            {inst.cssdStock}
                                                        </span>
                                                    </td>
                                                    {!isNurse && (
                                                        <td className="p-4 text-center text-slate-600">
                                                            {inst.dirtyStock > 0 ? <span className="text-orange-500 font-bold">{inst.dirtyStock}</span> : '-'}
                                                        </td>
                                                    )}
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

                                            {selectedUnitId === INVENTORY_FILTERS.CSSD && (
                                                <td className="p-4 text-center">
                                                    <span className={`inline-block px-4 py-2 rounded-full font-bold text-lg ${isLowStock ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-100 text-green-600'}`}>
                                                        {inst.cssdStock}
                                                    </span>
                                                </td>
                                            )}

                                            {selectedUnitId !== INVENTORY_FILTERS.ALL && selectedUnitId !== INVENTORY_FILTERS.CSSD && (
                                                <>
                                                    <td className="p-4 text-center">
                                                        <span className="inline-block px-4 py-2 rounded-full font-bold text-lg bg-blue-100 text-blue-600">
                                                            {currentUnitStock}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="text-xs text-slate-400 font-medium">
                                                            {inst.cssdStock} unit
                                                        </span>
                                                    </td>
                                                </>
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                        <div className="text-sm text-slate-500">
                            Menampilkan <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> sampai <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredInstruments.length)}</span> dari <span className="font-medium">{filteredInstruments.length}</span> data
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border rounded bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                            >
                                Sebelumnya
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                .map((page, i, arr) => (
                                    <React.Fragment key={page}>
                                        {i > 0 && arr[i - 1] !== page - 1 && <span className="px-2 self-center">...</span>}
                                        <button
                                            onClick={() => setCurrentPage(page)}
                                            className={`px-3 py-1 border rounded ${currentPage === page ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {page}
                                        </button>
                                    </React.Fragment>
                                ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border rounded bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                            >
                                Berikutnya
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventoryView;
