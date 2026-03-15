"""
Vyom Dummy Bank Server
======================
Simulates ICICI, SBI, HDFC bank APIs on separate ports.
Each bank has its own SQLite DB with users, accounts, and transactions.

Ports:
  ICICI  -> 7001
  SBI    -> 7002
  HDFC   -> 7003
  Vyom AA Gateway -> 7000  (aggregator that talks to all three)

Run: python3 bank_server.py
"""

import sqlite3, uuid, random, threading, os
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(BASE_DIR, exist_ok=True)

# ─────────────────────────────────────────────
# Bank configuration
# ─────────────────────────────────────────────
BANKS = {
    "ICICI": {
        "port": 7001,
        "db":   os.path.join(BASE_DIR, "icici.db"),
        "ifsc_prefix": "ICIC000",
    },
    "SBI": {
        "port": 7002,
        "db":   os.path.join(BASE_DIR, "sbi.db"),
        "ifsc_prefix": "SBIN000",
    },
    "HDFC": {
        "port": 7003,
        "db":   os.path.join(BASE_DIR, "hdfc.db"),
        "ifsc_prefix": "HDFC000",
    },
}

# ─────────────────────────────────────────────
# Seed data
# ─────────────────────────────────────────────
SEED_USERS = [
    {"name": "Nishant Chauhan",  "phone": "9004863472", "pan": "ABCPS1234A"},
    {"name": "Sneha Edugunoori", "phone": "8208187116", "pan": "BCDPM5678B"},
    {"name": "Nikhil Anumalla",  "phone": "9323015547", "pan": "CDERV9012C"},
    {"name": "Mrinmayi Badirke", "phone": "9820346324", "pan": "DEFSI3456D"},
    {"name": "Vikram Nair",      "phone": "9090909090", "pan": "EFGVN7890E"},
]

TX_REMARKS = [
    "Salary credit", "UPI payment", "NEFT transfer",
    "Online shopping", "Rent payment", "Insurance premium",
    "Mutual fund SIP", "Utility bill", "Recharge", "Food delivery",
]

def random_account_number(bank_prefix: str) -> str:
    return bank_prefix + str(random.randint(100000, 999999))

def random_ifsc(prefix: str) -> str:
    return prefix + str(random.randint(1, 9))

# ─────────────────────────────────────────────
# DB initialisation + seeding
# ─────────────────────────────────────────────
def init_db(db_path: str, bank_name: str, ifsc_prefix: str):
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    cur.executescript("""
        CREATE TABLE IF NOT EXISTS customers (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            phone       TEXT UNIQUE NOT NULL,
            pan         TEXT,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS accounts (
            id             TEXT PRIMARY KEY,
            customer_id    TEXT NOT NULL REFERENCES customers(id),
            account_number TEXT UNIQUE NOT NULL,
            ifsc           TEXT NOT NULL,
            account_type   TEXT CHECK(account_type IN ('SAVINGS','CURRENT','SALARY')) DEFAULT 'SAVINGS',
            balance        REAL DEFAULT 0.0,
            status         TEXT CHECK(status IN ('ACTIVE','FROZEN','CLOSED')) DEFAULT 'ACTIVE',
            created_at     TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id              TEXT PRIMARY KEY,
            account_id      TEXT NOT NULL REFERENCES accounts(id),
            type            TEXT CHECK(type IN ('CREDIT','DEBIT')) NOT NULL,
            amount          REAL NOT NULL,
            balance_after   REAL NOT NULL,
            remarks         TEXT,
            ref_number      TEXT,
            counterparty    TEXT,
            status          TEXT CHECK(status IN ('SUCCESS','FAILED','PENDING')) DEFAULT 'SUCCESS',
            created_at      TEXT DEFAULT (datetime('now'))
        );
    """)

    if cur.execute("SELECT COUNT(*) FROM customers").fetchone()[0] == 0:
        for user in SEED_USERS:
            cid = str(uuid.uuid4())
            cur.execute(
                "INSERT INTO customers (id, name, phone, pan) VALUES (?,?,?,?)",
                (cid, user["name"], user["phone"], user["pan"])
            )
            num_accounts = random.randint(1, 2)
            for idx in range(num_accounts):
                acc_type    = ["SAVINGS", "SALARY", "CURRENT"][idx % 3]
                balance     = round(random.uniform(1000, 250000), 2)
                acc_num     = random_account_number(ifsc_prefix.replace("0", ""))
                ifsc        = random_ifsc(ifsc_prefix)
                aid         = str(uuid.uuid4())
                cur.execute(
                    """INSERT INTO accounts (id, customer_id, account_number, ifsc,
                       account_type, balance) VALUES (?,?,?,?,?,?)""",
                    (aid, cid, acc_num, ifsc, acc_type, balance)
                )
                running_bal = balance
                for _ in range(random.randint(10, 20)):
                    tx_type  = random.choice(["CREDIT", "DEBIT"])
                    amount   = round(random.uniform(100, 15000), 2)
                    if tx_type == "DEBIT" and running_bal - amount < 0:
                        tx_type = "CREDIT"
                    running_bal = running_bal + amount if tx_type == "CREDIT" else running_bal - amount
                    days_ago = random.randint(1, 90)
                    tx_date  = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d %H:%M:%S")
                    cur.execute(
                        """INSERT INTO transactions
                           (id, account_id, type, amount, balance_after, remarks, ref_number, created_at)
                           VALUES (?,?,?,?,?,?,?,?)""",
                        (
                            str(uuid.uuid4()), aid, tx_type, amount,
                            round(running_bal, 2),
                            random.choice(TX_REMARKS),
                            bank_name[:3].upper() + str(random.randint(10**11, 10**12 - 1)),
                            tx_date,
                        )
                    )

    con.commit()
    con.close()
    print(f"  ✓ {bank_name} DB ready → {db_path}")


