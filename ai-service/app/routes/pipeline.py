from fastapi import APIRouter, UploadFile, File, Form, Header, HTTPException, Body
from typing import Optional
from app.models.schemas import UnifiedAssessmentRequest, UnifiedAssessmentResponse
from app.services.decision_pipeline import decision_pipeline
from app.utils.config import INTERNAL_KEY

router = APIRouter(prefix="/internal/pipeline", tags=["Decision Pipeline"])

@router.post("/assess-complaint", response_model=UnifiedAssessmentResponse)
async def assess_complaint_json(
    payload: UnifiedAssessmentRequest,
    x_internal_key: str = Header(None)
):
    """
    Evaluates complaint using pre-classified image metadata or category.
    """
    if x_internal_key and x_internal_key != INTERNAL_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized internal call")

    result = await decision_pipeline.evaluate_complaint(
        image_bytes=None,
        category=payload.category or "pothole",
        description=payload.description or "",
        address=payload.address or "",
        latitude=payload.latitude,
        longitude=payload.longitude,
        is_recurring=payload.is_recurring or False,
        nearby_report_count=payload.nearby_report_count or 0,
        image_category=payload.image_category,
        image_confidence=payload.image_confidence
    )

    return UnifiedAssessmentResponse(**result)


@router.post("/assess-complaint-with-image", response_model=UnifiedAssessmentResponse)
async def assess_complaint_with_image(
    file: UploadFile = File(...),
    category: str = Form("pothole"),
    description: str = Form(""),
    address: str = Form(""),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    is_recurring: bool = Form(False),
    nearby_report_count: int = Form(0),
    x_internal_key: str = Header(None)
):
    """
    Runs complete unified pipeline with raw image bytes, PyTorch EfficientNet inference,
    SOP retrieval, and grounded Gemini validation.
    """
    if x_internal_key and x_internal_key != INTERNAL_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized internal call")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty image file received")

    result = await decision_pipeline.evaluate_complaint(
        image_bytes=contents,
        filename=file.filename or "",
        category=category,
        description=description,
        address=address,
        latitude=latitude,
        longitude=longitude,
        is_recurring=is_recurring,
        nearby_report_count=nearby_report_count
    )

    return UnifiedAssessmentResponse(**result)
