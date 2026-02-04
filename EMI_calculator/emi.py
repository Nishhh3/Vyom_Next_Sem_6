import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# -------------------- PAGE CONFIG --------------------
st.set_page_config(
    page_title="VyomNext EMI Calculator",
    page_icon="🏦",
    layout="wide"
)

# -------------------- TITLE --------------------
st.title("🏦 VyomNext EMI Calculator")
st.caption("Smart Loan Planning")

st.divider()

# -------------------- SIDEBAR --------------------
st.sidebar.header("⚙️ Loan Configuration")

loan_type = st.sidebar.selectbox(
    "Select Loan Type",
    ["Home Loan", "Car Loan", "Personal Loan"]
)

# Presets
if loan_type == "Home Loan":
    default_rate = 8.5
    fee_percent = 0.5
elif loan_type == "Car Loan":
    default_rate = 9.5
    fee_percent = 1.0
else:
    default_rate = 13.5
    fee_percent = 2.0


loan_amount = st.sidebar.number_input(
    "Loan Amount (₹)",
    min_value=50000,
    max_value=100000000,
    value=1000000,
    step=10000
)

interest_rate = st.sidebar.number_input(
    "Interest Rate (%)",
    value=default_rate,
    step=0.1
)

tenure_years = st.sidebar.slider(
    "Tenure (Years)",
    min_value=1,
    max_value=30,
    value=10
)

processing_fee = st.sidebar.checkbox("Include Processing Fee")

prepayment = st.sidebar.checkbox("Enable Prepayment")

st.sidebar.divider()

# -------------------- FEES --------------------
fee_amount = 0

if processing_fee:
    fee_amount = (loan_amount * fee_percent) / 100


# -------------------- CORE CALCULATION --------------------

months = tenure_years * 12
monthly_rate = interest_rate / (12 * 100)


def calculate_emi(P, r, n):
    return P * r * (1 + r)**n / ((1 + r)**n - 1)


emi = calculate_emi(loan_amount, monthly_rate, months)

# -------------------- PREPAYMENT --------------------

prepay_amount = 0
prepay_month = 0

if prepayment:

    st.sidebar.subheader("💰 Prepayment")

    prepay_amount = st.sidebar.number_input(
        "Prepayment Amount (₹)",
        min_value=0,
        value=100000,
        step=5000
    )

    prepay_month = st.sidebar.slider(
        "Prepayment After (Months)",
        min_value=1,
        max_value=months,
        value=24
    )


# -------------------- AMORTIZATION --------------------

balance = loan_amount
schedule = []

for i in range(1, months + 1):

    interest = balance * monthly_rate
    principal = emi - interest

    if prepayment and i == prepay_month:
        balance -= prepay_amount

    balance -= principal

    if balance < 0:
        balance = 0

    schedule.append([
        i, emi, principal, interest, balance
    ])

df = pd.DataFrame(
    schedule,
    columns=["Month", "EMI", "Principal", "Interest", "Balance"]
)

# -------------------- TOTALS --------------------

total_paid = df["EMI"].sum()
total_interest = df["Interest"].sum()

if processing_fee:
    total_paid += fee_amount


# -------------------- DASHBOARD --------------------

col1, col2, col3, col4 = st.columns(4)

col1.metric("Monthly EMI", f"₹{emi:,.2f}")
col2.metric("Total Interest", f"₹{total_interest:,.2f}")
col3.metric("Processing Fee", f"₹{fee_amount:,.2f}")
col4.metric("Total Payable", f"₹{total_paid:,.2f}")

st.divider()

# -------------------- CHARTS --------------------

st.subheader("📈 Loan Analytics")

col5, col6 = st.columns(2)

# Pie Chart
with col5:

    fig1, ax1 = plt.subplots()

    ax1.pie(
        [loan_amount, total_interest],
        labels=["Principal", "Interest"],
        autopct="%1.1f%%"
    )

    ax1.set_title("Principal vs Interest")

    st.pyplot(fig1)


# Balance Chart
with col6:

    fig2, ax2 = plt.subplots()

    ax2.plot(df["Month"], df["Balance"])

    ax2.set_title("Outstanding Balance Trend")
    ax2.set_xlabel("Months")
    ax2.set_ylabel("₹ Balance")

    st.pyplot(fig2)


st.divider()

# -------------------- TABLE --------------------

st.subheader("📋 Amortization Schedule")

st.dataframe(df, use_container_width=True)


# -------------------- DOWNLOAD --------------------

csv = df.to_csv(index=False).encode("utf-8")

st.download_button(
    "📥 Download Schedule (CSV)",
    csv,
    "loan_schedule.csv",
    "text/csv"
)


# -------------------- FOOTER --------------------

st.caption("© 2026 Smart EMI Engine | Algo-Artisans")
