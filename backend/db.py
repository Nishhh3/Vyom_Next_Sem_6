import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from typing import Optional, Dict
import cv2


DB_CONFIG = {
    "host": "localhost",
    "user": "postgres",
    "password": "root",
    "database": "vyom_next"
}


def get_conn():
    """Get database connection."""
    return psycopg2.connect(**DB_CONFIG)


def image_to_blob(image_path: str) -> bytes:
    """
    Convert image file to binary blob.
    
    Args:
        image_path: Path to image file
        
    Returns:
        Binary data of the image
    """
    with open(image_path, 'rb') as f:
        return f.read()


def blob_to_image(blob_data: bytes, output_path: str) -> bool:
    """
    Convert blob data back to image file.
    
    Args:
        blob_data: Binary image data
        output_path: Path to save the image
        
    Returns:
        True if successful
    """
    try:
        with open(output_path, 'wb') as f:
            f.write(blob_data)
        return True
    except Exception as e:
        print(f"Error saving image: {e}")
        return False


def insert_signup(email: str, doc_path: str, capture_path: str, 
                 aadhar_number: Optional[str] = None,
                 webcam_path: Optional[str] = None) -> bool:
    """
    Insert new KYC signup with binary image storage and Aadhar number.
    
    Args:
        email: User email
        doc_path: Path to document image
        capture_path: Path to webcam capture image (initial registration)
        aadhar_number: Extracted Aadhar number (optional)
        webcam_path: Path to verification webcam image (optional, for later verification)
        
    Returns:
        True if successful
    """
    try:
        # Convert images to binary
        doc_blob = image_to_blob(doc_path)
        capture_blob = image_to_blob(capture_path)
        webcam_blob = image_to_blob(webcam_path) if webcam_path else None
        
        conn = get_conn()
        cur = conn.cursor()

        cur.execute("""
        INSERT INTO kyc_users
        (email, document_image, registration_capture, webcam_image, aadhar_number,
         status, created_at)
        VALUES (%s, %s, %s, %s, %s, 'PENDING', %s)
        RETURNING id
        """, (email, psycopg2.Binary(doc_blob), psycopg2.Binary(capture_blob), 
              psycopg2.Binary(webcam_blob) if webcam_blob else None, 
              aadhar_number, datetime.now()))

        user_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        
        print(f"✅ User signup saved (ID: {user_id})")
        return True
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False


def update_webcam_image(email: str, webcam_path: str) -> bool:
    """
    Update webcam verification image for existing user.
    
    Args:
        email: User email
        webcam_path: Path to webcam verification image
        
    Returns:
        True if successful
    """
    try:
        webcam_blob = image_to_blob(webcam_path)
        
        conn = get_conn()
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE kyc_users
            SET webcam_image=%s
            WHERE email=%s
        """, (psycopg2.Binary(webcam_blob), email))
        
        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False


def update_webcam_image_by_userid(userid: str, webcam_path: str) -> bool:
    """
    Update webcam verification image for existing user by user ID.
    
    Args:
        userid: User ID
        webcam_path: Path to webcam verification image
        
    Returns:
        True if successful
    """
    try:
        webcam_blob = image_to_blob(webcam_path)
        
        conn = get_conn()
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE kyc_users
            SET webcam_image=%s
            WHERE user_id=%s
        """, (psycopg2.Binary(webcam_blob), userid))
        
        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False


def get_user_by_email(email: str) -> Optional[Dict]:
    """
    Get user by email and convert blob images to temporary files.
    
    Args:
        email: User email
        
    Returns:
        User dictionary with image paths
    """
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("SELECT * FROM kyc_users WHERE email=%s", (email,))
        row = cur.fetchone()
        conn.close()
        
        if row:
            import os
            os.makedirs("temp", exist_ok=True)
            
            # Convert dict-like row to regular dict
            row = dict(row)
            
            # Convert blob images to temporary files
            if row.get('document_image'):
                doc_path = f"temp/doc_{row['id']}.jpg"
                blob_to_image(bytes(row['document_image']), doc_path)
                row['document_path'] = doc_path
            
            if row.get('registration_capture'):
                cap_path = f"temp/capture_{row['id']}.jpg"
                blob_to_image(bytes(row['registration_capture']), cap_path)
                row['capture_path'] = cap_path
            
            if row.get('webcam_image'):
                webcam_path = f"temp/webcam_{row['id']}.jpg"
                blob_to_image(bytes(row['webcam_image']), webcam_path)
                row['webcam_path'] = webcam_path
        
        return row
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return None


def activate_user(email: str, userid: str, password: str) -> bool:
    """
    Activate user account.
    
    Args:
        email: User email
        userid: Generated user ID
        password: Generated password
        
    Returns:
        True if successful
    """
    try:
        conn = get_conn()
        cur = conn.cursor()

        cur.execute("""
        UPDATE kyc_users
        SET status='ACCEPTED',
            user_id=%s,
            password=%s
        WHERE email=%s
        """, (userid, password, email))

        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False


