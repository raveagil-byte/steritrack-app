
import { Instrument, Unit, Transaction, TransactionType, TransactionStatus, LogEntry, User, Role, InstrumentSet } from '../types';

// Initial Mock Data
const INITIAL_UNITS: Unit[] = [
  { id: 'u1', name: 'IGD (Instalasi Gawat Darurat)', qrCode: 'UNIT-IGD-001', type: 'IGD' },
  { id: 'u2', name: 'Kamar Operasi 1 (OK)', qrCode: 'UNIT-OK-001', type: 'OK' },
  { id: 'u3', name: 'ICU Sentral', qrCode: 'UNIT-ICU-001', type: 'ICU' },
];

const INITIAL_INSTRUMENTS: Instrument[] = [
  { id: 'i1', name: 'Set Bedah Mayor', category: 'Sets', totalStock: 20, cssdStock: 15, dirtyStock: 0, unitStock: {} },
  { id: 'i2', name: 'Set Bedah Minor', category: 'Sets', totalStock: 30, cssdStock: 25, dirtyStock: 0, unitStock: {} },
  { id: 'i3', name: 'Laringoskop', category: 'Device', totalStock: 15, cssdStock: 10, dirtyStock: 0, unitStock: {} },
  { id: 'i4', name: 'Gunting Bedah (Bengkok)', category: 'Single', totalStock: 50, cssdStock: 40, dirtyStock: 0, unitStock: {} },
  { id: 'i5', name: 'Pinset Anatomis', category: 'Single', totalStock: 50, cssdStock: 45, dirtyStock: 0, unitStock: {} },
];

const INITIAL_SETS: InstrumentSet[] = [
  {
    id: 's1',
    name: 'Set Bedah Mayor',
    description: 'Perlengkapan standar untuk prosedur bedah besar.',
    items: [
      { instrumentId: 'i4', quantity: 2 },
      { instrumentId: 'i5', quantity: 2 }
    ]
  }
];

const INITIAL_USERS: User[] = [
  { id: 'user1', username: 'admin', password: '123', name: 'Kepala Instalasi', role: Role.ADMIN },
  { id: 'user2', username: 'staff', password: '123', name: 'Budi (CSSD)', role: Role.CSSD },
  { id: 'user3', username: 'nurse', password: '123', name: 'Siti (Perawat)', role: Role.NURSE, unitId: 'u2' },
];

const STORAGE_KEYS = {
  UNITS: 'steritrack_units',
  INSTRUMENTS: 'steritrack_instruments',
  SETS: 'steritrack_sets',
  TRANSACTIONS: 'steritrack_transactions',
  LOGS: 'steritrack_logs',
  USERS: 'steritrack_users',
  CURRENT_USER: 'steritrack_current_user' // Session persistence
};

// Helper to load or set default
const loadOrInit = <T,>(key: string, defaultVal: T): T => {
  const stored = localStorage.getItem(key);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(key, JSON.stringify(defaultVal));
  return defaultVal;
};

export const StorageService = {
  getUnits: (): Unit[] => loadOrInit(STORAGE_KEYS.UNITS, INITIAL_UNITS),
  getInstruments: (): Instrument[] => loadOrInit(STORAGE_KEYS.INSTRUMENTS, INITIAL_INSTRUMENTS),
  getSets: (): InstrumentSet[] => loadOrInit(STORAGE_KEYS.SETS, INITIAL_SETS),
  getTransactions: (): Transaction[] => loadOrInit(STORAGE_KEYS.TRANSACTIONS, []),
  getLogs: (): LogEntry[] => loadOrInit(STORAGE_KEYS.LOGS, []),
  getUsers: (): User[] => loadOrInit(STORAGE_KEYS.USERS, INITIAL_USERS),
  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return stored ? JSON.parse(stored) : null;
  },

  saveUnits: (data: Unit[]) => localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(data)),
  saveInstruments: (data: Instrument[]) => localStorage.setItem(STORAGE_KEYS.INSTRUMENTS, JSON.stringify(data)),
  saveSets: (data: InstrumentSet[]) => localStorage.setItem(STORAGE_KEYS.SETS, JSON.stringify(data)),
  saveTransactions: (data: Transaction[]) => localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data)),
  saveLogs: (data: LogEntry[]) => localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(data)),
  saveUsers: (data: User[]) => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data)),
  saveCurrentUser: (user: User | null) => {
    if (user) localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },
  
  // Reset for demo purposes
  reset: () => {
    localStorage.clear();
    window.location.reload();
  }
};
