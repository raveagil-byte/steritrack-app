import React, { useState } from 'react';
import { User, Lock, Save, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiService } from '../services/apiService';

const ProfileView = () => {
    const { currentUser, updateCurrentUser } = useAppContext();
    const navigate = useNavigate();

    // Fallback if user is null
    const [name, setName] = useState(currentUser?.name || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!currentUser) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password && password !== confirmPassword) {
            toast.error("Password baru tidak cocok!");
            return;
        }

        setIsLoading(true);
        try {
            await ApiService.updateUserProfile(currentUser.id, {
                name,
                password: password || undefined
            });

            // Update local context
            updateCurrentUser({
                ...currentUser,
                name
            });

            toast.success("Profil berhasil diperbarui!");

            setPassword('');
            setConfirmPassword('');
        } catch (error) {
            toast.error("Gagal menyimpan perubahan.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <header className="mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-all mb-6 group"
                >
                    <ArrowLeft size={18} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                    <span className="font-medium">Kembali</span>
                </button>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <User className="text-blue-600" size={32} />
                    Profil Saya
                </h2>
                <p className="text-slate-500">Kelola informasi akun dan keamanan Anda.</p>
            </header>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 space-y-6">

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 border-b pb-2">Informasi Dasar</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Role</label>
                            <input
                                type="text"
                                value={currentUser.role}
                                disabled
                                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Username</label>
                            <input
                                type="text"
                                value={currentUser.username}
                                disabled
                                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white"
                        />
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 border-b pb-2 flex items-center gap-2">
                        <Lock size={18} /> Keamanan
                    </h3>
                    <p className="text-sm text-slate-500">Kosongkan jika tidak ingin mengubah password.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password Baru</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white"
                                placeholder="******"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Konfirmasi Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white"
                                placeholder="******"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-6 flex justify-end">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Menyimpan...' : (
                            <>
                                <Save size={18} /> Simpan Perubahan
                            </>
                        )}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default ProfileView;
