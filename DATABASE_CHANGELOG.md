# Database Architecture Changelog

## Performance Optimization (v2.1)
**Date**: 2025-12-25
**Status**: Applied

### 1. Database Indexing
Added 15+ explicit indexes to improve query performance (lookup speed) for PostgreSQL:
*   **Foreign Keys**: Indexed all FK columns (PostgreSQL does not index them by default) to speed up Joins (e.g., `inventory_snapshots.instrumentid`).
*   **Transactions**: Indexed `timestamp`, `type`, and `unitid` for fast history filtering.
*   **Audit Logs**: Indexed `timestamp` and `userid` for instant log retrieval.
*   **Search**: Indexed `instruments.name` for faster keyword search.

### 2. Connection Tuning
*   Increased connection pool size to 20.
*   Configured idle timeout to 30s.
*   Enabled JSON Bzip compression for API responses.

---

## Migration to PostgreSQL (v2.0)

**Date**: 2025-12-25
**Status**: Completed

### 1. Conceptual Architecture (Diagram)
*   **Status**: **UNCHANGED**.
*   The logical entity relationships (Users, Units, Instruments, Sets, Transactions) remain identical to the MySQL version.
*   The `database_final.dbml` diagram remains valid for understanding the business logic and application flow.

### 2. Physical Implementation (Database)
*   **Engine**: Switched from **MySQL** to **PostgreSQL 16+**.
*   **Identifiers**: All table and column names in the database are now **lowercase** (`unitid`, `totalstock`) to comply with PostgreSQL best practices and avoid case-sensitivity issues.
*   **Data Types**: 
    *   `DATETIME` -> `TIMESTAMP`.
    *   `INT` -> `INTEGER`.
*   **Concurrency**: Replaced MySQL `ON DUPLICATE KEY UPDATE` with PostgreSQL `ON CONFLICT DO UPDATE`.
*   **Time Functions**: Replaced specific MySQL functions (`UNIX_TIMESTAMP`, `FROM_UNIXTIME`) with standard PostgreSQL equivalents (`EXTRACT(EPOCH)`, `to_timestamp`).

### 3. Application Layer (Backend)
*   **Adapter Pattern**: A compatibility layer (`db.js`) has been implemented to automatically map the PostgreSQL lowercase columns (e.g., `unitid`) back to the application's expected CamelCase format (e.g., `unitId`).
*   **Type Parsing**: Added automatic parsing to ensure `COUNT` and `SUM` operations return JavaScript `Numbers` instead of strings.
