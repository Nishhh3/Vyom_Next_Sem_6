"""
build_faq_index.py
------------------
Parses VyomNext_RAG_Training_FAQs.pdf and builds a FAISS index.
Run once from the backend root directory:

    python build_faq_index.py

Prerequisites:
    pip install sentence-transformers faiss-cpu groq PyPDF2
"""

import os
import re
import sys

# ── Make sure we can import from services/ ────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

PDF_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "VyomNext_RAG_Training_FAQs.pdf")


# ── Parse PDF into Q&A pairs ──────────────────────────────────

def parse_pdf(pdf_path: str) -> list:
    """Extract Q&A pairs from the FAQ PDF."""
    try:
        import PyPDF2
    except ImportError:
        print("❌ PyPDF2 not installed. Run: pip install PyPDF2")
        sys.exit(1)

    print(f"📄 Reading PDF: {pdf_path}")

    if not os.path.exists(pdf_path):
        print(f"❌ PDF not found at: {pdf_path}")
        print("   Make sure VyomNext_RAG_Training_FAQs.pdf is in your backend root folder.")
        sys.exit(1)

    # Extract all text from PDF
    full_text = ""
    with open(pdf_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            full_text += page.extract_text() + "\n"

    print(f"   Extracted {len(full_text)} characters from {len(reader.pages)} pages")

    # Parse Q&A pairs using regex
    # Pattern: Q1. ... A1. ... Q2. ... etc.
    pattern = re.compile(
        r'Q(\d+)\.\s*(.+?)\s*A\1\.\s*(.+?)(?=Q\d+\.|$)',
        re.DOTALL
    )

    faqs = []
    matches = pattern.findall(full_text)

    for num, question, answer in matches:
        q = question.strip().replace("\n", " ")
        a = answer.strip().replace("\n", " ")
        # Clean up multiple spaces
        q = re.sub(r'\s+', ' ', q)
        a = re.sub(r'\s+', ' ', a)
        if q and a:
            faqs.append({"q": q, "a": a})

    print(f"   Parsed {len(faqs)} Q&A pairs")
    return faqs


# ── Fallback FAQs if PDF parsing fails ───────────────────────

FALLBACK_FAQS = [
    {"q": "What is VyomNext?", "a": "VyomNext is a unified financial platform that allows users to manage bank accounts, payments, and financial services in one place."},
    {"q": "How do I create an account on VyomNext?", "a": "You can create an account by registering with your mobile number, email ID, and completing verification."},
    {"q": "Is VyomNext free to use?", "a": "Yes, basic services on VyomNext are free. Certain premium features may have charges."},
    {"q": "How do I log in to my VyomNext account?", "a": "You can log in using your registered user ID and password or via secure authentication methods."},
    {"q": "What should I do if I forget my password?", "a": "Use the Forgot Password option to reset your password using OTP verification."},
    {"q": "How is my data secured on VyomNext?", "a": "VyomNext uses encryption, secure authentication, and compliance standards to protect user data."},
    {"q": "Can I link multiple bank accounts?", "a": "Yes, VyomNext allows linking multiple bank accounts from supported banks."},
    {"q": "Which banks are supported?", "a": "VyomNext supports major public and private sector banks including ICICI, SBI, and HDFC."},
    {"q": "How do I link my bank account?", "a": "Go to Bank Accounts section, select your bank, and complete verification."},
    {"q": "Why did my bank linking fail?", "a": "Bank linking may fail due to incorrect details, network issues, or bank downtime."},
    {"q": "What should I do if my payment fails?", "a": "Check your bank balance and transaction status. If the amount is deducted, wait or contact support."},
    {"q": "Why was money deducted but payment failed?", "a": "This usually occurs due to bank processing delays. The amount is typically reversed within 3-5 working days."},
    {"q": "How long do refunds take?", "a": "Refunds usually take 3-7 working days depending on the bank."},
    {"q": "Can I track my transaction history?", "a": "Yes, all transactions are available in the transaction history section."},
    {"q": "What is a transaction ID?", "a": "A transaction ID is a unique identifier generated for every transaction."},
    {"q": "How do I report an unauthorized transaction?", "a": "Immediately raise a support ticket and temporarily block your account if needed."},
    {"q": "Is KYC mandatory?", "a": "Yes, KYC is mandatory to access all financial services on VyomNext."},
    {"q": "How do I complete KYC?", "a": "Upload valid identity documents and complete verification as instructed."},
    {"q": "What documents are required for KYC?", "a": "PAN card, Aadhaar card, or other government-approved documents are required."},
    {"q": "Why was my KYC rejected?", "a": "KYC may be rejected due to unclear documents or mismatched details."},
    {"q": "Can I reapply for KYC?", "a": "Yes, you can resubmit corrected documents."},
    {"q": "How do I update my personal details?", "a": "Go to Profile Settings and update your information."},
    {"q": "Is my Aadhaar number stored securely?", "a": "Yes, Aadhaar data is encrypted and handled as per compliance standards."},
    {"q": "What should I do if the app crashes?", "a": "Restart the app, update to the latest version, or contact support."},
    {"q": "Does VyomNext support UPI payments?", "a": "Yes, VyomNext supports UPI payments."},
    {"q": "How do I change my registered mobile number?", "a": "Submit a request through profile settings and verify via OTP."},
    {"q": "What is a transaction PIN?", "a": "A transaction PIN is a secure PIN required to authorize payments."},
    {"q": "How do I reset my transaction PIN?", "a": "Use the reset option with OTP verification."},
    {"q": "Why is my transaction PIN blocked?", "a": "Multiple incorrect attempts may temporarily block the PIN."},
    {"q": "Can I use VyomNext internationally?", "a": "Currently, VyomNext services are limited to domestic transactions."},
    {"q": "What should I do if OTP is not received?", "a": "Wait a few minutes and retry. Check network connectivity."},
    {"q": "Is VyomNext RBI compliant?", "a": "Yes, VyomNext follows applicable RBI and regulatory guidelines."},
    {"q": "How do I close my VyomNext account?", "a": "Submit an account closure request via support."},
    {"q": "Are there daily transaction limits?", "a": "Yes, limits vary based on account type and KYC status."},
    {"q": "How do I contact customer support?", "a": "Use the in-app Help Center to chat or raise a ticket."},
    {"q": "Can I upload screenshots for support?", "a": "Yes, screenshots and recordings can be uploaded."},
    {"q": "How long does support take to respond?", "a": "Response times vary based on issue priority."},
    {"q": "What happens after I raise a ticket?", "a": "An agent reviews your issue and connects with you if required."},
    {"q": "Can I see my previous tickets?", "a": "Yes, all past tickets are available in the Help Center."},
    {"q": "What is priority support?", "a": "High-impact issues such as failed payments are prioritized."},
    {"q": "Can I cancel a pending transaction?", "a": "Pending transactions cannot be canceled but may auto-fail."},
    {"q": "Why is my balance not updated?", "a": "Balance updates may be delayed due to bank processing."},
    {"q": "Is screen recording safe to upload?", "a": "Yes, uploaded media is securely stored and accessed only by support."},
    {"q": "Does VyomNext use AI for support?", "a": "Yes, AI is used for faster issue resolution."},
    {"q": "Can I talk to a human agent?", "a": "Yes, you can request to connect with an agent anytime."},
    {"q": "What happens if AI cannot solve my issue?", "a": "Your issue is escalated to a human support agent."},
    {"q": "Are chat conversations recorded?", "a": "Yes, chats are recorded for quality and compliance."},
    {"q": "How is AI trained in VyomNext?", "a": "AI is trained using FAQs, past tickets, and internal documentation."},
    {"q": "Can AI access my personal data?", "a": "AI only accesses limited, masked data required for support."},
    {"q": "What browsers are supported?", "a": "VyomNext works on all modern browsers."},
    {"q": "Is there a mobile app?", "a": "Yes, VyomNext is available on mobile platforms."},
    {"q": "Why am I logged out automatically?", "a": "This may occur due to inactivity or security policies."},
    {"q": "How do I enable notifications?", "a": "Enable notifications from app settings."},
    {"q": "What if my bank is temporarily unavailable?", "a": "Please wait and try again later."},
    {"q": "How do I report a technical bug?", "a": "Use the Help Center to report bugs with details."},
    {"q": "Can I export my transaction data?", "a": "Yes, transaction history can be downloaded."},
    {"q": "Is my money safe on VyomNext?", "a": "VyomNext does not store money; banks handle funds securely."},
    {"q": "Does VyomNext store card details?", "a": "No, card details are tokenized and not stored."},
    {"q": "What is auto-resolution?", "a": "Auto-resolution means AI resolves the issue instantly."},
    {"q": "How do I give feedback on support?", "a": "You can rate the support experience after resolution."},
    {"q": "Why was my account temporarily blocked?", "a": "Suspicious activity or security concerns may cause blocking."},
    {"q": "How do I unblock my account?", "a": "Contact support for verification and unblocking."},
    {"q": "Can I use the same account on multiple devices?", "a": "Yes, but simultaneous logins may be restricted."},
    {"q": "What if I see incorrect transaction data?", "a": "Report the issue immediately via Help Center."},
    {"q": "Is VyomNext scalable for businesses?", "a": "VyomNext is designed to scale for individual and business use."},
    {"q": "Does VyomNext support multiple languages?", "a": "Multi-language support is planned for future updates."},
    {"q": "How often is the system updated?", "a": "The platform is updated regularly for security and features."},
    {"q": "Where can I read terms and conditions?", "a": "Terms and conditions are available on the official website."},
    {"q": "Who can access my support tickets?", "a": "Only authorized support staff can access tickets."},
    {"q": "Can I delete my data?", "a": "Data deletion requests can be submitted to support."},
    {"q": "What happens if a refund fails?", "a": "The issue is escalated automatically for manual review."},
    {"q": "How does VyomNext handle fraud?", "a": "Advanced monitoring and alerts are used to detect fraud."},
    {"q": "Can I reopen a closed ticket?", "a": "Yes, tickets can be reopened if the issue persists."},
    {"q": "Does VyomNext learn from resolved issues?", "a": "Yes, resolved tickets improve AI accuracy."},
    {"q": "Is customer support available 24/7?", "a": "Support availability depends on issue type and priority."},
    {"q": "How do I know my issue is resolved?", "a": "You will receive a confirmation notification."},
]


# ── Main ──────────────────────────────────────────────────────

def main():
    print("\n🔧 VyomNext FAQ FAISS Index Builder")
    print("=" * 45)

    # Try parsing PDF first
    faqs = []
    try:
        faqs = parse_pdf(PDF_PATH)
    except SystemExit:
        raise
    except Exception as e:
        print(f"⚠️  PDF parsing failed: {e}")

    # Fall back to hardcoded FAQs if parsing returned too few
    if len(faqs) < 10:
        print(f"⚠️  Only {len(faqs)} FAQs parsed from PDF — using built-in FAQ list instead")
        faqs = FALLBACK_FAQS

    print(f"\n📊 Total FAQs to index: {len(faqs)}")
    print("\nSample FAQs:")
    for faq in faqs[:3]:
        print(f"  Q: {faq['q']}")
        print(f"  A: {faq['a'][:80]}...")
        print()

    # Import and build
    try:
        from services.rag_engine import build_index
    except ImportError:
        try:
            from services.rag_engine import build_index
        except ImportError:
            print("❌ Could not import rag_engine. Make sure you're in the backend directory.")
            sys.exit(1)

    print("🔄 Building FAISS index (this takes ~30 seconds on first run)...")
    success = build_index(faqs)

    if success:
        print("\n✅ FAQ index built successfully!")
        print("   You can now start the FastAPI server and test /api/support/chat")
        print("\n🧪 Quick test:")
        print("   python -c \"from services.rag_engine import chat_with_rag; print(chat_with_rag('What is VyomNext?'))\"")
    else:
        print("\n❌ Index building failed. Check errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()