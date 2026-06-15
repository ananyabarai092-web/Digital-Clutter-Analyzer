import io
from typing import Any, Dict, List

from fastapi.responses import StreamingResponse

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
except Exception:  # pragma: no cover
    canvas = None
    letter = None

from server.services.database import get_collection, serialize_doc, utcnow


def save_report(user_id: str, scan_result: Dict[str, Any]) -> str:
    doc = {
        "user_id": user_id,
        "title": "Full ClutterGuard Scan Report",
        "scan_date": scan_result.get("scan_metadata", {}).get("scan_date"),
        "summary": scan_result.get("summary", {}),
        "security": scan_result.get("security", {}),
        "storage": scan_result.get("storage", {}),
        "raw_data": scan_result,
        "created_at": utcnow(),
    }
    inserted = get_collection("reports").insert_one(doc)
    return str(inserted.inserted_id)


def get_reports(user_id: str, limit: int = 25) -> List[Dict[str, Any]]:
    docs = get_collection("reports").find({"user_id": user_id}, sort=[("created_at", -1)], limit=limit)
    return [serialize_doc(doc) for doc in docs]


def pdf_response(report: Dict[str, Any]) -> StreamingResponse:
    filename = "clutterguard_report.pdf"
    buffer = io.BytesIO()
    if canvas:
        pdf = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        y = height - 48
        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawString(48, y, "ClutterGuard Report")
        y -= 36
        pdf.setFont("Helvetica", 11)
        summary = report.get("summary", {})
        security = report.get("security", {})
        lines = [
            f"Scan date: {report.get('scan_date') or summary.get('scan_date', 'N/A')}",
            f"Files scanned: {summary.get('files_scanned', 0)}",
            f"Storage used: {summary.get('storage_used_formatted', '0 B')}",
            f"Duplicate files: {summary.get('duplicate_count', 0)}",
            f"Security score: {security.get('security_score', 0)}/100",
            f"Risk status: {security.get('risk_status', 'UNKNOWN')}",
            f"Potential recovery: {summary.get('potential_recovery', '0 B')}",
        ]
        for line in lines:
            pdf.drawString(48, y, line)
            y -= 20
        pdf.save()
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})

    text = "\n".join([
        "ClutterGuard Report",
        f"Files scanned: {report.get('summary', {}).get('files_scanned', 0)}",
        f"Security score: {report.get('security', {}).get('security_score', 0)}/100",
    ])
    buffer.write(text.encode())
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="text/plain", headers={"Content-Disposition": "attachment; filename=clutterguard_report.txt"})
