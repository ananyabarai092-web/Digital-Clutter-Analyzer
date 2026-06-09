import os
import time
from pathlib import Path
from typing import List
from models import FileRecord

class FileScanner:
    def __init__(self, root_path: str):
        self.root_path = Path(root_path).expanduser().resolve()
        self.files: List[FileRecord] = []
        self.folders_scanned = 0
        self.scan_duration = 0.0

    def scan_folder(self) -> List[FileRecord]:
        if not self.root_path.exists():
            raise FileNotFoundError(f"Path does not exist: {self.root_path}")
        if not self.root_path.is_dir():
            raise NotADirectoryError(f"Not a directory: {self.root_path}")

        start_time = time.perf_counter()
        self.files = self.scan_recursive(self.root_path)
        self.scan_duration = time.perf_counter() - start_time
        return self.files

    def scan_recursive(self, folder: Path) -> List[FileRecord]:
        collected: List[FileRecord] = []
        try:
            entries = list(folder.iterdir())
        except (PermissionError, OSError):
            return collected

        self.folders_scanned += 1
        for entry in entries:
            if entry.is_dir():
                collected.extend(self.scan_recursive(entry))
            elif entry.is_file():
                try:
                    collected.append(FileRecord(entry))
                except (OSError, PermissionError):
                    continue
        return collected

    def collect_files(self) -> List[FileRecord]:
        return self.files
