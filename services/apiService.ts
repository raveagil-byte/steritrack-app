import { Instrument, Unit, Transaction, LogEntry, User, InstrumentSet, Request, Asset, SterilePack } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const ApiService = {
    async getRecources<T>(endpoint: string): Promise<T> {
        try {
            const token = ApiService.getToken();
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_URL}/${endpoint}`, { headers });

            if (res.status === 401) {
                // If token expired/invalid, logout
                localStorage.removeItem('steritrack_current_user');
                // Only redirect if NOT already on login page to avoid infinite loop
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
                throw new Error("Unauthorized");
            }

            if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
            return res.json();
        } catch (e) {
            console.error(e);
            return [] as any;
        }
    },

    // Helper to get token
    getToken: () => {
        try {
            const userStr = localStorage.getItem('steritrack_current_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                return user.token;
            }
        } catch (e) { return null; }
        return null;
    },

    getUnits: () => ApiService.getRecources<Unit[]>('units'),
    getInstruments: () => ApiService.getRecources<Instrument[]>('instruments'),
    getUnassignedInstruments: () => ApiService.getRecources<Instrument[]>('instruments/unassigned'),
    getSets: () => ApiService.getRecources<InstrumentSet[]>('sets'),
    getTransactions: () => ApiService.getRecources<Transaction[]>('transactions'),
    getLogs: () => ApiService.getRecources<LogEntry[]>('logs'),
    getCombinedLogs: (params: any) => {
        const query = new URLSearchParams(params).toString();
        return ApiService.getRecources<{ data: any[], pagination: any }>(`audit-logs/combined?${query}`);
    },
    getUsers: () => ApiService.getRecources<User[]>('users'),
    getRequests: () => ApiService.getRecources<Request[]>('requests'),
    getStats: () => {
        const token = ApiService.getToken();
        return fetch(`${API_URL}/analytics`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }).then(res => res.json());
    },

    login: (credentials: { username: string, password: string }) => ApiService.apiCall('users/login', 'POST', credentials),
    register: (data: any) => ApiService.apiCall('users/register', 'POST', data),

    async apiCall(endpoint: string, method: 'POST' | 'PUT' | 'DELETE', body?: any) {
        const token = ApiService.getToken();
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

        if (res.status === 401) {
            localStorage.removeItem('steritrack_current_user');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
            throw new Error("Unauthorized");
        }

        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error || errBody.message || `API Error: ${res.status}`);
        }

        return res.json();
    },

    async batchGenerateAssets(instrumentId: string, prefix: string, count: number) {
        const response = await fetch(`${API_URL}/assets/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instrumentId, prefix, count, startFrom: 1 })
        });
        if (!response.ok) throw new Error('Gagal generate batch');
        return response.json();
    },

    createTransaction: (tx: Transaction) => ApiService.apiCall('transactions', 'POST', tx),
    validateTransaction: (id: string, validatedBy: string) => ApiService.apiCall(`transactions/${id}/validate`, 'PUT', { validatedBy }),
    validateTransactionWithVerification: (id: string, data: any) => ApiService.apiCall(`transactions/${id}/validate-with-verification`, 'POST', data),

    auditStockConsistency: () => ApiService.apiCall('audit/stock-consistency', 'POST', {}),

    createUser: (user: User) => ApiService.apiCall('users', 'POST', user),
    updateUser: (id: string, user: Partial<User>) => ApiService.apiCall(`users/${id}`, 'PUT', user),
    updateUserStatus: (id: string, is_active: boolean) => ApiService.apiCall(`users/${id}/status`, 'PUT', { is_active }),
    updateUserProfile: (id: string, data: { name: string, password?: string, phone?: string, photo_url?: string }) => ApiService.apiCall(`users/${id}/profile`, 'PUT', data),
    deleteUser: (id: string) => ApiService.apiCall(`users/${id}`, 'DELETE'),


    createUnit: (unit: Unit) => ApiService.apiCall('units', 'POST', unit),
    updateUnit: (id: string, unit: Partial<Unit>) => ApiService.apiCall(`units/${id}`, 'PUT', unit),
    updateUnitStatus: (id: string, is_active: boolean) => ApiService.apiCall(`units/${id}/status`, 'PUT', { is_active }),
    deleteUnit: (id: string) => ApiService.apiCall(`units/${id}`, 'DELETE'),

    createInstrument: (inst: Instrument) => ApiService.apiCall('instruments', 'POST', inst),
    updateInstrument: (id: string, inst: Partial<Instrument>) => ApiService.apiCall(`instruments/${id}`, 'PUT', inst),
    updateInstrumentStatus: (id: string, is_active: boolean) => ApiService.apiCall(`instruments/${id}/status`, 'PUT', { is_active }),
    deleteInstrument: (id: string) => ApiService.apiCall(`instruments/${id}`, 'DELETE'),

    updateStock: (id: string, cssdStock: number, dirtyStock: number, unitStock: Record<string, number>) =>
        ApiService.apiCall('instruments/update-stock', 'PUT', { id, cssdStock, dirtyStock, unitStock }),

    getAssetsByInstrument: (instrumentId: string) => ApiService.getRecources<Asset[]>(`assets/instrument/${instrumentId}`),
    updateAsset: (id: string, data: Partial<Asset>) => ApiService.apiCall(`assets/${id}`, 'PUT', data),

    createSet: (set: InstrumentSet) => ApiService.apiCall('sets', 'POST', set),
    updateSet: (id: string, set: InstrumentSet) => ApiService.apiCall(`sets/${id}`, 'PUT', set),
    updateSetStatus: (id: string, is_active: boolean) => ApiService.apiCall(`sets/${id}/status`, 'PUT', { is_active }),
    deleteSet: (id: string) => ApiService.apiCall(`sets/${id}`, 'DELETE'),

    addLog: (log: LogEntry) => ApiService.apiCall('logs', 'POST', log),

    createRequest: (req: Request) => ApiService.apiCall('requests', 'POST', req),
    updateRequestStatus: (id: string, status: string) => ApiService.apiCall(`requests/${id}/status`, 'PUT', { status }),

    resetSystem: () => fetch(`${API_URL}/reset`, { method: 'POST' }),
    resetActivityData: () => fetch(`${API_URL}/reset-activity-data`, { method: 'POST' }),

    washItems: (items: any[], operator: string) => ApiService.apiCall('sterilization/wash', 'POST', { items, operator }),
    sterilizeItems: (items: any[], operator: string, machine: string, status: 'SUCCESS' | 'FAILED') => ApiService.apiCall('sterilization/sterilize', 'POST', { items, operator, machine, status }),

    getPacks: () => ApiService.getRecources<SterilePack[]>('packs'),
    getPack: (id: string) => ApiService.getRecources<SterilePack>(`packs/${id}`),
    createPack: (pack: { name: string, type: string, packedBy: string, items: any[] }) => ApiService.apiCall('packs', 'POST', pack),
    sterilizePack: (id: string) => ApiService.apiCall(`packs/${id}/sterilize`, 'POST'),
    logUsage: (usage: any) => ApiService.apiCall('usage', 'POST', usage)
};
