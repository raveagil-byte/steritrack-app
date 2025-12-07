import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, Send, Archive } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Instrument, InstrumentSet } from '../../types';
import { toast } from 'sonner';

interface CartItem {
    id: string; // Instrument ID or Set ID
    type: 'SINGLE' | 'SET';
    name: string;
    quantity: number;
}

export const NurseRequest = ({ unitId }: { unitId?: string }) => {
    const { instruments, sets, createRequest, currentUser } = useAppContext();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activeTab, setActiveTab] = useState<'INSTRUMENTS' | 'SETS'>('SETS');

    // Use passed unitId or fallback to currentUser.unitId
    const targetUnitId = unitId || currentUser?.unitId;

    // Filter instruments that are active and available (not strictly checking stock here as it's a request)
    const availableInstruments = instruments.filter(i => i.is_active !== false);
    const availableSets = sets.filter(s => s.is_active !== false);

    const addToCart = (item: CartItem) => {
        setCart(prev => {
            const existing = prev.find(p => p.id === item.id);
            if (existing) {
                return prev.map(p => p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p);
            }
            return [...prev, item];
        });
        toast.success("Ditambahkan ke keranjang");
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(p => p.id !== id));
    };

    const updateQty = (id: string, delta: number) => {
        setCart(prev => prev.map(p => {
            if (p.id === id) {
                const newQty = Math.max(1, p.quantity + delta);
                return { ...p, quantity: newQty };
            }
            return p;
        }));
    };

    const handleSubmit = async () => {
        if (!targetUnitId) {
            toast.error("Anda tidak terdaftar di unit manapun. Hubungi Admin.");
            return;
        }

        if (cart.length === 0) {
            toast.error("Keranjang kosong!");
            return;
        }

        try {
            const itemsPayload = cart.map(c => ({
                itemId: c.id,
                itemType: c.type,
                quantity: c.quantity
            }));

            await createRequest(targetUnitId, currentUser?.name || 'Admin', itemsPayload);
            toast.success("Permintaan berhasil dikirim ke CSSD!");
            setCart([]);
        } catch (e) {
            toast.error("Gagal mengirim permintaan.");
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Permintaan Barang Steril</h2>
                    <p className="text-slate-500">Buat permintaan alat/set untuk kebutuhan unit Anda.</p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium text-sm">
                    Unit: <span className="font-bold">{targetUnitId ? `Terpilih (${targetUnitId})` : 'Tidak Terdaftar'}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Catalog Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Tabs */}
                    <div className="flex gap-2 border-b border-slate-200">
                        <button
                            onClick={() => setActiveTab('SETS')}
                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'SETS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            Set Instrumen (Kits)
                        </button>
                        <button
                            onClick={() => setActiveTab('INSTRUMENTS')}
                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'INSTRUMENTS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            Instrumen Satuan
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
                        {activeTab === 'SETS' ? (
                            availableSets.map(set => (
                                <div key={set.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                                <Archive size={20} />
                                            </div>
                                            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">SET</span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 mb-1">{set.name}</h4>
                                        <p className="text-xs text-slate-500 line-clamp-2 mb-4">{set.description || 'Tidak ada deskripsi'}</p>
                                    </div>
                                    <button
                                        onClick={() => addToCart({ id: set.id, type: 'SET', name: set.name, quantity: 1 })}
                                        className="w-full py-2 bg-slate-50 text-slate-700 font-medium rounded-lg hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition text-sm flex items-center justify-center gap-2"
                                    >
                                        <Plus size={16} /> Tambah
                                    </button>
                                </div>
                            ))
                        ) : (
                            availableInstruments.map(inst => (
                                <div key={inst.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                                                <Archive size={20} />
                                            </div>
                                            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">{inst.category}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 mb-1">{inst.name}</h4>
                                        <p className="text-xs text-slate-400 mb-4">Stock CSSD: {inst.cssdStock}</p>
                                    </div>
                                    <button
                                        onClick={() => addToCart({ id: inst.id, type: 'SINGLE', name: inst.name, quantity: 1 })}
                                        className="w-full py-2 bg-slate-50 text-slate-700 font-medium rounded-lg hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition text-sm flex items-center justify-center gap-2"
                                    >
                                        <Plus size={16} /> Tambah
                                    </button>
                                </div>
                            ))
                        )}

                        {activeTab === 'SETS' && availableSets.length === 0 && <p className="col-span-2 text-center text-slate-400 py-8">Tidak ada data set.</p>}
                        {activeTab === 'INSTRUMENTS' && availableInstruments.length === 0 && <p className="col-span-2 text-center text-slate-400 py-8">Tidak ada data instrumen.</p>}
                    </div>
                </div>

                {/* Cart Section */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 sticky top-4 overflow-hidden">
                        <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-2">
                            <ShoppingCart className="text-slate-700" size={20} />
                            <h3 className="font-bold text-slate-800">Keranjang Request</h3>
                            <span className="ml-auto bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
                        </div>

                        <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                            {cart.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <ShoppingCart size={48} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">Belum ada item dipilih</p>
                                </div>
                            ) : (
                                cart.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center group">
                                        <div className="flex-1 overflow-hidden">
                                            <h4 className="font-medium text-sm text-slate-800 truncate">{item.name}</h4>
                                            <p className="text-[10px] bg-slate-100 text-slate-500 inline-block px-1.5 rounded">{item.type}</p>
                                        </div>
                                        <div className="flex items-center gap-2 ml-2">
                                            <button onClick={() => updateQty(item.id, -1)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><Minus size={14} /></button>
                                            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQty(item.id, 1)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><Plus size={14} /></button>
                                            <button onClick={() => removeFromCart(item.id)} className="p-1 text-red-400 hover:bg-red-50 rounded ml-1"><Archive size={14} /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50">
                            <button
                                disabled={cart.length === 0}
                                onClick={handleSubmit}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                            >
                                <Send size={18} /> Kirim Permintaan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
