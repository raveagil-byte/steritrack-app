// Roles
export const ROLES = {
    ADMIN: 'ADMIN',
    CSSD: 'CSSD',
    NURSE: 'NURSE'
} as const;

// Transaction Types
export const TRANSACTION_TYPES = {
    DISTRIBUTE: 'DISTRIBUTE',
    COLLECT: 'COLLECT'
} as const;

// Transaction Statuses
export const TRANSACTION_STATUS = {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED'
} as const;

// Request Statuses
export const REQUEST_STATUS = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED'
} as const;

// Asset Statuses
export const ASSET_STATUS = {
    READY: 'READY',
    IN_USE: 'IN_USE',
    MAINTENANCE: 'MAINTENANCE',
    BROKEN: 'BROKEN',
    LOST: 'LOST'
} as const;

// Pack Statuses
export const PACK_STATUS = {
    PACKED: 'PACKED',
    STERILIZED: 'STERILIZED',
    DISTRIBUTED: 'DISTRIBUTED',
    EXPIRED: 'EXPIRED'
} as const;

// Item Types
export const ITEM_TYPES = {
    SINGLE: 'SINGLE',
    SET: 'SET',
    MIXED: 'MIXED'
} as const;

// Discrepancy Types
export const DISCREPANCY_TYPES = {
    BROKEN: 'broken',
    MISSING: 'missing',
    OK: 'ok'
} as const;

// UI View Modes
export const VIEW_MODES = {
    SINGLE: 'SINGLE',
    SET: 'SET'
} as const;

// Button Classes
export const BUTTON_CLASSES = {
    PRIMARY: "bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2",
    SECONDARY: "px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition",
    DANGER: "bg-red-600 text-white hover:bg-red-700",
    SUCCESS: "bg-green-600 text-white hover:bg-green-700"
} as const;
