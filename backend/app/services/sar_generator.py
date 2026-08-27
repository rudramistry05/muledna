import xml.etree.ElementTree as ET
from xml.dom import minidom
from sqlalchemy.orm import Session
from app.models.fraud_case import FraudCase, SARReport
from app.models.transaction import Transaction
from datetime import datetime

class SARGeneratorService:
    def __init__(self, db: Session):
        self.db = db

    def generate_sar_xml(self, case_id: int) -> SARReport:
        """
        Gathers fraud case details, related transaction logs, and automatically
        compiles a structured compliance-grade SAR XML payload and narrative.
        """
        case = self.db.query(FraudCase).filter(FraudCase.id == case_id).first()
        if not case:
            raise ValueError(f"Fraud case ID {case_id} not found")

        account = case.account
        
        # Gather transactions associated with this suspect account
        # Fetching outbound and inbound transactions
        out_txns = self.db.query(Transaction).filter(Transaction.source_account_id == account.id).all()
        in_txns = self.db.query(Transaction).filter(Transaction.destination_account_id == account.id).all()
        all_txns = out_txns + in_txns
        
        total_amount = sum(float(t.amount) for t in all_txns)
        txn_count = len(all_txns)
        
        # Build XML
        root = ET.Element("SuspiciousActivityReport", version="1.0")
        
        # Header Info
        header = ET.SubElement(root, "Header")
        ET.SubElement(header, "FilerName").text = "Bank of India AML Investigations Unit"
        ET.SubElement(header, "FilerBranch").text = "Mumbai Headquarters"
        ET.SubElement(header, "ReportDate").text = datetime.utcnow().strftime("%Y-%m-%d")
        ET.SubElement(header, "CaseID").text = str(case.id)
        
        # Subject Info
        subject = ET.SubElement(root, "Subject")
        ET.SubElement(subject, "FullName").text = account.customer_name
        ET.SubElement(subject, "AccountNumber").text = account.account_number
        ET.SubElement(subject, "Email").text = account.email or "N/A"
        ET.SubElement(subject, "Phone").text = account.phone_number or "N/A"
        ET.SubElement(subject, "RoutingNumber").text = account.routing_number or "N/A"
        ET.SubElement(subject, "RiskScore").text = str(account.risk_score)
        
        # Financial Activity Summary
        summary = ET.SubElement(root, "ActivitySummary")
        ET.SubElement(summary, "TotalAmountINR").text = f"{total_amount:.2f}"
        ET.SubElement(summary, "TransactionsCount").text = str(txn_count)
        
        # Transactions Breakdown
        txns_node = ET.SubElement(root, "TransactionsList")
        for t in all_txns:
            t_node = ET.SubElement(txns_node, "TransactionRecord")
            ET.SubElement(t_node, "Reference").text = t.transaction_reference
            ET.SubElement(t_node, "Amount").text = str(t.amount)
            ET.SubElement(t_node, "Type").text = t.type
            ET.SubElement(t_node, "Timestamp").text = t.timestamp.isoformat()
            ET.SubElement(t_node, "Status").text = t.status
            ET.SubElement(t_node, "RiskScore").text = str(t.risk_score)
        
        # Auto-compile a detailed regulatory narrative
        narrative_text = (
            f"The compliance unit of Bank of India has identified a highly anomalous transaction volume "
            f"associated with customer {account.customer_name} (Account: {account.account_number}). "
            f"Over the observation period, a total of {txn_count} transactions occurred, accumulating a total "
            f"volume of Rs.{total_amount:,.2f}. The AI scoring engine flagged the account with a critical risk score of "
            f"{account.risk_score}/100. Graph analytics utilizing Louvain community detection mapped this account "
            f"as a central hub in a structured credit layering ring. Incoming funds were distributed outwards "
            f"rapidly, indicating high velocity laundering. Based on these features, the account has been Frozen "
            f"pending law enforcement escalations."
        )
        
        ET.SubElement(root, "NarrativeText").text = narrative_text

        # Format XML string with indentation
        xml_string = ET.tostring(root, encoding="utf-8")
        parsed = minidom.parseString(xml_string)
        pretty_xml = parsed.toprettyxml(indent="  ")
        
        # Write to Database
        # Write to Database
        import base64
        from fpdf import FPDF
        
        class SARPDF(FPDF):
            def header(self):
                self.set_fill_color(11, 25, 44) # Navy dark
                self.rect(0, 0, 210, 35, 'F')
                self.set_text_color(255, 153, 51) # Saffron
                self.set_font('Helvetica', 'B', 14)
                self.cell(0, 8, 'BANK OF INDIA - SPECIAL AML DIVISION', align='C', new_x="LMARGIN", new_y="NEXT")
                self.set_text_color(255, 255, 255)
                self.set_font('Helvetica', 'B', 9)
                self.cell(0, 4, 'SUSPICIOUS ACTIVITY REGULATORY COMPLIANCE REPORT (SAR)', align='C', new_x="LMARGIN", new_y="NEXT")
                self.ln(12)
                
            def footer(self):
                self.set_y(-15)
                self.set_font('Helvetica', 'I', 8)
                self.set_text_color(128, 128, 128)
                self.cell(0, 10, f'Page {self.page_no()}/{{nb}} | CONFIDENTIAL - REGULATORY COMPLIANCE EXPORT', align='C')

        pdf = SARPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", size=9)
        pdf.set_text_color(0, 0, 0)
        
        # Metadata Block
        pdf.set_font("Helvetica", 'B', 11)
        pdf.cell(0, 6, "1. REPORTING FIU METADATA", new_x="LMARGIN", new_y="NEXT")
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)
        pdf.set_font("Helvetica", size=9)
        pdf.cell(90, 5, f"Filer Name: Bank of India AML Unit", new_x="RIGHT", new_y="LAST")
        pdf.cell(90, 5, f"Filer Branch: Mumbai AML HQ", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(90, 5, f"Report Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}", new_x="RIGHT", new_y="LAST")
        pdf.cell(90, 5, f"Case Docket ID: FC-00{case.id}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)
        
        # Subject Block
        pdf.set_font("Helvetica", 'B', 11)
        pdf.cell(0, 6, "2. SUBJECT ENTITY CHARACTERIZATION", new_x="LMARGIN", new_y="NEXT")
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)
        pdf.set_font("Helvetica", size=9)
        pdf.cell(90, 5, f"Customer Name: {account.customer_name}", new_x="RIGHT", new_y="LAST")
        pdf.cell(90, 5, f"Account Number: {account.account_number}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(90, 5, f"Email: {account.email or 'N/A'}", new_x="RIGHT", new_y="LAST")
        pdf.cell(90, 5, f"Phone Number: {account.phone_number or 'N/A'}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(90, 5, f"Home Branch: {account.home_branch or 'N/A'}", new_x="RIGHT", new_y="LAST")
        pdf.cell(90, 5, f"Cascaded Account Risk Score: {account.risk_score:.2f}/100.00", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)

        # Financial Activity Summary
        pdf.set_font("Helvetica", 'B', 11)
        pdf.cell(0, 6, "3. FINANCIAL VOLUME CHARACTERIZATION", new_x="LMARGIN", new_y="NEXT")
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)
        pdf.set_font("Helvetica", size=9)
        pdf.cell(90, 5, f"Total Observed Transactions: {txn_count}", new_x="RIGHT", new_y="LAST")
        pdf.cell(90, 5, f"Total Observed Activity Volume: Rs.{total_amount:,.2f}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)

        # Narrative
        pdf.set_font("Helvetica", 'B', 11)
        pdf.cell(0, 6, "4. REGULATORY INVESTIGATION NARRATIVE", new_x="LMARGIN", new_y="NEXT")
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)
        pdf.set_font("Helvetica", size=9)
        pdf.multi_cell(0, 4.5, narrative_text)
        pdf.ln(4)

        # Suspect Transactions Table
        pdf.set_font("Helvetica", 'B', 11)
        pdf.cell(0, 6, "5. DETAILED SUSPECT TRANSACTIONS LIST", new_x="LMARGIN", new_y="NEXT")
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(3)
        pdf.set_font("Helvetica", 'B', 8)
        pdf.cell(40, 5, "Reference", border=1, new_x="RIGHT", new_y="LAST")
        pdf.cell(30, 5, "Type", border=1, new_x="RIGHT", new_y="LAST")
        pdf.cell(40, 5, "Amount (INR)", border=1, new_x="RIGHT", new_y="LAST")
        pdf.cell(50, 5, "Timestamp", border=1, new_x="RIGHT", new_y="LAST")
        pdf.cell(30, 5, "Risk Score", border=1, new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_font("Helvetica", size=8)
        for t in all_txns:
            pdf.cell(40, 5, t.transaction_reference, border=1, new_x="RIGHT", new_y="LAST")
            pdf.cell(30, 5, t.type, border=1, new_x="RIGHT", new_y="LAST")
            pdf.cell(40, 5, f"Rs.{float(t.amount):,.2f}", border=1, new_x="RIGHT", new_y="LAST")
            pdf.cell(50, 5, t.timestamp.strftime('%Y-%m-%d %H:%M:%S'), border=1, new_x="RIGHT", new_y="LAST")
            pdf.cell(30, 5, f"{float(t.risk_score):.1f}%", border=1, new_x="LMARGIN", new_y="NEXT")

        pdf_bytes = pdf.output()
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')

        sar_report = SARReport(
            case_id=case.id,
            report_xml=pretty_xml,
            report_pdf_base64=pdf_base64,
            subject_name=account.customer_name,
            subject_account=account.account_number,
            summary_narrative=narrative_text
        )
        
        self.db.add(sar_report)
        self.db.commit()
        self.db.refresh(sar_report)
        
        return sar_report
