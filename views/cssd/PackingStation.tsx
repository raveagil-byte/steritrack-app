import React, { useState, useMemo } from 'react';
import { Package, Plus, Trash2, Printer, Search, CheckCircle2 } from 'lucide-react';
import { Instrument, InstrumentSet, SterilePack } from '../../types';
import { ApiService } from '../../services/apiService';
import { useAppContext } from '../../context/AppContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import { ARView } from '../ar/ARView'; // Import AR View


export const PackingStation = () => {
    const { instruments, sets, units, currentUser } = useAppContext();
    const { showAlert } = useConfirmation();
    const [searchTerm, setSearchTerm] = useState('');
    const [packType, setPackType] = useState<'SINGLE_ITEMS' | 'SET' | 'MIXED'>('SINGLE_ITEMS');
    const [packName, setPackName] = useState('');
    const [isAutoNamed, setIsAutoNamed] = useState(true); // Track if auto-naming is active
    const [packItems, setPackItems] = useState<{ id: string, name: string, quantity: number, type: 'SINGLE' | 'SET' }[]>([]);
    const [targetUnitId, setTargetUnitId] = useState<string>(''); // For Tagging/Booking
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastPack, setLastPack] = useState<SterilePack | null>(null);
    const [showAR, setShowAR] = useState(false); // New AR State

    // AR Handler
    const handleARScan = (qrCode: string) => {
        // Find instrument with this QR
        const instrument = instruments.find(i => i.id === qrCode);
        if (instrument) {
            handleAddItem(instrument, 'SINGLE');
            // Sound effect could go here
        } else {
            showAlert({
                title: 'Data Not Found',
                message: `QR ${qrCode} not recognized in database`,
                type: 'warning'
            });
        }
    };


    // Filter available instruments (must have packingStock > 0)
    const availableInstruments = useMemo(() => {
        return instruments.filter(i =>
            i.packingStock > 0 &&
            i.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [instruments, searchTerm]);

    const availableSets = useMemo(() => {
        return sets.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sets, searchTerm]);

    // Auto-generate name based on contents
    React.useEffect(() => {
        if (!isAutoNamed) return; // Don't overwrite if manual

        if (packItems.length === 0) {
            setPackName('');
            return;
        }

        if (packType === 'SET' && packItems.length === 1) {
            // Single Set
            const set = packItems[0];
            const dateCode = new Date().toLocaleDateString('id-ID').replace(/\//g, '');
            const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            setPackName(`${set.name} [${dateCode} - ${randomSuffix}]`);
        } else if (packType === 'SINGLE_ITEMS' && packItems.length === 1) {
            // Single Instrument Type
            const item = packItems[0];
            setPackName(`${item.name} (${item.quantity} pcs)`);
        } else {
            // Mixed
            const mainItem = packItems[0];
            const count = packItems.length;
            setPackName(`Paket Campuran: ${mainItem.name} + ${count - 1} lainnya`);
        }
    }, [packItems, packType, isAutoNamed]);

    const handleAddItem = (item: Instrument | InstrumentSet, type: 'SINGLE' | 'SET') => {
        const existing = packItems.find(p => p.id === item.id && p.type === type);

        // Check stock availability for singles
        if (type === 'SINGLE') {
            const inst = item as Instrument;
            const currentQty = existing ? existing.quantity : 0;
            if (currentQty + 1 > inst.packingStock) {
                showAlert({
                    title: 'Stok Tidak Cukup',
                    message: `Stok packing tidak cukup untuk ${inst.name}`,
                    type: 'warning'
                });
                return;
            }
        }

        if (existing) {
            setPackItems(packItems.map(p =>
                p.id === item.id && p.type === type
                    ? { ...p, quantity: p.quantity + 1 }
                    : p
            ));
        } else {
            setPackItems([...packItems, {
                id: item.id,
                name: item.name,
                quantity: 1,
                type
            }]);
        }
    };

    const handleRemoveItem = (index: number) => {
        setPackItems(packItems.filter((_, i) => i !== index));
    };

    const handleCreatePack = async () => {
        if (packItems.length === 0) return;
        if (!packName) {
            showAlert({
                title: 'Nama Paket Kosong',
                message: 'Mohon isi nama paket/label',
                type: 'warning'
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Prepare payload
            const payload = {
                name: packName,
                type: packType,
                packedBy: currentUser?.name || 'CSSD Staff',
                targetUnitId: targetUnitId || null,
                items: packItems.map(p => ({
                    instrumentId: p.id,
                    type: p.type,
                    quantity: p.quantity
                }))
            };

            const res = await ApiService.createPack(payload);
            setLastPack({ ...res, items: payload.items } as any);

            // Reset form
            setPackItems([]);
            // setPackName(''); // Keep auto-name logic to reset
            setPackType('SINGLE_ITEMS');
            setTargetUnitId(''); // Reset tagging

            showAlert({
                title: 'Paket Berhasil Dibuat',
                message: 'Paket berhasil dibuat! Silakan tempel label QR.',
                type: 'success'
            });
        } catch (error) {
            console.error(error);
            showAlert({
                title: 'Gagal Membuat Paket',
                message: 'Gagal membuat paket. Coba lagi atau hubungi admin.',
                type: 'danger'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">
            {/* TOGGLE AR MODE */}
            <div className="flex justify-end">
                <button
                    onClick={() => setShowAR(!showAR)}
                    className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${showAR ? 'bg-cyan-900 text-cyan-400 border border-cyan-500 shadow-lg shadow-cyan-500/20' : 'bg-slate-800 text-slate-300'}`}
                >
                    {showAR ? '🔴 Close AR Vision' : '👁️ Open AR Vision Scanner'}
                </button>
            </div>

            {/* AR VIEW PANEL (CONDITIONAL) */}
            {showAR && (
                <div className="w-full animate-in slide-in-from-top-10 fade-in duration-300">
                    <ARView onScan={handleARScan} activeInstrument={null} />
                </div>
            )}

            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${showAR ? 'h-1/2' : 'h-full'}`}>

                {/* LEFT: Selection Area */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-bold text-lg mb-2">Pilih Item untuk Dipacking</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari instrumen atau set..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex gap-2 mt-3 text-sm">
                            <button
                                onClick={() => setPackType('SINGLE_ITEMS')}
                                className={`px-3 py-1.5 rounded-full ${packType === 'SINGLE_ITEMS' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}
                            >
                                Instrumen Satuan
                            </button>
                            <button
                                onClick={() => setPackType('SET')}
                                className={`px-3 py-1.5 rounded-full ${packType === 'SET' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}
                            >
                                Instrument Set
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {packType === 'SINGLE_ITEMS' ? (
                            availableInstruments.length === 0 ? (
                                <p className="text-center text-slate-400 mt-10">Tidak ada instrumen di area packing</p>
                            ) : (
                                availableInstruments.map(inst => (
                                    <div key={inst.id} onClick={() => handleAddItem(inst, 'SINGLE')} className="p-3 border border-slate-100 rounded-lg hover:bg-blue-50 cursor-pointer flex justify-between items-center group">
                                        <div>
                                            <div className="font-semibold text-slate-800">{inst.name}</div>
                                            <div className="text-xs text-slate-500">Stok Packing: {inst.packingStock}</div>
                                        </div>
                                        <Plus className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
                                    </div>
                                ))
                            )
                        ) : (
                            availableSets.map(set => (
                                <div key={set.id} onClick={() => handleAddItem(set, 'SET')} className="p-3 border border-slate-100 rounded-lg hover:bg-purple-50 cursor-pointer flex justify-between items-center group">
                                    <div>
                                        <div className="font-semibold text-slate-800">{set.name}</div>
                                        <div className="text-xs text-slate-500">{set.items.length} jenis items</div>
                                    </div>
                                    <Plus className="text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* RIGHT: Current Pack */}
                <div className="flex flex-col gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-indigo-50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Package className="text-indigo-600" />
                                <h3 className="font-bold text-lg text-indigo-900">Isi Paket Baru</h3>
                            </div>
                            <div className="text-sm font-bold text-indigo-600">
                                {packItems.reduce((a, b) => a + b.quantity, 0)} Items
                            </div>
                        </div>

                        {/* TAGGING / BOOKING SECTION */}
                        <div className="p-4 border-b border-slate-100 bg-yellow-50/50">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Booking Unit (Opsional)</label>
                            <select
                                value={targetUnitId}
                                onChange={(e) => setTargetUnitId(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            >
                                <option value="">-- Tidak Ada Tagging (Stok Buffer) --</option>
                                <optgroup label="Pilih Unit Tujuan:">
                                    {units.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>

                        <div className="p-4 border-b border-slate-100">
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase">Nama Paket / Label</label>
                                <button
                                    onClick={() => setIsAutoNamed(!isAutoNamed)}
                                    className={`text-xs px-2 py-0.5 rounded border ${isAutoNamed ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                                >
                                    {isAutoNamed ? 'Auto (ON)' : 'Manual'}
                                </button>
                            </div>
                            <input
                                type="text"
                                value={packName}
                                onChange={(e) => {
                                    setPackName(e.target.value);
                                    setIsAutoNamed(false);
                                }}
                                placeholder="Contoh: Set Jahit #10, Pouch Gunting Bedah"
                                className={`w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none font-bold ${isAutoNamed ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-white border-slate-300 focus:ring-indigo-500'}`}
                                readOnly={isAutoNamed}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {packItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl m-2">
                                    <Package size={48} className="mb-2 opacity-50" />
                                    <p>Belum ada item dipilih</p>
                                </div>
                            ) : (
                                packItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${item.type === 'SET' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {item.quantity}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">{item.name}</div>
                                                <div className="text-xs text-slate-500">{item.type}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600 p-2">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={handleCreatePack}
                                disabled={packItems.length === 0 || !packName || isSubmitting}
                                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Package size={20} />
                                {isSubmitting ? 'Membuat Paket...' : 'Buat & Cetak QR'}
                            </button>
                        </div>
                    </div>

                    {/* Last Created QR Preview */}
                    {lastPack && (
                        <div className="bg-white rounded-xl shadow-lg border-2 border-indigo-100 p-4 animate-in slide-in-from-bottom-4">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-green-600 flex items-center gap-2">
                                        <CheckCircle2 size={18} /> Paket Terbuat!
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1">ID: {lastPack.id}</p>
                                </div>
                                <button
                                    onClick={() => window.print()}
                                    className="text-slate-400 hover:text-blue-600 p-1 hover:bg-blue-50 rounded"
                                    title="Cetak Label"
                                >
                                    <Printer size={20} />
                                </button>
                            </div>
                            <div id="printable-label" className="bg-white p-4 border-2 border-black rounded-lg text-center font-mono relative overflow-hidden">
                                {lastPack.targetUnitId && (
                                    <div className="absolute top-0 right-0 bg-black text-white text-xs px-2 py-1 font-bold">
                                        Book: {lastPack.targetUnitId === 'u1' ? 'IGD' : lastPack.targetUnitId === 'u2' ? 'OK' : 'ICU'}
                                    </div>
                                )}
                                <div className="text-2xl font-bold mb-2 mt-2">{lastPack.qrCode}</div>
                                <div className="text-lg font-bold">{lastPack.name}</div>
                                <div className="text-sm mt-2 border-t border-black pt-1 flex justify-between">
                                    <span>{new Date(lastPack.createdAt).toLocaleDateString()} {new Date(lastPack.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span>{lastPack.packedBy}</span>
                                </div>
                                <div className="text-xs mt-1">EXP: {new Date(lastPack.expiresAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
