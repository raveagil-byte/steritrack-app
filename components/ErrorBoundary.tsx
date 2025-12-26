import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4 relative overflow-hidden font-sans">
                    {/* Ambient Background Elements */}
                    <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-orange-400/10 rounded-full blur-[100px] pointer-events-none"></div>

                    {/* Main Alert Container */}
                    <div className="relative w-full max-w-[500px] min-h-[500px] flex items-center justify-center animate-[float_6s_ease-in-out_infinite]">
                        <div className="relative w-full h-full flex items-center justify-center">
                            {/* Glass Shape */}
                            <div
                                className="absolute inset-0 bg-gradient-to-br from-red-50/40 to-white/10 backdrop-blur-xl border border-red-200/50 z-0"
                                style={{
                                    borderRadius: '45% 55% 70% 30% / 45% 45% 55% 55%',
                                    boxShadow: `
                                20px 20px 60px rgba(220, 38, 38, 0.05),
                                -20px -20px 60px rgba(255,255,255,0.6),
                                inset 10px 10px 40px rgba(255,255,255,0.5),
                                inset -10px -10px 40px rgba(220, 38, 38, 0.05)
                            `
                                }}
                            ></div>

                            {/* Content */}
                            <div className="relative z-10 w-full px-8 py-10 flex flex-col items-center text-center">

                                <div className="w-20 h-20 mb-6 bg-red-100/50 rounded-full flex items-center justify-center backdrop-blur-md border border-red-200/50 shadow-inner">
                                    <AlertTriangle size={40} className="text-red-600 drop-shadow-sm" />
                                </div>

                                <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Terjadi Kesalahan!</h1>
                                <p className="text-slate-600 mb-6 max-w-[300px] text-sm leading-relaxed">
                                    Aplikasi mengalami masalah yang tidak terduga. Kami telah mencatat error ini. Silakan coba muat ulang halaman.
                                </p>

                                {this.state.error && (
                                    <div className="w-full bg-red-50/50 border border-red-100 rounded-lg p-3 mb-6 text-left overflow-auto max-h-32 text-xs font-mono text-red-800/80 shadow-inner">
                                        {this.state.error.toString()}
                                    </div>
                                )}

                                <button
                                    onClick={() => window.location.reload()}
                                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-full shadow-[0_4px_14px_rgba(220,38,38,0.3)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.4)] active:scale-95 transition-all duration-300 flex items-center gap-2"
                                >
                                    <RefreshCcw size={18} />
                                    <span>Muat Ulang Halaman</span>
                                </button>

                            </div>
                        </div>
                    </div>

                    <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                }
            `}</style>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
