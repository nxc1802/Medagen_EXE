# Medagen v2 Monorepo

This repository contains the rebuilt production-ready Medagen system.

## Project Structure
- `/backend`: Node.js + Fastify API with LangChain and Multi-LLM provider support.
- `/cv-worker`: FastAPI Python service for Computer Vision inference.
- `/.github/workflows`: CI/CD pipelines to deploy to Hugging Face Docker Spaces.

## Quick Start
```bash
docker-compose up --build
```
- Backend API & Swagger: `http://localhost:3000/docs`
- CV Worker API & Swagger: `http://localhost:8000/docs`
