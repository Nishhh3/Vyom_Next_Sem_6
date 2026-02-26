# face_auth_pipeline.py
# SilentFace + InsightFace pipeline (PRODUCTION STABLE — STRONG ANTI-SPOOF + SCREEN)

import cv2
import numpy as np
import torch
import os
import torchvision.transforms as T
from insightface.app import FaceAnalysis

from MiniFASNet import MiniFASNetV1, MiniFASNetV2, MiniFASNetV1SE

# =====================
# CALIBRATED THRESHOLDS (from your dataset)
# =====================
ANTI_SPOOF_THRESHOLD = 0.047    # SilentFace liveness
SCREEN_TEXTURE_THRESHOLD = 10000 # screen replay detector
LOW_TEXTURE_THRESHOLD = 25       # print attack detector

# =====================
# MODEL PATHS
# =====================
MODEL_V2 = "models/2.7_80x80_MiniFASNetV2.pth"
MODEL_V1 = "models/4_0_0_80x80_MiniFASNetV1SE.pth"

# =====================
# LOAD SILENTFACE
# =====================
def load_silentface(path):
    name = os.path.basename(path)

    if "V1SE" in name:
        model = MiniFASNetV1SE(128, (5,5), num_classes=3)
    elif "V2" in name:
        model = MiniFASNetV2(128, (5,5), num_classes=3)
    else:
        model = MiniFASNetV1(128, (5,5), num_classes=3)

    state = torch.load(path, map_location="cpu")
    state = {k.replace("module.",""):v for k,v in state.items()}
    model.load_state_dict(state, strict=False)
    model.eval()
    return model

print("🔄 Loading SilentFace...")
model_v2 = load_silentface(MODEL_V2)
model_v1 = load_silentface(MODEL_V1)
print("✅ SilentFace ready")

# =====================
# LOAD INSIGHTFACE
# =====================
print("🔄 Loading InsightFace...")
detector = FaceAnalysis(name="buffalo_s", providers=["CPUExecutionProvider"])
detector.prepare(ctx_id=0, det_size=(640,640))
print("✅ InsightFace ready")

# =====================
# PREPROCESS
# =====================
transform = T.Compose([
    T.ToPILImage(),
    T.Resize((112,112)),
    T.CenterCrop(80),
    T.ToTensor(),
    T.Normalize([0.5]*3,[0.5]*3),
])

# =====================
# IMAGE ENHANCEMENT
# =====================
def normalize_face(face_rgb):
    ycrcb = cv2.cvtColor(face_rgb, cv2.COLOR_RGB2YCrCb)
    ycrcb[:,:,0] = cv2.equalizeHist(ycrcb[:,:,0])
    return cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2RGB)

def sharpen(face_rgb):
    kernel = np.array([[0,-1,0],[-1,5,-1],[0,-1,0]])
    return cv2.filter2D(face_rgb,-1,kernel)

# =====================
# CROP
# =====================
def crop_face(img, f, scale=1.2):
    h,w = img.shape[:2]
    x1,y1,x2,y2 = f.bbox.astype(int)

    cx,cy = (x1+x2)//2,(y1+y2)//2
    bw,bh = int((x2-x1)*scale),int((y2-y1)*scale)

    x1=max(0,cx-bw//2)
    y1=max(0,cy-bh//2)
    x2=min(w,cx+bw//2)
    y2=min(h,cy+bh//2)

    face = img[y1:y2,x1:x2]
    if face is None or face.size==0:
        return None

    face = cv2.cvtColor(face,cv2.COLOR_BGR2RGB)
    face = normalize_face(face)
    face = sharpen(face)
    return face

# =====================
# SCORES
# =====================
def texture_score(face_rgb):
    gray = cv2.cvtColor(face_rgb, cv2.COLOR_RGB2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_32F).var())

def anti_spoof_score_multi(crops):
    scores=[]
    for c in crops:
        t = transform(c).unsqueeze(0)
        with torch.no_grad():
            p1 = torch.softmax(model_v1(t), dim=1)[0][0]
            p2 = torch.softmax(model_v2(t), dim=1)[0][0]
        scores.append(float((p1+p2)/2))
    return float(np.mean(scores))

# =====================
# MAIN VERIFY FUNCTION
# =====================
def verify_face_image(image_bytes: bytes, debug: bool=False):
    """
    Returns:
        status: ok | spoof | no_face
        embedding: np.array (if ok)
        liveness: float
        texture: float
    """

    img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return {"status": "no_face"}

    faces = detector.get(img)
    if not faces:
        return {"status": "no_face"}

    f = faces[0]
    emb = f.normed_embedding.astype(np.float32)

    # ===== MULTI CROP =====
    crops=[]
    for _ in range(3):
        scale = 1.2 + 0.05*np.random.randn()
        c = crop_face(img,f,scale)
        if c is not None:
            crops.append(c)

    if not crops:
        return {"status": "no_face"}

    live = anti_spoof_score_multi(crops)
    tex  = float(np.mean([texture_score(c) for c in crops]))

    if debug:
        print("PIPELINE → live:", live, "tex:", tex)

    # =====================
    # SCREEN SPOOF (high texture)
    # =====================
    if tex > SCREEN_TEXTURE_THRESHOLD:
        return {
            "status": "spoof",
            "liveness": float(live),
            "texture": float(tex),
        }

    # =====================
    # PRINT / LOW TEXTURE
    # =====================
    if tex < LOW_TEXTURE_THRESHOLD:
        return {
            "status": "spoof",
            "liveness": float(live),
            "texture": float(tex),
        }

    # =====================
    # SILENTFACE LIVENESS
    # =====================
    if live < ANTI_SPOOF_THRESHOLD:
        return {
            "status": "spoof",
            "liveness": float(live),
            "texture": float(tex),
        }

    # ===== REAL =====
    return {
        "status": "ok",
        "embedding": emb,
        "liveness": float(live),
        "texture": float(tex),
    }