
export enum TransactionType {
  DISTRIBUTE = 'DISTRIBUTE', // CSSD -> Unit (Sterile)
  COLLECT = 'COLLECT' // Unit -> CSSD (Dirty)
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum Role {
  ADMIN = 'ADMIN',
  CSSD = 'CSSD',
  NURSE = 'NURSE'
}

export interface User {
  id: string;
  username: string;
  password: string; // Plaintext for demo purposes
  name: string;
  role: Role;
  unitId?: string; // Optional: bind a nurse to a specific unit
  is_active?: boolean;
  phone?: string;
  photo_url?: string;
}

export interface Unit {
  id: string;
  name: string;
  qrCode: string; // The string encoded in the QR
  type: 'IGD' | 'OK' | 'ICU' | 'WARD' | 'CSSD';
  is_active?: boolean;
}

export interface Instrument {
  id: string;
  name: string;
  category: string;
  totalStock: number; // Global stock
  cssdStock: number; // Ready in CSSD
  dirtyStock: number; // Dirty in CSSD (waiting for sterilization)
  packingStock: number; // Washed/Decontaminated, waiting for Sterilization
  brokenStock?: number; // Damaged items
  unitStock: Record<string, number>; // Maps unitId to count
  usedInSets?: number;
  remainingLoose?: number;
  is_serialized?: boolean;
  measure_unit_id?: string;

  is_active?: boolean;
}

export interface InstrumentSetItem {
  instrumentId: string;
  quantity: number;
}

export interface InstrumentSet {
  id: string;
  name: string;
  description: string;
  items: InstrumentSetItem[];
  is_active?: boolean;
}

export interface TransactionItem {
  instrumentId: string;
  count: number;
  itemType?: 'SINGLE' | 'SET';
  brokenCount?: number;
  missingCount?: number;
  serialNumbers?: string[];
}

export interface TransactionSetItem {
  setId: string;
  quantity: number;
  brokenCount?: number;
  missingCount?: number;
}


export interface Transaction {
  id: string;
  timestamp: number;
  type: TransactionType;
  status: TransactionStatus;
  unitId: string; // The target unit (for distribute) or source unit (for collect)
  items: TransactionItem[];
  setItems?: TransactionSetItem[];
  packIds?: string[]; // New: Track which packs were part of this transaction
  qrCode: string; // Generated QR for the transaction itself
  createdBy: string; // 'CSSD Staff'
  validatedBy?: string; // 'Nurse X'
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING';
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface RequestItem {
  itemId: string;
  itemType: 'SINGLE' | 'SET';
  quantity: number;
}

export interface Request {
  id: string;
  timestamp: number;
  unitId: string;
  status: RequestStatus;
  requestedBy: string;
  items: RequestItem[];
}

export interface Asset {
  id: string;
  instrumentId: string;
  serialNumber: string;
  status: 'READY' | 'IN_USE' | 'MAINTENANCE' | 'BROKEN' | 'LOST';
  location: string;
  notes?: string;
  usageCount?: number;
  lastMaintenance?: number;
  createdAt?: number;
}

export interface SterilePackItem {
  instrumentId: string;
  itemType: 'SINGLE' | 'SET';
  quantity: number;
}

export interface SterilePack {
  id: string;
  name: string;
  type: 'SINGLE_ITEMS' | 'SET' | 'MIXED';
  status: 'PACKED' | 'STERILIZED' | 'DISTRIBUTED' | 'EXPIRED';
  createdAt: number;
  packedBy: string;
  expiresAt: number;
  qrCode: string;
  items?: SterilePackItem[];
  targetUnitId?: string;
  fifoWarning?: {
    hasOlder: boolean;
    olderPack: { id: string, name: string, createdAt: number };
  };
}