# ─────────────────────────────────────────────
# Flask app factory for each bank
# ─────────────────────────────────────────────
def get_con(db_path):
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    return con

def make_bank_app(bank_name: str, db_path: str) -> Flask:
    app = Flask(bank_name)
    CORS(app)

    def db():
        return get_con(db_path)

    # ── Health ──────────────────────────────
    @app.get("/health")
    def health():
        return jsonify({"bank": bank_name, "status": "UP"})

    # ── Fetch accounts by phone ─────────────
    @app.get("/accounts")
    def accounts_by_phone():
        phone = request.args.get("phone", "").strip()
        if not phone:
            return jsonify({"error": "phone is required"}), 400
        con  = db()
        cust = con.execute(
            "SELECT * FROM customers WHERE phone = ?", (phone,)
        ).fetchone()
        if not cust:
            con.close()
            return jsonify({"error": "Customer not found", "bank": bank_name}), 404
        accs = con.execute(
            "SELECT * FROM accounts WHERE customer_id = ? AND status = 'ACTIVE'",
            (cust["id"],)
        ).fetchall()
        con.close()
        return jsonify({
            "bank": bank_name,
            "customer": {
                "id":    cust["id"],
                "name":  cust["name"],
                "phone": cust["phone"],
                "pan":   cust["pan"],
            },
            "accounts": [
                {
                    "account_id":     a["id"],
                    "account_number": a["account_number"],
                    "ifsc":           a["ifsc"],
                    "account_type":   a["account_type"],
                    "balance":        a["balance"],
                    "status":         a["status"],
                }
                for a in accs
            ],
        })

    # ── Get balance ─────────────────────────
    @app.get("/accounts/<account_id>/balance")
    def get_balance(account_id):
        con = db()
        acc = con.execute(
            "SELECT a.*, c.name, c.phone FROM accounts a "
            "JOIN customers c ON c.id = a.customer_id "
            "WHERE a.id = ? AND a.status = 'ACTIVE'", (account_id,)
        ).fetchone()
        con.close()
        if not acc:
            return jsonify({"error": "Account not found"}), 404
        return jsonify({
            "bank":           bank_name,
            "account_id":     acc["id"],
            "account_number": acc["account_number"],
            "ifsc":           acc["ifsc"],
            "account_type":   acc["account_type"],
            "balance":        acc["balance"],
            "account_holder": acc["name"],
        })

    # ── Get transactions ────────────────────
    @app.get("/accounts/<account_id>/transactions")
    def get_transactions(account_id):
        limit  = min(int(request.args.get("limit",  "20")), 100)
        offset = int(request.args.get("offset", "0"))
        con    = db()
        acc    = con.execute("SELECT * FROM accounts WHERE id = ?", (account_id,)).fetchone()
        if not acc:
            con.close()
            return jsonify({"error": "Account not found"}), 404
        txns = con.execute(
            """SELECT * FROM transactions WHERE account_id = ?
               ORDER BY created_at DESC LIMIT ? OFFSET ?""",
            (account_id, limit, offset)
        ).fetchall()
        total = con.execute(
            "SELECT COUNT(*) FROM transactions WHERE account_id = ?", (account_id,)
        ).fetchone()[0]
        con.close()
        return jsonify({
            "bank":       bank_name,
            "account_id": account_id,
            "total":      total,
            "limit":      limit,
            "offset":     offset,
            "transactions": [
                {
                    "id":            t["id"],
                    "type":          t["type"],
                    "amount":        t["amount"],
                    "balance_after": t["balance_after"],
                    "remarks":       t["remarks"],
                    "ref_number":    t["ref_number"],
                    "status":        t["status"],
                    "date":          t["created_at"],
                }
                for t in txns
            ],
        })

    # ── Validate account + IFSC ─────────────
    @app.post("/accounts/validate")
    def validate_account():
        """
        Check if account_number + IFSC exist and match in this bank.
        Called by gateway before debiting to reject invalid destinations early.
        Returns {"valid": true/false} — never errors.
        """
        body    = request.get_json(silent=True) or {}
        acc_num = body.get("account_number", "").strip()
        ifsc    = body.get("ifsc", "").strip().upper()

        if not acc_num or not ifsc:
            return jsonify({"valid": False}), 200

        con = db()
        acc = con.execute(
            "SELECT id FROM accounts WHERE account_number = ? AND ifsc = ? AND status = 'ACTIVE'",
            (acc_num, ifsc)
        ).fetchone()
        con.close()

        return jsonify({"valid": acc is not None}), 200

    # ── Debit (outgoing transfer) ───────────
    @app.post("/accounts/<account_id>/transfer")
    def transfer(account_id):
        body    = request.get_json(silent=True) or {}
        amount  = body.get("amount")
        to_acc  = body.get("to_account_number")
        to_ifsc = body.get("to_ifsc")
        remarks = body.get("remarks", "Transfer")

        if not all([amount, to_acc, to_ifsc]):
            return jsonify({"error": "amount, to_account_number, to_ifsc are required"}), 400
        if float(amount) <= 0:
            return jsonify({"error": "Amount must be positive"}), 400

        con = db()
        acc = con.execute(
            "SELECT * FROM accounts WHERE id = ? AND status = 'ACTIVE'", (account_id,)
        ).fetchone()
        if not acc:
            con.close()
            return jsonify({"error": "Source account not found or inactive"}), 404
        if acc["balance"] < float(amount):
            con.close()
            return jsonify({"error": "Insufficient balance"}), 422

        new_balance = round(acc["balance"] - float(amount), 2)
        ref         = bank_name[:3].upper() + str(random.randint(10**11, 10**12 - 1))
        tx_id       = str(uuid.uuid4())

        con.execute("UPDATE accounts SET balance = ? WHERE id = ?", (new_balance, account_id))
        con.execute(
            """INSERT INTO transactions
               (id, account_id, type, amount, balance_after, remarks, ref_number, counterparty)
               VALUES (?,?,?,?,?,?,?,?)""",
            (tx_id, account_id, "DEBIT", float(amount), new_balance,
             remarks, ref, f"{to_acc}/{to_ifsc}")
        )
        con.commit()
        con.close()

        return jsonify({
            "status":        "SUCCESS",
            "bank":          bank_name,
            "tx_id":         tx_id,
            "ref_number":    ref,
            "amount":        float(amount),
            "balance_after": new_balance,
            "to_account":    to_acc,
            "to_ifsc":       to_ifsc,
            "timestamp":     datetime.utcnow().isoformat() + "Z",
        }), 201

    # ── Credit (incoming transfer) ──────────
    @app.post("/accounts/credit")
    def credit_account():
        """
        Called by gateway after a successful debit.
        Matches both account_number AND ifsc before crediting.
        """
        body       = request.get_json(silent=True) or {}
        to_acc_num = body.get("to_account_number", "").strip()
        to_ifsc    = body.get("to_ifsc", "").strip().upper()
        amount     = body.get("amount")
        remarks    = body.get("remarks", "Inward Transfer")
        ref_number = body.get("ref_number", "")
        from_bank  = body.get("from_bank", "")

        if not to_acc_num or not amount:
            return jsonify({"credited": False, "reason": "Missing fields"}), 200

        con = db()
        acc = con.execute(
            "SELECT * FROM accounts WHERE account_number = ? AND ifsc = ? AND status = 'ACTIVE'",
            (to_acc_num, to_ifsc)
        ).fetchone()

        if not acc:
            con.close()
            return jsonify({"credited": False, "reason": "Account not found in this bank"}), 200

        new_balance = round(acc["balance"] + float(amount), 2)
        tx_id       = str(uuid.uuid4())

        con.execute("UPDATE accounts SET balance = ? WHERE id = ?", (new_balance, acc["id"]))
        con.execute(
            """INSERT INTO transactions
               (id, account_id, type, amount, balance_after, remarks, ref_number, counterparty)
               VALUES (?,?,?,?,?,?,?,?)""",
            (tx_id, acc["id"], "CREDIT", float(amount), new_balance,
             remarks, ref_number, from_bank)
        )
        con.commit()
        con.close()

        print(f"  ✅ Credited ₹{amount} to {to_acc_num} in {bank_name} (ref: {ref_number})")
        return jsonify({
            "credited":    True,
            "bank":        bank_name,
            "account":     to_acc_num,
            "new_balance": new_balance,
            "ref_number":  ref_number,
        }), 200

    return app


