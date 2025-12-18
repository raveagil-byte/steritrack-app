import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Activity, Key, Users } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ApiService } from '../services/apiService';
import { Role, User } from '../types';

const BTN_PRIMARY_CLASSES = "bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2";

// 1. Define Schema
const loginSchema = z.object({
    username: z.string().min(1, "Username wajib diisi"),
    password: z.string().min(4, "Password minimal 4 karakter")
});

// 2. Derive Type
type LoginFormInputs = z.infer<typeof loginSchema>;

const LoginView = () => {
    const { login, users, currentUser } = useAppContext(); // currentUser check might be needed if user manually visits /login while logged in
    const navigate = useNavigate();

    // Redirect if already logged in
    React.useEffect(() => {
        if (currentUser) {
            if (currentUser.role === Role.ADMIN) navigate('/admin');
            else if (currentUser.role === Role.CSSD) navigate('/cssd');
            else if (currentUser.role === Role.NURSE) navigate('/nurse');
            else navigate('/inventory');
        }
    }, [currentUser, navigate]);

    const { register, handleSubmit, formState: { errors }, setError } = useForm<LoginFormInputs>({
        resolver: zodResolver(loginSchema)
    });

    const onSubmit = async (data: LoginFormInputs) => {
        try {
            const user = await ApiService.login(data);
            if (user && user.id) {
                if (user.is_active === false) {
                    setError('root', { message: 'Akun Anda dinonaktifkan. Hubungi admin.' });
                    return;
                }
                login(user);
            } else {
                setError('root', { message: 'Username atau password salah' });
            }
        } catch (error) {
            setError('root', { message: 'Username atau password salah' }); // Generic error for security
        }
    };

    const quickLogin = async (role: Role) => {
        // Quick login for demo: try to log in with known demo credentials
        // Assuming demo users: 'admin', 'staff', 'nurse' with password '123'
        let username = '';
        if (role === Role.ADMIN) username = 'admin';
        else if (role === Role.CSSD) username = 'staff';
        else if (role === Role.NURSE) username = 'nurse';

        try {
            const user = await ApiService.login({ username, password: '123' });
            if (user && user.id) {
                if (user.is_active === false) {
                    setError('root', { message: 'Akun Demo ini dinonaktifkan.' });
                    return;
                }
                login(user); // AppContext login handles redirect via Effect
            }
        } catch (e) {
            setError('root', { message: 'Gagal login demo. Pastikan user seed ada.' });
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Activity size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">SIAPPMEN Login</h1>
                    <p className="text-slate-500 text-sm font-semibold mt-2">SISTEM APLIKASI PENGAMBILAN DAN PENDISTRIBUSIAN INSTRUMEN</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                        <div className="relative">
                            <Users size={18} className="absolute left-3 top-3 text-slate-400" />
                            <input
                                {...register('username')}
                                type="text"
                                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 outline-none ${errors.username ? 'border-red-500 focus:ring-red-200' : 'focus:ring-blue-500'}`}
                                placeholder="Masukkan username"
                            />
                        </div>
                        {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <div className="relative">
                            <Key size={18} className="absolute left-3 top-3 text-slate-400" />
                            <input
                                {...register('password')}
                                type="password"
                                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 outline-none ${errors.password ? 'border-red-500 focus:ring-red-200' : 'focus:ring-blue-500'}`}
                                placeholder="Masukkan password"
                            />
                        </div>
                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                    </div>

                    {errors.root && <p className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded border border-red-100">{errors.root.message}</p>}

                    <button type="submit" className={`w-full ${BTN_PRIMARY_CLASSES}`}>Masuk</button>
                </form>

                <div className="mt-8 border-t border-slate-100 pt-6">
                    <p className="text-xs text-center text-slate-400 mb-3 uppercase tracking-wider font-bold">Akses Demo Cepat</p>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => quickLogin(Role.ADMIN)} className="text-xs py-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium">Admin</button>
                        <button onClick={() => quickLogin(Role.CSSD)} className="text-xs py-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium">CSSD</button>
                        <button onClick={() => quickLogin(Role.NURSE)} className="text-xs py-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium">Perawat</button>
                    </div>
                </div>

                <div className="mt-6 text-center pt-4 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                        Belum punya akun?{' '}
                        <Link to="/register" className="text-blue-600 font-bold hover:underline">
                            Daftar disini
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginView;
