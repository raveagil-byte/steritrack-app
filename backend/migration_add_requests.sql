-- Migration: Add Requests Tables
-- Purpose: Create tables for nurse request feature

USE steritrack;

-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
    id VARCHAR(50) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    unitId VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    requestedBy VARCHAR(100) NOT NULL,
    FOREIGN KEY (unitId) REFERENCES units(id)
);

-- Create request_items table
CREATE TABLE IF NOT EXISTS request_items (
    requestId VARCHAR(50),
    itemId VARCHAR(50),
    itemType VARCHAR(20) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    PRIMARY KEY (requestId, itemId),
    FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE CASCADE
);

-- Verify tables created
SHOW TABLES LIKE 'request%';
