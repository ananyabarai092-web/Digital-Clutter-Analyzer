"""
Optimized Scanner Service
Provides multithreaded file scanning with progress tracking for large directories.
Uses concurrent.futures.ThreadPoolExecutor for parallel directory traversal.
"""
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Callable, Dict, List, Optional, Set

from models import FileRecord

logger = logging.getLogger(__name__)


class ProgressTracker:
    """
    Tracks scan progress for real-time feedback.
    
    Maintains a simple in-memory counter that can be polled
    by the frontend to show scan completion percentage.
    """
    
    _instances: Dict[str, 'ProgressTracker'] = {}
    
    def __init__(self, scan_id: str):
        self.scan_id = scan_id
        self.total_items: int = 0
        self.processed_items: int = 0
        self.current_path: str = ""
        self.status: str = "initializing"  # initializing, scanning, analyzing, complete, error
        self.error_message: str = ""
        self.start_time: float = 0.0
        self.scan_path: str = ""
    
    @classmethod
    def create(cls, scan_id: str) -> 'ProgressTracker':
        tracker = cls(scan_id)
        cls._instances[scan_id] = tracker
        return tracker
    
    @classmethod
    def get(cls, scan_id: str) -> Optional['ProgressTracker']:
        return cls._instances.get(scan_id)
    
    @classmethod
    def remove(cls, scan_id: str) -> None:
        cls._instances.pop(scan_id, None)
    
    @property
    def percentage(self) -> float:
        if self.total_items == 0:
            return 0.0
        return min(100.0, round((self.processed_items / self.total_items) * 100, 1))
    
    @property
    def elapsed_seconds(self) -> float:
        if self.start_time == 0:
            return 0.0
        return round(time.time() - self.start_time, 1)
    
    def to_dict(self) -> Dict:
        return {
            "scan_id": self.scan_id,
            "status": self.status,
            "percentage": self.percentage,
            "processed_items": self.processed_items,
            "total_items": self.total_items,
            "current_path": self.current_path,
            "elapsed_seconds": self.elapsed_seconds,
            "error_message": self.error_message,
            "scan_path": self.scan_path,
        }


def count_items_parallel(root_path: Path, max_workers: int = 4) -> int:
    """
    Quickly estimate the number of items in a directory tree.
    Uses parallel traversal for speed.
    
    Args:
        root_path: The directory to scan
        max_workers: Number of parallel threads
    
    Returns:
        Approximate count of files and folders
    """
    try:
        entries = list(root_path.iterdir())
    except (PermissionError, OSError):
        return 0
    
    dirs = [e for e in entries if e.is_dir()]
    files_count = len([e for e in entries if e.is_file()])
    
    if not dirs:
        return files_count
    
    # Count subdirectories in parallel
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(count_items_parallel, d, max_workers): d for d in dirs}
        for future in as_completed(futures):
            try:
                files_count += future.result()
            except Exception:
                pass
    
    return files_count + len(dirs)


def scan_directory_multithreaded(
    root_path: Path,
    max_workers: int = 8,
    progress_tracker: Optional[ProgressTracker] = None,
) -> List[FileRecord]:
    """
    Scan a directory using multithreading for significantly faster traversal.
    
    Uses a thread pool to scan subdirectories in parallel.
    
    Args:
        root_path: The directory to scan
        max_workers: Number of parallel threads (default: 8)
        progress_tracker: Optional ProgressTracker for status updates
    
    Returns:
        List of FileRecord objects
    """
    if not root_path.exists():
        raise FileNotFoundError(f"Path does not exist: {root_path}")
    if not root_path.is_dir():
        raise NotADirectoryError(f"Not a directory: {root_path}")
    
    start_time = time.perf_counter()
    
    if progress_tracker:
        progress_tracker.status = "scanning"
        progress_tracker.start_time = start_time
        progress_tracker.scan_path = str(root_path)
        
        # Estimate total items for progress
        try:
            estimated = count_items_parallel(root_path, max_workers=min(4, max_workers))
            progress_tracker.total_items = max(estimated, 1)
        except Exception:
            progress_tracker.total_items = 1000  # Default estimate
    
    all_files = scan_recursive_multithreaded(root_path, max_workers, progress_tracker)
    
    duration = time.perf_counter() - start_time
    logger.info(
        f"Multithreaded scan completed: {len(all_files)} files "
        f"in {duration:.2f}s (workers={max_workers})"
    )
    
    if progress_tracker:
        progress_tracker.status = "complete"
        progress_tracker.processed_items = progress_tracker.total_items
        progress_tracker.current_path = ""
    
    return all_files


