from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime


class ScanRequest(BaseModel):
    path: str


class ScanResponse(BaseModel):
    status: str
    files_scanned: int
    storage_used: str
    duplicate_files: int
    risk_score: int
    message: str


class DuplicateFileItem(BaseModel):
    filename: str
    size: str
    path: str
    hash: str
    duplicates: int


class SecurityDetail(BaseModel):
    suspicious_files: int = 0
    hidden_executables: int = 0
    duplicate_executables: int = 0
    large_unknown_files: int = 0
    old_executables: int = 0
    malware_flags: int = 0
    security_score: int = 0
    risk_status: str = "UNKNOWN"
    details: Optional[Dict[str, List[str]]] = None


class TypeBreakdownItem(BaseModel):
    count: int
    percentage: float


class StorageData(BaseModel):
    total_storage: str
    type_breakdown: Dict[str, TypeBreakdownItem]


class DashboardResponse(BaseModel):
    summary: Dict[str, Any]
    storage: Dict[str, Any]
    security: Dict[str, Any]
    cleanup_recommendations: List[str]


class CleanupCategory(BaseModel):
    title: str
    count: int
    size: str
    description: str


class CleanupResponse(BaseModel):
    duplicate_files: CleanupCategory
    large_files: CleanupCategory
    old_files: CleanupCategory
    temporary_files: CleanupCategory
    potential_recovery: str
    recommendations: List[str]


class ReportItem(BaseModel):
    title: str
    date: str
    items: str
    size: str
    type: str


class ReportsResponse(BaseModel):
    reports: List[ReportItem]
    raw_data: Dict[str, Any]