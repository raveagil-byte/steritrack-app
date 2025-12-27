import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, Key, User, Briefcase, Building2, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ApiService } from '../services/apiService';
import { toast } from 'sonner';
import { ROLES } from '../constants';

const BTN_PRIMARY_CLASSES = "bg-blue-600/90 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-2xl shadow-[0_8px_16px_rgba(37,99,235,0.2)] hover:shadow-[0_12px_24px_rgba(37,99,235,0.3)] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-sm";

const registerSchema = z.object({
    username: z.string().min(3, "Username minimal 3 karakter").regex(/^[a-zA-Z0-9_]+$/, "Hanya huruf, angka, dan underscore"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    name: z.string().min(3, "Nama lengkap wajib diisi"),
    role: z.enum([ROLES.CSSD, ROLES.NURSE]),
    unitId: z.string().optional()
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

const Droplet = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <div className={`absolute rounded-[43%_57%_72%_28%_/_45%_48%_52%_55%] pointer-events-none ${className}`}
        style={{
            boxShadow: `
                inset 10px 10px 20px rgba(0, 0, 0, 0.05), 
                inset -10px -10px 20px rgba(255, 255, 255, 0.8), 
                10px 20px 20px rgba(0, 0, 0, 0.05), 
                5px 10px 10px rgba(0, 0, 0, 0.02)
            `,
            background: 'rgba(255, 255, 255, 0.01)',
            ...style
        }}
    />
);

const RegisterView = () => {
    const { units } = useAppContext();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [isFocused, setIsFocused] = useState(false);

    const { register, handleSubmit, watch, formState: { errors }, setError } = useForm<RegisterFormInputs>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: ROLES.NURSE
        }
    });

    const selectedRole = watch('role');

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        // Disable tilt when focused
        if (isFocused) return;

        const { clientX, clientY, currentTarget } = e;
        const { width, height, left, top } = currentTarget.getBoundingClientRect();

        const x = (clientX - left) / width;
        const y = (clientY - top) / height;

        // Tilt effect
        const rotateX = (0.5 - y) * 15; // Max 7.5 deg tilt
        const rotateY = (x - 0.5) * 15;

        setTilt({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setTilt({ x: 0, y: 0 });
    };

    // Reset tilt when focused
    React.useEffect(() => {
        if (isFocused) setTilt({ x: 0, y: 0 });
    }, [isFocused]);

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
        <div
            className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4 relative overflow-hidden font-sans"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Ambient Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-400/20 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Floating smaller droplets in background */}
            <Droplet className="w-20 h-20 top-10 left-[15%] animate-[float_9s_ease-in-out_infinite]" />
            <Droplet className="w-14 h-14 bottom-20 right-[20%] animate-[float_7s_ease-in-out_infinite_reverse]" />

            {/* Main Container - The Giant Droplet Card with 3D Tilt */}
            <div
                className={`relative w-full max-w-[600px] flex items-center justify-center ${isFocused ? '' : 'animate-[float_8s_ease-in-out_infinite]'}`}
                style={{
                    perspective: '1000px',
                    transition: 'all 0.5s ease-out'
                    // Removed min-height from here to let the inner container dictate height if needed, 
                    // but we will enforce a large min-height on the inner container.
                }}
            >

                {/* Inner Tilt Container */}
                <div
                    className="relative w-full min-h-[720px] flex items-center justify-center transition-transform duration-500 ease-out will-change-transform"
                    style={{
                        transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                        transformStyle: 'preserve-3d'
                    }}
                >
                    {/* The Droplet Shape Border/Container */}
                    <div
                        className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-blue-600/10 backdrop-blur-2xl border border-blue-200/40 z-0"
                        style={{
                            borderRadius: '42% 58% 70% 30% / 45% 45% 55% 55%', // Organic Droplet Shape
                            boxShadow: `
                                20px 20px 60px rgba(0,0,0,0.15),
                                -20px -20px 60px rgba(255,255,255,0.5),
                                inset 10px 10px 40px rgba(255,255,255,0.4),
                                inset -10px -10px 40px rgba(37,99,235,0.1),
                                inset 0px 0px 15px rgba(255,255,255,0.2)
                            `,
                            transform: 'translateZ(0px)'
                        }}
                    ></div>

                    {/* Content Container */}
                    <div className="relative z-10 w-full px-14 py-16 flex flex-col items-center">

                        {/* Specular Highlight */}
                        <div
                            className="absolute top-16 left-20 w-32 h-20 bg-gradient-to-br from-white to-transparent rounded-[50%] blur-md pointer-events-none opacity-90 transform -rotate-45 mix-blend-overlay transition-transform duration-200"
                            style={{ transform: `translate(${tilt.y * 1.5}px, ${tilt.x * 1.5}px) rotate(-45deg)` }}
                        ></div>
                        <div className="absolute top-20 left-24 w-12 h-8 bg-white rounded-[50%] blur-sm pointer-events-none opacity-80 transform -rotate-45"></div>

                        {/* Logo/Header */}
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 mx-auto mb-2 bg-white/20 rounded-full shadow-[inset_2px_2px_10px_rgba(255,255,255,0.5),_5px_5px_15px_rgba(0,0,0,0.05)] flex items-center justify-center backdrop-blur-md border border-white/30">
                                <UserPlus size={28} className="text-blue-600 drop-shadow-md" />
                            </div>
                            <h1 className="text-xl font-bold text-slate-800 tracking-tight drop-shadow-md">Daftar Akun Baru</h1>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">

                            {/* Name */}
                            <div className="group">
                                <div className="relative transform transition-all duration-300 hover:scale-[1.01]">
                                    <User size={16} className="absolute left-4 top-3 text-blue-700/80 z-10" />
                                    <input
                                        {...register('name')}
                                        onFocus={() => setIsFocused(true)}
                                        onBlur={() => setIsFocused(false)}
                                        className={`w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-2xl focus:bg-white/40 focus:ring-2 focus:ring-blue-300/40 outline-none text-slate-900 placeholder:text-slate-600/70 shadow-[inset_1px_1px_4px_rgba(0,0,0,0.05)] backdrop-blur-sm transition-all text-sm ${errors.name ? 'border-red-400 focus:ring-red-100' : ''}`}
                                        placeholder="Nama Lengkap"
                                    />
                                </div>
                                {errors.name && <p className="text-red-500 text-[10px] mt-0.5 ml-4 font-bold">{errors.name.message}</p>}
                            </div>

                            {/* Username */}
                            <div className="group">
                                <div className="relative transform transition-all duration-300 hover:scale-[1.01]">
                                    <User size={16} className="absolute left-4 top-3 text-blue-700/80 z-10" />
                                    <input
                                        {...register('username')}
                                        onFocus={() => setIsFocused(true)}
                                        onBlur={() => setIsFocused(false)}
                                        className={`w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-2xl focus:bg-white/40 focus:ring-2 focus:ring-blue-300/40 outline-none text-slate-900 placeholder:text-slate-600/70 shadow-[inset_1px_1px_4px_rgba(0,0,0,0.05)] backdrop-blur-sm transition-all text-sm ${errors.username ? 'border-red-400 focus:ring-red-100' : ''}`}
                                        placeholder="Username"
                                    />
                                </div>
                                {errors.username && <p className="text-red-500 text-[10px] mt-0.5 ml-4 font-bold">{errors.username.message}</p>}
                            </div>

                            {/* Password */}
                            <div className="group">
                                <div className="relative transform transition-all duration-300 hover:scale-[1.01]">
                                    <Key size={16} className="absolute left-4 top-3 text-blue-700/80 z-10" />
                                    <input
                                        {...register('password')}
                                        type="password"
                                        onFocus={() => setIsFocused(true)}
                                        onBlur={() => setIsFocused(false)}
                                        className={`w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-2xl focus:bg-white/40 focus:ring-2 focus:ring-blue-300/40 outline-none text-slate-900 placeholder:text-slate-600/70 shadow-[inset_1px_1px_4px_rgba(0,0,0,0.05)] backdrop-blur-sm transition-all text-sm ${errors.password ? 'border-red-400 focus:ring-red-100' : ''}`}
                                        placeholder="Password (Min. 6 Karakter)"
                                    />
                                </div>
                                {errors.password && <p className="text-red-500 text-[10px] mt-0.5 ml-4 font-bold">{errors.password.message}</p>}
                            </div>

                            {/* Role */}
                            <div className="group">
                                <div className="relative transform transition-all duration-300 hover:scale-[1.01]">
                                    <Briefcase size={16} className="absolute left-4 top-3 text-blue-700/80 z-10" />
                                    <select
                                        {...register('role')}
                                        className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-2xl focus:bg-white/40 focus:ring-2 focus:ring-blue-300/40 outline-none text-slate-900 shadow-[inset_1px_1px_4px_rgba(0,0,0,0.05)] backdrop-blur-sm transition-all appearance-none cursor-pointer text-sm"
                                    >
                                        <option value={ROLES.NURSE} className="text-slate-800">Perawat (Nurse)</option>
                                        <option value={ROLES.CSSD} className="text-slate-800">Staf CSSD</option>
                                    </select>
                                    {/* Custom arrow for select */}
                                    <div className="absolute right-4 top-3.5 pointer-events-none border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-blue-700/60"></div>
                                </div>
                            </div>

                            {/* Unit Selector */}
                            {selectedRole === ROLES.NURSE && (
                                <div className="group animate-in fade-in slide-in-from-top-2">
                                    <div className="relative transform transition-all duration-300 hover:scale-[1.01]">
                                        <Building2 size={16} className="absolute left-4 top-3 text-blue-700/80 z-10" />
                                        <select
                                            {...register('unitId')}
                                            onFocus={() => setIsFocused(true)}
                                            onBlur={() => setIsFocused(false)}
                                            className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-2xl focus:bg-white/40 focus:ring-2 focus:ring-blue-300/40 outline-none text-slate-900 shadow-[inset_1px_1px_4px_rgba(0,0,0,0.05)] backdrop-blur-sm transition-all appearance-none cursor-pointer text-sm"
                                        >
                                            <option value="" className="text-slate-800">-- Pilih Unit --</option>
                                            {units.length > 0 ? (
                                                units.map(u => (
                                                    <option key={u.id} value={u.id} className="text-slate-800">{u.name}</option>
                                                ))
                                            ) : (
                                                <option disabled className="text-slate-500">Memuat Unit / Tidak ada Data...</option>
                                            )}
                                        </select>
                                        <div className="absolute right-4 top-3.5 pointer-events-none border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-blue-700/60"></div>
                                    </div>
                                </div>
                            )}

                            {errors.root && (
                                <div className="bg-red-100/60 backdrop-blur-md border border-red-200 rounded-xl p-2 text-red-600 text-xs font-bold text-center shadow-md">
                                    {errors.root.message}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-40 mx-auto block mt-6 ${BTN_PRIMARY_CLASSES} ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-600/80'}`}
                            >
                                {isSubmitting ? '...' : 'Daftar'}
                            </button>
                        </form>

                        {/* Satellite Login Droplet */}
                        <Link to="/login" className={`absolute -bottom-16 -left-10 w-24 h-24 flex flex-col items-center justify-center text-center p-2 rounded-full cursor-pointer transition-transform hover:scale-110 active:scale-95 ${isFocused ? '' : 'animate-[float_6s_ease-in-out_infinite]'}`}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255,255,255,0.4)',
                                boxShadow: `
                                    10px 10px 30px rgba(37, 99, 235, 0.1),
                                    inset 5px 5px 20px rgba(255,255,255,0.5),
                                    inset -5px -5px 10px rgba(0,0,0,0.05)
                                `
                            }}
                        >
                            <ArrowLeft size={24} className="text-blue-600 mb-1 drop-shadow-sm" />
                            <span className="text-[10px] font-bold text-blue-800 leading-tight drop-shadow-sm">Kembali<br />Login</span>
                            {/* Shine */}
                            <div className="absolute top-4 right-5 w-6 h-3 bg-white/80 rounded-full blur-sm rotate-45 pointer-events-none"></div>
                        </Link>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    33% { transform: translate(10px, -15px) rotate(2deg); }
                    66% { transform: translate(-5px, 10px) rotate(-1deg); }
                }
            `}</style>
        </div>
    );
};

export default RegisterView;
