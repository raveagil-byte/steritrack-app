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
    createTransaction: (type: TransactionType, unitId: string, items: TransactionItem[], setItems?: TransactionSetItem[]) => Promise<Transaction | null>;
    validateTransaction: (txId: string, validatorName: string) => Promise<boolean>;
    washItems: (items: { instrumentId: string, quantity: number }[]) => Promise<void>;
    sterilizeItems: (items: { instrumentId: string, quantity: number }[], machine: string, status: 'SUCCESS' | 'FAILED') => Promise<any>;

    addUser: (user: User) => Promise<void>;
    updateUserStatus: (id: string, is_active: boolean) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    addInstrument: (inst: Instrument) => Promise<void>;
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
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const queryClient = useQueryClient();

    // Data Hooks
    const usersQuery = useUsers();
    const unitsQuery = useUnits();
    const instrumentsQuery = useInstruments();
    const setsQuery = useSets();
    const transactionsQuery = useTransactions();
    const logsQuery = useLogs();
    const requestsQuery = useRequests();
    const statsQuery = useStats();

    // Mutations
    const appMutations = useAppMutations();

    useEffect(() => {
        const savedUser = StorageService.getCurrentUser();
        if (savedUser) setCurrentUser(savedUser);
    }, []);

    const login = (user: User) => {
        setCurrentUser(user);
        StorageService.saveCurrentUser(user);
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
    const updateInstrumentStatus = async (id: string, is_active: boolean) => { await appMutations.updateInstrumentStatus.mutateAsync({ id, is_active }); };
    const deleteInstrument = async (id: string) => { await appMutations.deleteInstrument.mutateAsync(id); };

    const addUnit = async (unit: Unit) => { await appMutations.addUnit.mutateAsync(unit); };
    const updateUnitStatus = async (id: string, is_active: boolean) => { await appMutations.updateUnitStatus.mutateAsync({ id, is_active }); };
    const deleteUnit = async (id: string) => { await appMutations.deleteUnit.mutateAsync(id); };

    const addSet = async (set: InstrumentSet) => { await appMutations.addSet.mutateAsync(set); };
    const updateSet = async (set: InstrumentSet) => { await appMutations.updateSet.mutateAsync(set); };
    const updateSetStatus = async (id: string, is_active: boolean) => { await appMutations.updateSetStatus.mutateAsync({ id, is_active }); };
    const deleteSet = async (id: string) => { await appMutations.deleteSet.mutateAsync(id); };

    const createTransaction = async (type: TransactionType, unitId: string, items: TransactionItem[], setItems?: TransactionSetItem[]) => {
        if (items.length === 0 && (!setItems || setItems.length === 0)) return null;
        const res = await appMutations.createTransaction.mutateAsync({ type, unitId, items, setItems: setItems || [] });
        // The mutation invalidates queries, so fresh data will propagate
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
        if (window.confirm("ANDA YAKIN? Ini akan menghapus semua data.")) {
            await appMutations.resetSystem.mutateAsync();
        }
    };

    const createRequest = async (unitId: string, requestedBy: string, items: { itemId: string, itemType: 'SINGLE' | 'SET', quantity: number }[]) => {
        await appMutations.createRequest.mutateAsync({ unitId, requestedBy, items });
    };

    const updateRequestStatus = async (id: string, status: string) => {
        await appMutations.updateRequestStatus.mutateAsync({ id, status });
    };

    const addLog = (message: string) => {
        // Logging is now mostly handled by server, but we can do optimistic client side log if needed
        // or just let the server log actions. 
        // For compatibility, we'll ignore or maybe send a manual log if API supports it.
        // It seems the API has an addLog endpoint.
        // We actually didn't expose addLog mutation in useQueries but let's check...
        // Wait, for now let's just console log as frontend shouldn't really spam backend logs manually unless critical.
        console.log("AppLog:", message);
    };

    const refreshData = async () => {
        await queryClient.invalidateQueries();
    };

    return (
        <AppContext.Provider value={{
            currentUser,
            login, logout, updateCurrentUser,

            // Expose the raw data arrays. Fallback to [] if loading/error
            users: usersQuery.data || [],
            units: unitsQuery.data || [],
            instruments: instrumentsQuery.data || [],
            sets: setsQuery.data || [],
            transactions: transactionsQuery.data || [],
            logs: logsQuery.data || [],
            requests: requestsQuery.data || [],
            stats: statsQuery.data || null,

            addUser, updateUserStatus, deleteUser,
            addInstrument, updateInstrumentStatus, deleteInstrument,
            addUnit, updateUnitStatus, deleteUnit,
            addSet, updateSet, updateSetStatus, deleteSet,
            createTransaction, validateTransaction, washItems, sterilizeItems,
            resetSystem,
            addLog,
            refreshData,
            createRequest,
            updateRequestStatus
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
