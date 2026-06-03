"""
Download model weights from Hugging Face Hub if not already present locally.
Set HF_MODEL_REPO env var to your HF model repo (e.g. "yourname/medagen-models").
If not set, this step is skipped and models must exist in models/ already.
"""
import os
import logging

logger = logging.getLogger("cv-worker")

MODEL_FILES = [
    "best_medagen_swin_convnext_cbam_23classes.pth",
    "resnet18_cbam_teeth_best.pth",
    "resnet18_cbam_nail_best.pth",
]

def download_models():
    repo_id = os.getenv("HF_MODEL_REPO")
    if not repo_id:
        logger.info("HF_MODEL_REPO not set — skipping model download, expecting models/ to exist.")
        return

    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        logger.warning("huggingface_hub not installed — skipping model download.")
        return

    os.makedirs("models", exist_ok=True)
    hf_token = os.getenv("HF_TOKEN")

    for filename in MODEL_FILES:
        dest = os.path.join("models", filename)
        if os.path.exists(dest):
            logger.info(f"Model already present, skipping: {filename}")
            continue
        try:
            logger.info(f"Downloading {filename} from {repo_id}...")
            hf_hub_download(
                repo_id=repo_id,
                filename=filename,
                local_dir="models",
                token=hf_token,
            )
            logger.info(f"Downloaded: {filename}")
        except Exception as e:
            logger.error(f"Failed to download {filename}: {e}")
