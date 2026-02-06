import streamlit as st
import cv2
import os
from datetime import datetime
import numpy as np
import time

# Import the face verification utilities
try:
    from face_utils import BankingKYCPipeline
    FACE_UTILS_AVAILABLE = True
except ImportError as e:
    st.error(f"Error importing face_utils: {e}")
    FACE_UTILS_AVAILABLE = False

# Import database module
try:
    import db
    DB_AVAILABLE = True
except ImportError as e:
    st.error(f"Error importing database module: {e}")
    DB_AVAILABLE = False

# Import DeepFace
try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except ImportError as e:
    st.warning(f"DeepFace not available: {e}")
    DEEPFACE_AVAILABLE = False

# Page configuration
st.set_page_config(
    page_title="KYC Login",
    page_icon="🔐",
    layout="centered"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        text-align: center;
        padding: 1.5rem;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 10px;
        margin-bottom: 2rem;
    }
    .login-card {
        background-color: #f8f9fa;
        padding: 2rem;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        margin: 1rem 0;
    }
    .tab-content {
        padding: 1.5rem;
        background-color: white;
        border-radius: 10px;
        margin-top: 1rem;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
if 'user_data' not in st.session_state:
    st.session_state.user_data = None

def verify_credentials(user_id: str, password: str) -> dict:
    """Verify username and password"""
    try:
        user = db.get_user_by_userid(user_id)
        if user and user.get('password') == password and user.get('status') == 'ACCEPTED':
            return user
        return None
    except Exception as e:
        st.error(f"Login error: {e}")
        return None

def verify_face_login(user_id: str) -> dict:
    """Verify user using face authentication"""
    try:
        # Get user from database - this will convert binary to files
        st.info(f"🔍 Looking up user: {user_id}")
        user = db.get_user_by_userid(user_id)
        
        if not user:
            st.error("❌ User not found in database")
            return None
            
        if user.get('status') != 'ACCEPTED':
            st.error(f"❌ Account not activated. Current status: {user.get('status')}")
            return None
        
        st.success(f"✅ User found: {user.get('email')}")
        
        # Debug: Show what image paths we have
        st.info(f"📁 Available image paths:")
        st.write(f"- capture_path: {user.get('capture_path')}")
        st.write(f"- registration_capture: {user.get('registration_capture')}")
        st.write(f"- document_path: {user.get('document_path')}")
        
        # Check if registration image exists
        if not user.get('registration_capture') and not user.get('capture_path'):
            st.error("❌ No registration image found in database")
            return None
        
        # Get the registration image path (converted from binary by db.get_user_by_userid)
        registration_image_path = user.get('capture_path')
        
        if not registration_image_path:
            st.error("❌ Registration image path is None")
            return None
            
        if not os.path.exists(registration_image_path):
            st.error(f"❌ Registration image file not found at: {registration_image_path}")
            st.info("💡 The database may have the image as binary, but conversion to file failed")
            return None
        
        st.success(f"✅ Registration image found at: {registration_image_path}")
        
        # Show the registration image
        st.image(registration_image_path, caption="Your Registration Photo", width=200)
        
        # Capture webcam photo
        st.info("📸 Starting webcam for face verification...")
        
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            st.error("❌ Could not access webcam")
            return None
        
        # Countdown with preview
        placeholder = st.empty()
        for i in range(3, 0, -1):
            ret, frame = cap.read()
            if ret:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                placeholder.image(frame_rgb, channels="RGB", caption=f"Capturing in {i}...", use_container_width=True)
            time.sleep(1)
        
        # Capture frame
        ret, frame = cap.read()
        cap.release()
        
        if not ret:
            st.error("❌ Failed to capture image")
            return None
        
        # Save captured image
        capture_path = "login_capture.jpg"
        cv2.imwrite(capture_path, frame)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        placeholder.image(frame_rgb, channels="RGB", caption="Photo captured!", use_container_width=True)
        
        # Verify faces using DeepFace
        st.info("🔍 Verifying face match with ArcFace model...")
        
        from deepface import DeepFace
        
        result = DeepFace.verify(
            img1_path=registration_image_path,
            img2_path=capture_path,
            model_name='ArcFace',
            enforce_detection=False
        )
        
        # Show verification details
        st.write("**Verification Results:**")
        st.write(f"- Verified: {result.get('verified', False)}")
        st.write(f"- Distance: {result.get('distance', 0):.4f}")
        st.write(f"- Threshold: {result.get('threshold', 0):.4f}")
        st.write(f"- Model: {result.get('model', 'N/A')}")
        
        # Clean up temporary files
        if os.path.exists(capture_path):
            os.remove(capture_path)
        
        # Check verification result
        if result.get('verified', False):
            st.success(f"✅ Face verified! Distance: {result.get('distance', 0):.4f} < Threshold: {result.get('threshold', 0):.4f}")
            return user
        else:
            st.error(f"❌ Face verification failed. Distance: {result.get('distance', 0):.4f} >= Threshold: {result.get('threshold', 0):.4f}")
            st.info("💡 The faces don't match closely enough. Please try again in better lighting.")
            return None
            
    except Exception as e:
        st.error(f"❌ Face verification error: {str(e)}")
        import traceback
        st.error("**Full error traceback:**")
        st.code(traceback.format_exc())
        return None

def main():
    # Header
    st.markdown('<div class="main-header">🔐 KYC Login Portal</div>', unsafe_allow_html=True)
    
    if not DB_AVAILABLE:
        st.error("❌ Database not available")
        return
    
    # Check if already logged in
    if st.session_state.logged_in:
        st.success(f"✅ Welcome back, {st.session_state.user_data.get('email')}!")
        st.info("You are already logged in.")
        
        if st.button("🚪 Logout", type="secondary"):
            st.session_state.logged_in = False
            st.session_state.user_data = None
            st.rerun()
        return
    
    # Login tabs
    st.markdown("## Choose Login Method")
    
    tab1, tab2 = st.tabs(["🔑 Username & Password", "👤 Face Authentication"])
    
    with tab1:
        st.markdown('<div class="tab-content">', unsafe_allow_html=True)
        st.markdown("### Login with Credentials")
        
        with st.form("credential_login"):
            user_id = st.text_input("User ID", placeholder="VYM123456")
            password = st.text_input("Password", type="password", placeholder="Enter your password")
            
            submit = st.form_submit_button("🔓 Login", use_container_width=True, type="primary")
            
            if submit:
                if not user_id or not password:
                    st.error("❌ Please enter both User ID and Password")
                else:
                    with st.spinner("🔄 Verifying credentials..."):
                        user = verify_credentials(user_id, password)
                        
                        if user:
                            st.session_state.logged_in = True
                            st.session_state.user_data = user
                            st.success("✅ Login successful!")
                            st.balloons()
                            st.rerun()
                        else:
                            st.error("❌ Invalid credentials or account not activated")
        
        st.markdown('</div>', unsafe_allow_html=True)
    
    with tab2:
        st.markdown('<div class="tab-content">', unsafe_allow_html=True)
        st.markdown("### Login with Face Recognition")
        
        if not DEEPFACE_AVAILABLE:
            st.error("❌ DeepFace library not available. Please install: pip install deepface")
        elif not FACE_UTILS_AVAILABLE:
            st.warning("⚠️ Face utilities not fully available, using DeepFace directly")
        
        user_id_face = st.text_input("Enter your User ID", placeholder="VYM123456", key="face_user_id")
        
        if st.button("📸 Start Face Verification", use_container_width=True, type="primary", disabled=not DEEPFACE_AVAILABLE):
            if not user_id_face:
                st.error("❌ Please enter your User ID")
            else:
                with st.spinner("🔄 Verifying face..."):
                    user = verify_face_login(user_id_face)
                    
                    if user:
                        st.session_state.logged_in = True
                        st.session_state.user_data = user
                        st.success("✅ Face verification successful!")
                        st.balloons()
                        st.rerun()
                    else:
                        st.error("❌ Face verification failed or account not activated")
        
        st.markdown('</div>', unsafe_allow_html=True)
    
    # Footer
    st.markdown("---")
    st.info("🆕 Don't have an account? Complete KYC registration first.")

if __name__ == "__main__":
    main()