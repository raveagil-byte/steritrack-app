-- SQL Fix for Sterilization Tables on Cloud/Existing DB
-- Run this if you already have the tables but with old column names

-- 1. Rename machineNumber -> machine
ALTER TABLE sterilization_batches CHANGE COLUMN machineNumber machine VARCHAR(50) DEFAULT 'Autoclave 1';

-- 2. Rename instrumentId -> itemId
ALTER TABLE sterilization_batch_items CHANGE COLUMN instrumentId itemId VARCHAR(50);
