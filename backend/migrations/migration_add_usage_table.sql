CREATE TABLE IF NOT EXISTS usage_logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    unit_id VARCHAR(50) NOT NULL,
    patient_id VARCHAR(50),
    patient_name VARCHAR(100),
    doctor_name VARCHAR(100),
    procedure_id VARCHAR(50),
    items JSON,
    logged_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