# ─────────────────────────────────────────────
# Vyom AA Gateway (port 7000)
# ─────────────────────────────────────────────
def make_gateway_app() -> Flask:
    import urllib.request, json as _json

    app = Flask("VyomGateway")
    CORS(app)

    def call_bank(bank_name: str, path: str, method="GET", body=None):
        port    = BANKS[bank_name]["port"]
        url     = f"http://127.0.0.1:{port}{path}"
        headers = {"Content-Type": "application/json"}
        data    = _json.dumps(body).encode() if body else None
        try:
            req = urllib.request.Request(url, data=data, headers=headers, method=method)
            with urllib.request.urlopen(req, timeout=5) as r:
                return _json.loads(r.read()), r.status
        except Exception as e:
            return {"error": str(e)}, 503

    # ── Health ──────────────────────────────
    @app.get("/health")
    def health():
        results = {}
        for bank in BANKS:
            resp, code = call_bank(bank, "/health")
            results[bank] = resp.get("status", "DOWN") if code == 200 else "DOWN"
        return jsonify({"gateway": "UP", "banks": results})

    # ── All accounts for a phone ────────────
    @app.get("/vyom/accounts")
    def all_accounts():
        phone = request.args.get("phone", "").strip()
        if not phone:
            return jsonify({"error": "phone is required"}), 400
        result = {"phone": phone, "banks": {}}
        for bank in BANKS:
            resp, code = call_bank(bank, f"/accounts?phone={phone}")
            if code == 200:
                result["banks"][bank] = resp
            else:
                result["banks"][bank] = {"error": resp.get("error", "Failed"), "accounts": []}
        return jsonify(result)

    # ── Balance ─────────────────────────────
    @app.get("/vyom/<bank>/accounts/<account_id>/balance")
    def balance(bank, account_id):
        if bank.upper() not in BANKS:
            return jsonify({"error": "Unknown bank"}), 400
        resp, code = call_bank(bank.upper(), f"/accounts/{account_id}/balance")
        return jsonify(resp), code

    # ── Transactions ────────────────────────
    @app.get("/vyom/<bank>/accounts/<account_id>/transactions")
    def transactions(bank, account_id):
        if bank.upper() not in BANKS:
            return jsonify({"error": "Unknown bank"}), 400
        limit  = request.args.get("limit",  "20")
        offset = request.args.get("offset", "0")
        resp, code = call_bank(
            bank.upper(),
            f"/accounts/{account_id}/transactions?limit={limit}&offset={offset}"
        )
        return jsonify(resp), code

    # ── Transfer (validate + debit + credit) ─
    @app.post("/vyom/<bank>/accounts/<account_id>/transfer")
    def transfer(bank, account_id):
        if bank.upper() not in BANKS:
            return jsonify({"error": "Unknown bank"}), 400

        body       = request.get_json(silent=True) or {}
        to_acc_num = body.get("to_account_number", "").strip()
        to_ifsc    = body.get("to_ifsc", "").strip().upper()

        # ── Step 0: Pre-validate destination account + IFSC ──
        # Check all 3 banks — reject entire transaction if not found
        destination_valid = False
        for target_bank in BANKS:
            resp, code = call_bank(
                target_bank,
                "/accounts/validate",
                method="POST",
                body={"account_number": to_acc_num, "ifsc": to_ifsc},
            )
            if code == 200 and resp.get("valid"):
                destination_valid = True
                break

        if not destination_valid:
            return jsonify({
                "error": "Invalid destination. Account number and IFSC code do not match or account does not exist."
            }), 422

        # ── Step 1: Debit source account ─────
        debit_resp, debit_code = call_bank(
            bank.upper(),
            f"/accounts/{account_id}/transfer",
            method="POST",
            body=body,
        )

        if debit_code not in (200, 201):
            return jsonify(debit_resp), debit_code

        # ── Step 2: Credit destination account
        credit_payload = {
            "to_account_number": to_acc_num,
            "to_ifsc":           to_ifsc,
            "amount":            body.get("amount"),
            "remarks":           f"Inward transfer from {bank.upper()} via Vyom",
            "ref_number":        debit_resp.get("ref_number", ""),
            "from_bank":         bank.upper(),
        }

        credited_bank = None
        for target_bank in BANKS:
            credit_resp, credit_code = call_bank(
                target_bank,
                "/accounts/credit",
                method="POST",
                body=credit_payload,
            )
            if credit_code == 200 and credit_resp.get("credited"):
                credited_bank = target_bank
                print(f"  💸 Transfer: {bank.upper()} → {target_bank} | ₹{body.get('amount')} | ref: {debit_resp.get('ref_number')}")
                break

        return jsonify({
            **debit_resp,
            "credited_to_bank": credited_bank,
            "credit_status":    "SUCCESS" if credited_bank else "PENDING",
            "credit_note":      f"Credited in {credited_bank}" if credited_bank
                                else "Credit pending",
        }), 201

    return app


