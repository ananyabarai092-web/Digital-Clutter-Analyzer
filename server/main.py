"""
ClutterGuard FastAPI Backend Server
Connects the React frontend to the Python scanner engine.
"""
import logging
import os
import sys
from pathlib import Path

# Add project root to Python path so existing modules can be imported
_project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_project_root))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.routers import auth, scan, dashboard, duplicates, security, cleanup, reports, files, storage_growth, root_api
from server.services.database import database

app = FastAPI(
    title="ClutterGuard API",
    description="Backend API for Digital Clutter & Security Analyzer",
    version="1.0.0",
)

# Configure CORS — allow all origins to prevent browser blocking
# Restrict this in production if needed via ALLOWED_ORIGINS env var
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
database.init_indexes()
app.include_router(auth.router)
app.include_router(root_api.router)
app.include_router(scan.router)
app.include_router(dashboard.router)
app.include_router(duplicates.router)
app.include_router(security.router)
app.include_router(cleanup.router)
app.include_router(reports.router)
app.include_router(files.router)
app.include_router(storage_growth.router)


@app.get("/")
async def root():
    return {"message": "ClutterGuard API", "version": "1.0.0", "status": "running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="0.0.0.0", port=8000, reload=True)
