import pickle
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).parent

# Load models once at startup
with open(BASE_DIR / "loan_status_model.pkl", "rb") as f:
    clf = pickle.load(f)

with open(BASE_DIR / "loan_amount_model.pkl", "rb") as f:
    reg = pickle.load(f)


def predict_loan(data: dict) -> dict:
    df = pd.DataFrame([data])

    status = clf.predict(df)[0]
    probabilities = clf.predict_proba(df)[0]
    amount = int(reg.predict(df)[0])

    prob_dict = {
        cls: round(float(p), 2)
        for cls, p in zip(clf.classes_, probabilities)
    }

    return {
        "predicted_status": status,
        "probabilities": prob_dict,
        "estimated_amount": amount,
    }