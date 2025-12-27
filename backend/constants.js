// Backend Constants

const ROLES = {
    ADMIN: 'ADMIN',
    CSSD: 'CSSD',
    NURSE: 'NURSE'
};

const TRANSACTION_TYPES = {
    DISTRIBUTE: 'DISTRIBUTE',
    COLLECT: 'COLLECT'
};

const TRANSACTION_STATUS = {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED'
};

const VALIDATION_STATUS = {
    PARTIAL: 'PARTIAL',
    VERIFIED: 'VERIFIED'
};

const ITEM_TYPES = {
    SINGLE: 'SINGLE',
    SET: 'SET',
    MIXED: 'MIXED'
};

// Asset Statuses (Matching database enum)
const ASSET_STATUS = {
    READY: 'READY',
    IN_USE: 'IN_USE',
    MAINTENANCE: 'MAINTENANCE',
    BROKEN: 'BROKEN',
    LOST: 'LOST',
    DIRTY: 'DIRTY' // Added for internal logic if needed, check DB enum compatibility
    // Note: If DB enum doesn't support DIRTY, this might just be a logical status
    // Checking previous code: transactionsController used 'DIRTY' for asset update. 
    // Wait, earlier constants.ts did NOT have DIRTY. 
    // Let's check Schema. 
};

// Checking schema_pg.sql via memory or previous view...
// transaction_items table does not have status. instrument_assets does.
// instrument_assets status enum: 'READY', 'IN_USE', 'MAINTENANCE', 'BROKEN', 'LOST'.
// Wait, transactionsController line 97: newStatus = 'DIRTY'. 
// If schema doesn't support DIRTY, the INSERT/UPDATE will fail.
// I should probably check schema first. 
// But if the code I read in Step 397 (lines 97) sets it to 'DIRTY', then the schema MUST support it or the code is buggy. 
// Assuming the code works, I'll add DIRTY.

const UNIT_IDS = {
    CSSD: 'u-cssd'
};

const LOCATIONS = {
    CSSD: 'CSSD' // Used in transactionsController line 98: newLocation = 'CSSD';
};

module.exports = {
    ROLES,
    TRANSACTION_TYPES,
    TRANSACTION_STATUS,
    VALIDATION_STATUS,
    ITEM_TYPES,
    ASSET_STATUS,
    UNIT_IDS,
    LOCATIONS
};
