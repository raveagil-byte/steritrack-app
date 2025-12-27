import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, AlertCircle, Pencil, X, Search, ChevronLeft, ChevronRight, QrCode } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Instrument } from '../../types';
import { toast } from 'sonner';
import { ApiService } from '../../services/apiService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AssetListModal from '../../components/AssetListModal';
import { useConfirmation } from '../../context/ConfirmationContext';
import { Pagination } from '../../components/Pagination';

const instrumentSchema = z.object({
    name: z.string().min(2, "Nama instrumen wajib diisi"),
    category: z.enum(["Single", "Sets"]),
    totalStock: z.number().min(0).optional(),
    cssdStock: z.number().min(0).optional(),
    dirtyStock: z.number().min(0).optional(),
    packingStock: z.number().min(0).optional(),
    initialCondition: z.enum(["STERILE", "CLEAN", "DIRTY"]).optional(),
    is_serialized: z.boolean().optional(),
    measure_unit_id: z.string().optional(),
});

type InstrumentFormValues = z.infer<typeof instrumentSchema>;

export const AdminInstruments = () => {
    const { instruments, addInstrument, updateInstrument, updateInstrumentStatus, deleteInstrument } = useAppContext();
    const queryClient = useQueryClient();
    const [editingInstrument, setEditingInstrument] = useState<Instrument | null>(null);
    const [viewingAssetsInstrument, setViewingAssetsInstrument] = useState<Instrument | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
    const itemsPerPage = 20;

    const { data: unassignedInstruments = [] } = useQuery({
        queryKey: ['unassignedInstruments'],
        queryFn: ApiService.getUnassignedInstruments
    });

    const sourceInstruments = showUnassignedOnly ? unassignedInstruments : instruments;

    const filteredInstruments = sourceInstruments.filter((inst: Instrument) =>
        inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredInstruments.length / itemsPerPage);
    const displayedInstruments = filteredInstruments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const { register, handleSubmit, reset, formState: { errors } } = useForm<InstrumentFormValues>({
        resolver: zodResolver(instrumentSchema),
        defaultValues: {
            totalStock: 10,
            initialCondition: 'DIRTY', // Default safest option,
            measure_unit_id: 'mu1'
        }
    });

    const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, watch: watchEdit, setValue: setValueEdit, formState: { errors: errorsEdit } } = useForm<InstrumentFormValues>({
        resolver: zodResolver(instrumentSchema),
    });

    // Auto-calculate total stock in Edit
    const cssdStock = watchEdit('cssdStock') || 0;
    const dirtyStock = watchEdit('dirtyStock') || 0;
    const packingStock = watchEdit('packingStock') || 0;

    React.useEffect(() => {
        if (editingInstrument) {
            const calculatedTotal = cssdStock + dirtyStock + packingStock;
            setValueEdit('totalStock', calculatedTotal);
        }
    }, [cssdStock, dirtyStock, packingStock, editingInstrument, setValueEdit]);

    const onSubmit = async (data: InstrumentFormValues) => {
        try {
            // Determine stock distribution based on initial condition
            let cssdStock = 0;
            let packingStock = 0;
            let dirtyStock = 0;
            const stock = data.totalStock || 10;

            if (data.initialCondition === 'STERILE') {
                cssdStock = stock;
            } else if (data.initialCondition === 'CLEAN') {
                packingStock = stock;
            } else {
                dirtyStock = stock; // Default to dirty
            }

            await addInstrument({
                id: `i-${Date.now()}`,
                name: data.name,
                category: data.category,
                totalStock: stock,
                cssdStock: cssdStock,
                dirtyStock: dirtyStock,
                packingStock: packingStock,
                unitStock: {},
                is_serialized: data.is_serialized || false,
                measure_unit_id: data.measure_unit_id
            });
            toast.success(`Instrumen ${data.name} berhasil ditambahkan (${data.initialCondition})`);
            reset();
        } catch (error) {
            toast.error("Gagal menambahkan instrumen");
        }
    };

    const onEdit = async (data: InstrumentFormValues) => {
        if (!editingInstrument) return;
        try {
            await updateInstrument({
                id: editingInstrument.id,
                name: data.name,
                category: data.category,
                is_serialized: data.is_serialized,
                totalStock: data.totalStock,
                cssdStock: data.cssdStock,
                dirtyStock: data.dirtyStock,
                packingStock: data.packingStock,
                measure_unit_id: data.measure_unit_id
            });
            await queryClient.invalidateQueries({ queryKey: ['instruments'] });
            toast.success(`Instrumen ${data.name} berhasil diupdate`);
            setEditingInstrument(null);
            resetEdit();
        } catch (error) {
            toast.error("Gagal mengupdate instrumen");
        }
    };

    const { confirm } = useConfirmation();


    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            title: "Hapus Instrumen",
            message: "Apakah Anda yakin ingin menghapus instrumen ini? Tindakan ini tidak dapat dibatalkan.",
            confirmText: "Hapus",
            type: "danger"
        });

        if (isConfirmed) {
            try {
                await deleteInstrument(id);
                toast.success("Instrumen dihapus");
            } catch (error) {
                toast.error("Gagal menghapus instrumen");
            }
        }
    };

    const openEditModal = (instrument: Instrument) => {
        setEditingInstrument(instrument);
        resetEdit({
            name: instrument.name,
            category: instrument.category as "Single" | "Sets",
            is_serialized: instrument.is_serialized,
            initialCondition: 'DIRTY', // Default dummy for edit mode
            totalStock: instrument.totalStock,
            cssdStock: instrument.cssdStock,
            dirtyStock: instrument.dirtyStock,
            packingStock: instrument.packingStock || 0,
            measure_unit_id: instrument.measure_unit_id || 'mu1'
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Asset List Modal */}
            {viewingAssetsInstrument && (
                <AssetListModal
                    instrument={viewingAssetsInstrument}
                    onClose={() => setViewingAssetsInstrument(null)}
                />
            )}

            {/* Edit Modal */}
            {editingInstrument && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">Edit Instrumen: {editingInstrument.name}</h3>
                            <button onClick={() => setEditingInstrument(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitEdit(onEdit)} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Instrumen</label>
                                <input {...registerEdit('name')} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                                {errorsEdit.name && <p className="text-red-500 text-xs mt-1">{errorsEdit.name.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                                <select {...registerEdit('category')} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="Single">Single (Satuan)</option>
                                    <option value="Sets">Sets (Paket)</option>
                                </select>
                                {errorsEdit.category && <p className="text-red-500 text-xs mt-1">{errorsEdit.category.message}</p>}
                            </div>
                            <div className="w-full">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Satuan</label>
                                <select {...registerEdit('measure_unit_id')} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="mu1">Pcs (Pieces)</option>
                                    <option value="mu2">Set (Paket)</option>
                                    <option value="mu3">Box (Kotak)</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" {...registerEdit('is_serialized')} id="edit_serialized" className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
                                <label htmlFor="edit_serialized" className="text-sm font-medium text-slate-700">Wajib Serial Number (High Value Asset)</label>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-200">
                                <h4 className="text-sm font-bold text-slate-800 border-b pb-2">Koreksi Stok (Admin Override)</h4>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Stok (Auto)</label>
                                        <input
                                            {...registerEdit('totalStock', { valueAsNumber: true })}
                                            type="number"
                                            readOnly
                                            className="w-full p-2 border rounded bg-slate-100 font-bold text-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stok CSSD (Steril)</label>
                                        <input {...registerEdit('cssdStock', { valueAsNumber: true })} type="number" className="w-full p-2 border rounded bg-white text-green-700 font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stok Kotor</label>
                                        <input {...registerEdit('dirtyStock', { valueAsNumber: true })} type="number" className="w-full p-2 border rounded bg-white text-amber-700 font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stok Packing</label>
                                        <input {...registerEdit('packingStock', { valueAsNumber: true })} type="number" className="w-full p-2 border rounded bg-white text-blue-700 font-medium" />
                                    </div>
                                </div>

                                <p className="text-xs text-slate-500 italic mt-2">
                                    Note: Mengubah stok di sini akan langsung menimpa data tanpa transaksi history. Gunakan hanya untuk perbaikan data awal.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button type="button" onClick={() => setEditingInstrument(null)} className="px-4 py-2 border border-slate-300 rounded hover:bg-slate-50">
                                    Batal
                                </button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-lg shadow-blue-100">
                                    Simpan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Form */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Master Data Instrumen</h3>
                <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start">
                    <div className="w-full">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama</label>
                        <input {...register('name')} placeholder="Nama Instrumen" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                    </div>
                    <div className="w-full">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kategori</label>
                        <select {...register('category')} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="">Pilih Kategori</option>
                            <option value="Single">Single (Satuan)</option>
                            <option value="Sets">Sets (Paket)</option>
                        </select>
                        {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
                    </div>

                    <div className="w-full">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stok Awal</label>
                        <input {...register('totalStock', { valueAsNumber: true })} type="number" placeholder="Total" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                        {errors.totalStock && <p className="text-red-500 text-xs mt-1">{errors.totalStock.message}</p>}
                    </div>

                    <div className="w-full">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kondisi</label>
                        <select {...register('initialCondition')} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="DIRTY">Kotor (Perlu Sterilisasi)</option>
                            <option value="CLEAN">Bersih (Siap Packing)</option>
                            <option value="STERILE">Steril (Siap Pakai)</option>
                        </select>
                    </div>

                    <div className="w-full">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Satuan</label>
                        <select {...register('measure_unit_id')} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="mu1">Pcs (Pieces)</option>
                            <option value="mu2">Set (Paket)</option>
                            <option value="mu3">Box (Kotak)</option>
                        </select>
                    </div>

                    <div className="w-full flex flex-col justify-end h-[62px]">
                        <button type="submit" className="h-[42px] bg-green-600 text-white px-6 rounded font-medium hover:bg-green-700 whitespace-nowrap w-full">
                            + Tambah
                        </button>
                    </div>

                    <div className="col-span-1 md:col-span-6">
                        <label className="flex items-center gap-2 cursor-pointer w-fit">
                            <input type="checkbox" {...register('is_serialized')} className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 h-4 w-4" />
                            <span className="text-sm font-medium text-slate-700">Wajib Serial Number (Untuk tracking aset bernilai tinggi)</span>
                        </label>
                    </div>
                </form>
            </div>

            {/* Warning Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
                <div className="text-sm text-amber-800">
                    <p className="font-semibold">Perhatian:</p>
                    <p>Stok instrumen akan otomatis dikelola melalui transaksi distribusi dan pengambilan. Pastikan data awal sudah benar.</p>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Cari instrumen..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1); // Reset to page 1 on search
                        }}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <button
                    onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
                    className={`px-4 py-2 rounded-lg border font-medium transition-colors flex items-center gap-2 ${showUnassignedOnly
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                >
                    <AlertCircle size={18} />
                    <span>Belum Masuk Set ({unassignedInstruments.length})</span>
                </button>
            </div>

            {/* Instruments Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-slate-600">Nama Instrumen</th>
                            <th className="p-4 font-semibold text-slate-600">QR Master</th>
                            <th className="p-4 font-semibold text-slate-600">Kategori</th>
                            <th className="p-4 font-semibold text-slate-600 text-center">Total</th>
                            <th className="p-4 font-semibold text-slate-600 text-center text-blue-600 bg-blue-50">Dalam Set</th>
                            <th className="p-4 font-semibold text-slate-600 text-center text-green-600 bg-green-50">Sisa Loose</th>
                            <th className="p-4 font-semibold text-slate-600 text-center">CSSD</th>
                            <th className="p-4 font-semibold text-slate-600 text-center">Kotor</th>
                            <th className="p-4 font-semibold text-slate-600 text-center">Status</th>
                            <th className="p-4 font-semibold text-slate-600 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {displayedInstruments.map((inst: Instrument) => (
                            <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-medium text-slate-800">
                                    {inst.name}
                                    {/* Fallback check for both snake_case (form) and camelCase (API) */}
                                    {(inst.isSerialized || inst.is_serialized) && (
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                            SN
                                        </span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(inst.id);
                                            toast.success(`Kode disalin: ${inst.id}`);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors text-xs font-medium border border-slate-200 shadow-sm"
                                        title={`Klik untuk salin: ${inst.id}`}
                                    >
                                        <QrCode size={14} />
                                        <span>Salin Kode</span>
                                    </button>
                                </td>
                                <td className="p-4">
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">{inst.category}</span>
                                </td>
                                <td className="p-4 text-center font-bold text-slate-700">{inst.totalStock}</td>
                                <td className="p-4 text-center bg-blue-50">
                                    <span className="font-semibold text-blue-700">{inst.usedInSets ? inst.usedInSets : '-'}</span>
                                </td>
                                <td className="p-4 text-center bg-green-50">
                                    <span className="font-semibold text-green-700">{inst.remainingLoose !== undefined ? inst.remainingLoose : inst.totalStock}</span>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">{inst.cssdStock}</span>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">{inst.dirtyStock}</span>
                                </td>
                                <td className="p-4 text-center">
                                    <button
                                        onClick={async () => {
                                            try {
                                                const newStatus = !inst.is_active;
                                                await updateInstrumentStatus(inst.id, newStatus);
                                                toast.success(`Instrumen ${inst.name} ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
                                            } catch (e) {
                                                toast.error("Gagal mengubah status");
                                            }
                                        }}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${!!inst.is_active ? 'bg-green-500' : 'bg-slate-200'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!!inst.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {(inst.isSerialized || inst.is_serialized) && (
                                            <button
                                                onClick={() => setViewingAssetsInstrument(inst)}
                                                className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-full transition-all"
                                                title="Lihat Aset / Serial Number"
                                            >
                                                <QrCode size={16} />
                                            </button>
                                        )}
                                        <button onClick={() => openEditModal(inst)} className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-all" title="Edit">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(inst.id)} className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-all" title="Hapus">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!instruments.length && <div className="p-8 text-center text-slate-400">Belum ada instrumen terdaftar.</div>}
                {instruments.length > 0 && displayedInstruments.length === 0 && <div className="p-8 text-center text-slate-400">Tidak ada hasil pencarian.</div>}

                {/* Pagination */}
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
