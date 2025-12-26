import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiService } from '../services/apiService';
import { StorageService } from '../services/storage';
import { Instrument, InstrumentSet, InstrumentSetItem, Role, Transaction, TransactionStatus, TransactionType, Unit, User } from '../types';

// Query Keys
export const KEYS = {
    USERS: ['users'],
    UNITS: ['units'],
    INSTRUMENTS: ['instruments'],
    SETS: ['sets'],
    TRANSACTIONS: ['transactions'],
    LOGS: ['logs'],
    REQUESTS: ['requests'],
};

// --- Queries ---

export const useRequests = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: KEYS.REQUESTS,
        queryFn: ApiService.getRequests,
        staleTime: 1000 * 30,
        enabled: options?.enabled,
    });
};

export const useStats = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: ['stats'],
        queryFn: ApiService.getStats,
        staleTime: 1000 * 60, // 1 min
        enabled: options?.enabled,
    });
};

export const useUsers = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: KEYS.USERS,
        queryFn: ApiService.getUsers,
        staleTime: 1000 * 60 * 5, // 5 mins
        enabled: options?.enabled,
    });
};

export const useUnits = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: KEYS.UNITS,
        queryFn: ApiService.getUnits,
        staleTime: 1000 * 60 * 5,
        enabled: options?.enabled,
    });
};

export const useInstruments = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: KEYS.INSTRUMENTS,
        queryFn: ApiService.getInstruments,
        staleTime: 1000 * 30, // 30 sec
        enabled: options?.enabled,
    });
};

export const useSets = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: KEYS.SETS,
        queryFn: ApiService.getSets,
        staleTime: 1000 * 60 * 5,
        enabled: options?.enabled,
    });
};

export const useTransactions = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: KEYS.TRANSACTIONS,
        queryFn: ApiService.getTransactions,
        staleTime: 1000 * 10, // 10 sec for near real-time updates
        enabled: options?.enabled,
    });
};

export const useLogs = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: KEYS.LOGS,
        queryFn: ApiService.getLogs,
        staleTime: 1000 * 30,
        enabled: options?.enabled,
    });
};

// --- Mutations ---

