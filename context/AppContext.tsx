import React, { createContext, useContext, useEffect, useState } from 'react';
import { Instrument, Unit, Transaction, TransactionType, LogEntry, User, InstrumentSet, TransactionItem, TransactionSetItem, Request as AppRequest } from '../types';
import { StorageService } from '../services/storage';
import { useQueryClient } from '@tanstack/react-query';
import {
    useInstruments,
    useLogs,
    useSets,
    useTransactions,
    useUnits,
    useUsers,
    useRequests,
    useAppMutations,
    useStats
} from '../hooks/useQueries';
import { useConfirmation } from './ConfirmationContext';

interface AppContextType {
    currentUser: User | null;

    // Data (Fetched via React Query but exposed here for backward compatibility)
    instruments: Instrument[];
    units: Unit[];
    users: User[];
    sets: InstrumentSet[];
    transactions: Transaction[];
    logs: LogEntry[];
    requests: AppRequest[];
    stats: any;

    login: (user: User) => void;
    logout: () => void;
    updateCurrentUser: (user: User) => void;


    // Actions (Wrapped mutations)
    createTransaction: (type: TransactionType, unitId: string, items: TransactionItem[], setItems?: TransactionSetItem[], packIds?: string[], expectedReturnDate?: number | null) => Promise<Transaction | null>;
    validateTransaction: (txId: string, validatorName: string) => Promise<boolean>;
    washItems: (items: { instrumentId: string, quantity: number }[]) => Promise<void>;
    sterilizeItems: (items: { instrumentId: string, quantity: number }[], machine: string, status: 'SUCCESS' | 'FAILED') => Promise<any>;

    addUser: (user: User) => Promise<void>;
    updateUserStatus: (id: string, is_active: boolean) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    addInstrument: (inst: Instrument) => Promise<void>;
    updateInstrument: (inst: { id: string, name: string, category: string, is_serialized?: boolean, totalStock?: number, cssdStock?: number, dirtyStock?: number, packingStock?: number, measure_unit_id?: string }) => Promise<void>;
    updateInstrumentStatus: (id: string, is_active: boolean) => Promise<void>;
    deleteInstrument: (id: string) => Promise<void>;
    addUnit: (unit: Unit) => Promise<void>;
    updateUnitStatus: (id: string, is_active: boolean) => Promise<void>;
    deleteUnit: (id: string) => Promise<void>;
    addSet: (set: InstrumentSet) => Promise<void>;
    updateSet: (set: InstrumentSet) => Promise<void>;
    updateSetStatus: (id: string, is_active: boolean) => Promise<void>;
    deleteSet: (id: string) => Promise<void>;

    createRequest: (unitId: string, requestedBy: string, items: { itemId: string, itemType: 'SINGLE' | 'SET', quantity: number }[]) => Promise<void>;
    updateRequestStatus: (id: string, status: string) => Promise<void>;

    addLog: (message: string, type?: 'INFO' | 'SUCCESS' | 'WARNING') => void;
    resetSystem: () => Promise<void>;

    // Refresh function is now moot as Query handles it, but kept for compatibility if called explicitly
    refreshData: () => Promise<void>;

    sterilizeDirtyStock: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const queryClient = useQueryClient();
    const { confirm, showAlert } = useConfirmation();

    // Data Hooks - ONLY FETCH IF LOGGED IN
    const queryEnabled = !!currentUser;
    const usersQuery = useUsers({ enabled: queryEnabled });
    // Units must be available for registration even if logged out
    const unitsQuery = useUnits({ enabled: true });
    const instrumentsQuery = useInstruments({ enabled: queryEnabled });
    const setsQuery = useSets({ enabled: queryEnabled });
    const transactionsQuery = useTransactions({ enabled: queryEnabled });
    const logsQuery = useLogs({ enabled: queryEnabled });
    const requestsQuery = useRequests({ enabled: queryEnabled });
    const statsQuery = useStats({ enabled: queryEnabled });

    // Mutations
    const appMutations = useAppMutations();

    useEffect(() => {
        const savedUser = StorageService.getCurrentUser();
        if (savedUser) setCurrentUser(savedUser);
    }, []);

    const login = (user: User) => {
        setCurrentUser(user);
        StorageService.saveCurrentUser(user);

        // Force refetch because enabled:false -> true transition handles it mostly,
        // but if there was existing cache (even empty), we want to be sure.
        // Actually the transition from enabled: false to true automatically triggers fetch.
        // But let's be safe against any weird caching state from before.
        queryClient.invalidateQueries();
    };

    const logout = () => {
        setCurrentUser(null);
        StorageService.saveCurrentUser(null);
        queryClient.clear();
    };

    const updateCurrentUser = (user: User) => {
        setCurrentUser(user);
        StorageService.saveCurrentUser(user);
    };

    // --- Action Wrappers ---
    // These wrap the mutation calls to match the interface used by Views

    const addUser = async (user: User) => { await appMutations.addUser.mutateAsync(user); };
    const updateUserStatus = async (id: string, is_active: boolean) => { await appMutations.updateUserStatus.mutateAsync({ id, is_active }); };
    const deleteUser = async (id: string) => { await appMutations.deleteUser.mutateAsync(id); };

    const addInstrument = async (inst: Instrument) => { await appMutations.addInstrument.mutateAsync(inst); };
    const updateInstrument = async (inst: { id: string, name: string, category: string, is_serialized?: boolean, totalStock?: number, cssdStock?: number, dirtyStock?: number, packingStock?: number, measure_unit_id?: string }) => { await appMutations.updateInstrument.mutateAsync({ id: inst.id, ...inst }); };
    const updateInstrumentStatus = async (id: string, is_active: boolean) => { await appMutations.updateInstrumentStatus.mutateAsync({ id, is_active }); };
    const deleteInstrument = async (id: string) => { await appMutations.deleteInstrument.mutateAsync(id); };

