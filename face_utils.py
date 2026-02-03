import cv2, os, time
import numpy as np
from deepface import DeepFace
from mtcnn import MTCNN

os.makedirs("captures",exist_ok=True)

detector = MTCNN()
DeepFace.build_model("ArcFace")

MIN_CONF = 15.0

def enhance(face):

    h,w = face.shape[:2]

    up = cv2.resize(face,(w*2,h*2))
    denoise = cv2.fastNlMeansDenoisingColored(up,None,7,7,5,15)

    lab = cv2.cvtColor(denoise,cv2.COLOR_BGR2LAB)
    l,a,b = cv2.split(lab)

    clahe = cv2.createCLAHE(2,(8,8))
    l = clahe.apply(l)

    merged = cv2.merge([l,a,b])
    sharp = cv2.filter2D(
        cv2.cvtColor(merged,cv2.COLOR_LAB2BGR),
        -1,
        [[0,-1,0],[-1,5,-1],[0,-1,0]]
    )

    return cv2.resize(sharp,(224,224))

def extract_face(path):

    img = cv2.imread(path)
    rgb = cv2.cvtColor(img,cv2.COLOR_BGR2RGB)

    faces = detector.detect_faces(rgb)

    if not faces:
        return None,None

    best = max(faces,key=lambda x:x["confidence"])

    x,y,w,h = best["box"]

    return img[y:y+h,x:x+w], best

def webcam_capture(path):

    cap = cv2.VideoCapture(0,cv2.CAP_DSHOW)
    for _ in range(15): cap.read()

    time.sleep(2)
    ret,frame = cap.read()

    cv2.imwrite(path,frame)
    cap.release()

def verify(img1,img2):

    res = DeepFace.verify(
        img1,img2,
        model_name="ArcFace",
        detector_backend="opencv",
        distance_metric="cosine",
        enforce_detection=False
    )

    conf = max(0,min(100,(1-res["distance"]/res["threshold"])*100))

    return conf>MIN_CONF, conf
