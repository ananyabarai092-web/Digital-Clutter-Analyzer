from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from models import FileRecord

CATEGORY_MAP = {
    "images": {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp"},
    "videos": {".mp4", ".mkv", ".mov", ".avi", ".wmv", ".flv"},
    "documents": {".pdf", ".doc", ".docx", ".txt", ".odt", ".rtf"},
    "archives": {".zip", ".rar", ".7z", ".tar", ".gz"},
    "code": {".py", ".js", ".ts", ".java", ".cs", ".cpp", ".c", ".rb"},
    "executables": {".exe", ".bat", ".cmd", ".ps1", ".vbs", ".dll", ".scr"},
}

class StorageAnalyzer:
    def __init__(self, files: List[FileRecord]):
        self.files = files

    def calculate_total_storage(self) -> int:
        return sum(file.size for file in self.files)

    def find_largest_file(self) -> Optional[FileRecord]:
        return max(self.files, key=lambda f: f.size, default=None)

    def find_smallest_file(self) -> Optional[FileRecord]:
        return min(self.files, key=lambda f: f.size, default=None)

    def average_file_size(self) -> float:
        if not self.files:
            return 0.0
        return self.calculate_total_storage() / len(self.files)

    def file_type_breakdown(self) -> Dict[str, Dict[str, float]]:
        counters = Counter()
        for file in self.files:
            matched = False
            for category, extensions in CATEGORY_MAP.items():
                if file.extension in extensions:
                    counters[category] += 1
                    matched = True
                    break
            if not matched:
                counters["other"] += 1

        total = sum(counters.values()) or 1
        return {
            category: {
                "count": count,
                "percentage": round((count / total) * 100, 1),
            }
            for category, count in counters.items()
        }

    def storage_by_extension(self) -> Dict[str, int]:
        storage: Dict[str, int] = defaultdict(int)
        for file in self.files:
            storage[file.extension or ".none"] += file.size
        return dict(storage)

    def most_common_extension(self) -> Tuple[str, int]:
        if not self.files:
            return "", 0
        counter = Counter(file.extension for file in self.files)
        extension, count = counter.most_common(1)[0]
        return extension, count
