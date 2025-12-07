import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, QrCode, Printer, Pencil, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Unit } from '../../types';
import { toast } from 'sonner';
import QRScanner from '../../components/QRScanner';
import QRCodeGenerator from '../../components/QRCodeGenerator';
import { ApiService } from '../../services/apiService';
import { useQueryClient } from '@tanstack/react-query';

const unitSchema = z.object({
    name: z.string().min(2, "Nama unit wajib diisi"),
    type: z.string(),
});

type UnitFormValues = z.infer<typeof unitSchema>;

export const AdminUnits = () => {
    const { units, addUnit, updateUnitStatus, deleteUnit } = useAppContext();
    const queryClient = useQueryClient();
    const [viewQrUnit, setViewQrUnit] = useState<Unit | null>(null);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<UnitFormValues>({
        resolver: zodResolver(unitSchema),
        defaultValues: { type: 'WARD' }
    });

    const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, formState: { errors: errorsEdit } } = useForm<UnitFormValues>({
        resolver: zodResolver(unitSchema),
    });

    const onSubmit = async (data: UnitFormValues) => {
        try {
            await addUnit({
                id: `u-${Date.now()}`,
                name: data.name,
                type: data.type as any,
                qrCode: `UNIT-${data.type}-${Date.now().toString().slice(-4)}`
            });
            toast.success(`Unit ${data.name} ditambahkan`);
            reset();
        } catch (error) {
            toast.error("Gagal menambahkan unit");
        }
    };

    const onEdit = async (data: UnitFormValues) => {
        if (!editingUnit) return;
        try {
            await ApiService.updateUnit(editingUnit.id, {
                name: data.name,
                type: data.type as any,
                qrCode: editingUnit.qrCode // Keep existing QR code
            });
            await queryClient.invalidateQueries({ queryKey: ['units'] });
            toast.success(`Unit ${data.name} berhasil diupdate`);
            setEditingUnit(null);
            resetEdit();
        } catch (error) {
            toast.error("Gagal mengupdate unit");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Hapus unit ini?")) {
            await deleteUnit(id);
            toast.success("Unit dihapus");
        }
    };

    const handleScan = (code: string) => {
        const found = units.find(u => u.qrCode === code);
        setIsScanning(false);
        if (found) setViewQrUnit(found);
        else toast.error("Unit QR tidak dikenali");
    };

    const openEditModal = (unit: Unit) => {
        setEditingUnit(unit);
        resetEdit({
            name: unit.name,
            type: unit.type
        });
    };

    if (isScanning) {
        return <QRScanner title="Scan QR Unit" onScan={handleScan} onClose={() => setIsScanning(false)} expectedPrefix="UNIT-" />;
    }

    if (viewQrUnit) {
        return (
            <div className="max-w-md mx-auto text-center space-y-6">
                <h2 className="text-2xl font-bold">{viewQrUnit.name}</h2>
                <div className="bg-white p-6 rounded-xl shadow-lg border">
                    <QRCodeGenerator value={viewQrUnit.qrCode} size={256} />
                    <p className="mt-4 font-mono text-sm text-slate-500">{viewQrUnit.qrCode}</p>
                </div>
                <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded flex items-center gap-2 mx-auto hover:bg-blue-700">
                    <Printer size={18} /> Cetak Label
                </button>
                <button onClick={() => setViewQrUnit(null)} className="text-slate-500 hover:text-slate-700">Tutup</button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Edit Modal */}
            {editingUnit && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">Edit Unit: {editingUnit.name}</h3>
                            <button onClick={() => setEditingUnit(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitEdit(onEdit)} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Unit</label>
                                <input {...registerEdit('name')} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                                {errorsEdit.name && <p className="text-red-500 text-xs mt-1">{errorsEdit.name.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tipe Unit</label>
                                <select {...registerEdit('type')} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="IGD">IGD</option>
                                    <option value="OK">OK</option>
                                    <option value="ICU">ICU</option>
                                    <option value="ICVCU">ICVCU</option>
                                    <option value="WARD">WARD</option>
                                </select>
                            </div>
                            <div className="bg-slate-50 p-3 rounded">
                                <p className="text-xs text-slate-500">QR Code: <span className="font-mono">{editingUnit.qrCode}</span></p>
                                <p className="text-xs text-slate-400 mt-1">QR Code tidak dapat diubah</p>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button type="button" onClick={() => setEditingUnit(null)} className="px-4 py-2 border border-slate-300 rounded hover:bg-slate-50">
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

            {/* Add Form & Scan Button */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 shadow-sm flex-1 w-full">
                    <h3 className="font-bold text-slate-800 mb-4">Tambah Unit Baru</h3>
                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <input {...register('name')} placeholder="Nama Unit / Ruangan" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                        </div>
                        <div className="w-32">
                            <select {...register('type')} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="IGD">IGD</option>
                                <option value="OK">OK</option>
                                <option value="ICU">ICU</option>
                                <option value="ICVCU">ICVCU</option>
                                <option value="WARD">WARD</option>
                            </select>
                        </div>
                        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-medium hover:bg-green-700 whitespace-nowrap">
                            + Tambah
                        </button>
                    </form>
                </div>

                <button onClick={() => setIsScanning(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200">
                    <QrCode size={20} /> Scan QR Unit
                </button>
            </div>

            {/* Units Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-slate-600">Nama Unit</th>
                            <th className="p-4 font-semibold text-slate-600">Tipe</th>
                            <th className="p-4 font-semibold text-slate-600">QR Code</th>
                            <th className="p-4 font-semibold text-slate-600 text-center">Status</th>
                            <th className="p-4 font-semibold text-slate-600 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {units.map((unit: Unit) => (
                            <tr key={unit.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-medium text-slate-800">{unit.name}</td>
                                <td className="p-4">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">{unit.type}</span>
                                </td>
                                <td className="p-4">
                                    <button onClick={() => setViewQrUnit(unit)} className="font-mono text-xs text-blue-600 hover:underline flex items-center gap-1">
                                        <QrCode size={14} /> {unit.qrCode}
                                    </button>
                                </td>
                                <td className="p-4 text-center">
                                    <button
                                        onClick={async () => {
                                            try {
                                                const newStatus = !unit.is_active;
                                                await updateUnitStatus(unit.id, newStatus);
                                                toast.success(`Unit ${unit.name} ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
                                            } catch (e) {
                                                toast.error("Gagal mengubah status");
                                            }
                                        }}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${!!unit.is_active ? 'bg-green-500' : 'bg-slate-200'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!!unit.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => openEditModal(unit)} className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-all" title="Edit">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(unit.id)} className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-all" title="Hapus">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {units.length === 0 && <div className="p-8 text-center text-slate-400">Belum ada unit terdaftar.</div>}
            </div>
        </div>
    );
};
