import time
import os
from typing import Dict, Any, List, Optional
from app.services.vision_classifier import classifier
from app.rag.retriever import retriever
from app.rag.gemini_client import gemini_client
from app.rag.prompt_templates import CIVIC_RAG_SYSTEM_INSTRUCTION

DEPARTMENT_MAP = {
    "pothole": {
        "dept": "Roads & Infrastructure Department",
        "action": "Dispatch road maintenance unit for site inspection and asphalt pothole repair within SLA.",
        "sla": "48 to 72 hours (standard), 4-hour barricade for hazardous craters"
    },
    "road_damage": {
        "dept": "Roads & Infrastructure Department",
        "action": "Schedule structural pavement survey and surface crack sealing.",
        "sla": "5 working days for surface repair"
    },
    "damaged_infrastructure": {
        "dept": "Roads & Infrastructure Department",
        "action": "Inspect damaged sidewalk/footpath/railing and issue emergency barricading.",
        "sla": "48 hours for public safety hazards"
    },
    "garbage": {
        "dept": "Solid Waste & Sanitation Department",
        "action": "Deploy municipal waste collection vehicle for spot clearing and sanitization.",
        "sla": "24 hours for unattended residential garbage"
    },
    "streetlight": {
        "dept": "Electrical & Public Lighting Department",
        "action": "Deploy line technician van to repair luminaire, bulb, or power connection.",
        "sla": "24 to 48 hours for dark spot restoration"
    },
    "water_leakage": {
        "dept": "Water Supply & Sewerage Department",
        "action": "Dispatch pipeline emergency crew to isolate leak and replace ruptured piping.",
        "sla": "4 to 12 hours for main line bursts, 24 hours for minor leaks"
    },
    "drainage": {
        "dept": "Drainage & Stormwater Department",
        "action": "Mobilize suction tanker to clear stormwater blockage and desilt drain channel.",
        "sla": "24 hours for overflowing or blocked drains"
    }
}

DEFAULT_DEPT = {
    "dept": "Municipal Administration",
    "action": "Assign ward supervisor for initial site verification and routing.",
    "sla": "48 hours standard verification"
}


