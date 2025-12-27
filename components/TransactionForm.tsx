import React, { useState, useMemo } from 'react';
import { Instrument, InstrumentSet, TransactionItem, TransactionSetItem, TransactionType, Unit } from '../types';
import { useAppContext } from '../context/AppContext';
import QRScanner from './QRScanner';
import { Minus, Plus, QrCode, X, Package, Layers, Clock } from 'lucide-react';
import { ApiService } from '../services/apiService';
import { toast } from 'sonner';

const BTN_PRIMARY_CLASSES = "bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2";

interface TransactionFormProps {
    unit: Unit;
    type: TransactionType;
    onSubmit: (items: TransactionItem[], setItems: TransactionSetItem[], packIds?: string[], expectedReturnDate?: number | null) => void;
    onCancel: () => void;
}

const TransactionForm = ({ unit, type, onSubmit, onCancel }: TransactionFormProps) => {
    const { instruments, sets, units } = useAppContext();
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [selectedSets, setSelectedSets] = useState<Record<string, number>>({});
    const [discrepancies, setDiscrepancies] = useState<Record<string, { broken: number; missing: number }>>({});
    const [setItemsDiscrepancies, setSetItemsDiscrepancies] = useState<Record<string, { broken: number; missing: number }>>({});
    const [serialNumbers, setSerialNumbers] = useState<Record<string, string[]>>({}); // instrumentId -> [sn1, sn2]

    // NEW: Asset ID Tracking
    const [selectedAssets, setSelectedAssets] = useState<Record<string, string[]>>({}); // instrumentId -> [assetId1, assetId2]
    const [assetMap, setAssetMap] = useState<Record<string, any[]>>({}); // Cache of assets per instrument

    const [scannedPackIds, setScannedPackIds] = useState<string[]>([]); // Track distinct packs scanned

    // UI States for replacing native dialogs
    const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void; onCancel: () => void } | null>(null);
    const [inputModal, setInputModal] = useState<{ title: string; message?: string; value: string; onConfirm: (val: string) => void; onCancel: () => void } | null>(null);

    const [isScanning, setIsScanning] = useState(false);

    const [viewMode, setViewMode] = useState<'SINGLE' | 'SET'>('SINGLE');

    // Available individual instruments
    const availableInstruments = useMemo(() => {
        return instruments.filter((inst: Instrument) => {
            if (!inst.is_active) return false;
            // Removed tight strict check for 0 stock, we might want to see them but disabled
            return true;
        }).filter((inst: Instrument) => {
            if (type === TransactionType.DISTRIBUTE) {
                return inst.cssdStock >= 0; // Show even if 0
            } else {
                return (inst.unitStock[unit.id] || 0) >= 0;
            }
        });
    }, [instruments, type, unit.id]);

    // Available sets (all items must be available)
    const availableSets = useMemo(() => {
        return sets.filter((set: InstrumentSet) => {
            if (!set.is_active) return false;

            // Check if all items in set are available
            return set.items.every(setItem => {
                const inst = instruments.find(i => i.id === setItem.instrumentId);
                if (!inst || !inst.is_active) return false;

                // We just return true to list them, validation happens on quantity add
                return true;
            });
        });
    }, [sets, instruments]);

    const fetchAssetsIfNeeded = async (instrumentId: string) => {
        if (!assetMap[instrumentId]) {
            try {
                const assets = await ApiService.getAssetsByInstrument(instrumentId);
                setAssetMap(prev => ({ ...prev, [instrumentId]: assets }));
                return assets;
            } catch (e) {
                console.error(e);
                toast.error("Gagal memuat data asset");
                return [];
            }
        }
        return assetMap[instrumentId];
    };

    const addSerialNumber = async (instrumentId: string, sn: string, max: number) => {
        if (!sn.trim()) return;

        // 1. Fetch real assets
        const assets = await fetchAssetsIfNeeded(instrumentId);

        // 2. Find asset by SN
        // Case insensitive? Ideally sensitive.
        const asset = assets.find((a: any) => a.serialNumber === sn);

        if (!asset) {
            toast.error(`Serial Number "${sn}" tidak ditemukan di database.`);
            return;
        }

        // 3. Optional: Check status
        if (type === TransactionType.DISTRIBUTE && asset.status !== 'READY') {
            toast.warning(`Asset "${sn}" statusnya ${asset.status}, bukan READY.`);
            // Allow proceed? Maybe block strictly? 
            // return; 
        }

        setSerialNumbers(prev => {
            const currentList = prev[instrumentId] || [];
            if (currentList.includes(sn)) {
                toast.warning("Serial Number sudah ada dalam daftar ini.");
                return prev;
            }
            if (currentList.length >= max) {
                toast.warning("Jumlah melebihi stok tersedia.");
                return prev;
            }

            // Store ID
            setSelectedAssets(prevAssets => {
                const currentIds = prevAssets[instrumentId] || [];
                return { ...prevAssets, [instrumentId]: [...currentIds, asset.id] };
            });

            const newList = [...currentList, sn];
            // Sync quantity
            setQuantities(q => ({ ...q, [instrumentId]: newList.length }));
            return { ...prev, [instrumentId]: newList };
        });
    };

    const removeSerialNumber = (instrumentId: string, snToRemove: string) => {
        setSerialNumbers(prev => {
            const currentList = prev[instrumentId] || [];
            // Remove from list
            const newList = currentList.filter(sn => sn !== snToRemove);

            // Remove ID too
            // Optimally we assume the asset exists in assetMap because we fetched it to add it
            const assets = assetMap[instrumentId] || [];
            const assetToRemove = assets.find((a: any) => a.serialNumber === snToRemove);

            if (assetToRemove) {
                setSelectedAssets(prevAssets => {
                    const currentIds = prevAssets[instrumentId] || [];
                    const newIds = currentIds.filter(id => id !== assetToRemove.id);
                    return { ...prevAssets, [instrumentId]: newIds };
                });
            }

            // Sync quantity
            setQuantities(q => ({ ...q, [instrumentId]: newList.length }));
            return { ...prev, [instrumentId]: newList };
        });
    };

    const updateQuantity = (id: string, delta: number, field: 'ok' | 'broken' | 'missing', max: number) => {
        // Prevent manual quantity update for serialized items (except implied by SN addition)
        const inst = instruments.find(i => i.id === id);
        if (inst?.is_serialized && field === 'ok') {
            return; // Managed by addSerialNumber/removeSerialNumber
        }

        if (field === 'ok') {
            setQuantities(prev => {
                const current = prev[id] || 0;
                // Check total constraint
                const currentBroken = discrepancies[id]?.broken || 0;
                const currentMissing = discrepancies[id]?.missing || 0;
                const total = current + currentBroken + currentMissing;

                if (delta > 0 && total >= max) return prev; // Cannot exceed max

                const next = Math.max(0, current + delta);
                if (next === 0) {
                    const { [id]: _, ...rest } = prev;
                    return rest;
                }
                return { ...prev, [id]: next };
            });
        } else {
            setDiscrepancies(prev => {
                const current = prev[id] || { broken: 0, missing: 0 };
                const val = current[field];

                // Check total constraint
                const currentOk = quantities[id] || 0;
                const actualTotal = currentOk + (discrepancies[id]?.broken || 0) + (discrepancies[id]?.missing || 0);

                if (delta > 0 && actualTotal >= max) return prev;

                const nextVal = Math.max(0, val + delta);
                const nextState = { ...current, [field]: nextVal };

                if (nextState.broken === 0 && nextState.missing === 0) {
                    const { [id]: _, ...rest } = prev;
                    return rest;
                }
                return { ...prev, [id]: nextState };
            });
        }
    };

    const handleScan = async (code: string) => {
        // 1. Check if it's a PACK
        if (code.startsWith('PCK-')) {
            try {
                const pack = await ApiService.getPack(code);
                if (pack && pack.items) {
                    // Prevent duplicate scan of same pack (physical impossibility)
                    if (scannedPackIds.includes(pack.id)) {
                        toast.warning(`Paket ${pack.id} sudah ditambahkan dalam transaksi ini.`);
                        return;
                    }

                    const processPackAddition = () => {
                        let addedCount = 0;
                        pack.items.forEach((pItem: any) => {
                            const inst = instruments.find(i => i.id === pItem.instrumentId);
                            if (inst) {
                                const max = type === TransactionType.DISTRIBUTE ? inst.cssdStock : (inst.unitStock[unit.id] || 0);
                                const current = quantities[inst.id] || 0;
                                if (current + pItem.quantity <= max) {
                                    updateQuantity(inst.id, pItem.quantity, 'ok', max);
                                    addedCount++;
                                }
                            }
                        });
                        if (addedCount > 0) {
                            setScannedPackIds(prev => [...prev, pack.id]);
                            toast.success(`Paket "${pack.name}" ditambahkan (${addedCount} jenis items).`);
                            setIsScanning(false);
                            return;
                        }
                    };

                    // UNIT TARGET CHECK (New!)
                    if (pack.targetUnitId && type === TransactionType.DISTRIBUTE) {
                        if (pack.targetUnitId !== unit.id) {
                            const targetUnit = units.find(u => u.id === pack.targetUnitId);
                            const targetName = targetUnit ? targetUnit.name : 'Unit Lain';

                            setConfirmModal({
                                title: "⚠️ SALAH TUJUAN UNIT?",
                                message: `Paket ini ditandai (Booking) untuk unit: "${targetName}".\nSedangkan Anda sedang distribusi ke unit: "${unit.name}".\n\nApakah Anda yakin ingin memberikan paket ini ke ${unit.name}?`,
                                onConfirm: () => {
                                    setConfirmModal(null);
                                    checkFifoAndProcess(pack, processPackAddition);
                                },
                                onCancel: () => {
                                    setConfirmModal(null);
                                    setIsScanning(false);
                                }
                            });
                            return; // Wait for user interaction
                        }
                    }

                    checkFifoAndProcess(pack, processPackAddition);
                    return;
                }
            } catch (e) {
                console.error(e);
            }
        }

        const inst = instruments.find((i: Instrument) => i.id === code);
        if (inst) {
            const max = type === TransactionType.DISTRIBUTE ? inst.cssdStock : (inst.unitStock[unit.id] || 0);
            if (max <= 0) {
                toast.error(type === TransactionType.DISTRIBUTE ? "Item habis di CSSD" : "Item tidak ditemukan di unit ini");
                return;
            }

            if (inst.is_serialized) {
                setInputModal({
                    title: `Input Serial Number`,
                    message: `Masukkan Serial Number untuk ${inst.name}:`,
                    value: '',
                    onConfirm: (sn) => {
                        addSerialNumber(inst.id, sn, max);
                        setInputModal(null);
                        setIsScanning(false);
                    },
                    onCancel: () => {
                        setInputModal(null);
                    }
                });
            } else {
                updateQuantity(inst.id, 1, 'ok', max);
                setIsScanning(false);
            }
        } else {
            // Keep existing alert only if not PCK (which we handled or failed silently above, maybe show alert if pack fail too?)
            if (!code.startsWith('PCK-')) {
                toast.error(`QR Instrumen Tidak Dikenal: ${code}`);
                setIsScanning(false);
            } else {
                toast.error(`QR Paket Tidak Dikenal atau Gagal Memuat: ${code}`);
                setIsScanning(false);
            }
        }
    };

    const checkFifoAndProcess = (pack: any, callback: () => void) => {
        // FIFO CHECK
        if (pack.fifoWarning && pack.fifoWarning.hasOlder) {
            const olderDate = new Date(pack.fifoWarning.olderPack.createdAt).toLocaleDateString();
            setConfirmModal({
                title: "⚠️ PERINGATAN FIFO",
                message: `Ada stok paket yang lebih lama ("${pack.fifoWarning.olderPack.name}") dari tanggal ${olderDate}.\nID: ${pack.fifoWarning.olderPack.id}\n\nDisarankan menggunakan stok lama terlebih dahulu (First-In First-Out).\nApakah Anda yakin ingin tetap menggunakan paket ini?`,
                onConfirm: () => {
                    setConfirmModal(null);
                    callback();
                },
                onCancel: () => {
                    setConfirmModal(null);
                    setIsScanning(false);
                }
            });
        } else {
            callback();
        }
    };

    // Helper for Sets discrepancies
    const updateSetQuantity = (setId: string, delta: number, field: 'ok' | 'broken' | 'missing', max: number) => {
        if (field === 'ok') {
            setSelectedSets(prev => {
                const current = prev[setId] || 0;
                const currentBroken = setItemsDiscrepancies[setId]?.broken || 0;
                const currentMissing = setItemsDiscrepancies[setId]?.missing || 0;
                const total = current + currentBroken + currentMissing;

                if (delta > 0 && total >= max) return prev;

                const next = Math.max(0, current + delta);
                if (next === 0) {
                    const { [setId]: _, ...rest } = prev;
                    return rest;
                }
                return { ...prev, [setId]: next };
            });
        } else {
            setSetItemsDiscrepancies(prev => {
                const current = prev[setId] || { broken: 0, missing: 0 };
                const val = current[field];

                const currentOk = selectedSets[setId] || 0;
                const actualTotal = currentOk + (setItemsDiscrepancies[setId]?.broken || 0) + (setItemsDiscrepancies[setId]?.missing || 0);

                if (delta > 0 && actualTotal >= max) return prev;

                const nextVal = Math.max(0, val + delta);
                const nextState = { ...current, [field]: nextVal };

                if (nextState.broken === 0 && nextState.missing === 0) {
                    const { [setId]: _, ...rest } = prev;
                    return rest;
                }
                return { ...prev, [setId]: nextState };
            });
        }
    };


    const [returnDuration, setReturnDuration] = useState(1); // Default 1 day

    const handleSubmit = () => {
        // Prepare individual items
        const items: TransactionItem[] = [];
        // Combine all items that have any quantity (ok, broken, or missing)
        const allItemIds = new Set([...Object.keys(quantities), ...Object.keys(discrepancies)]);

        allItemIds.forEach(id => {
            const count = quantities[id] || 0;
            const broken = discrepancies[id]?.broken || 0;
            const missing = discrepancies[id]?.missing || 0;

            if (count + broken + missing > 0) {
                items.push({
                    instrumentId: id,
                    count, // This is OK count
                    itemType: 'SINGLE',
                    brokenCount: broken,
                    missingCount: missing,
                    serialNumbers: serialNumbers[id] || [],
                    assetIds: selectedAssets[id] || [] // Submit UUIDs
                });
            }
        });

        // Prepare set items
        const setItems: TransactionSetItem[] = [];
        const allSetIds = new Set([...Object.keys(selectedSets), ...Object.keys(setItemsDiscrepancies)]);

        allSetIds.forEach(id => {
            const quantity = selectedSets[id] || 0;
            const broken = setItemsDiscrepancies[id]?.broken || 0;
            const missing = setItemsDiscrepancies[id]?.missing || 0;

            if (quantity + broken + missing > 0) {
                setItems.push({
                    setId: id,
                    quantity, // OK count
                    brokenCount: broken,
                    missingCount: missing
                });
            }
        });

        // Calculate expected return date
        let expectedReturnDate = null;
        if (type === TransactionType.DISTRIBUTE) {
            const now = new Date();
            expectedReturnDate = now.setDate(now.getDate() + returnDuration);
        }

        onSubmit(items, setItems, scannedPackIds, expectedReturnDate);
    };

    const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0) +
        Object.values(discrepancies).reduce((a, b) => a + b.broken + b.missing, 0) +
        Object.values(selectedSets).reduce((a, b) => a + b, 0) +
        Object.values(setDiscrepancies).reduce((a, b) => a + b.broken + b.missing, 0);


    return (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-6rem)] md:h-auto">
            {isScanning && (
                <QRScanner
                    title="Scan Instrumen"
                    onScan={handleScan}
                    onClose={() => setIsScanning(false)}
                />
            )}

            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0 z-10">
                <div>
                    <h3 className="font-bold text-lg">{type === TransactionType.DISTRIBUTE ? 'Kirim Item Steril' : 'Ambil Item Kotor'}</h3>
                    <p className="text-sm text-slate-500">Target: <span className="font-medium text-slate-900">{unit.name}</span></p>
                </div>
                <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>

            {/* Return Date Selector for Distribution */}
            {type === TransactionType.DISTRIBUTE && (
                <div className="p-4 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-orange-800">
                        <Clock size={18} />
                        <span className="font-semibold text-sm">Batas Waktu Kembali:</span>
                    </div>
                    <select
                        value={returnDuration}
                        onChange={(e) => setReturnDuration(Number(e.target.value))}
                        className="bg-white border border-orange-200 text-orange-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block p-2 font-bold"
                    >
                        <option value={1}>1 Hari (Besok)</option>
                        <option value={2}>2 Hari</option>
                        <option value={3}>3 Hari</option>
                        <option value={7}>1 Minggu</option>
                    </select>
                </div>
            )}

            {/* Scan Button */}
            <div className="p-4 bg-white border-b border-slate-100">
                <button
                    onClick={() => setIsScanning(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition border border-blue-100"
                >
                    <QrCode size={20} />
                    Scan QR Astrumen
                </button>
            </div>

            {/* Toggle View Mode */}
            <div className="p-4 bg-white border-b border-slate-100">
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('SINGLE')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${viewMode === 'SINGLE'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        <Package size={18} />
                        Item Satuan
                    </button>
                    <button
                        onClick={() => setViewMode('SET')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${viewMode === 'SET'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        <Layers size={18} />
                        Set Instrumen
                    </button>
                </div>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {viewMode === 'SINGLE' ? (
                    // SINGLE INSTRUMENTS VIEW
                    availableInstruments.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <Package className="mx-auto mb-2 text-slate-300" size={32} />
                            <p>Tidak ada item satuan tersedia.</p>
                        </div>
                    ) : (
                        availableInstruments.map((inst: Instrument) => {
                            const max = type === TransactionType.DISTRIBUTE ? inst.cssdStock : (inst.unitStock[unit.id] || 0);
                            const current = quantities[inst.id] || 0;
                            return (
                                <div key={inst.id} className={`p-4 rounded-xl border transition-all ${current > 0 || (discrepancies[inst.id]?.broken || 0) > 0 || (discrepancies[inst.id]?.missing || 0) > 0 ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-300'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-slate-800">{inst.name}</h4>
                                            <p className="text-xs text-slate-500">Tersedia: {max}</p>
                                        </div>
                                        {/* Standard / OK Counter */}
                                        <div className="flex items-center gap-3">
                                            {inst.is_serialized ? (
                                                <div className="flex flex-col items-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setInputModal({
                                                                title: "Input Serial Number",
                                                                message: "Masukkan/Scan Serial Number:",
                                                                value: "",
                                                                onConfirm: (sn) => {
                                                                    addSerialNumber(inst.id, sn, max);
                                                                    setInputModal(null);
                                                                },
                                                                onCancel: () => setInputModal(null)
                                                            });
                                                        }}
                                                        className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                                                        disabled={current >= max}
                                                    >
                                                        + Add Asset
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-xs text-slate-400 font-bold uppercase mr-2">{type === TransactionType.COLLECT ? 'Baik' : 'Jml'}</span>
                                                    <button
                                                        onClick={() => updateQuantity(inst.id, -1, 'ok', max)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95 disabled:opacity-50"
                                                        disabled={current === 0}
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <span className="w-8 text-center font-bold text-lg">{current}</span>
                                                    <button
                                                        onClick={() => updateQuantity(inst.id, 1, 'ok', max)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                                                        disabled={current + (discrepancies[inst.id]?.broken || 0) + (discrepancies[inst.id]?.missing || 0) >= max}
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Serial Number List */}
                                    {inst.is_serialized && (serialNumbers[inst.id]?.length || 0) > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2 p-2 bg-slate-50 rounded-lg">
                                            {serialNumbers[inst.id].map(sn => (
                                                <span key={sn} className="bg-white border border-indigo-200 text-indigo-700 px-2 py-1 rounded text-xs font-mono flex items-center gap-1">
                                                    {sn}
                                                    <button onClick={() => removeSerialNumber(inst.id, sn)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Discrepancy Inputs for COLLECT */}
                                    {type === TransactionType.COLLECT && (
                                        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-blue-100">
                                            <div className="flex items-center justify-between bg-white/50 p-2 rounded-lg">
                                                <span className="text-xs font-bold text-orange-600">Rusak</span>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => updateQuantity(inst.id, -1, 'broken', max)} disabled={(discrepancies[inst.id]?.broken || 0) === 0} className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 disabled:opacity-50"><Minus size={12} /></button>
                                                    <span className="w-4 text-center text-sm font-bold">{discrepancies[inst.id]?.broken || 0}</span>
                                                    <button onClick={() => updateQuantity(inst.id, 1, 'broken', max)} disabled={current + (discrepancies[inst.id]?.broken || 0) + (discrepancies[inst.id]?.missing || 0) >= max} className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 disabled:opacity-50"><Plus size={12} /></button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between bg-white/50 p-2 rounded-lg">
                                                <span className="text-xs font-bold text-red-600">Hilang</span>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => updateQuantity(inst.id, -1, 'missing', max)} disabled={(discrepancies[inst.id]?.missing || 0) === 0} className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 disabled:opacity-50"><Minus size={12} /></button>
                                                    <span className="w-4 text-center text-sm font-bold">{discrepancies[inst.id]?.missing || 0}</span>
                                                    <button onClick={() => updateQuantity(inst.id, 1, 'missing', max)} disabled={current + (discrepancies[inst.id]?.broken || 0) + (discrepancies[inst.id]?.missing || 0) >= max} className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 disabled:opacity-50"><Plus size={12} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                            );
                        })
                    )
                ) : (
                    // SETS VIEW
                    availableSets.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <Layers className="mx-auto mb-2 text-slate-300" size={32} />
                            <p>Tidak ada set tersedia.</p>
                            <p className="text-xs mt-1">Pastikan semua item dalam set tersedia.</p>
                        </div>
                    ) : (
                        availableSets.map((set: InstrumentSet) => {
                            const current = selectedSets[set.id] || 0;

                            // Calculate max sets available
                            let maxSets = Infinity;
                            for (const item of set.items) {
                                const inst = instruments.find(i => i.id === item.instrumentId);
                                if (inst) {
                                    const available = type === TransactionType.DISTRIBUTE ? inst.cssdStock : (inst.unitStock[unit.id] || 0);
                                    const possibleSets = Math.floor(available / item.quantity);
                                    maxSets = Math.min(maxSets, possibleSets);
                                }
                            }

                            return (
                                <div key={set.id} className={`p-4 rounded-xl border transition-all ${current > 0 ? 'border-green-500 bg-green-50' : 'border-slate-100 hover:border-slate-300'}`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                                <Layers size={16} className="text-green-600" />
                                                {set.name}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1">{set.description}</p>
                                            <p className="text-xs text-green-600 font-medium mt-1">Tersedia: {maxSets} set</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-400 font-bold uppercase mr-2">{type === TransactionType.COLLECT ? 'Baik' : 'Jml'}</span>
                                            <button
                                                onClick={() => updateSetQuantity(set.id, -1, 'ok', maxSets)}
                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95 disabled:opacity-50"
                                                disabled={current === 0}
                                            >
                                                <Minus size={16} />
                                            </button>
                                            <span className="w-8 text-center font-bold text-lg">{current}</span>
                                            <button
                                                onClick={() => updateSetQuantity(set.id, 1, 'ok', maxSets)}
                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 active:scale-95 disabled:opacity-50"
                                                disabled={current + (setItemsDiscrepancies[set.id]?.broken || 0) + (setItemsDiscrepancies[set.id]?.missing || 0) >= maxSets}
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Discrepancy Inputs for Sets (COLLECT ONLY) */}
                                    {type === TransactionType.COLLECT && (
                                        <div className="grid grid-cols-2 gap-4 mb-3 pb-3 border-b border-green-100">
                                            <div className="flex items-center justify-between bg-white/50 p-2 rounded-lg">
                                                <span className="text-xs font-bold text-orange-600">Set Rusak</span>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => updateSetQuantity(set.id, -1, 'broken', maxSets)} disabled={(setItemsDiscrepancies[set.id]?.broken || 0) === 0} className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 disabled:opacity-50"><Minus size={12} /></button>
                                                    <span className="w-4 text-center text-sm font-bold">{setItemsDiscrepancies[set.id]?.broken || 0}</span>
                                                    <button onClick={() => updateSetQuantity(set.id, 1, 'broken', maxSets)} disabled={current + (setItemsDiscrepancies[set.id]?.broken || 0) + (setItemsDiscrepancies[set.id]?.missing || 0) >= maxSets} className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 disabled:opacity-50"><Plus size={12} /></button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between bg-white/50 p-2 rounded-lg">
                                                <span className="text-xs font-bold text-red-600">Set Hilang</span>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => updateSetQuantity(set.id, -1, 'missing', maxSets)} disabled={(setItemsDiscrepancies[set.id]?.missing || 0) === 0} className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 disabled:opacity-50"><Minus size={12} /></button>
                                                    <span className="w-4 text-center text-sm font-bold">{setItemsDiscrepancies[set.id]?.missing || 0}</span>
                                                    <button onClick={() => updateSetQuantity(set.id, 1, 'missing', maxSets)} disabled={current + (setItemsDiscrepancies[set.id]?.broken || 0) + (setItemsDiscrepancies[set.id]?.missing || 0) >= maxSets} className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 disabled:opacity-50"><Plus size={12} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    )}


                                    {/* Show items in set */}
                                    <div className="bg-white rounded-lg p-3 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Isi Set:</p>
                                        <div className="space-y-1">
                                            {set.items.map(item => {
                                                const inst = instruments.find(i => i.id === item.instrumentId);
                                                return (
                                                    <div key={item.instrumentId} className="flex justify-between text-xs">
                                                        <span className="text-slate-600">{inst?.name || item.instrumentId}</span>
                                                        <span className="font-bold text-slate-700">x{item.quantity}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )
                )}
            </div>

            {/* Submit Button */}
            <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0 z-10">
                <button
                    onClick={handleSubmit}
                    disabled={totalItems === 0}
                    className={`w-full ${BTN_PRIMARY_CLASSES} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {type === TransactionType.DISTRIBUTE ? 'Kirim & Buat QR' : 'Ambil & Buat QR'}
                    {totalItems > 0 && ` (${totalItems} item)`}
                </button>
            </div>
            {/* Modal Dialogs */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <h3 className="font-bold text-lg text-slate-800">{confirmModal.title}</h3>
                        <p className="text-slate-600 whitespace-pre-line">{confirmModal.message}</p>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={confirmModal.onCancel}
                                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                            >
                                Ya, Lanjutkan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {inputModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <h3 className="font-bold text-lg text-slate-800">{inputModal.title}</h3>
                        {inputModal.message && <p className="text-slate-600">{inputModal.message}</p>}
                        <input
                            autoFocus
                            type="text"
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center text-lg"
                            placeholder="Ketik disini..."
                            value={inputModal.value}
                            onChange={(e) => setInputModal({ ...inputModal, value: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    inputModal.onConfirm(inputModal.value);
                                }
                            }}
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={inputModal.onCancel}
                                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => inputModal.onConfirm(inputModal.value)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                            >
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionForm;
