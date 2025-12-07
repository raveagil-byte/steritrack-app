import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, Pencil, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Role, User } from '../../types';
import { toast } from 'sonner';
import { ApiService } from '../../services/apiService';
import { useQueryClient } from '@tanstack/react-query';

const userSchema = z.object({
    username: z.string().min(3, "Username minimal 3 karakter"),
    name: z.string().min(1, "Nama lengkap harus diisi"),
    password: z.string().optional(),
    role: z.nativeEnum(Role),
    unitId: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

export const AdminUsers = () => {
    const { users, units, addUser, updateUserStatus, deleteUser } = useAppContext();
    const queryClient = useQueryClient();
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues: { role: Role.CSSD }
    });

    const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, watch: watchEdit, formState: { errors: errorsEdit } } = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
    });

    const selectedRole = watch('role');
    const selectedRoleEdit = watchEdit('role');

    const onSubmit = async (data: UserFormValues) => {
        try {
            await addUser({
                id: `u-${Date.now()}`,
                ...data,
                password: data.password || '123', // Default password if not provided
                unitId: data.role === Role.NURSE ? data.unitId : undefined
            } as User);
            toast.success(`User ${data.username} berhasil ditambahkan`);
            reset();
        } catch (error) {
            toast.error("Gagal menambahkan user");
        }
    };

    const onEdit = async (data: UserFormValues) => {
        if (!editingUser) return;
        try {
            await ApiService.updateUser(editingUser.id, {
                username: data.username,
                name: data.name,
                role: data.role,
                unitId: data.role === Role.NURSE ? data.unitId : undefined,
                password: data.password && data.password.trim() !== '' ? data.password : undefined
            });
            await queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success(`User ${data.username} berhasil diupdate`);
            setEditingUser(null);
            resetEdit();
        } catch (error) {
            toast.error("Gagal mengupdate user");
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Hapus user ${name}?`)) {
            try {
                await deleteUser(id);
                toast.success("User dihapus");
            } catch (error) {
                toast.error("Gagal menghapus user");
            }
        }
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        resetEdit({
            username: user.username,
            name: user.name,
            role: user.role,
            unitId: user.unitId || '',
            password: ''
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">Edit User: {editingUser.name}</h3>
                            <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitEdit(onEdit)} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                                    <input {...registerEdit('username')} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                                    {errorsEdit.username && <p className="text-red-500 text-xs mt-1">{errorsEdit.username.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                                    <input {...registerEdit('name')} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                                    {errorsEdit.name && <p className="text-red-500 text-xs mt-1">{errorsEdit.name.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Password Baru (kosongkan jika tidak diubah)</label>
                                    <input {...registerEdit('password')} type="password" placeholder="Kosongkan jika tidak diubah" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                                    {errorsEdit.password && <p className="text-red-500 text-xs mt-1">{errorsEdit.password.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                    <select {...registerEdit('role')} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value={Role.ADMIN}>Admin</option>
                                        <option value={Role.CSSD}>Staf CSSD</option>
                                        <option value={Role.NURSE}>Perawat (Unit)</option>
                                    </select>
                                </div>
                            </div>

                            {selectedRoleEdit === Role.NURSE && (
                                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tugaskan ke Unit</label>
                                    <select {...registerEdit('unitId')} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                        <option value="">-- Pilih Unit --</option>
                                        {units.map(unit => (
                                            <option key={unit.id} value={unit.id}>{unit.name} ({unit.type})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 border border-slate-300 rounded hover:bg-slate-50">
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
                <h3 className="font-bold text-slate-800 mb-4">Tambah Pengguna Baru</h3>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="w-full">
                            <input {...register('username')} placeholder="Username" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
                        </div>
                        <div className="w-full">
                            <input {...register('name')} placeholder="Nama Lengkap" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                        </div>
                        <div className="w-full">
                            <input {...register('password')} type="password" placeholder="Password" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                        </div>
                        <div className="w-full">
                            <select {...register('role')} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value={Role.ADMIN}>Admin</option>
                                <option value={Role.CSSD}>Staf CSSD</option>
                                <option value={Role.NURSE}>Perawat (Unit)</option>
                            </select>
                        </div>
                    </div>

                    {selectedRole === Role.NURSE && (
                        <div className="bg-white p-4 rounded border border-slate-200">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tugaskan ke Unit</label>
                            <select {...register('unitId')} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">-- Pilih Unit --</option>
                                {units.map(unit => (
                                    <option key={unit.id} value={unit.id}>{unit.name} ({unit.type})</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">Perawat akan otomatis membuat permintaan untuk unit ini.</p>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-medium hover:bg-green-700 shadow-lg shadow-green-100">
                            + Tambah Pengguna
                        </button>
                    </div>
                </form>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-slate-600">Nama</th>
                            <th className="p-4 font-semibold text-slate-600">Unit Bertugas</th>
                            <th className="p-4 font-semibold text-slate-600">Username</th>
                            <th className="p-4 font-semibold text-slate-600 text-center">Status</th>
                            <th className="p-4 font-semibold text-slate-600 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((u: User) => (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-medium text-slate-800">{u.name}</td>
                                <td className="p-4 text-slate-600">
                                    {u.unitId ? (
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            {units.find(unit => unit.id === u.unitId)?.name || 'Unit Tidak Dikenal'}
                                        </span>
                                    ) : (
                                        <span className="text-slate-300">-</span>
                                    )}
                                </td>
                                <td className="p-4 text-slate-500 font-mono text-xs">{u.username}</td>
                                <td className="p-4 text-center">
                                    <button
                                        onClick={async () => {
                                            try {
                                                const newStatus = !u.is_active;
                                                await updateUserStatus(u.id, newStatus);
                                                toast.success(`User ${u.username} ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
                                            } catch (e) {
                                                toast.error("Gagal mengubah status");
                                            }
                                        }}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${!!u.is_active ? 'bg-green-500' : 'bg-slate-200'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!!u.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => openEditModal(u)} className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-all" title="Edit">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(u.id, u.name)} className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-all" title="Hapus">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users.length === 0 && <div className="p-8 text-center text-slate-400">Belum ada pengguna terdaftar.</div>}
            </div>
        </div>
    );
};
