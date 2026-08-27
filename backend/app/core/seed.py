from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.account import Account, Device, Location
from app.models.transaction import Transaction, Prediction
from app.models.fraud_case import FraudCase, SARReport
from app.models.alert import Alert
from app.models.audit import AuditLog

def seed_data(db: Session):
    # 1. Users
    seed_password_hash = "$2b$12$.F/a9np3NR4oRfRg4KrzYO1q5PKAyWPkNxP3CnBsZpZ8GIjArQ2uS"
    users = [
        User(id=1, email='admin@boi.co.in', hashed_password=seed_password_hash, full_name='Amit Sharma', role='Admin', status='Active', is_otp_verified=True),
        User(id=2, email='analyst@boi.co.in', hashed_password=seed_password_hash, full_name='Priya Patel', role='Risk Analyst', status='Active', is_otp_verified=True),
        User(id=3, email='investigator@boi.co.in', hashed_password=seed_password_hash, full_name='Rajesh Kumar', role='Investigator', status='Active', is_otp_verified=True),
        User(id=4, email='clerk@boi.co.in', hashed_password=seed_password_hash, full_name='Sunita Rao', role='Bank Employee', status='Active', is_otp_verified=True)
    ]
    for u in users:
        db.add(u)
    db.commit()

    # 2. Accounts
    accounts = [
        Account(id=1, account_number='BOI0010192830', customer_name='Aditya Verma', risk_score=12.5, status='Active', balance=542000.00, phone_number='+919876543210', email='aditya.verma@email.com', home_branch='Mumbai Nariman Point', routing_number='BOID0000101'),
        Account(id=2, account_number='BOI0020495811', customer_name='Neha Deshmukh', risk_score=8.2, status='Active', balance=12450.50, phone_number='+919876543211', email='neha.d@email.com', home_branch='Pune Main Branch', routing_number='BOID0000205'),
        Account(id=3, account_number='BOI0039281722', customer_name='Rohan Malhotra', risk_score=87.5, status='Suspended', balance=1500.00, phone_number='+919876543212', email='rohan.m@email.com', home_branch='Delhi Connaught Place', routing_number='BOID0000301'),
        Account(id=4, account_number='BOI0099887766', customer_name='Manoj Gowda (Controller)', risk_score=95.0, status='Suspended', balance=890000.00, phone_number='+919988776655', email='mgowda.fraud@tempmail.com', home_branch='Mumbai Andheri', routing_number='BOID0000112'),
        Account(id=5, account_number='BOI0011223344', customer_name='Suresh Kumar (Mule 1)', risk_score=82.1, status='Active', balance=45000.00, phone_number='+919123456780', email='sureshk@dispostable.com', home_branch='Mumbai Andheri', routing_number='BOID0000112'),
        Account(id=6, account_number='BOI0022334455', customer_name='Vikram Singh (Mule 2)', risk_score=78.4, status='Active', balance=62000.00, phone_number='+919123456781', email='vsingh@dispostable.com', home_branch='Bengaluru MG Road', routing_number='BOID0000408'),
        Account(id=7, account_number='BOI0033445566', customer_name='Kiran Joshi (Mule 3)', risk_score=84.9, status='Active', balance=18000.00, phone_number='+919123456782', email='kjoshi@dispostable.com', home_branch='Chennai T-Nagar', routing_number='BOID0000502'),
        Account(id=8, account_number='BOI0044556677', customer_name='Anjali Gupta (Mule 4)', risk_score=81.3, status='Active', balance=25000.00, phone_number='+919123456783', email='agupta@dispostable.com', home_branch='Kolkata Salt Lake', routing_number='BOID0000609'),
        Account(id=9, account_number='BOI0055667788', customer_name='Vijay Mallya (Victim)', risk_score=15.0, status='Active', balance=12050000.00, phone_number='+919000000001', email='vmallya@legit.com', home_branch='Mumbai Nariman Point', routing_number='BOID0000101'),
        Account(id=10, account_number='BOI0066778899', customer_name='Deepak Hooda (Victim 2)', risk_score=10.4, status='Active', balance=423500.00, phone_number='+919000000002', email='dhooda@legit.com', home_branch='Ahmedabad Branch', routing_number='BOID0000711')
    ]
    for a in accounts:
        db.add(a)
    db.commit()

    # 3. Devices
    now = datetime.utcnow()
    devices = [
        Device(id=1, account_id=1, device_uuid='dev-uuid-aditya', device_name='iPhone 13 Pro', os='iOS 16.2', ip_address='103.45.12.18', last_login=now - timedelta(days=1)),
        Device(id=2, account_id=2, device_uuid='dev-uuid-neha', device_name='OnePlus 10T', os='Android 13', ip_address='115.110.43.29', last_login=now - timedelta(hours=2)),
        Device(id=3, account_id=3, device_uuid='dev-uuid-rohan', device_name='Redmi Note 11', os='Android 11', ip_address='49.12.94.133', last_login=now - timedelta(days=4)),
        Device(id=4, account_id=4, device_uuid='dev-uuid-manoj', device_name='Emulator-PC', os='Windows 11', ip_address='192.168.1.100', last_login=now - timedelta(minutes=10)),
        Device(id=5, account_id=5, device_uuid='dev-uuid-suresh', device_name='Samsung S22', os='Android 13', ip_address='103.88.22.41', last_login=now - timedelta(minutes=5)),
        Device(id=6, account_id=6, device_uuid='dev-uuid-vikram', device_name='Oppo Reno 8', os='Android 12', ip_address='103.88.22.42', last_login=now - timedelta(minutes=12)),
        Device(id=7, account_id=7, device_uuid='dev-uuid-kiran', device_name='Vivo V25', os='Android 12', ip_address='103.88.22.43', last_login=now - timedelta(minutes=15)),
        Device(id=8, account_id=8, device_uuid='dev-uuid-anjali', device_name='iPhone 12', os='iOS 15.5', ip_address='103.88.22.44', last_login=now - timedelta(minutes=20)),
        Device(id=9, account_id=9, device_uuid='dev-uuid-vijay', device_name='MacBook Pro M2', os='macOS Ventura', ip_address='122.160.10.82', last_login=now - timedelta(hours=1))
    ]
    for d in devices:
        db.add(d)
    db.commit()

    # 4. Locations
    locations = [
        Location(id=1, account_id=1, country='India', city='Mumbai', ip_address='103.45.12.18', latitude=19.0760, longitude=72.8777, timestamp=now - timedelta(days=1)),
        Location(id=2, account_id=2, country='India', city='Pune', ip_address='115.110.43.29', latitude=18.5204, longitude=73.8567, timestamp=now - timedelta(hours=2)),
        Location(id=3, account_id=3, country='India', city='Delhi', ip_address='49.12.94.133', latitude=28.6139, longitude=77.2090, timestamp=now - timedelta(days=4)),
        Location(id=4, account_id=4, country='India', city='Mumbai', ip_address='192.168.1.100', latitude=19.0760, longitude=72.8777, timestamp=now - timedelta(minutes=10)),
        Location(id=5, account_id=5, country='India', city='Mumbai', ip_address='103.88.22.41', latitude=19.0760, longitude=72.8777, timestamp=now - timedelta(minutes=5)),
        Location(id=6, account_id=6, country='India', city='Bengaluru', ip_address='103.88.22.42', latitude=12.9716, longitude=77.5946, timestamp=now - timedelta(minutes=12)),
        Location(id=7, account_id=7, country='India', city='Chennai', ip_address='103.88.22.43', latitude=13.0827, longitude=80.2707, timestamp=now - timedelta(minutes=15)),
        Location(id=8, account_id=8, country='India', city='Kolkata', ip_address='103.88.22.44', latitude=22.5726, longitude=88.3639, timestamp=now - timedelta(minutes=20)),
        Location(id=9, account_id=9, country='India', city='Mumbai', ip_address='122.160.10.82', latitude=19.0760, longitude=72.8777, timestamp=now - timedelta(hours=1))
    ]
    for loc in locations:
        db.add(loc)
    db.commit()

    # 5. Transactions
    transactions = [
        Transaction(id=1, transaction_reference='TXN9928172901', source_account_id=9, destination_account_id=4, amount=150000.00, timestamp=now - timedelta(minutes=30), type='Transfer', description='Urgent Payment for Services', location_lat=19.0760, location_lon=72.8777, device_id='dev-uuid-vijay', risk_score=92.5, risk_reasons='Velocity Spike, New Device, Location Shift', status='Suspicious'),
        Transaction(id=2, transaction_reference='TXN9928172902', source_account_id=10, destination_account_id=4, amount=98000.00, timestamp=now - timedelta(minutes=25), type='Transfer', description='Investment Deposit', location_lat=23.0225, location_lon=72.5714, device_id='dev-uuid-manoj', risk_score=89.2, risk_reasons='Rapid high volume transfer to new beneficiary', status='Suspicious'),
        Transaction(id=3, transaction_reference='TXN9928172903', source_account_id=4, destination_account_id=5, amount=45000.00, timestamp=now - timedelta(minutes=20), type='Transfer', description='Payout ref 102', location_lat=19.0760, location_lon=72.8777, device_id='dev-uuid-manoj', risk_score=94.8, risk_reasons='Credit-Debit Symmetry, Holding Time < 5 mins', status='Suspicious'),
        Transaction(id=4, transaction_reference='TXN9928172904', source_account_id=4, destination_account_id=6, amount=62000.00, timestamp=now - timedelta(minutes=18), type='Transfer', description='Payout ref 103', location_lat=19.0760, location_lon=72.8777, device_id='dev-uuid-manoj', risk_score=93.6, risk_reasons='Credit-Debit Symmetry, High Velocity Ratio', status='Suspicious'),
        Transaction(id=5, transaction_reference='TXN9928172905', source_account_id=4, destination_account_id=7, amount=18000.00, timestamp=now - timedelta(minutes=15), type='Transfer', description='Payout ref 104', location_lat=19.0760, location_lon=72.8777, device_id='dev-uuid-manoj', risk_score=95.1, risk_reasons='Immediate layering payout, suspicious device fingerprint', status='Suspicious'),
        Transaction(id=6, transaction_reference='TXN9928172906', source_account_id=4, destination_account_id=8, amount=25000.00, timestamp=now - timedelta(minutes=12), type='Transfer', description='Payout ref 105', location_lat=19.0760, location_lon=72.8777, device_id='dev-uuid-manoj', risk_score=92.0, risk_reasons='Layering cluster network transfer', status='Suspicious'),
        Transaction(id=7, transaction_reference='TXN9928172907', source_account_id=1, destination_account_id=2, amount=5000.00, timestamp=now - timedelta(hours=5), type='Transfer', description='Monthly rent', location_lat=19.0760, location_lon=72.8777, device_id='dev-uuid-aditya', risk_score=3.2, risk_reasons='Low Risk Profile', status='Approved'),
        Transaction(id=8, transaction_reference='TXN9928172908', source_account_id=2, destination_account_id=1, amount=1200.00, timestamp=now - timedelta(hours=3), type='Transfer', description='Dinner bill split', location_lat=18.5204, location_lon=73.8567, device_id='dev-uuid-neha', risk_score=1.5, risk_reasons='Regular interaction pattern', status='Approved')
    ]
    for tx in transactions:
        db.add(tx)
    db.commit()

    # 6. Predictions
    predictions = [
        Prediction(id=1, transaction_id=1, xgb_score=91.2, lgb_score=93.4, iforest_score=88.0, ensemble_score=92.5, shap_values_json='{"Velocity Spike": 35.2, "New Device": 25.1, "Location Shift": 20.3, "Credit-Debit Ratio": 11.9}', prediction_timestamp=now - timedelta(minutes=30)),
        Prediction(id=2, transaction_id=2, xgb_score=88.1, lgb_score=90.0, iforest_score=85.5, ensemble_score=89.2, shap_values_json='{"High Volume": 40.5, "Beneficiary Age": 22.3, "Location Entropy": 15.2, "Credit-Debit Ratio": 11.2}', prediction_timestamp=now - timedelta(minutes=25)),
        Prediction(id=3, transaction_id=3, xgb_score=95.0, lgb_score=96.1, iforest_score=91.0, ensemble_score=94.8, shap_values_json='{"Holding Time": 45.1, "Credit-Debit Symmetry": 30.2, "Velocity Ratio": 12.0, "Night Transaction": 7.5}', prediction_timestamp=now - timedelta(minutes=20)),
        Prediction(id=4, transaction_id=4, xgb_score=92.5, lgb_score=94.8, iforest_score=90.2, ensemble_score=93.6, shap_values_json='{"Holding Time": 41.2, "Credit-Debit Symmetry": 33.4, "Velocity Ratio": 14.1, "Night Transaction": 4.9}', prediction_timestamp=now - timedelta(minutes=18))
    ]
    for p in predictions:
        db.add(p)
    db.commit()

    # 7. Alerts
    alerts = [
        Alert(id=1, victim_name='Vijay Mallya', victim_phone='+919000000001', transaction_id=1, status='Sent', alert_type='SMS', countdown_seconds=45, sent_at=now - timedelta(minutes=30)),
        Alert(id=2, victim_name='Deepak Hooda', victim_phone='+919000000002', transaction_id=2, status='Escalated', alert_type='Voice', countdown_seconds=0, sent_at=now - timedelta(minutes=25))
    ]
    for al in alerts:
        db.add(al)
    db.commit()

    # 8. Fraud Cases
    fraud_cases = [
        FraudCase(id=1, title='Andheri Layering Ring A-09', status='Under Investigation', severity='Critical', summary='Suspicious payout flows identified from victim Vijay Mallya to controller Manoj Gowda, subsequently layered into Suresh Kumar, Vikram Singh, Kiran Joshi, and Anjali Gupta.', investigator_id=3, account_id=4, created_at=now - timedelta(minutes=20), updated_at=now - timedelta(minutes=10))
    ]
    for fc in fraud_cases:
        db.add(fc)
    db.commit()

    # 9. SAR Reports
    sar_reports = [
        SARReport(id=1, case_id=1, report_xml='<?xml version="1.0" encoding="UTF-8"?><SAR><Header><FilerName>Bank of India AML Unit</FilerName></Header><Subject><Name>Manoj Gowda</Name><Account>BOI0099887766</Account></Subject></SAR>', filer_name='Bank of India AML Unit', subject_name='Manoj Gowda', subject_account='BOI0099887766', summary_narrative='Subject account was identified as a focal point in a layering network. Funds totaling 248,000 INR were transferred from high-value account holders and immediately disbursed to multiple recipient accounts within minutes, a pattern indicative of dynamic mule layering.', created_at=now - timedelta(minutes=5))
    ]
    for sar in sar_reports:
        db.add(sar)
    db.commit()

    # 10. Audit Logs
    audit_logs = [
        AuditLog(id=1, user_id=1, action='User login successful', target_table='users', record_id=1, timestamp=now - timedelta(hours=1), ip_address='192.168.1.1'),
        AuditLog(id=2, user_id=3, action='Viewed Fraud Case', target_table='fraud_cases', record_id=1, timestamp=now - timedelta(minutes=15), ip_address='192.168.1.12'),
        AuditLog(id=3, user_id=3, action='Generated SAR Report', target_table='sar_reports', record_id=1, timestamp=now - timedelta(minutes=5), ip_address='192.168.1.12')
    ]
    for aud in audit_logs:
        db.add(aud)
    db.commit()
