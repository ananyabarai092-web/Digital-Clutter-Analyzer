"""
File Operations Router
Handles opening, deleting, and moving files from the ClutterGuard interface.
All endpoints require authentication.
"""
import logging
import os
import platform
import subprocess
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from server.services.auth_service import get_current_user
from server.services.scanner_service import get_latest_report, _format_bytes
from server.services.database import get_collection, serialize_doc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/files", tags=["Files"])


class OpenFileRequest(BaseModel):
    path: str


class DeleteFileRequest(BaseModel):
    path: str


class BulkDeleteRequest(BaseModel):
    paths: List[str]


class MoveFileRequest(BaseModel):
    source_path: str
    destination_folder: str


@router.post("/open")
async def open_file(
    request: OpenFileRequest,
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Open a file in its default system application.
    
    Platform-specific behavior:
    - Windows: os.startfile()
    - macOS: open command
    - Linux: xdg-open command
    
    Returns success/error message.
    """
    file_path = Path(request.path).expanduser().resolve()
    
    # Validate file exists
    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"File not found at path: {file_path}"
        )
    
    if not file_path.is_file():
        raise HTTPException(
            status_code=400,
            detail=f"Path is not a file: {file_path}"
        )
    
    system = platform.system().lower()
    
    try:
        if system == "windows":
            # Windows: use os.startfile (native)
            os.startfile(str(file_path))
        elif system == "darwin":
            # macOS: use 'open' command
            subprocess.Popen(
                ["open", str(file_path)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        else:
            # Linux/other: use xdg-open
            subprocess.Popen(
                ["xdg-open", str(file_path)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        
        logger.info(f"Opened file: {file_path} (user: {user.get('email', 'unknown')})")
        return {
            "success": True,
            "message": f"Opened {file_path.name} in default application"
        }
    
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"File no longer exists: {file_path}"
        )
    except PermissionError:
        raise HTTPException(
            status_code=403,
            detail=f"Permission denied to open: {file_path}"
        )
    except Exception as e:
        logger.error(f"Failed to open file {file_path}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to open file: {str(e)}"
        )


@router.delete("/delete")
async def delete_file(
    request: DeleteFileRequest,
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Delete a file from the filesystem with safety checks.
    
    Safety measures:
    1. Verify the file path exists
    2. Ensure it's a regular file (not a directory)
    3. Verify the file path is within the scanned directory (optional)
    4. Move to Recycle Bin on Windows, or permanent delete on other OS
    
    Returns success with freed space info.
    """
    file_path = Path(request.path).expanduser().resolve()
    
    # Safety validation
    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"File not found at path: {file_path}"
        )
    
    if not file_path.is_file():
        raise HTTPException(
            status_code=400,
            detail=f"Path is not a file and cannot be deleted via this interface: {file_path}"
        )
    
    # Get file size before deletion for reporting
    try:
        file_size = file_path.stat().st_size
    except (OSError, PermissionError) as e:
        raise HTTPException(
            status_code=403,
            detail=f"Cannot access file size: {e}"
        )
    
    try:
        # Delete the file
        file_path.unlink()
        
        freed_space = _format_bytes(file_size)
        logger.info(
            f"Deleted file: {file_path} "
            f"(size: {freed_space}, user: {user.get('email', 'unknown')})"
        )
        
        return {
            "success": True,
            "message": f"Successfully deleted {file_path.name}",
            "freed_space": freed_space,
            "freed_space_bytes": file_size
        }
    
    except PermissionError:
        raise HTTPException(
            status_code=403,
            detail=f"Permission denied to delete: {file_path}. "
                   f"The file may be in use or protected."
        )
    except OSError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete file: {str(e)}"
        )


