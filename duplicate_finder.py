import hashlib
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, List, Tuple
from models import FileRecord

class DuplicateFinder:
    def __init__(self, files: List[FileRecord]):
        self.files = files

    def find_duplicate_names(self) -> Dict[str, List[FileRecord]]:
        groups: Dict[str, List[FileRecord]] = defaultdict(list)
        for file in self.files:
            groups[file.name.lower()].append(file)
        return {name: records for name, records in groups.items() if len(records) > 1}

    def _hash_file(self, path: Path) -> str:
        hasher = hashlib.md5()
        try:
            with path.open("rb") as fh:
                for chunk in iter(lambda: fh.read(8192), b""):
                    hasher.update(chunk)
        except (OSError, PermissionError):
            return ""
        return hasher.hexdigest()

    def find_duplicate_content(self) -> Dict[str, List[FileRecord]]:
        groups: Dict[str, List[FileRecord]] = defaultdict(list)
        for file in self.files:
            digest = self._hash_file(file.path)
            if digest:
                groups[digest].append(file)
        return {digest: records for digest, records in groups.items() if len(records) > 1}

    def calculate_wasted_space(self, duplicates_by_content: Dict[str, List[FileRecord]]) -> int:
        wasted = 0
        for files in duplicates_by_content.values():
            sorted_files = sorted(files, key=lambda f: f.size, reverse=True)
            wasted += sum(file.size for file in sorted_files[1:])
        return wasted

    def duplicate_groups_count(self, duplicates_by_content: Dict[str, List[FileRecord]]) -> int:
        return len(duplicates_by_content)
