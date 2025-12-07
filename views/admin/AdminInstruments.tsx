import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, AlertCircle, Pencil, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Instrument } from '../../types';
import { toast } from 'sonner';
import { ApiService } from '../../services/apiService';
import { useQueryClient } from '@tanstack/react-query';

const instrumentSchema = z.object({
    name: z.string().min(2, "Nama instrumen wajib diisi"),
    category: z.string().min(2, "Kategori wajib diisi"),
    totalStock: z.number().min(1, "Stok minimal 1").optional(),
});

type InstrumentFormValues = z.infer<typeof instrumentSchema>;

export const AdminInstruments = () => {
    const { instruments, addInstrument, updateInstrumentStatus, deleteInstrument } = useAppContext();
    const queryClient = useQueryClient();
    const [editingInstrument, setEditingInstrument] = useState<Instrument | null>(null);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<InstrumentFormValues>({
        resolver: zodResolver(instrumentSchema),
        defaultValues: { totalStock: 10 }
    });

    const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, formState: { errors: errorsEdit } } = useForm<InstrumentFormValues>({
        resolver: zodResolver(instrumentSchema),
    });

    const onSubmit = async (data: InstrumentFormValues) => {
        try {
            await addInstrument({
                id: `i-${Date.now()}`,
                name: data.name,
                category: data.category,
                totalStock: data.totalStock || 10,
                cssdStock: data.totalStock || 10,
                dirtyStock: 0,
                unitStock: {}
            });
            toast.success(`Instrumen ${data.name} berhasil ditambahkan`);
            reset();
        } catch (error) {
            toast.error("Gagal menambahkan instrumen");
        }
    };

    const onEdit = async (data: InstrumentFormValues) => {
        if (!editingInstrument) return;
        try {
            await ApiService.updateInstrument(editingInstrument.id, {
                name: data.name,
                category: data.category
            });
            await queryClient.invalidateQueries({ queryKey: ['instruments'] });
            toast.success(`Instrumen ${data.name} berhasil diupdate`);
            setEditingInstrument(null);
            resetEdit();
        } catch (error) {
            toast.error("Gagal mengupdate instrumen");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm(`Hapus instrumen ini?`)) {
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
            category: instrument.category
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                                <input {...registerEdit('category')} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                                {errorsEdit.category && <p className="text-red-500 text-xs mt-1">{errorsEdit.category.message}</p>}
                            </div>
                            <div className="bg-slate-50 p-3 rounded space-y-1">
                                <p className="text-xs text-slate-500">Total Stok: <span className="font-bold">{editingInstrument.totalStock}</span></p>
                                <p className="text-xs text-slate-500">CSSD: <span className="font-bold">{editingInstrument.cssdStock}</span></p>
                                <p className="text-xs text-slate-500">Kotor: <span className="font-bold">{editingInstrument.dirtyStock}</span></p>
                                <p className="text-xs text-slate-400 mt-2">Stok tidak dapat diubah melalui edit. Gunakan fitur transaksi.</p>
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
                <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <div className="w-full">
                        <input {...register('name')} placeholder="Nama Instrumen" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                    </div>
                    <div className="w-full">
                        <input {...register('category')} placeholder="Kategori" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                        {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
                    </div>
                    <div className="w-full">
                        <input {...register('totalStock', { valueAsNumber: true })} type="number" placeholder="Total Stok" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                        {errors.totalStock && <p className="text-red-500 text-xs mt-1">{errors.totalStock.message}</p>}
                    </div>
                    <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-medium hover:bg-green-700 whitespace-nowrap">
                        + Tambah
                    </button>
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

            {/* Instruments Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-slate-600">Nama Instrumen</th>
                            <th className="p-4 font-semibold text-slate-600">Kategori</th>
                            <th className="p-4 font-semibold text-slate-600 text-center">Total</th>
                            <th className="p-4 font-semibold text-slate-600 text-center">CSSD</th>
                            <th className="p-4 font-semibold text-slate-600 text-center">Kotor</th>
                            <th className="p-4 font-semibold text-slate-600 text-center">Status</th>
                            <th className="p-4 font-semibold text-slate-600 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {instruments.map((inst: Instrument) => (
                            <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-medium text-slate-800">{inst.name}</td>
                                <td className="p-4">
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">{inst.category}</span>
                                </td>
                                <td className="p-4 text-center font-bold text-slate-700">{inst.totalStock}</td>
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
                {instruments.length === 0 && <div className="p-8 text-center text-slate-400">Belum ada instrumen terdaftar.</div>}
            </div>
        </div>
    );
};
