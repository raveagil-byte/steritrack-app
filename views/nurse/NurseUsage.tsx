import React, { useState, useMemo } from 'react';
import { Package, X, User, UserPlus, Stethoscope, Plus, Save, ScanLine, Loader, Search } from 'lucide-react';
import { Instrument, InstrumentSet } from '../../types';
import { toast } from 'sonner';
import { useAppContext } from '../../context/AppContext';
import { ApiService } from '../../services/apiService';
import QRScanner from '../../components/QRScanner';

interface NurseUsageProps {
    unitId: string;
}

interface UsageItem {
    id: string; // Instrument ID or Set ID
    name: string;
    type: 'SINGLE' | 'SET';
    quantity: number;
}

export const NurseUsage: React.FC<NurseUsageProps> = ({ unitId }) => {
    const { instruments, sets, currentUser } = useAppContext();
    const [patientId, setPatientId] = useState('');
    const [patientName, setPatientName] = useState('');
    const [doctorName, setDoctorName] = useState('');
    const [procedureId, setProcedureId] = useState('');
    const [items, setItems] = useState<UsageItem[]>([]);

    // UI State
    const [showScanner, setShowScanner] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showItemSelector, setShowItemSelector] = useState(false);

    // Filter available items (only showing items that have stock in this unit ideally, 
    // but for usage logging we might want to allow selection even if stock is technically 0 in system due to sync lag)
    // However, best UX is to show what's available.

    const availableItems = useMemo(() => {
        const unitInstruments = instruments
            .filter((i: Instrument) => (i.unitStock?.[unitId] || 0) > 0)
            .map((i: Instrument) => ({ ...i, type: 'SINGLE' }));

        // For sets, we don't track unit stock of sets explicitly in the `sets` array usually (it's composed of instruments).
        // But if we did, we'd filter here. 
        // For now, let's assume sets are always visible or "virtual"
        // Actually, if we want to be strict, we should check if the unit has the components.
        // But for simplicity of "Usage Logging", let's list all Sets as theoretical options.
        const allSets = sets.map((s: InstrumentSet) => ({ ...s, type: 'SET' }));

        return [...unitInstruments, ...allSets].filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [instruments, sets, unitId, searchTerm]);

    const handleScan = (code: string) => {
        // Try to find instrument or set by ID or QR
        // Simple heuristic: check if code matches an ID
        const foundSet = sets.find(s => s.id === code);
        if (foundSet) {
            addItem(foundSet.id, foundSet.name, 'SET');
            setShowScanner(false);
            toast.success(`Set ${foundSet.name} ditambahkan`);
            return;
        }

        const foundInst = instruments.find(i => i.id === code);
        if (foundInst) {
            addItem(foundInst.id, foundInst.name, 'SINGLE');
            setShowScanner(false);
            toast.success(`Instrumen ${foundInst.name} ditambahkan`);
            return;
        }

        toast.error('Item tidak ditemukan: ' + code);
    }

    const addItem = (id: string, name: string, type: 'SINGLE' | 'SET') => {
        setItems(prev => {
            const exists = prev.find(p => p.id === id);
            if (exists) {
                return prev.map(p => p.id === id ? { ...p, quantity: p.quantity + 1 } : p);
            }
            return [...prev, { id, name, type, quantity: 1 }];
        });
    }

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(p => p.id !== id));
    }

    const updateQuantity = (id: string, delta: number) => {
        setItems(prev => prev.map(p => {
            if (p.id === id) {
                const newQty = Math.max(1, p.quantity + delta);
                return { ...p, quantity: newQty };
            }
            return p;
        }));
    }

    const handleSubmit = async () => {
        if (!patientId.trim()) {
            toast.error('Mohon isi ID Pasien / No. RM');
            return;
        }
        if (items.length === 0) {
            toast.error('Belum ada instrument/set yang dipilih');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                unitId,
                patientId,
                patientName,
                doctorName,
                procedureId,
                items,
                notes: `Logged by ${currentUser?.name}`
            };

            await ApiService.logUsage(payload);
            toast.success('Pemakaian berhasil dicatat!');

            // Reset form
            setPatientId('');
            setPatientName('');
            setDoctorName('');
            setProcedureId('');
            setItems([]);
        } catch (error) {
            toast.error('Gagal menyimpan data pemakaian');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    }

    if (showScanner) {
        return <QRScanner title="Scan Barcode Set/Instrumen" onScan={handleScan} onClose={() => setShowScanner(false)} />
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                        <Stethoscope size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Catat Pemakaian (Usage)</h2>
                        <p className="text-emerald-50">Link to Patient - Traceability System</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Patient Info */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <User size={18} className="text-emerald-600" />
                            Data Pasien
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">No. RM (Patient ID) *</label>
                                <input
                                    type="text"
                                    value={patientId}
                                    onChange={e => setPatientId(e.target.value)}
                                    placeholder="Contoh: 889900"
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Pasien</label>
                                <input
                                    type="text"
                                    value={patientName}
                                    onChange={e => setPatientName(e.target.value)}
                                    placeholder="Nama Lengkap"
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dokter Bedah</label>
                                <div className="relative">
                                    <UserPlus className="absolute left-3 top-3 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        value={doctorName}
                                        onChange={e => setDoctorName(e.target.value)}
                                        placeholder="dr. Sp.B..."
                                        className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID Operasi (Opsional)</label>
                                <input
                                    type="text"
                                    value={procedureId}
                                    onChange={e => setProcedureId(e.target.value)}
                                    placeholder="OP-2024-..."
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Items */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 min-h-[400px] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Package size={18} className="text-emerald-600" />
                                Item yang Dipakai
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowScanner(true)}
                                    className="px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-slate-700 transition"
                                >
                                    <ScanLine size={16} />
                                    Scan QR
                                </button>
                                <button
                                    onClick={() => setShowItemSelector(!showItemSelector)}
                                    className="px-3 py-2 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-emerald-200 transition"
                                >
                                    <Plus size={16} />
                                    Tambah Manual
                                </button>
                            </div>
                        </div>

                        {/* Item Selector Dropdown Area */}
                        {showItemSelector && (
                            <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Cari instrumen atau set..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                    {availableItems.length === 0 && <p className="text-center text-slate-400 text-xs py-2">Tidak ada item ditemukan.</p>}
                                    {availableItems.map((item: any) => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                addItem(item.id, item.name, item.type);
                                                setShowItemSelector(false);
                                                setSearchTerm('');
                                            }}
                                            className="w-full text-left px-3 py-2 bg-white hover:bg-emerald-50 rounded-lg text-sm border border-slate-100 flex justify-between items-center group"
                                        >
                                            <span className="font-medium text-slate-700">{item.name}</span>
                                            <span className="text-xs text-slate-400 uppercase group-hover:text-emerald-600">{item.type}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Selected Items List */}
                        <div className="flex-1 space-y-2">
                            {items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-xl p-8">
                                    <Package size={48} className="mb-2 opacity-50" />
                                    <p className="text-sm">Belum ada item discan/dipilih</p>
                                </div>
                            ) : (
                                items.map((item, idx) => (
                                    <div key={`${item.id}-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${item.type === 'SET' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {item.type}
                                                </span>
                                                <span className="font-bold text-slate-700">{item.name}</span>
                                            </div>
                                            <div className="text-xs text-slate-400 font-mono mt-0.5 ml-1">{item.id}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
                                                <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 rounded text-slate-600 font-bold">-</button>
                                                <span className="w-8 text-center text-sm font-bold text-slate-800">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 rounded text-slate-600 font-bold">+</button>
                                            </div>
                                            <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || items.length === 0 || !patientId}
                                className="px-6 py-3 bg-emerald-600 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 disabled:shadow-none hover:bg-emerald-700 transition flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <><Loader className="animate-spin" size={20} /> Menyimpan...</>
                                ) : (
                                    <><Save size={20} /> Simpan Pemakaian</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
