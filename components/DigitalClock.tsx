import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const DigitalClock = () => {
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setDate(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 backdrop-blur-md shadow-lg relative overflow-hidden group select-none transition-all hover:border-slate-600/50">
            {/* Ambient Glow */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-700"></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-blue-400">
                        <Clock size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">WAKTU SISTEM</span>
                    </div>
                    {/* Pulsing Dot */}
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse"></div>
                </div>

                <div className="text-3xl font-mono font-bold text-white tracking-widest drop-shadow-xl text-center my-1 tabular-nums">
                    {date.toLocaleTimeString('en-GB', { hour12: false })}
                </div>

                <div className="text-center">
                    <div className="text-[10px] text-slate-400 font-medium border-t border-slate-700/50 pt-2 mt-2 uppercase tracking-wide">
                        {date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                </div>
            </div>
        </div>
    );
};
