import streamlit as st
import os
import random

from db import (
    insert_signup,
    get_user_by_userid,
    get_newly_accepted,
    finalize_activation
)

from face_utils import verify
from emailer import send_activation

# ---------------------------------
# PAGE CONFIG
# ---------------------------------

st.set_page_config(page_title="Banking KYC Prototype", layout="centered")
st.title("🏦 Banking KYC Prototype")


# ---------------------------------
# AUTO ACTIVATE ACCEPTED USERS
# ---------------------------------

def auto_activate():

    users = get_newly_accepted()

    for u in users:

        userid = str(random.randint(10000000, 99999999))
        password = str(random.randint(10000000, 99999999))

        try:
            send_activation(u["email"], userid, password)
            finalize_activation(u["email"], userid, password)

            st.success(f"Activation email sent to {u['email']}")

        except Exception as e:
            st.error(f"Email failed for {u['email']}: {e}")


# Run once per refresh
auto_activate()


# ---------------------------------
# SIDEBAR MENU
# ---------------------------------

menu = st.sidebar.selectbox(
    "Menu",
    ["Signup", "Login - Face", "Login - ID/Password"]
)


# ---------------------------------
# SIGNUP
# ---------------------------------

if menu == "Signup":

    st.subheader("📝 New Registration")

    email = st.text_input("Email")

    doc = st.file_uploader("Upload ID Document", type=["jpg", "jpeg", "png"])

    cam = st.camera_input("Capture Live Photo")

    if st.button("Submit KYC"):

        if not email or not doc or not cam:
            st.error("All fields required.")
        else:

            os.makedirs("uploads", exist_ok=True)

            doc_path = f"uploads/{email}_doc.jpg"
            cap_path = f"uploads/{email}_capture.jpg"

            with open(doc_path, "wb") as f:
                f.write(doc.read())

            with open(cap_path, "wb") as f:
                f.write(cam.getvalue())

            insert_signup(email, doc_path, cap_path)

            st.success("Submitted. Wait 24hrs for approval.")


# ---------------------------------
# LOGIN VIA FACE
# ---------------------------------

elif menu == "Login - Face":

    st.subheader("👤 Face Authentication")

    userid = st.text_input("UserID")

    cam = st.camera_input("Capture Live Photo")

    if st.button("Login via Face"):

        if not userid or not cam:
            st.error("UserID and camera required.")
        else:

            user = get_user_by_userid(userid)

            if not user:
                st.error("Invalid user")

            elif user["status"] != "ACCEPTED":
                st.warning("Account not approved")

            else:

                os.makedirs("captures", exist_ok=True)

                live = "captures/live.jpg"

                with open(live, "wb") as f:
                    f.write(cam.getvalue())

                ok, conf = verify(user["registration_capture"], live)

                if ok:
                    st.success(f"Login successful ({conf:.1f}%)")
                else:
                    st.error("Face mismatch")


# ---------------------------------
# LOGIN WITH USERID / PASSWORD
# ---------------------------------

elif menu == "Login - ID/Password":

    st.subheader("🔐 Login With Credentials")

    userid = st.text_input("UserID")

    pwd = st.text_input("Password", type="password")

    if st.button("Login"):

        if not userid or not pwd:
            st.error("All fields required.")
        else:

            user = get_user_by_userid(userid)

            if not user:
                st.error("Invalid user")

            elif user["password"] != pwd:
                st.error("Wrong password")

            elif user["status"] != "ACCEPTED":
                st.warning("Wait for approval")

            else:
                st.success("Login successful")
