import { useState, useMemo } from 'react';
import { Instrument, InstrumentSet, TransactionItem, TransactionSetItem, TransactionType, Unit } from '../types';
import { useAppContext } from '../context/AppContext';
import { ApiService } from '../services/apiService';
import { toast } from 'sonner';
import { ASSET_STATUS, DISCREPANCY_TYPES, ITEM_TYPES, TRANSACTION_TYPES } from '../constants';

interface UseTransactionLogicProps {
    unit: Unit;
    type: TransactionType;
    onSubmit: (items: TransactionItem[], setItems: TransactionSetItem[], packIds?: string[], expectedReturnDate?: number | null) => void;
    onClose: () => void;
}

export const useTransactionLogic = ({ unit, type, onSubmit, onClose }: UseTransactionLogicProps) => {
    const { instruments, sets, units } = useAppContext();

    // --- STATE ---
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [selectedSets, setSelectedSets] = useState<Record<string, number>>({});
    const [discrepancies, setDiscrepancies] = useState<Record<string, { broken: number; missing: number }>>({});
    const [setItemsDiscrepancies, setSetItemsDiscrepancies] = useState<Record<string, { broken: number; missing: number }>>({});

    // Serial Numbers & Assets
    const [serialNumbers, setSerialNumbers] = useState<Record<string, string[]>>({});
    const [selectedAssets, setSelectedAssets] = useState<Record<string, string[]>>({});
    const [assetMap, setAssetMap] = useState<Record<string, any[]>>({});

    // Packs
    const [scannedPackIds, setScannedPackIds] = useState<string[]>([]);

    // UI Logic State
    const [isScanning, setIsScanning] = useState(false);
    const [returnDuration, setReturnDuration] = useState(1);

    // Modals State
    const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void; onCancel: () => void } | null>(null);
    const [inputModal, setInputModal] = useState<{ title: string; message?: string; value: string; onConfirm: (val: string) => void; onCancel: () => void } | null>(null);

    // --- COMPUTED DATA ---

    // 1. Available Instruments
    const availableInstruments = useMemo(() => {
        return instruments.filter((inst: Instrument) => {
            if (!inst.is_active) return false;
            return true;
        }).filter((inst: Instrument) => {
            if (type === TRANSACTION_TYPES.DISTRIBUTE) {
                return inst.cssdStock >= 0;
            } else {
                return (inst.unitStock[unit.id] || 0) >= 0;
            }
        });
    }, [instruments, type, unit.id]);

    // 2. Available Sets
    const availableSets = useMemo(() => {
        return sets.filter((set: InstrumentSet) => {
            if (!set.is_active) return false;
            return set.items.every(setItem => {
                const inst = instruments.find(i => i.id === setItem.instrumentId);
                return inst && inst.is_active;
            });
        });
    }, [sets, instruments]);

    // 3. Total Items Count
    const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0) +
        Object.values(discrepancies).reduce((a, b) => a + b.broken + b.missing, 0) +
        Object.values(selectedSets).reduce((a, b) => a + b, 0) +
        Object.values(setDiscrepancies).reduce((a, b) => a + b.broken + b.missing, 0);


    // --- FUNCTIONS ---

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
        const assets = await fetchAssetsIfNeeded(instrumentId);
        const asset = assets.find((a: any) => a.serialNumber === sn);

        if (!asset) {
            toast.error(`Serial Number "${sn}" tidak ditemukan di database.`);
            return;
        }

        if (type === TRANSACTION_TYPES.DISTRIBUTE && asset.status !== ASSET_STATUS.READY) {
            toast.warning(`Asset "${sn}" statusnya ${asset.status}, bukan READY.`);
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

            setSelectedAssets(prevAssets => {
                const currentIds = prevAssets[instrumentId] || [];
                return { ...prevAssets, [instrumentId]: [...currentIds, asset.id] };
            });

            const newList = [...currentList, sn];
            setQuantities(q => ({ ...q, [instrumentId]: newList.length }));
            return { ...prev, [instrumentId]: newList };
        });
    };

    const removeSerialNumber = (instrumentId: string, snToRemove: string) => {
        setSerialNumbers(prev => {
            const currentList = prev[instrumentId] || [];
            const newList = currentList.filter(sn => sn !== snToRemove);

            const assets = assetMap[instrumentId] || [];
            const assetToRemove = assets.find((a: any) => a.serialNumber === snToRemove);

            if (assetToRemove) {
                setSelectedAssets(prevAssets => {
                    const currentIds = prevAssets[instrumentId] || [];
                    const newIds = currentIds.filter(id => id !== assetToRemove.id);
                    return { ...prevAssets, [instrumentId]: newIds };
                });
            }

            setQuantities(q => ({ ...q, [instrumentId]: newList.length }));
            return { ...prev, [instrumentId]: newList };
        });
    };

    const updateQuantity = (id: string, delta: number, field: 'ok' | 'broken' | 'missing', max: number) => {
        const inst = instruments.find(i => i.id === id);
        if (inst?.is_serialized && field === DISCREPANCY_TYPES.OK) {
            return;
        }

        if (field === DISCREPANCY_TYPES.OK) {
            setQuantities(prev => {
                const current = prev[id] || 0;
                const currentBroken = discrepancies[id]?.broken || 0;
                const currentMissing = discrepancies[id]?.missing || 0;
                const total = current + currentBroken + currentMissing;

                if (delta > 0 && total >= max) return prev;

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

    const updateSetQuantity = (setId: string, delta: number, field: 'ok' | 'broken' | 'missing', max: number) => {
        if (field === DISCREPANCY_TYPES.OK) {
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

    const checkFifoAndProcess = (pack: any, callback: () => void) => {
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

    const handleScan = async (code: string) => {
        if (code.startsWith('PCK-')) {
            try {
                const pack = await ApiService.getPack(code);
                if (pack && pack.items) {
                    if (scannedPackIds.includes(pack.id)) {
                        toast.warning(`Paket ${pack.id} sudah ditambahkan dalam transaksi ini.`);
                        return;
                    }

                    const processPackAddition = () => {
                        let addedCount = 0;
                        pack.items.forEach((pItem: any) => {
                            const inst = instruments.find(i => i.id === pItem.instrumentId);
                            if (inst) {
                                const max = type === TRANSACTION_TYPES.DISTRIBUTE ? inst.cssdStock : (inst.unitStock[unit.id] || 0);
                                const current = quantities[inst.id] || 0;
                                if (current + pItem.quantity <= max) {
                                    updateQuantity(inst.id, pItem.quantity, DISCREPANCY_TYPES.OK, max);
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

                    if (pack.targetUnitId && type === TRANSACTION_TYPES.DISTRIBUTE) {
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
                            return;
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
            const max = type === TRANSACTION_TYPES.DISTRIBUTE ? inst.cssdStock : (inst.unitStock[unit.id] || 0);
            if (max <= 0) {
                toast.error(type === TRANSACTION_TYPES.DISTRIBUTE ? "Item habis di CSSD" : "Item tidak ditemukan di unit ini");
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
                updateQuantity(inst.id, 1, DISCREPANCY_TYPES.OK, max);
                setIsScanning(false);
            }
        } else {
            if (!code.startsWith('PCK-')) {
                toast.error(`QR Instrumen Tidak Dikenal: ${code}`);
                setIsScanning(false);
            } else {
                toast.error(`QR Paket Tidak Dikenal atau Gagal Memuat: ${code}`);
                setIsScanning(false);
            }
        }
    };

    const submitTransaction = () => {
        const items: TransactionItem[] = [];
        const allItemIds = new Set([...Object.keys(quantities), ...Object.keys(discrepancies)]);

        allItemIds.forEach(id => {
            const count = quantities[id] || 0;
            const broken = discrepancies[id]?.broken || 0;
            const missing = discrepancies[id]?.missing || 0;

            if (count + broken + missing > 0) {
                items.push({
                    instrumentId: id,
                    count,
                    itemType: ITEM_TYPES.SINGLE,
                    brokenCount: broken,
                    missingCount: missing,
                    serialNumbers: serialNumbers[id] || [],
                    assetIds: selectedAssets[id] || []
                });
            }
        });

        const setItems: TransactionSetItem[] = [];
        const allSetIds = new Set([...Object.keys(selectedSets), ...Object.keys(setItemsDiscrepancies)]);

        allSetIds.forEach(id => {
            const quantity = selectedSets[id] || 0;
            const broken = setItemsDiscrepancies[id]?.broken || 0;
            const missing = setItemsDiscrepancies[id]?.missing || 0;

            if (quantity + broken + missing > 0) {
                setItems.push({
                    setId: id,
                    quantity,
                    brokenCount: broken,
                    missingCount: missing
                });
            }
        });

        let expectedReturnDate = null;
        if (type === TRANSACTION_TYPES.DISTRIBUTE) {
            const now = new Date();
            expectedReturnDate = now.setDate(now.getDate() + returnDuration);
        }

        onSubmit(items, setItems, scannedPackIds, expectedReturnDate);
    };

    return {
        // Data
        availableInstruments,
        availableSets,
        quantities,
        selectedSets,
        discrepancies,
        setItemsDiscrepancies,
        serialNumbers,

        // Modal States
        confirmModal,
        inputModal,
        setConfirmModal,
        setInputModal,

        // Interaction
        isScanning,
        setIsScanning,
        returnDuration,
        setReturnDuration,
        totalItems,

        // Actions
        addSerialNumber,
        removeSerialNumber,
        updateQuantity,
        updateSetQuantity,
        handleScan,
        submitTransaction
    };
};
