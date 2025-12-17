-- FIX 1: Re-create sterile_pack_items with Explicit Primary Key compatibility
-- Run this on CLOUD database

CREATE TABLE IF NOT EXISTS sterile_pack_items (
    packId VARCHAR(50),
    instrumentId VARCHAR(50),
    itemType VARCHAR(20) DEFAULT 'SINGLE',
    quantity INT NOT NULL DEFAULT 1,
    
    -- COMPOSITE PRIMARY KEY IS REQUIRED FOR CLOUD DBs (MySQL 8 Managed)
    PRIMARY KEY (packId, instrumentId),
    
    -- Foreign Keys
    CONSTRAINT fk_pack_items_pack FOREIGN KEY (packId) REFERENCES sterile_packs(id) ON DELETE CASCADE
);

-- FIX 2: Re-create Reporting Views for Dashboard
-- Note: Requires `SQL SECURITY INVOKER` to bypass 'Super User' permission error (Error 1227)

DROP VIEW IF EXISTS v_daily_summary;

CREATE 
    SQL SECURITY INVOKER 
VIEW v_daily_summary AS
SELECT 
    DATE_FORMAT(FROM_UNIXTIME(timestamp / 1000), '%Y-%m-%d') AS date,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN type = 'DISTRIBUTE' THEN 1 ELSE 0 END) as distribution_count,
    SUM(CASE WHEN type = 'COLLECT' THEN 1 ELSE 0 END) as collection_count
FROM transactions
GROUP BY date;


DROP VIEW IF EXISTS v_user_activity_summary;

CREATE 
    SQL SECURITY INVOKER 
VIEW v_user_activity_summary AS
SELECT 
    createdBy as user,
    COUNT(*) as activity_count,
    MAX(timestamp) as last_active
FROM transactions
WHERE createdBy IS NOT NULL
GROUP BY createdBy;


-- OPTIONAL: If table existed but empty, here is how you would sync data (needs Data Dump separately)
-- but creating the structure enables the app to start working again.
