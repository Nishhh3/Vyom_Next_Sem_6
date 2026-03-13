from fastapi import FastAPI, UploadFile, File
import tensorflow as tf
import numpy as np
import cv2

app = FastAPI()

model = tf.keras.models.load_model("new_aadhaar_fraud_model.keras")
IMG_SIZE = 224

def preprocess(image_bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
    img = img.astype(np.float32) / 255.0
    img = np.expand_dims(img, axis=0)
    return img

@app.post("/analyze")
async def analyze_document(file: UploadFile = File(...)):
    image_bytes = await file.read()
    img = preprocess(image_bytes)

    prediction = model.predict(img)[0][0]
    probability = float(prediction)

    return {
        "forgery_probability": probability,
        "is_forged": probability >= 0.35
    }