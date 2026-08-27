-- Drop tables if they exist (clean setup)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS sar_reports CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS fraud_cases CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table (Investigators, Risk Analysts, Admin, Bank Employees)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Investigator', 'Risk Analyst', 'Bank Employee')),
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
    is_otp_verified BOOLEAN DEFAULT FALSE,
    otp_code VARCHAR(10),
    otp_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accounts Table (Bank Customers / Potential Mule Accounts)
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    risk_score FLOAT DEFAULT 0.0 CHECK (risk_score >= 0.0 AND risk_score <= 100.0),
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Frozen')),
    balance NUMERIC(15, 2) DEFAULT 0.00,
    phone_number VARCHAR(30),
    email VARCHAR(255),
    home_branch VARCHAR(100) DEFAULT 'Mumbai Main Branch',
    routing_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table (Transaction Log)
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    transaction_reference VARCHAR(100) UNIQUE NOT NULL,
    source_account_id INT REFERENCES accounts(id) ON DELETE CASCADE,
    destination_account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(50) DEFAULT 'Transfer' CHECK (type IN ('Transfer', 'Deposit', 'Withdrawal')),
    description TEXT,
    location_lat FLOAT,
    location_lon FLOAT,
    device_id VARCHAR(100),
    risk_score FLOAT DEFAULT 0.0 CHECK (risk_score >= 0.0 AND risk_score <= 100.0),
    risk_reasons TEXT, -- JSON or comma-separated reasons
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Blocked', 'Suspicious'))
);

-- Fraud Cases Table
CREATE TABLE fraud_cases (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'Under Investigation', 'Resolved', 'Closed')),
    severity VARCHAR(50) DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    summary TEXT,
    investigator_id INT REFERENCES users(id) ON DELETE SET NULL,
    account_id INT REFERENCES accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Predictions Table (AI Engine Output Log)