def scan_recursive_multithreaded(
    folder: Path,
    max_workers: int = 8,
    progress_tracker: Optional[ProgressTracker] = None,
) -> List[FileRecord]:
    """
    Recursively scan a directory using thread pool for parallel subdirectory scanning.
    
    Args:
        folder: Directory to scan
        max_workers: Number of threads
        progress_tracker: Optional progress tracker
    
    Returns:
        List of FileRecord objects from this directory and subdirectories
    """
    collected: List[FileRecord] = []
    subdirs: List[Path] = []
    
    try:
        entries = list(folder.iterdir())
    except (PermissionError, OSError):
        return collected
    
    # Process files in current directory
    for entry in entries:
        if entry.is_dir():
            subdirs.append(entry)
        elif entry.is_file():
            try:
                collected.append(FileRecord(entry))
                if progress_tracker:
                    progress_tracker.processed_items += 1
                    progress_tracker.current_path = str(entry)
            except (OSError, PermissionError):
                continue
    
    # Scan subdirectories in parallel
    if subdirs:
        # Limit workers to avoid too many threads
        actual_workers = min(max_workers, len(subdirs), 8)
        
        with ThreadPoolExecutor(max_workers=actual_workers) as executor:
            futures = {
                executor.submit(
                    scan_recursive_multithreaded,
                    subdir,
                    max_workers,
                    progress_tracker,
                ): subdir
                for subdir in subdirs
            }
            
            for future in as_completed(futures):
                try:
                    collected.extend(future.result())
                except Exception as e:
                    logger.debug(f"Error scanning subdirectory: {e}")
    
    return collected


def scan_directory_original(
    root_path: Path,
    progress_tracker: Optional[ProgressTracker] = None,
) -> List[FileRecord]:
    """
    Original single-threaded scan method (kept as fallback).
    
    Args:
        root_path: The directory to scan
        progress_tracker: Optional ProgressTracker for status updates
    
    Returns:
        List of FileRecord objects
    """
    if not root_path.exists():
        raise FileNotFoundError(f"Path does not exist: {root_path}")
    if not root_path.is_dir():
        raise NotADirectoryError(f"Not a directory: {root_path}")
    
    start_time = time.perf_counter()
    
    if progress_tracker:
        progress_tracker.status = "scanning"
        progress_tracker.start_time = start_time
        progress_tracker.scan_path = str(root_path)
    
    all_files = _scan_recursive_single(root_path, progress_tracker)
    
    duration = time.perf_counter() - start_time
    logger.info(f"Single-threaded scan completed: {len(all_files)} files in {duration:.2f}s")
    
    if progress_tracker:
        progress_tracker.status = "complete"
    
    return all_files


def _scan_recursive_single(
    folder: Path,
    progress_tracker: Optional[ProgressTracker] = None,
) -> List[FileRecord]:
    """Single-threaded recursive file scanner."""
    collected: List[FileRecord] = []
    try:
        entries = list(folder.iterdir())
    except (PermissionError, OSError):
        return collected
    
    for entry in entries:
        if entry.is_dir():
            collected.extend(_scan_recursive_single(entry, progress_tracker))
        elif entry.is_file():
            try:
                collected.append(FileRecord(entry))
                if progress_tracker:
                    progress_tracker.processed_items += 1
                    progress_tracker.current_path = str(entry)
            except (OSError, PermissionError):
                continue
    
    return collected


def get_cached_scan_fingerprint(folder_path: Path) -> str:
    """
    Generate a fingerprint for a folder to detect if it has changed.
    Uses modification time and item count for quick comparison.
    
    Args:
        folder_path: Directory to fingerprint
    
    Returns:
        String fingerprint hash
    """
    import hashlib
    fingerprint = hashlib.md5()
    
    try:
        fingerprint.update(str(folder_path.stat().st_mtime).encode())
        
        # Count top-level items quickly
        try:
            items = list(folder_path.iterdir())
            fingerprint.update(str(len(items)).encode())
        except (PermissionError, OSError):
            pass
    except (OSError, PermissionError):
        pass
    
    return fingerprint.hexdigest()[:16]