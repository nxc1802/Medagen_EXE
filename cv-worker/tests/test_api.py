from fastapi.testclient import TestClient
import pytest
import os
from src.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert "dermnet" in response.json()["models_configured"]

def test_api_key_blocks_unauthorized(monkeypatch):
    # Enable API Key in test environment
    monkeypatch.setenv("API_KEY", "test-secret-key")
    
    # Send request without key
    response = client.post("/api/v1/predict", data={"model_name": "dermnet", "top_n": 3})
    assert response.status_code == 401
    assert "Unauthorized" in response.json()["detail"]

def test_api_key_allows_authorized_but_fails_on_empty_file(monkeypatch):
    monkeypatch.setenv("API_KEY", "test-secret-key")
    
    # Send request with valid key but missing file (should pass verification, but fail with 422 due to missing file)
    headers = {"X-API-Key": "test-secret-key"}
    response = client.post("/api/v1/predict", data={"model_name": "dermnet", "top_n": 3}, headers=headers)
    
    # It passes 401 authorization and reaches standard multipart validation (422)
    assert response.status_code == 422
