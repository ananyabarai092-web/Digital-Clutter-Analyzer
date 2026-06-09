import os
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List
from models import FileRecord

SUSPICIOUS_EXTENSIONS = {".exe", ".bat", ".cmd", ".vbs", ".scr", ".ps1", ".dll"}
MALWARE_SIGNATURES = [
    b"powershell",
    b"invoke-expression",
    b"createprocess",
    b"createremotethread",
    b"virtualalloc",
    b"wscript.shell",
    b"shell.execute",
    b"base64",
    b"eval(",
    b"document.write",
    b"cmd.exe",
    b"mshta",
    b"regsvr32",
    b"certutil",
]
PROTECTED_PATH_SEGMENTS = [
    "\\windows\\",
    "\\program files\\",
    "\\program files (x86)\\",
    "\\system32\\",
    "\\boot\\",
    "\\recovery\\",
]


class SecurityAnalyzer:
    def __init__(self, files: List[FileRecord], root_path: Path):
        self.files = files
        self.root_path = root_path

    def scan_malware_content(self, max_bytes: int = 1024 * 1024) -> List[FileRecord]:
        malware_files: List[FileRecord] = []
        for file in self.files:
            try:
                with file.path.open("rb") as fh:
                    data = fh.read(max_bytes).lower()
            except (OSError, PermissionError):
                continue

            if any(signature in data for signature in MALWARE_SIGNATURES):
                malware_files.append(file)
        return malware_files

    def scan_suspicious_extensions(self) -> List[FileRecord]:
        return [file for file in self.files if file.extension in SUSPICIOUS_EXTENSIONS]

    def detect_hidden_executables(self) -> List[FileRecord]:
        return [file for file in self.files if file.is_executable() and file.is_hidden()]

    def detect_large_unknown_files(self, threshold_mb: int = 50) -> List[FileRecord]:
        return [
            file
            for file in self.files
            if file.size >= threshold_mb * 1024 * 1024
            and file.extension not in {".mp4", ".mkv", ".zip", ".exe"}
        ]

    def detect_duplicate_executables(self) -> Dict[str, List[FileRecord]]:
        groups: Dict[str, List[FileRecord]] = defaultdict(list)
        suspicious = self.scan_suspicious_extensions()
        for file in suspicious:
            groups[file.name.lower()].append(file)
        return {name: records for name, records in groups.items() if len(records) > 1}

    def detect_old_executables(self, age_days: int = 365) -> List[FileRecord]:
        cutoff = datetime.now() - timedelta(days=age_days)
        return [file for file in self.scan_suspicious_extensions() if file.modified_date < cutoff]

    def is_safe_to_delete(self, file: FileRecord) -> bool:
        try:
            resolved_file = file.path.resolve()
            resolved_root = self.root_path.resolve()
            if resolved_file != resolved_root:
                try:
                    if not resolved_file.is_relative_to(resolved_root):
                        return False
                except AttributeError:
                    if not str(resolved_file).startswith(str(resolved_root) + os.sep):
                        return False
            lower_path = str(resolved_file).lower()
            return not any(segment in lower_path for segment in PROTECTED_PATH_SEGMENTS)
        except (OSError, RuntimeError):
            return False

    def risk_score(self) -> int:
        suspicious_count = len(self.scan_suspicious_extensions())
        hidden_count = len(self.detect_hidden_executables())
        large_count = len(self.detect_large_unknown_files())
        duplicate_count = len(self.detect_duplicate_executables())
        old_count = len(self.detect_old_executables())
        malware_count = len(self.scan_malware_content())
        total_files = len(self.files) or 1

        score = (
            suspicious_count * 2
            + hidden_count * 5
            + large_count * 3
            + duplicate_count * 2
            + old_count * 1
            + malware_count * 10
        )
        score += int((suspicious_count / total_files) * 30)
        score += int((malware_count / total_files) * 40)
        return min(100, max(0, score))

    def generate_security_report(self) -> Dict[str, object]:
        suspicious = self.scan_suspicious_extensions()
        hidden = self.detect_hidden_executables()
        large_unknown = self.detect_large_unknown_files()
        duplicate_execs = self.detect_duplicate_executables()
        old_execs = self.detect_old_executables()
        malware_files = self.scan_malware_content()
        score = self.risk_score()
        status = self._score_status(score)

        return {
            "suspicious_files": len(suspicious),
            "hidden_executables": len(hidden),
            "duplicate_executables": len(duplicate_execs),
            "large_unknown_files": len(large_unknown),
            "old_executables": len(old_execs),
            "malware_flags": len(malware_files),
            "security_score": score,
            "risk_status": status,
            "details": {
                "suspicious_names": [file.name for file in suspicious][:10],
                "hidden_names": [file.name for file in hidden][:10],
                "large_unknown_names": [file.name for file in large_unknown][:10],
                "old_executable_names": [file.name for file in old_execs][:10],
                "malware_names": [file.name for file in malware_files][:10],
            },
        }

    def _score_status(self, score: int) -> str:
        if score <= 25:
            return "SAFE"
        if score <= 50:
            return "LOW RISK"
        if score <= 75:
            return "MODERATE RISK"
        return "HIGH RISK"
