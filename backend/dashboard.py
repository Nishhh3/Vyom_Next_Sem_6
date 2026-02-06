import streamlit as st
import os
from datetime import datetime
from pathlib import Path
import pandas as pd
from PIL import Image
import sys
import json

# Import database module
try:
    import db
    DB_AVAILABLE = True
except ImportError:
    st.error("❌ Database module not found. Please ensure db.py is in the same directory.")
    DB_AVAILABLE = False

# Import email utilities
try:
    from email_utils import send_activation_email, send_rejection_email
    EMAIL_AVAILABLE = True
except ImportError:
    EMAIL_AVAILABLE = False
    print("⚠️ Email utilities not available - emails will not be sent")

# Page configuration
st.set_page_config(
    page_title="KYC Admin Dashboard",
    page_icon="🏦",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better UI
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1f77b4;
        text-align: center;
        padding: 1rem;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 10px;
        margin-bottom: 2rem;
    }
    .status-approved {
        background-color: #d4edda;
        color: #155724;
        padding: 1rem;
        border-radius: 5px;
        border-left: 5px solid #28a745;
        margin: 1rem 0;
    }
    .status-rejected {
        background-color: #f8d7da;
        color: #721c24;
        padding: 1rem;
        border-radius: 5px;
        border-left: 5px solid #dc3545;
        margin: 1rem 0;
    }
    .status-pending {
        background-color: #fff3cd;
        color: #856404;
        padding: 1rem;
        border-radius: 5px;
        border-left: 5px solid #ffc107;
        margin: 1rem 0;
    }
    .metric-card {
        background-color: #f8f9fa;
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        text-align: center;
    }
    .metric-value {
        font-size: 2rem;
        font-weight: bold;
        color: #1f77b4;
    }
    .metric-label {
        font-size: 1rem;
        color: #6c757d;
        margin-top: 0.5rem;
    }
    .image-container {
        border: 2px solid #dee2e6;
        border-radius: 10px;
        padding: 1rem;
        background-color: #ffffff;
    }
    .detail-box {
        background-color: #f8f9fa;
        padding: 1rem;
        border-radius: 5px;
        margin: 0.5rem 0;
    }
    .report-card {
        background-color: #e7f3ff;
        padding: 1.5rem;
        border-radius: 10px;
        border-left: 5px solid #2196F3;
        margin: 1rem 0;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if 'refresh_trigger' not in st.session_state:
    st.session_state.refresh_trigger = 0

def get_status_color(status):
    """Get color emoji for status badge"""
    colors = {
        'ACCEPTED': '🟢',
        'REJECTED': '🔴',
        'PENDING': '🟡',
        'MANUAL_REVIEW': '🟠'
    }
    return colors.get(status, '⚪')

def load_all_users():
    """Load all KYC users from database"""
    try:
        from psycopg2.extras import RealDictCursor
        conn = db.get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT id, email, aadhar_number, user_id, status, 
                   email_sent, created_at, updated_at
            FROM kyc_users
            ORDER BY created_at DESC
        """)
        
        users = cur.fetchall()
        conn.close()
        return [dict(user) for user in users]
    except Exception as e:
        st.error(f"Error loading users: {e}")
        return []

def get_user_details(user_id: int):
    """Get detailed user information including images"""
    try:
        from psycopg2.extras import RealDictCursor
        conn = db.get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT *
            FROM kyc_users
            WHERE id=%s
        """, (user_id,))
        
        user = cur.fetchone()
        conn.close()
        
        if user:
            # Convert to regular dict
            user = dict(user)
            
            # Create temp directory for images
            os.makedirs("temp", exist_ok=True)
            
            # Convert blob images to files
            if user.get('document_image'):
                doc_path = f"temp/doc_{user['id']}.jpg"
                db.blob_to_image(bytes(user['document_image']), doc_path)
                user['document_path'] = doc_path
            
            if user.get('registration_capture'):
                reg_path = f"temp/reg_{user['id']}.jpg"
                db.blob_to_image(bytes(user['registration_capture']), reg_path)
                user['registration_path'] = reg_path
            
            if user.get('webcam_image'):
                webcam_path = f"temp/webcam_{user['id']}.jpg"
                db.blob_to_image(bytes(user['webcam_image']), webcam_path)
                user['webcam_path'] = webcam_path
        
        return user
    except Exception as e:
        st.error(f"Error loading user details: {e}")
        return None

