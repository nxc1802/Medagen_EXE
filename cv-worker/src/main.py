from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Security
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
import io
import os
import logging
from PIL import Image
from contextlib import asynccontextmanager
import asyncio
from src.services.inference import predict, MODEL_CONFIGS, load_model, loaded_models

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cv-worker")

# Define API Key header security
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)):
    expected_key = os.getenv("API_KEY")
    if expected_key: # Only enforce authentication if API_KEY is set in environment
        if not api_key or api_key != expected_key:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid API Key")
    return api_key

async def preload_models_background():
    # Run PyTorch model loading in a background thread so it doesn't block the event loop
    for model_name in MODEL_CONFIGS.keys():
        try:
            logger.info(f"Loading weights for model: {model_name}...")
            await asyncio.to_thread(load_model, model_name)
            logger.info(f"Model [{model_name}] preloaded successfully.")
        except Exception as e:
            logger.error(f"Failed to preload model [{model_name}]: {str(e)}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Phase: Schedule background model loading
    logger.info("Initializing CV Worker, scheduling models to load in background...")
    asyncio.create_task(preload_models_background())
    yield
    # Shutdown Phase: Clean up loaded models to release memory
    logger.info("Shutting down CV Worker, releasing loaded model resources...")
    loaded_models.clear()

app = FastAPI(
    title="Medagen CV Worker",
    description="FastAPI service for Medical Image Analysis (Dermatology, Dental, Nail)",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Medagen CV Worker API is running."}

@app.get("/health")
def health_check():
    return {
        "status": "ok", 
        "models_configured": list(MODEL_CONFIGS.keys()),
        "models_loaded": list(loaded_models.keys()),
        "ready": len(loaded_models) == len(MODEL_CONFIGS)
    }

@app.post("/api/v1/predict")
async def handle_prediction(
    file: UploadFile = File(...),
    model_name: str = Form("dermnet"),
    top_n: int = Form(3),
    api_key: str = Depends(verify_api_key)
):
    if model_name not in MODEL_CONFIGS:
        raise HTTPException(status_code=400, detail=f"Invalid model name. Available: {list(MODEL_CONFIGS.keys())}")
        
    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")
        
    try:
        predictions = predict(image, model_name, top_n)
        return {
            "success": True,
            "model": model_name,
            "predictions": predictions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
