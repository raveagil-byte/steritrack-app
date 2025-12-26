import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';

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

const NotFoundView = () => {
    const navigate = useNavigate();
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { clientX, clientY, currentTarget } = e;
        const { width, height, left, top } = currentTarget.getBoundingClientRect();

        const x = (clientX - left) / width;
        const y = (clientY - top) / height;

        // Tilt effect
        const rotateX = (0.5 - y) * 15;
        const rotateY = (x - 0.5) * 15;

        setTilt({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setTilt({ x: 0, y: 0 });
    };

    return (
        <div
            className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4 relative overflow-hidden font-sans"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Ambient Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-red-400/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-400/20 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Floating smaller droplets in background */}
            <Droplet className="w-32 h-32 top-20 left-[10%] animate-[float_10s_ease-in-out_infinite]" />
            <Droplet className="w-16 h-16 bottom-32 right-[25%] animate-[float_8s_ease-in-out_infinite_reverse]" />

            {/* Main Container - The Giant Droplet Card with 3D Tilt */}
            <div
                className="relative w-full max-w-[450px] min-h-[500px] flex items-center justify-center animate-[float_7s_ease-in-out_infinite]"
                style={{ perspective: '1000px' }}
            >
                <div
                    className="relative w-full h-full flex items-center justify-center transition-transform duration-200 ease-out will-change-transform"
                    style={{
                        transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                        transformStyle: 'preserve-3d'
                    }}
                >
                    {/* The Droplet Shape Border/Container */}
                    <div
                        className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-blue-600/10 backdrop-blur-2xl border border-blue-200/40 z-0"
                        style={{
                            borderRadius: '48% 52% 68% 32% / 42% 46% 54% 58%',
                            boxShadow: `
                                20px 20px 60px rgba(0,0,0,0.1),
                                -20px -20px 60px rgba(255,255,255,0.4),
                                inset 10px 10px 40px rgba(255,255,255,0.3),
                                inset -10px -10px 40px rgba(37,99,235,0.05),
                                inset 0px 0px 15px rgba(255,255,255,0.1)
                            `,
                            transform: 'translateZ(0px)'
                        }}
                    ></div>

                    {/* Content Container */}
                    <div className="relative z-10 w-full px-8 py-10 flex flex-col items-center text-center" style={{ transform: 'translateZ(50px)' }}>

                        {/* Highlights */}
                        <div className="absolute top-16 left-16 w-24 h-12 bg-white/40 rounded-[50%] blur-xl pointer-events-none transform -rotate-45"></div>

                        {/* Error Icon Bubble */}
                        <div className="w-24 h-24 mb-6 bg-red-500/10 rounded-full shadow-[inset_2px_2px_10px_rgba(255,255,255,0.5),_5px_5px_15px_rgba(0,0,0,0.05)] flex items-center justify-center backdrop-blur-md border border-red-200/30 animate-pulse">
                            <AlertCircle size={48} className="text-red-500/80 drop-shadow-md" />
                        </div>

                        <h1 className="text-6xl font-black text-slate-800/80 drop-shadow-sm mb-2 font-mono">404</h1>
                        <h2 className="text-2xl font-bold text-slate-700/90 mb-2">Halaman Hilang</h2>
                        <p className="text-slate-600 mb-8 max-w-[280px] leading-relaxed">
                            Oops! Sepertinya Anda tersesat. Halaman yang Anda cari tidak ditemukan atau telah dipindahkan.
                        </p>

                        <button
                            onClick={() => navigate('/')}
                            className="bg-blue-600/90 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full shadow-[0_8px_16px_rgba(37,99,235,0.25)] hover:shadow-[0_12px_24px_rgba(37,99,235,0.35)] active:scale-95 transition-all duration-300 flex items-center gap-2 backdrop-blur-sm group"
                        >
                            <Home size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                            <span>Kembali ke Beranda</span>
                        </button>

                    </div>
                </div>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    33% { transform: translate(10px, -10px) rotate(1deg); }
                    66% { transform: translate(-5px, 5px) rotate(-1deg); }
                }
            `}</style>
        </div>
    );
};

export default NotFoundView;
