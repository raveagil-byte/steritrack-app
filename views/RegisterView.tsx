import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, Key, User, Briefcase, ArrowLeft, Building2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Role } from '../types';
import { toast } from 'sonner';
import { ApiService } from '../services/apiService';

const BTN_PRIMARY_CLASSES = "bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2";

const registerSchema = z.object({
    username: z.string().min(3, "Username minimal 3 karakter").regex(/^[a-zA-Z0-9_]+$/, "Hanya huruf, angka, dan underscore"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    name: z.string().min(3, "Nama lengkap wajib diisi"),
    role: z.enum(['CSSD', 'NURSE']),
    unitId: z.string().optional()
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

const RegisterView = () => {
    const { units } = useAppContext();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const { register, handleSubmit, watch, formState: { errors }, setError } = useForm<RegisterFormInputs>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: 'NURSE'
        }
    });

    const selectedRole = watch('role');

    const onSubmit = async (data: RegisterFormInputs) => {
        setIsSubmitting(true);
        try {
            const result = await ApiService.register(data);

            if (result.error) {
                throw new Error(result.error || 'Gagal mendaftar');
            }

            toast.success('Registrasi Berhasil! Silakan Login.');
            navigate('/login');

        } catch (error: any) {
            setError('root', { message: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md my-4 animate-in fade-in zoom-in duration-300">
                <Link to="/login" className="flex items-center text-slate-400 hover:text-slate-600 mb-6 text-sm font-medium transition-colors">
                    <ArrowLeft size={16} className="mr-1" /> Kembali ke Login
                </Link>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserPlus size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Daftar Akun Baru</h1>
                    <p className="text-slate-500">Bergabung dengan SteriTrack</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                        <div className="relative">
                            <User size={18} className="absolute left-3 top-3 text-slate-400" />
                            <input
                                {...register('name')}
                                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 outline-none ${errors.name ? 'border-red-500' : 'focus:ring-blue-500'}`}
                                placeholder="Nama Lengkap Anda"
                            />
                        </div>
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                        <div className="relative">
                            <User size={18} className="absolute left-3 top-3 text-slate-400" />
                            <input
                                {...register('username')}
                                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 outline-none ${errors.username ? 'border-red-500' : 'focus:ring-blue-500'}`}
                                placeholder="Username untuk login"
                            />
                        </div>
                        {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <div className="relative">
                            <Key size={18} className="absolute left-3 top-3 text-slate-400" />
                            <input
                                {...register('password')}
                                type="password"
                                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 outline-none ${errors.password ? 'border-red-500' : 'focus:ring-blue-500'}`}
                                placeholder="Minimal 6 karakter"
                            />
                        </div>
                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Peran / Role</label>
                        <div className="relative">
                            <Briefcase size={18} className="absolute left-3 top-3 text-slate-400" />
                            <select
                                {...register('role')}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 outline-none focus:ring-blue-500 bg-white"
                            >
                                <option value="NURSE">Perawat (Nurse)</option>
                                <option value="CSSD">Staf CSSD</option>
                            </select>
                        </div>
                    </div>

                    {/* Unit Selector (Changes based on Role) */}
                    {selectedRole === 'NURSE' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Unit Penempatan</label>
                            <div className="relative">
                                <Building2 size={18} className="absolute left-3 top-3 text-slate-400" />
                                <select
                                    {...register('unitId')}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 outline-none focus:ring-blue-500 bg-white"
                                >
                                    <option value="">-- Pilih Unit --</option>
                                    {units.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Pilih lokasi stasiun kerja Anda.</p>
                        </div>
                    )}

                    {errors.root && <p className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded border border-red-100">{errors.root.message}</p>}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full ${BTN_PRIMARY_CLASSES} ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isSubmitting ? 'Mendaftarkan...' : 'Daftar Sekarang'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-slate-500">
                        Sudah punya akun?{' '}
                        <Link to="/login" className="text-blue-600 font-bold hover:underline">
                            Login disini
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterView;
