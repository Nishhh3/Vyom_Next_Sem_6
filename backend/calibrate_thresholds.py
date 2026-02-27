import glob
import numpy as np
import os
from face_auth_pipeline import verify_face_image

def collect(folder):
    files = (
        glob.glob(os.path.join(folder, "*.jpg")) +
        glob.glob(os.path.join(folder, "*.jpeg")) +
        glob.glob(os.path.join(folder, "*.png"))
    )

    print(f"\n📂 {folder} → {len(files)} images")

    results = []

    for p in files:
        with open(p, "rb") as f:
            r = verify_face_image(f.read())

        print(os.path.basename(p), "→", r["status"])

        print("   liveness:", r.get("liveness"), "texture:", r.get("texture"))

        results.append(r)   # collect all

    return results


real = collect("calibration_data/real_same")
spoof = collect("calibration_data/spoof")

real_live = [r["liveness"] for r in real]
spoof_live = [r["liveness"] for r in spoof]

print("\n=== LIVENESS ===")
print("REAL avg:", np.mean(real_live))
print("REAL min:", min(real_live))
print("SPOOF max:", max(spoof_live))
print("SPOOF avg:", np.mean(spoof_live))

thr = (min(real_live) + max(spoof_live)) / 2
print("\n✅ Suggested ANTI_SPOOF_THRESHOLD =", round(thr, 3))