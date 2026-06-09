import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List
from models import FileRecord

class ReportGenerator:
    def __init__(self, scan_path: Path, files: List[FileRecord], metadata: Dict[str, object]):
        self.scan_path = scan_path
        self.files = files
        self.metadata = metadata

    def generate_summary_report(self) -> Dict[str, object]:
        return {
            "scan_path": str(self.scan_path),
            "scan_date": datetime.now().isoformat(),
            "files_scanned": len(self.files),
            "folders_scanned": self.metadata.get("folders_scanned", 0),
            "scan_duration_seconds": round(self.metadata.get("scan_duration", 0.0), 2),
            "storage_used_bytes": self.metadata.get("storage_used", 0),
            "security_score": self.metadata.get("security_score", 0),
            "risk_status": self.metadata.get("risk_status", "UNKNOWN"),
        }

    def generate_storage_report(self, storage_summary: Dict[str, object]) -> Dict[str, object]:
        return {
            "summary": self.generate_summary_report(),
            "storage": storage_summary,
        }

    def generate_security_report(self, security_summary: Dict[str, object]) -> Dict[str, object]:
        return {
            "summary": self.generate_summary_report(),
            "security": security_summary,
        }

    def generate_cleanup_report(self, cleanup_recommendations: List[str], top_large_files: List[Dict[str, object]]) -> Dict[str, object]:
        return {
            "summary": self.generate_summary_report(),
            "cleanup_recommendations": cleanup_recommendations,
            "top_large_files": top_large_files,
        }

    def export_json(self, data: Dict[str, object], file_name: str, export_dir: Path) -> Path:
        export_dir.mkdir(parents=True, exist_ok=True)
        path = export_dir / file_name
        try:
            with path.open("w", encoding="utf-8") as file:
                json.dump(data, file, indent=2)
        except (OSError, IOError):
            raise
        return path

    def export_txt(self, report: Dict[str, object], file_name: str, export_dir: Path) -> Path:
        export_dir.mkdir(parents=True, exist_ok=True)
        path = export_dir / file_name
        lines: List[str] = []

        def add_line(key, value):
            lines.append(f"{key}: {value}")

        for key, value in report.items():
            add_line(key, value)
        try:
            with path.open("w", encoding="utf-8") as file:
                file.write("\n".join(lines))
        except (OSError, IOError):
            raise
        return path
