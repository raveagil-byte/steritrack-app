import React, { useState, useMemo } from 'react';
import { Package, Droplets, Flame, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Instrument } from '../../types';
import { toast } from 'sonner';
import { LabelPrinter } from '../../components/LabelPrinter';

export const SterilizationView = () => {
    const { instruments, washItems, sterilizeItems } = useAppContext();
    const [step, setStep] = useState<'DECONTAMINATION' | 'STERILIZATION'>('DECONTAMINATION');
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [machine, setMachine] = useState<string>('Autoclave 1');
    const [cycleStatus, setCycleStatus] = useState<'SUCCESS' | 'FAILED'>('SUCCESS');
    const [generatedLabels, setGeneratedLabels] = useState<any[]>([]);

    // Filter instruments based on step
    const availableItems = useMemo(() => {
        return instruments.filter(i => {
            if (step === 'DECONTAMINATION') return i.dirtyStock > 0;
            if (step === 'STERILIZATION') return i.packingStock > 0;
            return false;
        });
    }, [instruments, step]);

    const handleQuantityChange = (id: string, delta: number, max: number) => {
        setSelectedItems(prev => {
            const current = prev[id] || 0;
            const next = Math.max(0, Math.min(max, current + delta));
            if (next === 0) {
                const { [id]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [id]: next };
        });
    };

    const handleSelectAll = () => {
        const all: Record<string, number> = {};
        availableItems.forEach(i => {
            const max = step === 'DECONTAMINATION' ? i.dirtyStock : i.packingStock;
            all[i.id] = max;
        });
        setSelectedItems(all);
    };

    const handleClearSelection = () => {
        setSelectedItems({});
    };

    const handleSubmit = async () => {
        const itemsToProcess = Object.entries(selectedItems).map(([instrumentId, quantity]) => ({
            instrumentId,
            quantity
        }));

        if (itemsToProcess.length === 0) {
            toast.error("Pilih item terlebih dahulu");
            return;
        }

        setIsProcessing(true);
        try {
            if (step === 'DECONTAMINATION') {
                await washItems(itemsToProcess);
                toast.success(`${itemsToProcess.length} jenis item dicuci & dikemas.`);
            } else {
                const res: any = await sterilizeItems(itemsToProcess, machine, cycleStatus);
                if (cycleStatus === 'SUCCESS') {
                    // Generate label data for printing
                    const labelsRequest = itemsToProcess.flatMap(item => {
                        const inst = instruments.find(i => i.id === item.instrumentId);
                        return Array(item.quantity).fill(null).map((_, i) => ({
                            id: `${res.batchId}-${item.instrumentId}-${i}`,
                            itemName: inst?.name || 'Unknown Item',
                            batchId: res.batchId,
                            sterilDate: Date.now(),
                            expireDate: res.expiryDate,
                            operator: 'CSSD Staff'
                        }));
                    });

                    setGeneratedLabels(labelsRequest);

                    toast.success(`Sterilisasi Selesai!`, {
                        description: `Batch ID: ${res.batchId}. Label siap dicetak.`,
                        action: {
                            label: 'Cetak Label',
                            onClick: () => { } // Handled by state
                        }
                    });
                } else {
                    toast.warning(`Siklus Gagal. Item dikembalikan ke status Kotor.`);
                }
            }
            setSelectedItems({});
        } catch (error) {
            console.error(error);
            toast.error("Gagal memproses item.");
        } finally {
            setIsProcessing(false);
        }
    };

    const totalSelected = Object.values(selectedItems).reduce((a, b) => a + b, 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Stepper */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Siklus Sterilisasi</h2>
                    <p className="text-slate-500 text-sm">Proses instrumen dari kotor kembali menjadi steril</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => { setStep('DECONTAMINATION'); setSelectedItems({}); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${step === 'DECONTAMINATION' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Droplets size={16} /> Dekontaminasi
                    </button>
                    <button
                        onClick={() => { setStep('STERILIZATION'); setSelectedItems({}); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${step === 'STERILIZATION' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Flame size={16} /> Cloud Sterilisasi
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Item List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="font-bold text-slate-700 uppercase tracking-wider text-sm">
                            {step === 'DECONTAMINATION' ? 'Daftar Item Kotor (Dirty Stock)' : 'Siap Steril (Packing Stock)'}
                        </h3>
                        <div className="space-x-2">
                            <button onClick={handleSelectAll} className="text-xs font-bold text-blue-600 hover:text-blue-700">Pilih Semua</button>
                            <span className="text-slate-300">|</span>
                            <button onClick={handleClearSelection} className="text-xs font-bold text-slate-400 hover:text-slate-600">Reset</button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden min-h-[400px]">
                        {availableItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 text-center p-8">
                                <Package size={48} className="mb-4 opacity-20" />
                                <p className="font-medium">Tidak ada item yang perlu diproses di tahap ini.</p>
                                {step === 'DECONTAMINATION' && <p className="text-xs mt-2">Pastikan sudah melakukan "Ambil Kotor" dari unit.</p>}
                                {step === 'STERILIZATION' && <p className="text-xs mt-2">Selesaikan tahap Dekontaminasi & Packing terlebih dahulu.</p>}
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {availableItems.map((inst) => {
                                    const stock = step === 'DECONTAMINATION' ? inst.dirtyStock : inst.packingStock;
                                    const selected = selectedItems[inst.id] || 0;

                                    return (
                                        <div key={inst.id} className={`p-4 transition-colors ${selected > 0 ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{inst.name}</h4>
                                                    <p className="text-xs text-slate-500">{inst.category} • Tersedia: {stock}</p>
                                                </div>
                                                <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                                                    <button
                                                        onClick={() => handleQuantityChange(inst.id, -1, stock)}
                                                        disabled={selected === 0}
                                                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-30"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-8 text-center font-bold text-lg">{selected}</span>
                                                    <button
                                                        onClick={() => handleQuantityChange(inst.id, 1, stock)}
                                                        disabled={selected >= stock}
                                                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-30"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Summary & Action */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 sticky top-6">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${step === 'DECONTAMINATION' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                            {step === 'DECONTAMINATION' ? <Droplets size={24} /> : <Flame size={24} />}
                        </div>

                        <h3 className="text-xl font-bold text-slate-800 mb-1">
                            {step === 'DECONTAMINATION' ? 'Proses Cuci & Packing' : 'Mulai Sterilisasi'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                            {step === 'DECONTAMINATION'
                                ? 'Pindahkan item kotor ke area packing setelah dicuci.'
                                : 'Masukkan item packed ke autoclave untuk sterilisasi.'}
                        </p>

                        <div className="bg-slate-50 p-4 rounded-xl mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-600 text-sm">Total Item Dipilih:</span>
                                <span className="font-bold text-lg">{totalSelected}</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${step === 'DECONTAMINATION' ? 'bg-blue-500' : 'bg-orange-500'}`}
                                    style={{ width: totalSelected > 0 ? '100%' : '0%' }}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={totalSelected === 0 || isProcessing}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                                ${step === 'DECONTAMINATION'
                                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                                    : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-orange-200'
                                }`}
                        >
                            {isProcessing ? (
                                <RotateCcw className="animate-spin" />
                            ) : (
                                <>
                                    {step === 'DECONTAMINATION' ? 'Proses Cuci' : 'Mulai Autoclave'} <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            {generatedLabels.length > 0 && (
                <LabelPrinter
                    labels={generatedLabels}
                    onClose={() => setGeneratedLabels([])}
                />
            )}
        </div>
    );
};