class UnifiedDecisionPipeline:
    """
    Unified AI Decision and Validation Pipeline
    Combines:
    1. PyTorch Deep Vision Classifier (EfficientNet-B0)
    2. Deterministic Confidence & Recurrence Evaluation
    3. Dense Semantic Vector Search across verified civic SOPs (FAISS)
    4. Grounded Contextual Synthesis & SLA Validation (Google Gemini)
    """

    async def evaluate_complaint(
        self,
        image_bytes: Optional[bytes] = None,
        filename: str = "",
        category: str = "pothole",
        description: str = "",
        address: str = "",
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        is_recurring: bool = False,
        nearby_report_count: int = 0,
        image_category: Optional[str] = None,
        image_confidence: Optional[float] = None
    ) -> Dict[str, Any]:
        start_time = time.time()

        # Step 1: ML Vision Inference
        if image_bytes and len(image_bytes) > 0:
            pred_cat, confidence, vision_ms = classifier.classify(image_bytes, filename)
        elif image_category:
            pred_cat = image_category
            confidence = float(image_confidence or 0.88)
            vision_ms = 0.0
        else:
            pred_cat = category or "pothole"
            confidence = 0.85
            vision_ms = 0.0

        user_cat = (category or pred_cat).lower().strip()
        pred_cat = pred_cat.lower().strip()
        detection_reason = getattr(classifier, 'last_detection_reason', '')

        # Step 2: Evaluation of Confidence, Alignment, and Rejection Logic
        is_irrelevant = (pred_cat == "irrelevant")
        # In RaiseIt, 'road_damage' and 'pothole' both represent 'pothole' ("Pothole / Road Defect").
        # 'damaged_infrastructure' ("Broken Footpath / Railing") is distinct and must not match pothole.
        category_mismatch = (pred_cat != user_cat) and not (
            pred_cat == "road_damage" and user_cat == "pothole"
        )

        if is_irrelevant:
            confidence = 0.0
            pred_cat = "irrelevant"
            validation_status = "REJECTED"
            uncertainty_notes = f"AI Validation REJECTED: Photographic evidence does not depict a valid civic issue ({detection_reason or 'non-civic content detected'}). Valid on-site photo proof of public infrastructure defect is mandatory."
            suggested_department = "Citizen Redressal Cell"
            recommended_action = "Reject ticket or request citizen re-submission with authentic photo of the civic defect."
            prescribed_sla = "N/A - Rejected by AI Validation"
            is_supported = False
            target_cat = "irrelevant"

        elif category_mismatch and confidence >= 0.60:
            validation_status = "REJECTED"
            uncertainty_notes = f"AI Validation REJECTED: Category Mismatch. Citizen reported '{user_cat}', but neural vision model detected '{pred_cat}' ({round(confidence * 100, 1)}% confidence - {detection_reason}). Photographic evidence contradicts the reported issue."
            target_cat = pred_cat
            dept_info = DEPARTMENT_MAP.get(target_cat, DEFAULT_DEPT)
            suggested_department = dept_info["dept"]
            recommended_action = f"Reject ticket for '{user_cat}' or redirect to {suggested_department} under category '{target_cat}'."
            prescribed_sla = "N/A - Category Mismatch Rejection"
            is_supported = True

        elif category_mismatch:
            validation_status = "MANUAL_REVIEW_REQUIRED"
            uncertainty_notes = f"Citizen selected '{user_cat}', but visual classifier identified '{pred_cat}' with lower confidence ({round(confidence * 100, 1)}%). Requires supervisory confirmation."
            target_cat = user_cat
            dept_info = DEPARTMENT_MAP.get(target_cat, DEFAULT_DEPT)
            suggested_department = dept_info["dept"]
            recommended_action = "Supervisory review required to verify correct department routing."
            prescribed_sla = dept_info["sla"]
            is_supported = True

        elif confidence >= 0.70:
            validation_status = "VALIDATED"
            uncertainty_notes = None
            target_cat = user_cat
            dept_info = DEPARTMENT_MAP.get(target_cat, DEFAULT_DEPT)
            suggested_department = dept_info["dept"]
            recommended_action = dept_info["action"]
            prescribed_sla = dept_info["sla"]
            is_supported = True

        else:
            validation_status = "UNCERTAIN"
            uncertainty_notes = f"Visual classification confidence is moderate ({round(confidence * 100, 1)}%). Ground truth requires physical inspection."
            target_cat = user_cat
            dept_info = DEPARTMENT_MAP.get(target_cat, DEFAULT_DEPT)
            suggested_department = dept_info["dept"]
            recommended_action = dept_info["action"]
            prescribed_sla = dept_info["sla"]
            is_supported = True

        # Step 3: RAG Retrieval from FAISS Knowledge Base
        rag_query = f"{target_cat} {description} {suggested_department} standard operating procedure resolution SLA"
        context_meta = {
            "category": target_cat,
            "department": suggested_department,
            "status": "SUBMITTED"
        }
        chunks, retrieval_ms = retriever.retrieve(rag_query, context=context_meta, top_k=4)

        retrieved_supporting_info = []
        for c in chunks:
            text = c.get("content", "").strip()
            snippet = text[:220] + "..." if len(text) > 220 else text
            retrieved_supporting_info.append({
                "documentName": c.get("document_name", "Civic SOP"),
                "department": c.get("department", suggested_department),
                "section": c.get("page_or_section", "General"),
                "relevanceScore": c.get("similarity_score", 0.0),
                "textSnippet": snippet
            })

        # Step 4: Grounded Generative Assessment (Gemini with Fallback)
        grounded_analysis = ""
        gemini_called = False

        if gemini_client.is_configured() and chunks:
            doc_context = "\n\n".join([
                f"[{c['document_name']} - {c.get('page_or_section', 'Section')}]: {c.get('content', '')[:600]}"
                for c in chunks[:3]
            ])

            prompt = f"""You are the AI Municipal Validation Assistant for the RaiseIt Civic Platform.
Analyze the following citizen complaint and provide a professional, grounded assessment strictly derived from the verified municipal context documents.

Complaint Details:
- Vision Model Detected: {pred_cat.upper()} (Confidence: {round(confidence * 100, 1)}%)
- Citizen Selected Category: {user_cat.upper()}
- Description: {description or 'No citizen notes provided'}
- Location: {address or 'Coordinates provided'}
- Cluster Recurrence: {nearby_report_count} nearby issues (Recurring Hotspot: {is_recurring})

Verified Municipal SOP Context:
{doc_context}

Instructions:
1. Provide a concise 2-3 paragraph technical validation:
   - State whether the photographic evidence and description conform to municipal defect definitions.
   - Specify the exact department jurisdiction, required priority tier, and prescribed SLA timeline from the documents.
   - If recurring cluster detected, mention the accelerated intervention protocol.
2. Formulate the single most effective recommended next operational action for the junior engineer.
3. STRICT GROUNDING: Do not hallucinate or invent SLAs, telephone numbers, or procedures not found in the verified documents. Include document citations in brackets e.g. [Document Name, Section]."""

            try:
                llm_res = await gemini_client.generate_content(
                    prompt=prompt,
                    system_instruction=CIVIC_RAG_SYSTEM_INSTRUCTION,
                    temperature=0.2,
                    max_tokens=600
                )
                if llm_res.get("success") and llm_res.get("text"):
                    grounded_analysis = llm_res["text"].strip()
                    gemini_called = True
            except Exception as e:
                print(f"[UnifiedDecisionPipeline] Gemini call error: {e}")

        # Deterministic grounded fallback if Gemini is offline or not configured
        if not grounded_analysis:
            if validation_status == "REJECTED":
                grounded_analysis = (
                    f"**AI Evidence Validation REJECTION Notice:**\n"
                    f"The photographic evidence submitted for this ticket failed neural verification against municipal defect criteria.\n\n"
                    f"- **Claimed Defect Category:** {user_cat.replace('_', ' ').title()}\n"
                    f"- **Model Vision Detection:** {pred_cat.replace('_', ' ').title()} ({round(confidence * 100, 1)}% confidence)\n"
                    f"- **Validation Finding:** {uncertainty_notes}\n\n"
                    f"**Policy Compliance & Directive:** Under Municipal SOP Section 1 (Grievance Intake Protocols), tickets with invalid or contradictory photo evidence cannot be processed for department work orders. Citizen is advised to resubmit with an authentic, focused photograph of the defect."
                )
            else:
                recurrence_txt = (
                    f" A high-density cluster of {nearby_report_count} complaints exists in this 500-meter zone, triggering escalated recurrence protocols."
                    if is_recurring else " This appears to be an isolated incident with no immediate cluster."
                )

                primary_doc = chunks[0]["document_name"] if chunks else "Citizen Complaint Lifecycle Charter"
                primary_sec = chunks[0].get("page_or_section", "General") if chunks else "Section 1"

                grounded_analysis = (
                    f"**Automated Verification Summary:**\n"
                    f"The reported issue has been processed by the neural vision classifier ({classifier.model_name}) with a confidence of {round(confidence * 100, 1)}%. "
                    f"The issue is classified under **{suggested_department}** jurisdiction for category **{target_cat.replace('_', ' ').title()}**.{recurrence_txt}\n\n"
                    f"**Prescribed Municipal SLA:**\n"
                    f"Under [{primary_doc}, {primary_sec}], standard resolution for this category is targeted within **{prescribed_sla}**. "
                    f"Initial site verification must be completed by the ward engineer within 24 hours of ticket dispatch."
                )

        total_latency_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "prediction": pred_cat,
            "confidence": round(confidence, 4),
            "modelVersion": classifier.model_name,
            "isSupportedCategory": is_supported,
            "validationStatus": validation_status,
            "suggestedDepartment": suggested_department,
            "suggestedCategory": target_cat,
            "prescribedSLA": prescribed_sla,
            "recommendedAction": recommended_action,
            "groundedAnalysis": grounded_analysis,
            "retrievedSupportingInfo": retrieved_supporting_info,
            "uncertaintyNotes": uncertainty_notes,
            "telemetry": {
                "visionLatencyMs": vision_ms,
                "retrievalLatencyMs": retrieval_ms,
                "totalLatencyMs": total_latency_ms,
                "geminiGenerated": gemini_called
            }
        }


# Global singleton
decision_pipeline = UnifiedDecisionPipeline()
