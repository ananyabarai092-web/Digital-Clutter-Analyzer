@echo off
echo.
echo ======================================
echo   ClutterGuard - Start FastAPI Backend
echo ======================================
echo.

cd /d "c:\Users\anany\OneDrive\Desktop\digital clutter and risk analyzer"

echo Activating environment...
call .venv\Scripts\activate.bat

echo.
echo ======================================
echo   FastAPI Starting on http://localhost:8000
echo ======================================
echo Keep this window open!
echo.
echo In a NEW terminal, run:
echo   cd "c:\Users\anany\OneDrive\Desktop\digital clutter and risk analyzer\frontend"
echo   npm run dev
echo.
echo Then open: http://localhost:5173
echo.
echo.
echo API Documentation: http://localhost:8000/docs
echo.
pause

python -c "import sys; from pathlib import Path; sys.path.insert(0, str(Path('.').resolve())); from server.main import app; import uvicorn; uvicorn.run(app, host='0.0.0.0', port=8000)"