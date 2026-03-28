import re

from fastapi import APIRouter, Form, HTTPException, Request, Depends
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from twilio.twiml.messaging_response import MessagingResponse

from services.helpcenter_service import (
    get_all_complaints,
    get_complaint_by_id,
    save_complaint,
    update_complaint_status,
)

router = APIRouter(prefix="/helpcenter", tags=["Help Center"])

VALID_STATUSES = {"open", "in_progress", "resolved"}


@router.post("/webhook/whatsapp", response_class=PlainTextResponse)
async def whatsapp_webhook(
    From: str = Form(...),
    Body: str = Form(...),
    MessageSid: str = Form(None),
):
    phone = From.replace("whatsapp:", "").strip()

    if not Body.strip():
        return PlainTextResponse(str(MessagingResponse()), media_type="application/xml")

    result = save_complaint(
        channel="whatsapp",
        user_identifier=phone,
        raw_message=Body.strip(),
        twilio_msg_sid=MessageSid,
    )

    reply = MessagingResponse()
    reply.message(
        f"Hi! We received your complaint (Ref #{result['id']}).\n"
        f"Category: {result['groq_category'].capitalize()}\n"
        "Our team will get back to you shortly."
    )
    return PlainTextResponse(str(reply), media_type="application/xml")


@router.post("/webhook/email")
async def email_webhook(request: Request):
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload from Cloudmail")

    sender = (payload.get("from") or payload.get("sender") or "unknown").strip()
    subject = payload.get("subject", "(no subject)").strip()
    body = payload.get("text") or payload.get("body") or payload.get("html") or ""

    clean_body = re.sub(r"<[^>]+>", " ", body).strip()
    clean_body = re.sub(r"\s+", " ", clean_body)

    if not clean_body:
        raise HTTPException(status_code=400, detail="Empty email body received")

    save_complaint(
        channel="email",
        user_identifier=sender,
        raw_message=clean_body,
        subject=subject,
    )

    return {"received": True}


@router.get("/complaints")
def list_complaints(status: str = None):
    if status and status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {VALID_STATUSES}")
    return get_all_complaints(status=status)


@router.get("/complaints/{complaint_id}")
def get_complaint(complaint_id: int):
    complaint = get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint


class StatusUpdate(BaseModel):
    status: str


class CreateComplaintRequest(BaseModel):
    message: str
    user_identifier: str = None


@router.post("/complaints/from-chat")
def create_complaint_from_chat(body: CreateComplaintRequest):
    """
    Create a complaint from the support chat interface.
    When RAG can't resolve, users can file a ticket directly.
    """
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    user_id = body.user_identifier or "anonymous"
    
    result = save_complaint(
        channel="whatsapp",  # Treat chat escalations as WhatsApp channel
        user_identifier=user_id,
        raw_message=body.message.strip(),
    )
    
    return {
        "success": True,
        "complaint_id": result["id"],
        "reference_number": f"#{result['id']}",
        "message": f"Support ticket created! Our team will review it and get back to you shortly.",
        "category": result.get("groq_category"),
        "status": result.get("status"),
    }


@router.patch("/complaints/{complaint_id}/status")
def patch_complaint_status(complaint_id: int, payload: StatusUpdate):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {VALID_STATUSES}")
    updated = update_complaint_status(complaint_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return {"success": True, "complaint_id": complaint_id, "new_status": payload.status}