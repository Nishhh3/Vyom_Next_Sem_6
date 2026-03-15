import pandas as pd
import pickle
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

df1 = pd.read_csv("Loan_1.csv")
df2 = pd.read_csv("Loan_2.csv")
df = pd.concat([df1, df2], ignore_index=True)

categorical_cols = ["employment_type", "existing_loan", "loan_purpose", "collateral"]
numerical_cols = ["age", "monthly_income", "credit_score", "savings", "requested_amount", "tenure_years"]

preprocessor = ColumnTransformer(transformers=[
    ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols),
    ("num", "passthrough", numerical_cols)
])

X = df[categorical_cols + numerical_cols]

clf = Pipeline(steps=[
    ("prep", preprocessor),
    ("rf", RandomForestClassifier(n_estimators=300, max_depth=15, min_samples_split=5, random_state=42))
])
clf.fit(X, df["approval_status"])

reg = Pipeline(steps=[
    ("prep", preprocessor),
    ("rf", RandomForestRegressor(n_estimators=300, max_depth=15, min_samples_split=5, random_state=42))
])
reg.fit(X, df["approved_amount"])

with open("loan_status_model.pkl", "wb") as f:
    pickle.dump(clf, f)

with open("loan_amount_model.pkl", "wb") as f:
    pickle.dump(reg, f)

print("✅ Models retrained and saved successfully!")