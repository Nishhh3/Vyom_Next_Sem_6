# backend_api.py
# FastAPI implementation for KYC verification system

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from datetime import datetime
import json
from pathlib import Path
import shutil
from typing import Optional

# Import your existing modules
try:
    from face_utils import BankingKYCPipeline
    FACE_UTILS_AVAILABLE = True
except ImportError as e:
    print(f"Error importing face_utils: {e}")
    FACE_UTILS_AVAILABLE = False

try:
    import db
    DB_AVAILABLE = True
except ImportError as e:
    print(f"Error importing database module: {e}")
    DB_AVAILABLE = False

try:
    from ocr_utils import extract_aadhar as extract_aadhar_number
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("OCR utilities not available - Aadhar extraction disabled")

# Initialize FastAPI app
app = FastAPI(
    title="KYC Verification API",
    description="Face verification system for banking KYC",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
UPLOAD_FOLDER = "uploads"
VERIFICATION_REPORTS = "verification_reports"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(VERIFICATION_REPORTS, exist_ok=True)

def convert_to_serializable(obj):
    """Convert NumPy types to native Python types"""
    import numpy as np
    
    if isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_to_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_serializable(item) for item in obj]
    else:
        return obj

def save_verification_report(email: str, report_data: dict) -> Optional[str]:
    """Save verification report as JSON"""
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = f"{VERIFICATION_REPORTS}/{email.replace('@', '_')}_{timestamp}.json"
        
        with open(report_path, 'w') as f:
            json.dump(report_data, f, indent=2)
        
        return report_path
    except Exception as e:
        print(f"Error saving report: {e}")
        return None

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "KYC Verification API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "face_utils": FACE_UTILS_AVAILABLE,
        "database": DB_AVAILABLE,
        "ocr": OCR_AVAILABLE,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/verify")
async def verify_kyc(
    email: str = Form(...),
    id_document: UploadFile = File(...),
    webcam_image: UploadFile = File(...),
    enhance_document: bool = Form(True),
    enhance_webcam: bool = Form(True)
):
    """
    Main KYC verification endpoint
    
    Args:
        email: User's email address
        id_document: Uploaded Aadhar/ID document image
        webcam_image: Captured webcam image
        enhance_document: Whether to enhance document image
        enhance_webcam: Whether to enhance webcam image
    
    Returns:
        Verification result with match status, confidence, and other metrics
    """
    try:
        # Check if required modules are available
        if not FACE_UTILS_AVAILABLE or not DB_AVAILABLE:
            raise HTTPException(
                status_code=500,
                detail="Required modules not available"
            )

        # Validate file types
        allowed_extensions = {'.jpg', '.jpeg', '.png'}
        doc_ext = Path(id_document.filename).suffix.lower()
        webcam_ext = Path(webcam_image.filename).suffix.lower()
        
        if doc_ext not in allowed_extensions or webcam_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only JPG, JPEG, and PNG are allowed"
            )
        
        # Generate unique filenames
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_email = email.replace('@', '_').replace('.', '_')
        
        doc_filename = f"{safe_email}_{timestamp}_doc{doc_ext}"
        webcam_filename = f"{safe_email}_{timestamp}_webcam{webcam_ext}"
        
        doc_path = os.path.join(UPLOAD_FOLDER, doc_filename)
        webcam_path = os.path.join(UPLOAD_FOLDER, webcam_filename)
        
        # Save uploaded files
        with open(doc_path, "wb") as buffer:
            shutil.copyfileobj(id_document.file, buffer)
        
        with open(webcam_path, "wb") as buffer:
            shutil.copyfileobj(webcam_image.file, buffer)
        
        # Extract Aadhar number if OCR is available
        aadhar_number = None
        if OCR_AVAILABLE:
            try:
                aadhar_number = extract_aadhar_number(doc_path)
            except Exception as e:
                print(f"Aadhar extraction failed: {e}")
        
        # Initialize pipeline and run verification
        pipeline = BankingKYCPipeline()
        
        # Verify using saved images
        result = pipeline.verify_with_saved_images(
            id_document_path=doc_path,
            webcam_image_path=webcam_path,
            model='ArcFace',
            enhance_document=enhance_document,
            enhance_webcam=enhance_webcam
        )
        
        # Convert result to serializable format
        result = convert_to_serializable(result)
        
        # Prepare verification report
        verification_report = {
            'email': email,
            'timestamp': datetime.now().isoformat(),
            'aadhar_number': aadhar_number,
            'verification_result': result,
            'file_paths': {
                'document': doc_path,
                'webcam': webcam_path
            },
            'settings': {
                'model': 'ArcFace',
                'enhance_document': enhance_document,
                'enhance_webcam': enhance_webcam
            }
        }
        
        # Save verification report
        report_path = save_verification_report(email, verification_report)
        
        # Save to database
        try:
            db_success = db.insert_signup(
                email=email,
                doc_path=doc_path,
                capture_path=webcam_path,
                aadhar_number=aadhar_number,
                webcam_path=webcam_path
            )
            
            if not db_success:
                print("Warning: Failed to save to database")
        except Exception as e:
            print(f"Database error: {e}")
            # Continue even if database save fails
        
        # Return success response
        return {
            "success": True,
            "verification": result,
            "aadhar_number": aadhar_number,
            "report_path": report_path,
            "message": "KYC verification completed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Verification error: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Verification failed: {str(e)}"
        )

@app.get("/api/status")
async def check_status(email: str):
    """
    Check KYC status for an email
    
    Args:
        email: User's email address
    
    Returns:
        Current verification status
    """
    try:
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        if not DB_AVAILABLE:
            raise HTTPException(
                status_code=500,
                detail="Database module not available"
            )
        
        # Query database for status
        status = db.get_signup_status(email)
        
        if status:
            return {
                "success": True,
                "status": status
            }
        else:
            return {
                "success": False,
                "message": "No registration found for this email"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Status check error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check status: {str(e)}"
        )

@app.delete("/api/cleanup")
async def cleanup_old_files(days: int = 7):
    """
    Cleanup old uploaded files (admin endpoint)
    
    Args:
        days: Delete files older than this many days
    
    Returns:
        Number of files deleted
    """
    try:
        from datetime import timedelta
        
        deleted_count = 0
        cutoff_time = datetime.now() - timedelta(days=days)
        
        # Cleanup uploads folder
        for filename in os.listdir(UPLOAD_FOLDER):
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.isfile(file_path):
                file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                if file_time < cutoff_time:
                    os.remove(file_path)
                    deleted_count += 1
        
        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"Cleaned up files older than {days} days"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cleanup failed: {str(e)}"
        )

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "Endpoint not found"}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    
    # Run the FastAPI server
    uvicorn.run(
        "backend_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes (development only)
        log_level="info"
    )