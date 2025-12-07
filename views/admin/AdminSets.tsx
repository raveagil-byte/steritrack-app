import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, Edit, Plus, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Instrument, InstrumentSet, InstrumentSetItem } from '../../types';
import { toast } from 'sonner';

// Simplify form for basic Set details, items handled manually due to complexity or need specialized FieldArray
const setSchema = z.object({
    name: z.string().min(3, "Nama set minimal 3 karakter"),
    description: z.string().optional(),
});

type SetFormValues = z.infer<typeof setSchema>;

export const AdminSets = () => {
    const { sets, instruments, addSet, updateSet, updateSetStatus, deleteSet } = useAppContext();
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [items, setItems] = useState<InstrumentSetItem[]>([]);

    // Item selection state
    const [selectedInstId, setSelectedInstId] = useState('');
    const [selectedQty, setSelectedQty] = useState(1);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<SetFormValues>({
        resolver: zodResolver(setSchema)
    });

    const resetForm = () => {
        reset({ name: '', description: '' });
        setItems([]);
        setIsEditing(false);
        setEditingId(null);
    };

    const handleAddItem = () => {
        if (!selectedInstId || selectedQty <= 0) return;
        const existing = items.find(i => i.instrumentId === selectedInstId);
        if (existing) {
            setItems(items.map(i => i.instrumentId === selectedInstId ? { ...i, quantity: i.quantity + selectedQty } : i));
        } else {
            setItems([...items, { instrumentId: selectedInstId, quantity: selectedQty }]);
        }
        setSelectedInstId('');
        setSelectedQty(1);
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(i => i.instrumentId !== id));
    };

    const onSubmit = async (data: SetFormValues) => {
        if (items.length === 0) {
            toast.error("Set harus memiliki minimal 1 item instrumen");
            return;
        }

        try {
            if (isEditing && editingId) {
                await updateSet({
                    id: editingId,
                    name: data.name,
                    description: data.description || '',
                    items
                });
                toast.success("Set diperbarui");
            } else {
                await addSet({
                    id: `s-${Date.now()}`,
                    name: data.name,
                    description: data.description || '',
                    items
                });
                toast.success("Set baru dibuat");
            }
            resetForm();
        } catch (error) {
            toast.error("Gagal menyimpan set");
        }
    };

    const startEdit = (set: InstrumentSet) => {
        setValue('name', set.name);
        setValue('description', set.description);
        setItems([...set.items]);
        setEditingId(set.id);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Hapus set ini?")) {
            await deleteSet(id);
            toast.success("Set dihapus");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Area */}
                <div className={`lg:col-span-1 bg-slate-50 p-6 rounded-xl border space-y-4 ${isEditing ? 'border-orange-200 bg-orange-50/50' : 'border-slate-100'}`}>
                    <h3 className="font-bold text-slate-800 flex justify-between items-center">
                        {isEditing ? 'Edit Set' : 'Buat Set Baru'}
                        {isEditing && <button onClick={resetForm} className="text-xs text-slate-500 hover:text-slate-800 underline">Batal</button>}
                    </h3>

                    <div className="space-y-3">
                        <div>
                            <input {...register('name')} placeholder="Nama Set" className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                        </div>
                        <input {...register('description')} placeholder="Deskripsi (Opsional)" className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>

                    <div className="border-t border-slate-200 pt-3">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Editor Komposisi</label>
                        <div className="flex gap-2 mb-3">
                            <select
                                className="flex-1 p-2 border rounded text-sm w-full outline-none"
                                value={selectedInstId}
                                onChange={e => setSelectedInstId(e.target.value)}
                            >
                                <option value="">+ Pilih...</option>
                                {instruments.filter(i => i.category !== 'Sets').map(i => (
                                    <option key={i.id} value={i.id}>{i.name}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                className="w-14 p-2 border rounded text-sm outline-none"
                                min="1"
                                value={selectedQty}
                                onChange={e => setSelectedQty(Number(e.target.value))}
                            />
                            <button onClick={handleAddItem} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition">
                                <Plus size={16} />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {items.map((item, idx) => {
                                const inst = instruments.find(i => i.id === item.instrumentId);
                                return (
                                    <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-200 text-sm shadow-sm group">
                                        <span className="font-medium text-slate-700 truncate max-w-[150px]">{inst?.name || 'Item ???'}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="bg-slate-100 text-slate-600 px-2 rounded text-xs font-bold">x{item.quantity}</span>
                                            <button onClick={() => handleRemoveItem(item.instrumentId)} className="text-slate-300 hover:text-red-500 transition">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {items.length === 0 && <p className="text-slate-400 text-xs italic text-center py-4 bg-white/50 rounded border border-dashed border-slate-300">Belum ada instrumen dipilih.</p>}
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit(onSubmit)}
                        className={`w-full py-2.5 rounded-lg font-bold text-white shadow-md transition-all ${isEditing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {isEditing ? 'Simpan Perubahan' : 'Simpan Set Baru'}
                    </button>
                </div>

                {/* List Area */}
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 gap-4">
                        {sets.length === 0 && <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">Belum ada set instrumen yang dibuat.</div>}

                        {sets.map((s) => (
                            <div key={s.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-bold text-lg text-slate-800">{s.name}</h4>
                                        <p className="text-slate-500 text-sm">{s.description || 'Tidak ada deskripsi'}</p>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const newStatus = !s.is_active;
                                                    await updateSetStatus(s.id, newStatus);
                                                    toast.success(`Set ${s.name} ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
                                                } catch (e) {
                                                    toast.error("Gagal mengubah status set");
                                                }
                                            }}
                                            className={`relative inline-flex h-4 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${!!s.is_active ? 'bg-green-500' : 'bg-slate-200'}`}
                                            title={!!s.is_active ? "Aktif" : "Nonaktif"}
                                        >
                                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${!!s.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                        </button>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2 border-l border-slate-100">
                                            <button onClick={() => startEdit(s)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Edit">
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(s.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Hapus">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {s.items.map((item, idx) => {
                                        const inst = instruments.find(i => i.id === item.instrumentId);
                                        return (
                                            <div key={idx} className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full text-xs font-medium border border-slate-100">
                                                {inst?.name} <span className="font-bold text-slate-800 ml-1">x{item.quantity}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