    const addUnit = async (unit: Unit) => { await appMutations.addUnit.mutateAsync(unit); };
    const updateUnitStatus = async (id: string, is_active: boolean) => { await appMutations.updateUnitStatus.mutateAsync({ id, is_active }); };
    const deleteUnit = async (id: string) => { await appMutations.deleteUnit.mutateAsync(id); };

    const addSet = async (set: InstrumentSet) => { await appMutations.addSet.mutateAsync(set); };
    const updateSet = async (set: InstrumentSet) => { await appMutations.updateSet.mutateAsync(set); };
    const updateSetStatus = async (id: string, is_active: boolean) => { await appMutations.updateSetStatus.mutateAsync({ id, is_active }); };
    const deleteSet = async (id: string) => { await appMutations.deleteSet.mutateAsync(id); };

    const createTransaction = async (type: TransactionType, unitId: string, items: TransactionItem[], setItems?: TransactionSetItem[], packIds?: string[], expectedReturnDate?: number | null) => {
        if (items.length === 0 && (!setItems || setItems.length === 0)) return null;
        const res = await appMutations.createTransaction.mutateAsync({ type, unitId, items, setItems: setItems || [], packIds: packIds || [], expectedReturnDate });
        return res;
    };

    const validateTransaction = async (id: string, validator: string) => {
        await appMutations.validateTransaction.mutateAsync({ id, validator });
        return true;
    };

    const washItems = async (items: { instrumentId: string, quantity: number }[]) => {
        if (!currentUser) return;
        await appMutations.washItems.mutateAsync({ items, operator: currentUser.name });
    };

    const sterilizeItems = async (items: { instrumentId: string, quantity: number }[], machine: string = 'Autoclave 1', status: 'SUCCESS' | 'FAILED' = 'SUCCESS') => {
        if (!currentUser) return;
        return await appMutations.sterilizeItems.mutateAsync({ items, operator: currentUser.name, machine, status });
    };

    const resetSystem = async () => {
        const isConfirmed = await confirm({
            title: "Reset Sistem",
            message: "ANDA YAKIN? Ini akan menghapus semua data transaksi dan stok.\nData master (Instrumen, Unit, Set) TIDAK akan dihapus.",
            confirmText: "Ya, Hapus Semua",
            type: "danger"
        });

        if (isConfirmed) {
            await appMutations.resetSystem.mutateAsync();
            await showAlert({
                title: "Sistem Direset",
                message: "Semua data transaksi dan stok telah dihapus.",
                type: "success"
            });
        }
    };

    const createRequest = async (unitId: string, requestedBy: string, items: { itemId: string, itemType: 'SINGLE' | 'SET', quantity: number }[]) => {
        await appMutations.createRequest.mutateAsync({ unitId, requestedBy, items });
    };

    const updateRequestStatus = async (id: string, status: string) => {
        await appMutations.updateRequestStatus.mutateAsync({ id, status });
    };

    const addLog = (message: string) => {
        console.log("AppLog:", message);
    };

    const sterilizeDirtyStock = async () => {
        if (!currentUser) return;

        // 1. Identify dirty items
        const dirtyItems = instrumentsQuery.data
            ?.filter(i => i.dirtyStock > 0)
            .map(i => ({ instrumentId: i.id, quantity: i.dirtyStock })) || [];

        if (dirtyItems.length === 0) return;

        const isConfirmed = await confirm({
            title: "Konfirmasi Sterilisasi",
            message: `Akan mensterilkan ${dirtyItems.reduce((a, b) => a + b.quantity, 0)} item kotor. Lanjutkan?`,
            confirmText: "Sterilkan Sekarang",
            type: "info"
        });

        if (!isConfirmed) return;

        try {
            await washItems(dirtyItems);
            await sterilizeItems(dirtyItems);

            await showAlert({
                title: "Sterilisasi Berhasil",
                message: `${dirtyItems.length} jenis instrumen telah disterilkan.`,
                type: "success"
            });
        } catch (error) {
            console.error("Error during bulk sterilization:", error);
            await showAlert({
                title: "Gagal Sterilisasi",
                message: "Terjadi kesalahan saat melakukan sterilisasi otomatis.",
                type: "warning"
            });
        }
    };

    const refreshData = async () => {
        await queryClient.invalidateQueries();
    };

    return (
        <AppContext.Provider value={{
            currentUser,
            login, logout, updateCurrentUser,

            users: usersQuery.data || [],
            units: unitsQuery.data || [],
            instruments: instrumentsQuery.data || [],
            sets: setsQuery.data || [],
            transactions: transactionsQuery.data || [],
            logs: logsQuery.data || [],
            requests: requestsQuery.data || [],
            stats: statsQuery.data || null,

            addUser, updateUserStatus, deleteUser,
            addInstrument, updateInstrument, updateInstrumentStatus, deleteInstrument,
            addUnit, updateUnitStatus, deleteUnit,
            addSet, updateSet, updateSetStatus, deleteSet,
            createTransaction, validateTransaction, washItems, sterilizeItems,
            resetSystem,
            addLog,
            refreshData,
            createRequest,
            updateRequestStatus,
            sterilizeDirtyStock
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppContext must be used within AppProvider");
    return context;
};
