import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

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

const UnauthorizedView = () => {
    const navigate = useNavigate();
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { clientX, clientY, currentTarget } = e;
        const { width, height, left, top } = currentTarget.getBoundingClientRect();

        const x = (clientX - left) / width;
        const y = (clientY - top) / height;

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
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-400/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-slate-400/20 rounded-full blur-[100px] pointer-events-none"></div>

            <Droplet className="w-24 h-24 top-20 right-[15%] animate-[float_10s_ease-in-out_infinite]" />
            <Droplet className="w-16 h-16 bottom-20 left-[10%] animate-[float_8s_ease-in-out_infinite_reverse]" />

            <div
                className="relative w-full max-w-[480px] min-h-[500px] flex items-center justify-center animate-[float_7s_ease-in-out_infinite]"
                style={{ perspective: '1000px' }}
            >
                <div
                    className="relative w-full h-full flex items-center justify-center transition-transform duration-200 ease-out will-change-transform"
                    style={{
                        transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                        transformStyle: 'preserve-3d'
                    }}
                >
                    {/* Glass Container */}
                    <div
                        className="absolute inset-0 bg-gradient-to-br from-orange-100/30 to-slate-200/10 backdrop-blur-2xl border border-white/40 z-0"
                        style={{
                            borderRadius: '38% 62% 63% 37% / 41% 44% 56% 59%',
                            boxShadow: `
                                20px 20px 60px rgba(0,0,0,0.1),
                                -20px -20px 60px rgba(255,255,255,0.4),
                                inset 10px 10px 40px rgba(255,255,255,0.3),
                                inset -10px -10px 40px rgba(0,0,0,0.05)
                            `,
                            transform: 'translateZ(0px)'
                        }}
                    ></div>

                    {/* Content */}
                    <div className="relative z-10 w-full px-8 py-10 flex flex-col items-center text-center" style={{ transform: 'translateZ(50px)' }}>

                        <div className="w-24 h-24 mb-6 bg-orange-500/10 rounded-full shadow-[inset_2px_2px_10px_rgba(255,255,255,0.5),_5px_5px_15px_rgba(0,0,0,0.05)] flex items-center justify-center backdrop-blur-md border border-orange-200/30">
                            <ShieldAlert size={48} className="text-orange-600/80 drop-shadow-md" />
                        </div>

                        <h1 className="text-4xl font-black text-slate-800/80 drop-shadow-sm mb-2 font-mono">403</h1>
                        <h2 className="text-xl font-bold text-slate-700/90 mb-3">Akses Ditolak</h2>

                        <div className="bg-white/30 rounded-xl p-4 mb-8 backdrop-blur-sm border border-white/40 shadow-sm">
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Maaf, akun Anda tidak memiliki izin untuk mengakses halaman ini. Silakan hubungi Administrator jika Anda merasa ini adalah kesalahan.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <button
                                onClick={() => navigate(-1)}
                                className="bg-white/50 hover:bg-white/70 text-slate-700 font-semibold py-3 px-6 rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 border border-white/60"
                            >
                                <ArrowLeft size={18} />
                                <span>Kembali</span>
                            </button>

                            <button
                                onClick={() => navigate('/')}
                                className="bg-orange-600/90 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-xl shadow-[0_8px_16px_rgba(234,88,12,0.2)] hover:shadow-[0_12px_24px_rgba(234,88,12,0.3)] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                <span>Ke Halaman Utama</span>
                            </button>
                        </div>

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

export default UnauthorizedView;