def load_verification_report(email: str):
    """Load verification report for a user"""
    try:
        report_dir = "verification_reports"
        if not os.path.exists(report_dir):
            return None
        
        # Find the most recent report for this email
        email_prefix = email.replace('@', '_')
        reports = [f for f in os.listdir(report_dir) if f.startswith(email_prefix) and f.endswith('.json')]
        
        if not reports:
            return None
        
        # Get most recent report
        reports.sort(reverse=True)
        report_path = os.path.join(report_dir, reports[0])
        
        with open(report_path, 'r') as f:
            report_data = json.load(f)
        
        return report_data
    except Exception as e:
        print(f"Error loading verification report: {e}")
        return None

def display_verification_report(report_data):
    """Display the verification report"""
    if not report_data:
        st.warning("📄 No verification report found")
        return
    
    st.markdown("### 📊 Verification Report")
    st.markdown('<div class="report-card">', unsafe_allow_html=True)
    
    # Basic info
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown(f"**Verification Time:**")
        st.write(report_data.get('timestamp', 'N/A'))
    
    with col2:
        st.markdown(f"**AI Model:**")
        st.write(report_data.get('settings', {}).get('model', 'N/A'))
    
    with col3:
        st.markdown(f"**Aadhar Number:**")
        st.write(report_data.get('aadhar_number', 'Not extracted'))
    
    # Verification results
    result = report_data.get('verification_result', {})
    
    st.markdown("---")
    st.markdown("**Verification Metrics:**")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        match = result.get('match', False)
        st.metric("Face Match", "✅ Yes" if match else "❌ No")
    
    with col2:
        confidence = result.get('confidence', 0)
        st.metric("Confidence", f"{confidence:.1f}%")
    
    with col3:
        risk = result.get('risk_score', 100)
        st.metric("Risk Score", f"{risk:.1f}/100")
    
    with col4:
        decision = result.get('decision', 'N/A')
        st.metric("Decision", decision)
    
    # Technical details
    with st.expander("🔍 Technical Details"):
        st.json({
            'Distance Score': result.get('distance', 0),
            'Threshold': result.get('threshold', 0),
            'Document Detection': f"{result.get('doc_detection_conf', 0):.1%}",
            'Webcam Detection': f"{result.get('webcam_detection_conf', 0):.1%}",
            'Liveness Check': result.get('liveness_check', {}),
            'Quality Checks': result.get('quality_checks', {}),
            'Preprocessing': result.get('preprocessing', {}),
            'Settings': report_data.get('settings', {})
        })
    
    st.markdown('</div>', unsafe_allow_html=True)