CREATE TABLE predictions (
    id SERIAL PRIMARY KEY,
    transaction_id INT REFERENCES transactions(id) ON DELETE CASCADE,
    xgb_score FLOAT NOT NULL,
    lgb_score FLOAT NOT NULL,
    iforest_score FLOAT NOT NULL,
    ensemble_score FLOAT NOT NULL,
    shap_values_json TEXT, -- JSON representation of local SHAP values
    prediction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alerts Table (Victim real-time alerting system)
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    victim_name VARCHAR(255),
    victim_phone VARCHAR(50),
    transaction_id INT REFERENCES transactions(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Sent' CHECK (status IN ('Sent', 'Acknowledged', 'Blocked', 'Escalated')),
    alert_type VARCHAR(50) DEFAULT 'SMS' CHECK (alert_type IN ('SMS', 'Push', 'Voice')),
    countdown_seconds INT DEFAULT 45,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table (History of push, SMS, email, browser warnings)
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    transaction_id INT REFERENCES transactions(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Sent' CHECK (status IN ('Sent', 'Delivered', 'Failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SAR Reports Table (Suspicious Activity Reports)
CREATE TABLE sar_reports (
    id SERIAL PRIMARY KEY,
    case_id INT REFERENCES fraud_cases(id) ON DELETE CASCADE,
    report_xml TEXT,
    report_pdf_base64 TEXT,
    filer_name VARCHAR(255) DEFAULT 'Bank of India AML Unit',
    subject_name VARCHAR(255),
    subject_account VARCHAR(100),
    summary_narrative TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Devices Table (Devices associated with user activity for IP/UUID fingerprinting)
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    account_id INT REFERENCES accounts(id) ON DELETE CASCADE,
    device_uuid VARCHAR(100) NOT NULL,
    device_name VARCHAR(255),
    os VARCHAR(100),
    ip_address VARCHAR(50),
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Locations Table (History of transactions locations for traveling speed check)
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    account_id INT REFERENCES accounts(id) ON DELETE CASCADE,
    country VARCHAR(100),
    city VARCHAR(100),
    ip_address VARCHAR(50),
    latitude FLOAT,
    longitude FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    target_table VARCHAR(100),
    record_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50)
);

-- Indexes for performance
CREATE INDEX idx_transactions_source ON transactions(source_account_id);
CREATE INDEX idx_transactions_dest ON transactions(destination_account_id);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX idx_accounts_number ON accounts(account_number);
CREATE INDEX idx_accounts_risk ON accounts(risk_score);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_fraud_cases_status ON fraud_cases(status);

-- Seed Initial Users (hashed passwords match 'password123')
INSERT INTO users (email, hashed_password, full_name, role, status, is_otp_verified) VALUES
('admin@boi.co.in', '$2b$12$.F/a9np3NR4oRfRg4KrzYO1q5PKAyWPkNxP3CnBsZpZ8GIjArQ2uS', 'Amit Sharma', 'Admin', 'Active', TRUE),
('analyst@boi.co.in', '$2b$12$.F/a9np3NR4oRfRg4KrzYO1q5PKAyWPkNxP3CnBsZpZ8GIjArQ2uS', 'Priya Patel', 'Risk Analyst', 'Active', TRUE),
('investigator@boi.co.in', '$2b$12$.F/a9np3NR4oRfRg4KrzYO1q5PKAyWPkNxP3CnBsZpZ8GIjArQ2uS', 'Rajesh Kumar', 'Investigator', 'Active', TRUE),
('clerk@boi.co.in', '$2b$12$.F/a9np3NR4oRfRg4KrzYO1q5PKAyWPkNxP3CnBsZpZ8GIjArQ2uS', 'Sunita Rao', 'Bank Employee', 'Active', TRUE);

-- Seed Initial Accounts (Bank of India Customers)
-- We will seed some normal high-net-worth individuals and a connected ring of suspicious accounts.
INSERT INTO accounts (account_number, customer_name, risk_score, status, balance, phone_number, email, home_branch, routing_number) VALUES
('BOI0010192830', 'Aditya Verma', 12.5, 'Active', 542000.00, '+919876543210', 'aditya.verma@email.com', 'Mumbai Nariman Point', 'BOID0000101'),
('BOI0020495811', 'Neha Deshmukh', 8.2, 'Active', 12450.50, '+919876543211', 'neha.d@email.com', 'Pune Main Branch', 'BOID0000205'),
('BOI0039281722', 'Rohan Malhotra', 87.5, 'Suspended', 1500.00, '+919876543212', 'rohan.m@email.com', 'Delhi Connaught Place', 'BOID0000301'),
-- Fraud controller
('BOI0099887766', 'Manoj Gowda (Controller)', 95.0, 'Suspended', 890000.00, '+919988776655', 'mgowda.fraud@tempmail.com', 'Mumbai Andheri', 'BOID0000112'),
-- Mule accounts connected to controller
('BOI0011223344', 'Suresh Kumar (Mule 1)', 82.1, 'Active', 45000.00, '+919123456780', 'sureshk@dispostable.com', 'Mumbai Andheri', 'BOID0000112'),
('BOI0022334455', 'Vikram Singh (Mule 2)', 78.4, 'Active', 62000.00, '+919123456781', 'vsingh@dispostable.com', 'Bengaluru MG Road', 'BOID0000408'),
('BOI0033445566', 'Kiran Joshi (Mule 3)', 84.9, 'Active', 18000.00, '+919123456782', 'kjoshi@dispostable.com', 'Chennai T-Nagar', 'BOID0000502'),
('BOI0044556677', 'Anjali Gupta (Mule 4)', 81.3, 'Active', 25000.00, '+919123456783', 'agupta@dispostable.com', 'Kolkata Salt Lake', 'BOID0000609'),
-- Victim accounts
('BOI0055667788', 'Vijay Mallya (Victim)', 15.0, 'Active', 12050000.00, '+919000000001', 'vmallya@legit.com', 'Mumbai Nariman Point', 'BOID0000101'),
('BOI0066778899', 'Deepak Hooda (Victim 2)', 10.4, 'Active', 423500.00, '+919000000002', 'dhooda@legit.com', 'Ahmedabad Branch', 'BOID0000711');

-- Seed Device signatures for accounts
INSERT INTO devices (account_id, device_uuid, device_name, os, ip_address, last_login) VALUES
(1, 'dev-uuid-aditya', 'iPhone 13 Pro', 'iOS 16.2', '103.45.12.18', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(2, 'dev-uuid-neha', 'OnePlus 10T', 'Android 13', '115.110.43.29', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
(3, 'dev-uuid-rohan', 'Redmi Note 11', 'Android 11', '49.12.94.133', CURRENT_TIMESTAMP - INTERVAL '4 days'),
(4, 'dev-uuid-manoj', 'Emulator-PC', 'Windows 11', '192.168.1.100', CURRENT_TIMESTAMP - INTERVAL '10 minutes'),
(5, 'dev-uuid-suresh', 'Samsung S22', 'Android 13', '103.88.22.41', CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
(6, 'dev-uuid-vikram', 'Oppo Reno 8', 'Android 12', '103.88.22.42', CURRENT_TIMESTAMP - INTERVAL '12 minutes'),
(7, 'dev-uuid-kiran', 'Vivo V25', 'Android 12', '103.88.22.43', CURRENT_TIMESTAMP - INTERVAL '15 minutes'),
(8, 'dev-uuid-anjali', 'iPhone 12', 'iOS 15.5', '103.88.22.44', CURRENT_TIMESTAMP - INTERVAL '20 minutes'),
(9, 'dev-uuid-vijay', 'MacBook Pro M2', 'macOS Ventura', '122.160.10.82', CURRENT_TIMESTAMP - INTERVAL '1 hour');

-- Seed Locations log
INSERT INTO locations (account_id, country, city, ip_address, latitude, longitude, timestamp) VALUES
(1, 'India', 'Mumbai', '103.45.12.18', 19.0760, 72.8777, CURRENT_TIMESTAMP - INTERVAL '1 day'),
(2, 'India', 'Pune', '115.110.43.29', 18.5204, 73.8567, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
(3, 'India', 'Delhi', '49.12.94.133', 28.6139, 77.2090, CURRENT_TIMESTAMP - INTERVAL '4 days'),
(4, 'India', 'Mumbai', '192.168.1.100', 19.0760, 72.8777, CURRENT_TIMESTAMP - INTERVAL '10 minutes'),
(5, 'India', 'Mumbai', '103.88.22.41', 19.0760, 72.8777, CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
(6, 'India', 'Bengaluru', '103.88.22.42', 12.9716, 77.5946, CURRENT_TIMESTAMP - INTERVAL '12 minutes'),
(7, 'India', 'Chennai', '103.88.22.43', 13.0827, 80.2707, CURRENT_TIMESTAMP - INTERVAL '15 minutes'),
(8, 'India', 'Kolkata', '103.88.22.44', 22.5726, 88.3639, CURRENT_TIMESTAMP - INTERVAL '20 minutes'),
(9, 'India', 'Mumbai', '122.160.10.82', 19.0760, 72.8777, CURRENT_TIMESTAMP - INTERVAL '1 hour');

-- Seed Transactions (Representing Fraud Ring transfers)
-- Step 1: The controller (Manoj) orchestrates high-value pulls from Victims to himself.
-- Step 2: The controller distributes matching amounts to multiple mules in small, rapid successions to dilute the trail.
INSERT INTO transactions (transaction_reference, source_account_id, destination_account_id, amount, timestamp, type, description, location_lat, location_lon, device_id, risk_score, risk_reasons, status) VALUES
('TXN9928172901', 9, 4, 150000.00, CURRENT_TIMESTAMP - INTERVAL '30 minutes', 'Transfer', 'Urgent Payment for Services', 19.0760, 72.8777, 'dev-uuid-vijay', 92.5, 'Velocity Spike, New Device, Location Shift', 'Suspicious'),
('TXN9928172902', 10, 4, 98000.00, CURRENT_TIMESTAMP - INTERVAL '25 minutes', 'Transfer', 'Investment Deposit', 23.0225, 72.5714, 'dev-uuid-manoj', 89.2, 'Rapid high volume transfer to new beneficiary', 'Suspicious'),
-- Layering phase: Controller (Manoj) payouts to Mules in rapid succession
('TXN9928172903', 4, 5, 45000.00, CURRENT_TIMESTAMP - INTERVAL '20 minutes', 'Transfer', 'Payout ref 102', 19.0760, 72.8777, 'dev-uuid-manoj', 94.8, 'Credit-Debit Symmetry, Holding Time < 5 mins', 'Suspicious'),
('TXN9928172904', 4, 6, 62000.00, CURRENT_TIMESTAMP - INTERVAL '18 minutes', 'Transfer', 'Payout ref 103', 19.0760, 72.8777, 'dev-uuid-manoj', 93.6, 'Credit-Debit Symmetry, High Velocity Ratio', 'Suspicious'),
('TXN9928172905', 4, 7, 18000.00, CURRENT_TIMESTAMP - INTERVAL '15 minutes', 'Transfer', 'Payout ref 104', 19.0760, 72.8777, 'dev-uuid-manoj', 95.1, 'Immediate layering payout, suspicious device fingerprint', 'Suspicious'),
('TXN9928172906', 4, 8, 25000.00, CURRENT_TIMESTAMP - INTERVAL '12 minutes', 'Transfer', 'Payout ref 105', 19.0760, 72.8777, 'dev-uuid-manoj', 92.0, 'Layering cluster network transfer', 'Suspicious'),
-- Normal legitimate transactions
('TXN9928172907', 1, 2, 5000.00, CURRENT_TIMESTAMP - INTERVAL '5 hours', 'Transfer', 'Monthly rent', 19.0760, 72.8777, 'dev-uuid-aditya', 3.2, 'Low Risk Profile', 'Approved'),
('TXN9928172908', 2, 1, 1200.00, CURRENT_TIMESTAMP - INTERVAL '3 hours', 'Transfer', 'Dinner bill split', 18.5204, 73.8567, 'dev-uuid-neha', 1.5, 'Regular interaction pattern', 'Approved');

-- Seed Predictions
INSERT INTO predictions (transaction_id, xgb_score, lgb_score, iforest_score, ensemble_score, shap_values_json, prediction_timestamp) VALUES
(1, 91.2, 93.4, 88.0, 92.5, '{"Velocity Spike": 35.2, "New Device": 25.1, "Location Shift": 20.3, "Credit-Debit Ratio": 11.9}', CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
(2, 88.1, 90.0, 85.5, 89.2, '{"High Volume": 40.5, "Beneficiary Age": 22.3, "Location Entropy": 15.2, "Credit-Debit Ratio": 11.2}', CURRENT_TIMESTAMP - INTERVAL '25 minutes'),
(3, 95.0, 96.1, 91.0, 94.8, '{"Holding Time": 45.1, "Credit-Debit Symmetry": 30.2, "Velocity Ratio": 12.0, "Night Transaction": 7.5}', CURRENT_TIMESTAMP - INTERVAL '20 minutes'),
(4, 92.5, 94.8, 90.2, 93.6, '{"Holding Time": 41.2, "Credit-Debit Symmetry": 33.4, "Velocity Ratio": 14.1, "Night Transaction": 4.9}', CURRENT_TIMESTAMP - INTERVAL '18 minutes');

-- Seed Alerts
INSERT INTO alerts (victim_name, victim_phone, transaction_id, status, alert_type, countdown_seconds, sent_at) VALUES
('Vijay Mallya', '+919000000001', 1, 'Sent', 'SMS', 45, CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
('Deepak Hooda', '+919000000002', 2, 'Escalated', 'Voice', 0, CURRENT_TIMESTAMP - INTERVAL '25 minutes');

-- Seed Fraud Cases
INSERT INTO fraud_cases (title, status, severity, summary, investigator_id, account_id, created_at, updated_at) VALUES
('Andheri Layering Ring A-09', 'Under Investigation', 'Critical', 'Suspicious payout flows identified from victim Vijay Mallya to controller Manoj Gowda, subsequently layered into Suresh Kumar, Vikram Singh, Kiran Joshi, and Anjali Gupta.', 3, 4, CURRENT_TIMESTAMP - INTERVAL '20 minutes', CURRENT_TIMESTAMP - INTERVAL '10 minutes');

-- Seed SAR Reports
INSERT INTO sar_reports (case_id, report_xml, filer_name, subject_name, subject_account, summary_narrative) VALUES
(1, '<?xml version="1.0" encoding="UTF-8"?><SAR><Header><FilerName>Bank of India AML Unit</FilerName></Header><Subject><Name>Manoj Gowda</Name><Account>BOI0099887766</Account></Subject></SAR>', 'Bank of India AML Unit', 'Manoj Gowda', 'BOI0099887766', 'Subject account was identified as a focal point in a layering network. Funds totaling 248,000 INR were transferred from high-value account holders and immediately disbursed to multiple recipient accounts within minutes, a pattern indicative of dynamic mule layering.');

-- Seed Audit logs
INSERT INTO audit_logs (user_id, action, target_table, record_id, timestamp, ip_address) VALUES
(1, 'User login successful', 'users', 1, CURRENT_TIMESTAMP - INTERVAL '1 hour', '192.168.1.1'),
(3, 'Viewed Fraud Case', 'fraud_cases', 1, CURRENT_TIMESTAMP - INTERVAL '15 minutes', '192.168.1.12'),
(3, 'Generated SAR Report', 'sar_reports', 1, CURRENT_TIMESTAMP - INTERVAL '5 minutes', '192.168.1.12');
