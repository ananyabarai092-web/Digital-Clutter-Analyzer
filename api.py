from flask import Flask, jsonify, request
from flask_cors import CORS
import json
from pathlib import Path
from datetime import datetime, timedelta
from models import FileRecord
from analyzer import StorageAnalyzer
from duplicate_finder import DuplicateFinder
from security import SecurityAnalyzer
from recommendations import CleanupAdvisor
from scanner import FileScanner
import os

app = Flask(__name__)
CORS(app)

# Store the latest report
latest_report_path = Path("latest_report.json")
scan_history_path = Path("data/scan_history.json")

def load_latest_report():
    """Load the latest report from JSON"""
    try:
        with open(latest_report_path, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return None

def load_scan_history():
    """Load scan history"""
    try:
        with open(scan_history_path, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return []

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "ClutterGuard API is running"}), 200

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    """Get dashboard data"""
    report = load_latest_report()
    if not report:
        return jsonify({"error": "No report data available"}), 404
    
    return jsonify(report), 200

@app.route('/api/summary', methods=['GET'])
def get_summary():
    """Get summary statistics"""
    report = load_latest_report()
    if not report:
        return jsonify({"error": "No report data available"}), 404
    
    return jsonify(report.get("summary", {})), 200

@app.route('/api/storage', methods=['GET'])
def get_storage():
    """Get storage breakdown"""
    report = load_latest_report()
    if not report:
        return jsonify({"error": "No report data available"}), 404
    
    return jsonify(report.get("storage", {})), 200

@app.route('/api/security', methods=['GET'])
def get_security():
    """Get security information"""
    report = load_latest_report()
    if not report:
        return jsonify({"error": "No report data available"}), 404
    
    return jsonify(report.get("security", {})), 200

@app.route('/api/cleanup-recommendations', methods=['GET'])
def get_cleanup_recommendations():
    """Get cleanup recommendations"""
    report = load_latest_report()
    if not report:
        return jsonify({"error": "No report data available"}), 404
    
    return jsonify(report.get("cleanup_recommendations", [])), 200

@app.route('/api/files', methods=['GET'])
def get_files():
    """Get file list"""
    report = load_latest_report()
    if not report:
        return jsonify({"error": "No report data available"}), 404
    
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 50, type=int)
    
    files = report.get("file_list", [])
    start = (page - 1) * limit
    end = start + limit
    
    return jsonify({
        "files": files[start:end],
        "total": len(files),
        "page": page,
        "limit": limit,
        "pages": (len(files) + limit - 1) // limit
    }), 200

@app.route('/api/scan-history', methods=['GET'])
def get_scan_history_endpoint():
    """Get scan history"""
    history = load_scan_history()
    return jsonify(history), 200

@app.route('/api/scan', methods=['POST'])
def start_scan():
    """Start a new scan"""
    try:
        data = request.get_json()
        scan_path = data.get('path', os.path.expanduser('~'))
        
        # You would integrate your existing scanner here
        # For now, return a placeholder
        return jsonify({
            "status": "scanning",
            "path": scan_path,
            "message": "Scan started"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/file-action', methods=['POST'])
def file_action():
    """Perform action on file (delete, quarantine, ignore)"""
    try:
        data = request.get_json()
        action = data.get('action')  # delete, quarantine, ignore
        file_path = data.get('file_path')
        
        # You would implement actual file operations here
        return jsonify({
            "status": "success",
            "action": action,
            "file_path": file_path
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)
