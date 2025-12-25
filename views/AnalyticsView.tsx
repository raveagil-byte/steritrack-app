import React, { useState } from 'react';
import { Sparkles, Server, ArrowRight, LayoutDashboard, BrainCircuit } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { analyzeSystemState } from '../services/aiService';
import { DashboardCharts } from '../components/DashboardCharts';

const AnalyticsView = () => {
    const { instruments, transactions, logs, currentUser, units } = useAppContext();
    const [tab, setTab] = useState<'DASHBOARD' | 'AI'>('DASHBOARD');
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);

    const handleAsk = async () => {
        if (!prompt.trim()) return;
        const currentPrompt = prompt; // Save prompt to display or use
        setPrompt(''); // Clear input immediately for better UX
        setLoading(true);
        const result = await analyzeSystemState(currentPrompt, instruments, transactions, logs, units);
        setResponse(result);
        setLoading(false);
    };

    return (
        <div className="max-w-6xl mx-auto h-full flex flex-col pt-4">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                        Analitik & Laporan
                    </h2>
                    <p className="text-slate-500">Tinjauan performa operasional CSSD</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setTab('DASHBOARD')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${tab === 'DASHBOARD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <LayoutDashboard size={16} /> Dashboard
                    </button>
                    <button
                        onClick={() => setTab('AI')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${tab === 'AI' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <BrainCircuit size={16} /> Asisten AI
                    </button>
                </div>
            </header>

            {tab === 'DASHBOARD' ? (
                <DashboardCharts />
            ) : (
                <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[500px]">
                        <div className="bg-purple-50 p-4 border-b border-purple-100">
                            <div className="flex items-center gap-2 text-purple-700 font-bold">
                                <Sparkles size={18} />
                                Asisten Cerdas CSSD
                            </div>
                            <p className="text-xs text-purple-600 mt-1">Ditenagai oleh Gemini 2.5 Flash</p>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto space-y-4">
                            {!response && !loading && (
                                <div className="text-center text-slate-400 mt-20">
                                    <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>Coba tanyakan:</p>
                                    <p className="text-sm font-medium mt-2">"Unit mana yang punya gunting terbanyak?"</p>
                                    <p className="text-sm font-medium">"Apakah kita perlu restock sesuatu?"</p>
                                </div>
                            )}

                            {response && (
                                <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                        <Sparkles size={16} className="text-purple-600" />
                                    </div>
                                    <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                                        {response}
                                    </div>
                                </div>
                            )}

                            {loading && (
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                        <Sparkles size={16} className="text-purple-600" />
                                    </div>
                                    <div className="flex items-center gap-2 p-4">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <div className="relative">
                                <input
                                    type="text"
                                    className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition"
                                    placeholder="Tanya tentang inventaris..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                                />
                                <button
                                    onClick={handleAsk}
                                    disabled={loading || !prompt}
                                    className="absolute right-2 top-2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
                                >
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsView;
