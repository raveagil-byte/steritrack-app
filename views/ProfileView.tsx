import React, { useState, useRef } from 'react';
import { User, Lock, Save, ArrowLeft, Sun, Moon, LogOut, Camera, Phone, UserCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiService } from '../services/apiService';

const ProfileView = () => {
    const { currentUser, updateCurrentUser, logout } = useAppContext();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    // Fallback if user is null
    const [name, setName] = useState(currentUser?.name || '');
    const [phone, setPhone] = useState(currentUser?.phone || '');
    const [photoUrl, setPhotoUrl] = useState(currentUser?.photo_url || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!currentUser) return null;

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

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
                phone,
                photo_url: photoUrl,
                password: password || undefined
            });

            // Update local context
            updateCurrentUser({
                ...currentUser,
                name,
                phone,
                photo_url: photoUrl
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

                <div className="space-y-6">
                    <div className="flex flex-col items-center justify-center -mt-2 mb-6">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 shadow-lg bg-slate-200">
                                {photoUrl ? (
                                    <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <UserCircle size={64} />
                                    </div>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Camera size={24} />
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handlePhotoUpload}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Klik foto untuk mengubah</p>
                    </div>

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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nomor WhatsApp / HP</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => {
                                        // Only numbers
                                        const re = /^[0-9\b]+$/;
                                        if (e.target.value === '' || re.test(e.target.value)) {
                                            setPhone(e.target.value)
                                        }
                                    }}
                                    placeholder="08xxxxxxxxxx"
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                        </div>
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

                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 pb-2">Pengaturan Aplikasi</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                        >
                            <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                                {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
                            </span>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${theme === 'dark' ? 'translate-x-5' : ''}`} />
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => window.open('https://chat.whatsapp.com/Dbb6Zgp1OdvEdLOkvMo8Db', '_blank')}
                            className="flex items-center justify-between px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors group md:col-span-2"
                        >
                            <span className="text-green-700 dark:text-green-400 font-medium flex items-center gap-2">
                                <Phone size={18} /> Gabung Grup WhatsApp
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={logout}
                            className="flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors group"
                        >
                            <span className="text-red-700 dark:text-red-400 font-medium flex items-center gap-2">
                                <LogOut size={18} /> Keluar Aplikasi
                            </span>
                        </button>
                    </div>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
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
