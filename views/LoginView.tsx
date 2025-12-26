import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Activity, Key, Users, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ApiService } from '../services/apiService';
import { Role, User } from '../types';

const BTN_PRIMARY_CLASSES = "bg-blue-600/90 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-2xl shadow-[0_8px_16px_rgba(37,99,235,0.2)] hover:shadow-[0_12px_24px_rgba(37,99,235,0.3)] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-sm";

// 1. Define Schema
const loginSchema = z.object({
    username: z.string().min(1, "Username wajib diisi"),
    password: z.string().min(4, "Password minimal 4 karakter")
});

// 2. Derive Type
type LoginFormInputs = z.infer<typeof loginSchema>;

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

const LoginView = () => {
    const { login, users, currentUser } = useAppContext();
    const navigate = useNavigate();
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (currentUser) {
            if (currentUser.role === Role.ADMIN) navigate('/admin');
            else if (currentUser.role === Role.CSSD) navigate('/cssd');
            else if (currentUser.role === Role.NURSE) navigate('/nurse');
            else navigate('/inventory');
        }
    }, [currentUser, navigate]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        // Disable tilt when focused
        if (isFocused) return;

        const { clientX, clientY, currentTarget } = e;
        const { width, height, left, top } = currentTarget.getBoundingClientRect();

        const x = (clientX - left) / width;
        const y = (clientY - top) / height;

        // Calculate tilt: move opposite to mouse to simulate depth (or follow mouse)
        // Let's make it follow mouse slightly for a glass feel
        const rotateX = (0.5 - y) * 20; // Max 10 deg tilt
        const rotateY = (x - 0.5) * 20;

        setTilt({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setTilt({ x: 0, y: 0 });
    };

    // Reset tilt when focused
    useEffect(() => {
        if (isFocused) setTilt({ x: 0, y: 0 });
    }, [isFocused]);

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
            setError('root', { message: 'Username atau password salah' });
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
            <Droplet className="w-16 h-16 top-20 left-[20%] animate-[float_6s_ease-in-out_infinite]" />
            <Droplet className="w-12 h-12 bottom-32 right-[25%] animate-[float_8s_ease-in-out_infinite_reverse]" />

            {/* Main Container - The Giant Droplet Card with 3D Tilt */}
            <div
                className={`relative w-full max-w-[500px] min-h-[600px] flex items-center justify-center ${isFocused ? '' : 'animate-[float_7s_ease-in-out_infinite]'}`}
                style={{
                    perspective: '1000px',
                    transition: 'all 0.5s ease-out'
                }}
            >

                {/* Inner Tilt Container - Separated from float animation */}
                <div
                    className="relative w-full h-full flex items-center justify-center transition-transform duration-500 ease-out will-change-transform"
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
                            // Add slight depth to the glass itself
                            transform: 'translateZ(0px)'
                        }}
                    ></div>

                    {/* Content Container - Centered inside the droplet */}
                    <div className="relative z-10 w-full px-12 py-16 flex flex-col items-center">

                        {/* Stronger Specular Highlight - Moves slightly for parallax */}
                        <div
                            className="absolute top-16 left-20 w-24 h-16 bg-gradient-to-br from-white to-transparent rounded-[50%] blur-md pointer-events-none opacity-90 transform -rotate-45 mix-blend-overlay transition-transform duration-200"
                            style={{ transform: `translate(${tilt.y * 1.5}px, ${tilt.x * 1.5}px) rotate(-45deg)` }}
                        ></div>
                        <div className="absolute top-20 left-24 w-12 h-8 bg-white rounded-[50%] blur-sm pointer-events-none opacity-80 transform -rotate-45"></div>

                        {/* Logo/Header */}
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 mx-auto mb-3 bg-white/20 rounded-full shadow-[inset_2px_2px_10px_rgba(255,255,255,0.5),_5px_5px_15px_rgba(0,0,0,0.05)] flex items-center justify-center backdrop-blur-md border border-white/30">
                                <Activity size={40} className="text-blue-600 drop-shadow-md" />
                            </div>
                            <h1 className="text-3xl font-bold text-slate-800 tracking-tight drop-shadow-md">SIAPPMEN</h1>
                            <p className="text-slate-600/90 text-sm font-semibold tracking-wide mt-1 drop-shadow-sm">Sistem Sterilisasi</p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full">
                            <div className="group">
                                <div className="relative transform transition-all duration-300 hover:scale-[1.02]">
                                    <Users size={20} className="absolute left-4 top-3.5 text-blue-700/80 z-10" />
                                    <input
                                        {...register('username')}
                                        type="text"
                                        onFocus={() => setIsFocused(true)}
                                        onBlur={() => setIsFocused(false)}
                                        className={`w-full pl-12 pr-4 py-3 bg-white/20 border border-white/30 rounded-2xl focus:bg-white/40 focus:ring-2 focus:ring-blue-300/40 outline-none text-slate-900 placeholder:text-slate-600/70 shadow-[inset_1px_1px_4px_rgba(0,0,0,0.05)] backdrop-blur-sm transition-all ${errors.username ? 'border-red-400 focus:ring-red-100' : ''}`}
                                        placeholder="Username"
                                    />
                                </div>
                                {errors.username && <p className="text-red-500 text-xs mt-1 text-center font-bold px-4 py-0.5 bg-white/40 rounded-full inline-block mx-auto shadow-sm backdrop-blur-md">{errors.username.message}</p>}
                            </div>

                            <div className="group">
                                <div className="relative transform transition-all duration-300 hover:scale-[1.02]">
                                    <Key size={20} className="absolute left-4 top-3.5 text-blue-700/80 z-10" />
                                    <input
                                        {...register('password')}
                                        type={isPasswordVisible ? "text" : "password"}
                                        onFocus={() => setIsFocused(true)}
                                        onBlur={() => setIsFocused(false)}
                                        className={`w-full pl-12 pr-12 py-3 bg-white/20 border border-white/30 rounded-2xl focus:bg-white/40 focus:ring-2 focus:ring-blue-300/40 outline-none text-slate-900 placeholder:text-slate-600/70 shadow-[inset_1px_1px_4px_rgba(0,0,0,0.05)] backdrop-blur-sm transition-all ${errors.password ? 'border-red-400 focus:ring-red-100' : ''}`}
                                        placeholder="Password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                        className="absolute right-4 top-3.5 text-blue-700/60 hover:text-blue-700 transition-colors z-20 focus:outline-none"
                                        tabIndex={-1}
                                    >
                                        {isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-red-500 text-xs mt-1 text-center font-bold px-4 py-0.5 bg-white/40 rounded-full inline-block mx-auto shadow-sm backdrop-blur-md">{errors.password.message}</p>}
                            </div>

                            {errors.root && (
                                <div className="bg-red-100/60 backdrop-blur-md border border-red-200 rounded-xl p-2 text-red-600 text-xs font-bold text-center shadow-md">
                                    {errors.root.message}
                                </div>
                            )}

                            <button type="submit" className={`${BTN_PRIMARY_CLASSES} w-40 mx-auto block mt-2 shadow-[0_10px_20px_rgba(37,99,235,0.25)] border border-white/20 hover:bg-blue-600/80`}>
                                <span>Masuk</span>
                            </button>
                        </form>



                        {/* Satellite Register Droplet - Orbiting/Floating Effect */}
                        <Link to="/register" className="absolute -bottom-16 -right-10 w-28 h-28 flex flex-col items-center justify-center text-center p-2 rounded-full cursor-pointer transition-transform hover:scale-110 active:scale-95 animate-[float_5s_ease-in-out_infinite_reverse]"
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
                            <span className="text-3xl font-light text-blue-600 mb-1 drop-shadow-sm">+</span>
                            <span className="text-[10px] font-bold text-blue-800 leading-tight drop-shadow-sm">Daftar<br />Pengguna Baru</span>
                            {/* Shine */}
                            <div className="absolute top-4 left-5 w-8 h-4 bg-white/80 rounded-full blur-sm -rotate-45 pointer-events-none"></div>
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

export default LoginView;
