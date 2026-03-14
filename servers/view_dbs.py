"""
Run this to open all 3 bank DBs in sqlite-web browser UI.
Usage: python view_dbs.py
"""

import subprocess, sys, os, time, webbrowser

BASE_DIR = os.path.join(os.path.dirname(__file__), "data")

BANKS = [
    {"name": "ICICI", "db": os.path.join(BASE_DIR, "icici.db"), "port": 8081},
    {"name": "SBI",   "db": os.path.join(BASE_DIR, "sbi.db"),   "port": 8082},
    {"name": "HDFC",  "db": os.path.join(BASE_DIR, "hdfc.db"),  "port": 8083},
]

def check_dbs():
    missing = [b["name"] for b in BANKS if not os.path.exists(b["db"])]
    if missing:
        print(f"\n❌ DB files not found for: {', '.join(missing)}")
        print("   Run 'python bank_server.py' first to create and seed the databases.\n")
        sys.exit(1)

def main():
    check_dbs()

    print("\n🗄️  Vyom — Bank DB Viewer")
    print("=" * 35)

    procs = []
    for bank in BANKS:
        proc = subprocess.Popen(
            [sys.executable, "-m", "sqlite_web", bank["db"], "--port", str(bank["port"]), "--host", "127.0.0.1"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        procs.append(proc)
        print(f"  ✓ {bank['name']:<6} → http://localhost:{bank['port']}")

    # Give servers a moment to start, then open all in browser
    time.sleep(1.5)
    print("\n  Opening in browser...")
    for bank in BANKS:
        webbrowser.open(f"http://localhost:{bank['port']}")

    print("\n  Press Ctrl+C to stop all.\n")

    try:
        for p in procs:
            p.wait()
    except KeyboardInterrupt:
        print("\n  Stopping...")
        for p in procs:
            p.terminate()
        print("  Done.\n")

if __name__ == "__main__":
    main()