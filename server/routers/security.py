from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any

from server.services.scanner_service import get_security_data
from server.services.auth_service import get_current_user

router = APIRouter(prefix="/api", tags=["Security"])


@router.get("/security")
async def get_security(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get security analysis from the latest scan.
    
    Returns:
    - Risk Files
    - Executables
    - Hidden Files
    - Risk Score
    """
    try:
        data = get_security_data(str(user["_id"]))
        return data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load security data: {str(e)}")