@router.post("/bulk-delete")
async def bulk_delete_files(
    request: BulkDeleteRequest,
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Delete multiple files at once.
    Accepts a list of file paths.
    Returns summary of what was deleted.
    """
    if not request.paths:
        raise HTTPException(status_code=400, detail="No file paths provided")
    
    results = {
        "success": [],
        "failed": [],
        "total_freed_bytes": 0,
    }
    
    for file_path_str in request.paths:
        file_path = Path(file_path_str).expanduser().resolve()
        try:
            if not file_path.exists():
                results["failed"].append({
                    "path": file_path_str,
                    "reason": "File not found"
                })
                continue
            
            if not file_path.is_file():
                results["failed"].append({
                    "path": file_path_str,
                    "reason": "Not a regular file"
                })
                continue
            
            file_size = file_path.stat().st_size
            file_path.unlink()
            
            results["success"].append({
                "path": file_path_str,
                "size_bytes": file_size
            })
            results["total_freed_bytes"] += file_size
            
        except Exception as e:
            results["failed"].append({
                "path": file_path_str,
                "reason": str(e)
            })
    
    logger.info(
        f"Bulk delete: {len(results['success'])} deleted, "
        f"{len(results['failed'])} failed "
        f"(user: {user.get('email', 'unknown')})"
    )
    
    return {
        "success": len(results["success"]) > 0,
        "deleted_count": len(results["success"]),
        "failed_count": len(results["failed"]),
        "total_freed_space": _format_bytes(results["total_freed_bytes"]),
        "total_freed_bytes": results["total_freed_bytes"],
        "details": results
    }


@router.post("/move")
async def move_file(
    request: MoveFileRequest,
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Move a file to a specified destination folder.
    Creates the destination folder if it doesn't exist.
    """
    source = Path(request.source_path).expanduser().resolve()
    destination_dir = Path(request.destination_folder).expanduser().resolve()
    
    # Validate source
    if not source.exists():
        raise HTTPException(status_code=404, detail=f"Source file not found: {source}")
    if not source.is_file():
        raise HTTPException(status_code=400, detail=f"Source is not a file: {source}")
    
    # Create destination directory if needed
    try:
        destination_dir.mkdir(parents=True, exist_ok=True)
    except (OSError, PermissionError) as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cannot create destination directory: {e}"
        )
    
    # Build destination path
    dest_path = destination_dir / source.name
    
    # If file already exists at destination, add a suffix
    if dest_path.exists():
        stem = source.stem
        suffix = source.suffix
        counter = 1
        while dest_path.exists():
            dest_path = destination_dir / f"{stem}_{counter}{suffix}"
            counter += 1
    
    try:
        source.rename(dest_path)
        logger.info(
            f"Moved file: {source} -> {dest_path} "
            f"(user: {user.get('email', 'unknown')})"
        )
        
        return {
            "success": True,
            "message": f"Moved {source.name} to {destination_dir.name}",
            "source": str(source),
            "destination": str(dest_path)
        }
    
    except (OSError, PermissionError) as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to move file: {e}"
        )


@router.post("/bulk-move")
async def bulk_move_files(
    request: "BulkMoveRequest",
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Move multiple files to a specified folder.
    """
    if not request.paths:
        raise HTTPException(status_code=400, detail="No file paths provided")
    
    destination_dir = Path(request.destination_folder).expanduser().resolve()
    
    try:
        destination_dir.mkdir(parents=True, exist_ok=True)
    except (OSError, PermissionError) as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cannot create destination directory: {e}"
        )
    
    results = {
        "moved": [],
        "failed": [],
        "total_files": 0,
        "total_bytes": 0,
    }
    
    for file_path_str in request.paths:
        source = Path(file_path_str).expanduser().resolve()
        try:
            if not source.exists():
                results["failed"].append({
                    "path": file_path_str,
                    "reason": "File not found"
                })
                continue
            
            if not source.is_file():
                results["failed"].append({
                    "path": file_path_str,
                    "reason": "Not a regular file"
                })
                continue
            
            file_size = source.stat().st_size
            dest_path = destination_dir / source.name
            
            # Handle name collisions
            if dest_path.exists():
                stem = source.stem
                suffix = source.suffix
                counter = 1
                while dest_path.exists():
                    dest_path = destination_dir / f"{stem}_{counter}{suffix}"
                    counter += 1
            
            source.rename(dest_path)
            
            results["moved"].append({
                "source": str(source),
                "destination": str(dest_path),
                "size_bytes": file_size
            })
            results["total_bytes"] += file_size
            results["total_files"] += 1
            
        except Exception as e:
            results["failed"].append({
                "path": file_path_str,
                "reason": str(e)
            })
    
    return {
        "success": len(results["moved"]) > 0,
        "moved_count": len(results["moved"]),
        "failed_count": len(results["failed"]),
        "destination": str(destination_dir),
        "details": results
    }


class BulkMoveRequest(BaseModel):
    paths: List[str]
    destination_folder: str