# ─────────────────────────────────────────────
# Boot all servers
# ─────────────────────────────────────────────
if __name__ == "__main__":
    print("\n🏦 Vyom Dummy Bank Server\n" + "="*40)

    print("\nInitialising databases...")
    for name, cfg in BANKS.items():
        init_db(cfg["db"], name, cfg["ifsc_prefix"])

    threads = []
    for bank_name, cfg in BANKS.items():
        bank_app = make_bank_app(bank_name, cfg["db"])
        t = threading.Thread(
            target=lambda a=bank_app, p=cfg["port"]: a.run(
                host="0.0.0.0", port=p, debug=False, use_reloader=False
            ),
            daemon=True
        )
        t.start()
        threads.append(t)
        print(f"  🚀 {bank_name} Bank API  → http://localhost:{cfg['port']}")

    gw = make_gateway_app()
    print(f"  🌐 Vyom AA Gateway    → http://localhost:7000")
    print("\nEndpoints:")
    print("  GET  :7000/vyom/accounts?phone=9876543210")
    print("  GET  :7000/vyom/ICICI/accounts/<id>/balance")
    print("  GET  :7000/vyom/SBI/accounts/<id>/transactions")
    print("  POST :7000/vyom/HDFC/accounts/<id>/transfer   ← validates IFSC+account, then debit+credit")
    print("  GET  :7000/health")
    print("\nsqlite_web UI (run separately):")
    print("  python view_dbs.py")
    print("\nPress Ctrl+C to stop.\n")

    gw.run(host="0.0.0.0", port=7000, debug=False, use_reloader=False)