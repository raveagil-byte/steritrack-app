import React, { useState, useMemo } from 'react';
import { Settings, Save, Search, Check, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { ApiService } from '../../services/apiService';
import { toast } from 'sonner';
import { Pagination } from '../../components/Pagination';

const ParLevelRow = ({ inst, unitId, currentStock, currentMax, onSave }: any) => {
    const [val, setVal] = useState(currentMax);
    const [changed, setChanged] = useState(false);
    const [saving, setSaving] = useState(false);

    // Update local state if prop changes (e.g. unit switch)
    React.useEffect(() => {
        setVal(currentMax);
        setChanged(false);
    }, [currentMax, unitId]);

    const handleSave = async () => {
        setSaving(true);
        await onSave(inst.id, val);
        setSaving(false);
        setChanged(false);
    };

    return (
        <tr className="hover:bg-slate-50 transition-colors">
            <td className="p-4 font-medium text-slate-700">
                <div className="flex flex-col">
                    <span>{inst.name}</span>
                    <span className="text-xs text-slate-400 font-normal">{inst.category}</span>
                </div>
            </td>
            <td className="p-4 text-slate-600 font-mono text-lg">{currentStock}</td>
            <td className="p-4">
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min="0"
                        value={val}
                        onChange={(e) => {
                            setVal(e.target.value);
                            setChanged(true);
                        }}
                        className={`w-24 p-2 border rounded-lg text-center font-bold outline-none transition-all ${changed ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-100' : 'border-slate-200'
                            }`}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && changed) handleSave();
                        }}
                    />
                    <span className="text-xs text-slate-400">pcs</span>
                </div>
            </td>
            <td className="p-4">
                <button
                    onClick={handleSave}
                    disabled={!changed || saving}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${changed
                        ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 transform hover:scale-105'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                >
                    {saving ? (
                        <span className="animate-spin">⌛</span>
                    ) : changed ? (
                        <>
                            <Save size={16} /> Simpan
                        </>
                    ) : (
                        <>
                            <Check size={16} /> Tersimpan
                        </>
                    )}
                </button>
            </td>
        </tr>
    );
};

export const ParLevelSettings = () => {
    const { units, instruments, refreshData } = useAppContext();
    const [selectedUnitId, setSelectedUnitId] = useState<string>(units[0]?.id || '');
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filter instruments
    const filteredInstruments = useMemo(() => {
        return instruments.filter((i: any) =>
            i.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [instruments, search]);

    // Reset page when search or filter changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [search, selectedUnitId]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredInstruments.length / itemsPerPage);
    const paginatedInstruments = filteredInstruments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSaveBackend = async (instrumentId: string, newVal: string) => {
        if (!selectedUnitId) return;
        const num = parseInt(newVal);
        if (isNaN(num)) return;

        try {
            await ApiService.apiCall(`instruments/${instrumentId}/max-stock`, 'PUT', {
                unitId: selectedUnitId,
                maxStock: num
            });
            toast.success("Batas stok berhasil diperbarui");
            if (refreshData) refreshData();
        } catch (err: any) {
            toast.error("Gagal update: " + err.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="text-blue-600" />
                        Manajemen Kuota Stok (Par Level)
                    </h2>
                    <p className="text-sm text-slate-500">Atur batas maksimal stok per unit untuk mencegah penumpukan.</p>
                </div>

                <div className="flex items-center gap-3 bg-blue-50 p-2 rounded-xl border border-blue-100">
                    <span className="text-sm font-bold text-blue-800 ml-2">Unit:</span>
                    <select
                        className="p-2 pr-8 rounded-lg border-blue-200 text-blue-900 font-bold bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                        value={selectedUnitId}
                        onChange={(e) => setSelectedUnitId(e.target.value)}
                    >
                        {units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari instrumen..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="text-xs text-slate-500 font-medium px-2">
                        Menampilkan {paginatedInstruments.length} dari {filteredInstruments.length} elemen
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-extrabold tracking-wider">
                            <tr>
                                <th className="p-4 w-1/3">Nama Instrumen</th>
                                <th className="p-4">Stok Saat Ini</th>
                                <th className="p-4">Batas Max (Quota)</th>
                                <th className="p-4 w-48">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedInstruments.map((inst: any) => {
                                const currentStock = inst.unitStock?.[selectedUnitId] || 0;
                                const currentMax = inst.unitMaxStock?.[selectedUnitId] || 100;

                                return (
                                    <ParLevelRow
                                        key={`${inst.id}-${selectedUnitId}`}
                                        inst={inst}
                                        unitId={selectedUnitId}
                                        currentStock={currentStock}
                                        currentMax={currentMax}
                                        onSave={handleSaveBackend}
                                    />
                                );
                            })}

                            {paginatedInstruments.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-400 flex flex-col items-center">
                                        <AlertCircle size={48} className="mb-4 opacity-20" />
                                        <p>Tidak ada instrumen yang ditemukan.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="bg-white px-4 pb-4">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredInstruments.length}
                        itemsPerPage={itemsPerPage}
                    />
                </div>
            </div>
        </div>
    );
};
