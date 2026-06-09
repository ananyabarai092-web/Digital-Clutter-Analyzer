from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from analyzer import StorageAnalyzer
from models import FileRecord
from duplicate_finder import DuplicateFinder
from security import SecurityAnalyzer

class CleanupAdvisor:
    def __init__(self, files: List[FileRecord]):
        self.files = files
        self.analyzer = StorageAnalyzer(files)
        self.duplicate_finder = DuplicateFinder(files)

    def identify_unused_files(self, threshold_days: int = 180) -> List[FileRecord]:
        cutoff = datetime.now() - timedelta(days=threshold_days)
        return [file for file in self.files if file.modified_date < cutoff]

    def identify_large_files(self, top_n: int = 10) -> List[FileRecord]:
        return sorted(self.files, key=lambda f: f.size, reverse=True)[:top_n]

    def identify_duplicate_files(self) -> Dict[str, List[FileRecord]]:
        return self.duplicate_finder.find_duplicate_content()

    def generate_recommendations(self, security_report: Dict[str, object]) -> List[str]:
        recommendations: List[str] = []
        duplicate_groups = self.identify_duplicate_files()
        unused_90 = self.identify_unused_files(90)
        unused_180 = self.identify_unused_files(180)
        large_files = self.identify_large_files(5)

        if duplicate_groups:
            recommendations.append(f"⚠ {len(duplicate_groups)} duplicate content groups detected.")
            recommendations.append(f"Potential storage recovery: {self._format_size(self.duplicate_finder.calculate_wasted_space(duplicate_groups))}.")
        if unused_180:
            recommendations.append(f"⚠ {len(unused_180)} files have not been modified in 180 days.")
        if len(large_files) > 0:
            recommendations.append("⚠ Review the top large files to free up space.")
        if security_report.get("hidden_executables", 0) > 0:
            recommendations.append("Investigate hidden executable files.")
        if security_report.get("duplicate_executables", 0) > 0:
            recommendations.append("Remove duplicate installers and duplicate executable files.")
        if not recommendations:
            recommendations.append("System looks clean. Keep backup and maintenance routines active.")

        recommendations.append("• Archive unused large files and installers.")
        recommendations.append("• Remove temporary clutter from Downloads and Desktop.")
        return recommendations

    def _format_size(self, value: int) -> str:
        for unit in ["B", "KB", "MB", "GB", "TB"]:
            if value < 1024.0:
                return f"{value:.2f} {unit}"
            value /= 1024.0
        return f"{value:.2f} TB"