export const useAppMutations = () => {
    const queryClient = useQueryClient();
    // Resolving circular dependency: directly access storage or pass user as argument if needed.
    // Ideally, the mutations should just take the user ID from the arguments or context should be structured differently.
    // For now, let's just read from storage or let the service handle it (if service uses a singleton/static token).
    // Or simpler: fetch user inside the mutation function if strictly needed, but `createdBy` is usually passed or handled by backend session.
    // Let's use direct storage access here to break the cycle with AppContext.
    const currentUser = StorageService.getCurrentUser();

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: KEYS.USERS });
        queryClient.invalidateQueries({ queryKey: KEYS.UNITS });
        queryClient.invalidateQueries({ queryKey: KEYS.INSTRUMENTS });
        queryClient.invalidateQueries({ queryKey: KEYS.SETS });
        queryClient.invalidateQueries({ queryKey: KEYS.TRANSACTIONS });
        queryClient.invalidateQueries({ queryKey: KEYS.LOGS });
    };

    // User Mutations
    const addUser = useMutation({
        mutationFn: ApiService.createUser,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.USERS }),
    });

    const deleteUser = useMutation({
        mutationFn: ApiService.deleteUser,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.USERS }),
    });

    const updateUserStatus = useMutation({
        mutationFn: (data: { id: string, is_active: boolean }) => ApiService.updateUserStatus(data.id, data.is_active),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.USERS }),
    });

    // Instrument Mutations
    const addInstrument = useMutation({
        mutationFn: ApiService.createInstrument,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.INSTRUMENTS }),
    });

    const deleteInstrument = useMutation({
        mutationFn: ApiService.deleteInstrument,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.INSTRUMENTS }),
    });

    const updateInstrument = useMutation({
        mutationFn: (data: Partial<Instrument>) => ApiService.updateInstrument(data.id!, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.INSTRUMENTS }),
    });

    const updateInstrumentStatus = useMutation({
        mutationFn: (data: { id: string, is_active: boolean }) => ApiService.updateInstrumentStatus(data.id, data.is_active),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.INSTRUMENTS }),
    });

    const washItems = useMutation({
        mutationFn: (data: { items: any[], operator: string }) => ApiService.washItems(data.items, data.operator),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.INSTRUMENTS });
            queryClient.invalidateQueries({ queryKey: KEYS.LOGS });
        }
    });

    const sterilizeItems = useMutation({
        mutationFn: (data: { items: any[], operator: string, machine: string, status: 'SUCCESS' | 'FAILED' }) => ApiService.sterilizeItems(data.items, data.operator, data.machine, data.status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.INSTRUMENTS });
            queryClient.invalidateQueries({ queryKey: KEYS.LOGS });
        }
    });

    // Unit Mutations
    const addUnit = useMutation({
        mutationFn: ApiService.createUnit,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.UNITS }),
    });

    const deleteUnit = useMutation({
        mutationFn: ApiService.deleteUnit,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.UNITS }),
    });

    const updateUnitStatus = useMutation({
        mutationFn: (data: { id: string, is_active: boolean }) => ApiService.updateUnitStatus(data.id, data.is_active),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.UNITS }),
    });

    // Set Mutations
    const addSet = useMutation({
        mutationFn: ApiService.createSet,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.SETS });
            queryClient.invalidateQueries({ queryKey: KEYS.INSTRUMENTS }); // Sets might affect instrument availability?
        },
    });

    const updateSet = useMutation({
        mutationFn: (data: { id: string, name: string, description: string, items: InstrumentSetItem[] }) => ApiService.updateSet(data.id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.SETS }),
    });

    const deleteSet = useMutation({
        mutationFn: ApiService.deleteSet,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.SETS }),
    });

    const updateSetStatus = useMutation({
        mutationFn: (data: { id: string, is_active: boolean }) => ApiService.updateSetStatus(data.id, data.is_active),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.SETS }),
    });

    // Transaction Mutations
    const createTransaction = useMutation({
        mutationFn: async (data: {
            type: TransactionType,
            unitId: string,
            items: { instrumentId: string, count: number }[],
            setItems?: { setId: string, quantity: number }[],
            packIds?: string[]
        }) => {
            const tx: Transaction = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                type: data.type,
                status: TransactionStatus.PENDING,
                unitId: data.unitId,
                items: data.items,
                setItems: data.setItems,
                packIds: data.packIds,
                qrCode: `TX-${Date.now()}`,
                createdBy: currentUser?.name || 'System',
            };
            await ApiService.createTransaction(tx);
            // Return the transaction object so it can be used in the UI
            return tx;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.TRANSACTIONS });
            queryClient.invalidateQueries({ queryKey: KEYS.INSTRUMENTS });
            queryClient.invalidateQueries({ queryKey: KEYS.LOGS });
        },
    });

    const validateTransaction = useMutation({
        mutationFn: (data: { id: string, validator: string }) => ApiService.validateTransaction(data.id, data.validator),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.TRANSACTIONS });
            queryClient.invalidateQueries({ queryKey: KEYS.INSTRUMENTS });
            queryClient.invalidateQueries({ queryKey: KEYS.LOGS });
        },
    });

    // System Mutations
    const resetSystem = useMutation({
        mutationFn: ApiService.resetSystem,
        onSuccess: () => invalidateAll(),
    });

    // Request Mutations
    const createRequest = useMutation({
        mutationFn: (data: { unitId: string, requestedBy: string, items: { itemId: string, itemType: 'SINGLE' | 'SET', quantity: number }[] }) => {
            const req: any = {
                id: `req-${Date.now()}`,
                unitId: data.unitId,
                requestedBy: data.requestedBy,
                items: data.items,
                status: 'PENDING'
            };
            return ApiService.createRequest(req);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.REQUESTS });
        }
    });

    const updateRequestStatus = useMutation({
        mutationFn: (data: { id: string, status: string }) => ApiService.updateRequestStatus(data.id, data.status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.REQUESTS });
        }
    });

    return {
        addUser,
        deleteUser,
        updateUserStatus,
        addInstrument,
        deleteInstrument,
        updateInstrument,
        updateInstrumentStatus,
        addUnit,
        deleteUnit,
        updateUnitStatus,
        addSet,
        updateSet,
        deleteSet,
        updateSetStatus,
        createTransaction,
        validateTransaction,
        resetSystem,
        washItems,
        sterilizeItems,

        // Requests
        createRequest,
        updateRequestStatus
    };
};