def get_user_by_userid(userid: str) -> Optional[Dict]:
    """
    Get user by user ID and convert blob images to temporary files.
    
    Args:
        userid: User ID
        
    Returns:
        User dictionary with image paths
    """
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("SELECT * FROM kyc_users WHERE user_id=%s", (userid,))
        row = cur.fetchone()
        conn.close()
        
        if row:
            # Convert dict-like row to regular dict
            row = dict(row)
            
            # Convert blob images to temporary files
            import os
            os.makedirs("temp", exist_ok=True)
            
            if row.get('document_image'):
                doc_path = f"temp/doc_{row['id']}.jpg"
                blob_to_image(bytes(row['document_image']), doc_path)
                row['document_path'] = doc_path
            
            if row.get('registration_capture'):
                cap_path = f"temp/capture_{row['id']}.jpg"
                blob_to_image(bytes(row['registration_capture']), cap_path)
                row['registration_capture'] = cap_path  # For compatibility
                row['capture_path'] = cap_path
            
            if row.get('webcam_image'):
                webcam_path = f"temp/webcam_{row['id']}.jpg"
                blob_to_image(bytes(row['webcam_image']), webcam_path)
                row['webcam_path'] = webcam_path
        
        return row
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return None


def get_newly_accepted() -> list:
    """
    Get users who are newly accepted but not yet emailed.
    
    Returns:
        List of user dictionaries
    """
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("""
            SELECT * FROM kyc_users
            WHERE status='ACCEPTED'
            AND (email_sent IS NULL OR email_sent=FALSE)
            AND user_id IS NULL
        """)

        rows = cur.fetchall()
        conn.close()
        return [dict(row) for row in rows]
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return []


def finalize_activation(email: str, userid: str, password: str) -> bool:
    """
    Finalize user activation and mark email as sent.
    
    Args:
        email: User email
        userid: Generated user ID
        password: Generated password
        
    Returns:
        True if successful
    """
    try:
        conn = get_conn()
        cur = conn.cursor()

        cur.execute("""
            UPDATE kyc_users
            SET user_id=%s,
                password=%s,
                email_sent=TRUE
            WHERE email=%s
        """, (userid, password, email))

        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False


def get_signup_status(email: str) -> Optional[Dict]:
    """
    Get KYC signup status for a user by email.
    
    Args:
        email: User email
        
    Returns:
        Dictionary with status information or None if user not found
    """
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                email,
                status,
                aadhar_number,
                user_id,
                created_at,
                updated_at
            FROM kyc_users 
            WHERE email=%s
        """, (email,))
        
        row = cur.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return None
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return None


def get_user_aadhar(email: str) -> Optional[str]:
    """
    Get Aadhar number for a user.
    
    Args:
        email: User email
        
    Returns:
        Aadhar number or None
    """
    try:
        conn = get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("SELECT aadhar_number FROM kyc_users WHERE email=%s", (email,))
        row = cur.fetchone()
        conn.close()
        
        return row['aadhar_number'] if row else None
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return None


def update_aadhar_number(email: str, aadhar_number: str) -> bool:
    """
    Update Aadhar number for a user.
    
    Args:
        email: User email
        aadhar_number: Aadhar number to update
        
    Returns:
        True if successful
    """
    try:
        conn = get_conn()
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE kyc_users
            SET aadhar_number=%s
            WHERE email=%s
        """, (aadhar_number, email))
        
        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False


# Database schema creation helper
def create_schema():
    """
    Create the required database schema.
    This should be run once to set up the database.
    """
    schema = """
    CREATE TABLE IF NOT EXISTS kyc_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        aadhar_number VARCHAR(14),
        document_image BYTEA,
        registration_capture BYTEA,
        webcam_image BYTEA,
        user_id VARCHAR(50) UNIQUE,
        password VARCHAR(255),
        status VARCHAR(20) DEFAULT 'PENDING',
        email_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_email ON kyc_users(email);
    CREATE INDEX IF NOT EXISTS idx_user_id ON kyc_users(user_id);
    CREATE INDEX IF NOT EXISTS idx_status ON kyc_users(status);
    CREATE INDEX IF NOT EXISTS idx_aadhar ON kyc_users(aadhar_number);
    
    -- Create trigger for updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
    
    DROP TRIGGER IF EXISTS update_kyc_users_updated_at ON kyc_users;
    
    CREATE TRIGGER update_kyc_users_updated_at
        BEFORE UPDATE ON kyc_users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    """
    
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(schema)
        conn.commit()
        conn.close()
        print("✅ Database schema created successfully")
        return True
    except Exception as e:
        print(f"❌ Schema creation error: {e}")
        return False


def migrate_add_webcam_column():
    """
    Add webcam_image column to existing database.
    Run this if you already have a database and need to add the new column.
    """
    migration = """
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'kyc_users' 
            AND column_name = 'webcam_image'
        ) THEN
            ALTER TABLE kyc_users 
            ADD COLUMN webcam_image BYTEA;
        END IF;
    END $$;
    """
    
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(migration)
        conn.commit()
        conn.close()
        print("✅ Migration completed: webcam_image column added")
        return True
    except Exception as e:
        print(f"❌ Migration error: {e}")
        return False


if __name__ == "__main__":
    # Create schema when run directly
    print("Database Setup Options:")
    print("1. Create new schema")
    print("2. Migrate existing database (add webcam_image column)")
    
    choice = input("Enter choice (1 or 2): ").strip()
    
    if choice == "1":
        print("\nCreating database schema...")
        create_schema()
    elif choice == "2":
        print("\nRunning migration...")
        migrate_add_webcam_column()
    else:
        print("Invalid choice")