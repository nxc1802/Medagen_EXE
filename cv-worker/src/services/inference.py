import os
import torch
from torchvision import transforms
from PIL import Image
from typing import Dict, Any, List
from src.models.architectures import ViTCNNHybrid, CBAMResNet18

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
IMAGE_SIZE = 224

MODEL_CONFIGS = {
    "dermnet": {
        "path": "models/best_medagen_swin_convnext_cbam_23classes.pth",
        "type": "vit_cnn_hybrid",
        "classes": [
            "Acne and Rosacea Photos", "Actinic Keratosis Basal Cell Carcinoma and other Malignant Lesions",
            "Atopic Dermatitis Photos", "Bullous Disease Photos", "Cellulitis Impetigo and other Bacterial Infections",
            "Eczema Photos", "Exanthems and Drug Eruptions", "Hair Loss Photos Alopecia and other Hair Diseases",
            "Herpes HPV and other STDs Photos", "Light Diseases and Disorders of Pigmentation",
            "Lupus and other Connective Tissue diseases", "Melanoma Skin Cancer Nevi and Moles",
            "Nail Fungus and other Nail Disease", "Poison Ivy Photos and other Contact Dermatitis",
            "Psoriasis pictures Lichen Planus and related diseases", "Scabies Lyme Disease and other Infestations and Bites",
            "Seborrheic Keratoses and other Benign Tumors", "Systemic Disease",
            "Tinea Ringworm Candidiasis and other Fungal Infections", "Urticaria Hives",
            "Vascular Tumors", "Vasculitis Photos", "Warts Molluscum and other Viral Infections"
        ]
    },
    "teeth": {
        "path": "models/resnet18_cbam_teeth_best.pth",
        "type": "cbam_resnet18",
        "classes": ["Calculus", "Mouth Ulcer", "Tooth Discoloration", "caries", "hypodontia", "Unknown"]
    },
    "nail": {
        "path": "models/resnet18_cbam_nail_best.pth",
        "type": "cbam_resnet18",
        "classes": ["Acral_Lentiginous_Melanoma", "Healthy_Nail", "Onychogryphosis", "blue_finger", "clubbing", "pitting", "Unknown"]
    }
}

loaded_models = {}

transforms_inference = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def load_model(model_name: str):
    if model_name in loaded_models:
        return loaded_models[model_name]
    
    if model_name not in MODEL_CONFIGS:
        raise ValueError(f"Model {model_name} not found in configurations.")
        
    config = MODEL_CONFIGS[model_name]
    model_path = config["path"]
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file {model_path} not found.")

    checkpoint = torch.load(model_path, map_location=DEVICE)
    if isinstance(checkpoint, dict):
        state_dict = checkpoint.get('model_state', checkpoint.get('state_dict', checkpoint))
    else:
        state_dict = checkpoint

    if config["type"] == "vit_cnn_hybrid":
        model = ViTCNNHybrid(num_classes=len(config["classes"]))
    elif config["type"] == "cbam_resnet18":
        model = CBAMResNet18(num_classes=len(config["classes"]))
    
    try:
        model.load_state_dict(state_dict, strict=True)
    except RuntimeError:
        model.load_state_dict(state_dict, strict=False)
        
    model = model.to(DEVICE)
    model.eval()
    
    loaded_models[model_name] = model
    return model

def predict(image: Image.Image, model_name: str, top_n: int = 3) -> List[Dict[str, Any]]:
    model = load_model(model_name)
    config = MODEL_CONFIGS[model_name]
    class_names = config["classes"]
    
    image_tensor = transforms_inference(image).unsqueeze(0).to(DEVICE)
    
    with torch.no_grad():
        logits = model(image_tensor)
        probabilities = torch.softmax(logits, dim=1)[0]
        
        top_n = min(top_n, len(class_names))
        topk = torch.topk(probabilities, k=top_n)
        
        predictions = []
        for prob, idx in zip(topk.values, topk.indices):
            predictions.append({
                "class": class_names[int(idx)],
                "confidence": float(prob)
            })
            
    return predictions