def display_metrics_dashboard(users):
    """Display key metrics"""
    total = len(users)
    accepted = sum(1 for u in users if u.get('status') == 'ACCEPTED')
    rejected = sum(1 for u in users if u.get('status') == 'REJECTED')
    pending = sum(1 for u in users if u.get('status') == 'PENDING')
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-value">{total}</div>
            <div class="metric-label">Total Registrations</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-value" style="color: #28a745;">{accepted}✅</div>
            <div class="metric-label">Accepted</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-value" style="color: #dc3545;">{rejected}❌</div>
            <div class="metric-label">Rejected</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col4:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-value" style="color: #ffc107;">{pending}⏳</div>
            <div class="metric-label">Pending Review</div>
        </div>
        """, unsafe_allow_html=True)

def display_image_comparison(user):
    """Display side-by-side image comparison"""
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("### 📄 Document Photo")
        if user.get('document_path') and os.path.exists(user['document_path']):
            st.image(user['document_path'], use_container_width=True)
        else:
            st.warning("Document image not available")
    
    with col2:
        st.markdown("### 📸 Registration Capture")
        if user.get('registration_path') and os.path.exists(user['registration_path']):
            st.image(user['registration_path'], use_container_width=True)
        else:
            st.warning("Registration capture not available")
    
    with col3:
        st.markdown("### 🎥 Verification Webcam")
        if user.get('webcam_path') and os.path.exists(user['webcam_path']):
            st.image(user['webcam_path'], use_container_width=True)
        else:
            st.info("No verification capture yet")

def display_detailed_report(user):
    """Display detailed user report"""
    st.markdown("---")
    st.markdown("## 📊 Detailed KYC Report")
    
    # Basic Information
    st.markdown("### 📋 Basic Information")
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown(f"""
        <div class="detail-box">
            <strong>User ID:</strong><br>
            {user.get('id', 'N/A')}
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown(f"""
        <div class="detail-box">
            <strong>Registration Date:</strong><br>
            {user.get('created_at', 'N/A')}
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        status = user.get('status', 'PENDING')
        status_class = 'status-approved' if status == 'ACCEPTED' else 'status-rejected' if status == 'REJECTED' else 'status-pending'
        st.markdown(f"""
        <div class="{status_class}">
            <strong>Status:</strong> {get_status_color(status)} {status}
        </div>
        """, unsafe_allow_html=True)
    
    # User Information
    st.markdown("### 👤 User Information")
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown(f"""
        <div class="detail-box">
            <strong>Email:</strong> {user.get('email', 'N/A')}<br>
            <strong>Aadhar Number:</strong> {user.get('aadhar_number', 'Not extracted')}
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown(f"""
        <div class="detail-box">
            <strong>Generated User ID:</strong> {user.get('user_id', 'Not generated')}<br>
            <strong>Email Sent:</strong> {'✅ Yes' if user.get('email_sent') else '❌ No'}
        </div>
        """, unsafe_allow_html=True)
    
    # Load and display verification report
    st.markdown("---")
    report_data = load_verification_report(user.get('email', ''))
    display_verification_report(report_data)
    
    # Image Comparison
    st.markdown("---")
    st.markdown("### 📸 Photo Verification")
    display_image_comparison(user)
    
    # Last Updated
    if user.get('updated_at'):
        st.markdown(f"**Last Updated:** {user.get('updated_at')}")

def update_user_status(user_id: int, new_status: str) -> bool:
    """Update user status in database"""
    try:
        conn = db.get_conn()
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE kyc_users
            SET status=%s, updated_at=%s
            WHERE id=%s
        """, (new_status, datetime.now(), user_id))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        st.error(f"Error updating status: {e}")
        return False

def generate_and_activate_user(email: str) -> tuple:
    """Generate user ID and password, then activate user and send email"""
    import random
    import string
    
    # Generate user ID: VYM + random 6 digits
    user_id = f"VYM{random.randint(100000, 999999)}"
    
    # Generate password: 8 characters alphanumeric
    password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    
    # Activate user in database
    success = db.activate_user(email, user_id, password)
    
    if success:
        # Send activation email
        if EMAIL_AVAILABLE:
            email_sent = send_activation_email(email, user_id, password)
            if email_sent:
                # Mark email as sent in database
                try:
                    conn = db.get_conn()
                    cur = conn.cursor()
                    cur.execute("""
                        UPDATE kyc_users
                        SET email_sent=TRUE
                        WHERE email=%s
                    """, (email,))
                    conn.commit()
                    conn.close()
                except Exception as e:
                    print(f"Error updating email_sent flag: {e}")
        return user_id, password
    else:
        return None, None

def main():
    # Header
    st.markdown('<div class="main-header">🏦 KYC Admin Dashboard</div>', unsafe_allow_html=True)
    
    if not DB_AVAILABLE:
        return
    
    # Sidebar
    with st.sidebar:
        st.markdown("## 🔧 Admin Controls")
        st.markdown("---")
        
        # Refresh button
        if st.button("🔄 Refresh Records", use_container_width=True):
            st.session_state.refresh_trigger += 1
            st.rerun()
        
        st.markdown("---")
        
        # Filter options
        st.markdown("### 🔍 Filters")
        status_filter = st.selectbox(
            "Filter by Status",
            ["All", "PENDING", "ACCEPTED", "REJECTED"]
        )
        
        st.markdown("---")
        st.markdown("### ℹ️ Information")
        st.info("""
        **Admin Dashboard Features:**
        - View all KYC registrations
        - Review verification reports
        - Review detailed reports
        - Approve/Reject applications
        - Generate user credentials
        - Track verification status
        """)
    
    # Load users
    users = load_all_users()
    
    # Apply filters
    if status_filter != "All":
        users = [u for u in users if u.get('status') == status_filter]
    
    # Display metrics
    all_users = load_all_users()  # For metrics, show all
    display_metrics_dashboard(all_users)
    
    st.markdown("---")
    
    # Main content
    if not users:
        st.warning("📭 No KYC registration records found.")
        st.info("💡 Records will appear here once users complete KYC registration.")
        return
    
    # Records table
    st.markdown("## 📋 KYC Registration Records")
    
    # Create dataframe for display
    df_data = []
    for user in users:
        df_data.append({
            'ID': user.get('id'),
            'Email': user.get('email', 'N/A'),
            'Aadhar': user.get('aadhar_number', 'Not extracted')[:10] + '...' if user.get('aadhar_number') else 'N/A',
            'Status': f"{get_status_color(user.get('status', 'PENDING'))} {user.get('status', 'PENDING')}",
            'User ID': user.get('user_id', 'Not generated'),
            'Email Sent': '✅' if user.get('email_sent') else '❌',
            'Created': str(user.get('created_at', 'N/A'))[:19] if user.get('created_at') else 'N/A'
        })
    
    df = pd.DataFrame(df_data)
    st.dataframe(df, use_container_width=True, hide_index=True)
    
    st.markdown("---")
    
    # Record selection
    st.markdown("## 🔍 Review Individual Record")
    
    user_options = {f"{u.get('id')} - {u.get('email', 'Unknown')}": u.get('id') for u in users}
    selected_option = st.selectbox(
        "Select a user to review:",
        list(user_options.keys())
    )
    
    if selected_option:
        selected_user_id = user_options[selected_option]
        selected_user = get_user_details(selected_user_id)
        
        if selected_user:
            # Display detailed report
            display_detailed_report(selected_user)
            
            st.markdown("---")
            
            # Admin Action Section
            st.markdown("## ⚖️ Admin Decision")
            
            current_status = selected_user.get('status', 'PENDING')
            
            col1, col2, col3 = st.columns([2, 2, 2])
            
            with col1:
                if st.button("✅ ACCEPT & GENERATE CREDENTIALS", type="primary", use_container_width=True,
                           disabled=(current_status == 'ACCEPTED')):
                    with st.spinner("Generating credentials..."):
                        user_id, password = generate_and_activate_user(selected_user['email'])
                        
                        if user_id and password:
                            success_msg = f"✅ User ACCEPTED!\n\n**User ID:** {user_id}\n\n**Password:** {password}"
                            if EMAIL_AVAILABLE:
                                success_msg += "\n\n📧 Activation email sent to user"
                            else:
                                success_msg += "\n\n⚠️ Email service not available - please send credentials manually"
                            st.success(success_msg)
                            st.info("💡 User can now login using credentials or face authentication")
                            st.session_state.refresh_trigger += 1
                            st.rerun()
                        else:
                            st.error("❌ Failed to generate credentials")
            
            with col2:
                if st.button("❌ REJECT", use_container_width=True,
                           disabled=(current_status == 'REJECTED')):
                    if update_user_status(selected_user_id, 'REJECTED'):
                        # Send rejection email
                        if EMAIL_AVAILABLE:
                            send_rejection_email(selected_user['email'])
                        st.error("❌ User REJECTED!")
                        st.session_state.refresh_trigger += 1
                        st.rerun()
                    else:
                        st.error("Failed to update status")
            
            with col3:
                if st.button("🔄 Reset to Pending", use_container_width=True):
                    if update_user_status(selected_user_id, 'PENDING'):
                        st.info("🔄 Status reset to PENDING")
                        st.session_state.refresh_trigger += 1
                        st.rerun()
                    else:
                        st.error("Failed to update status")
            
            # Show current credentials if available
            if selected_user.get('user_id') and selected_user.get('password'):
                st.markdown("---")
                st.markdown("### 🔑 Generated Credentials")
                col1, col2 = st.columns(2)
                with col1:
                    st.info(f"**User ID:** {selected_user.get('user_id')}")
                with col2:
                    st.info(f"**Password:** {selected_user.get('password')}")

if __name__ == "__main__":
    main()