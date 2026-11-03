from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ClassificationResponse(BaseModel):
  category: str
  confidence: float
  modelVersion: str = "VisionClassifier-v1.0"
  processingTimeMs: Optional[float] = None

class RAGContext(BaseModel):
  category: Optional[str] = None
  department: Optional[str] = None
  status: Optional[str] = None
  reportId: Optional[str] = None
  address: Optional[str] = None

class RAGQueryRequest(BaseModel):
  question: str
  context: Optional[RAGContext] = Field(default_factory=RAGContext)
  use_rag: Optional[bool] = True

class RAGSource(BaseModel):
  documentName: str
  department: Optional[str] = None
  pageOrSection: Optional[str] = None
  relevanceScore: Optional[float] = None

class RAGQueryResponse(BaseModel):
  answer: str
  sources: List[RAGSource] = Field(default_factory=list)
  latencyMs: Optional[float] = None
  telemetry: Optional[Dict[str, Any]] = None

class IndexDocumentRequest(BaseModel):
  filePath: str
  metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class RetrievedInfoItem(BaseModel):
  documentName: str
  department: Optional[str] = None
  section: Optional[str] = None
  relevanceScore: Optional[float] = None
  textSnippet: Optional[str] = None

class UnifiedAssessmentRequest(BaseModel):
  category: Optional[str] = "pothole"
  description: Optional[str] = ""
  address: Optional[str] = ""
  latitude: Optional[float] = None
  longitude: Optional[float] = None
  is_recurring: Optional[bool] = False
  nearby_report_count: Optional[int] = 0
  image_category: Optional[str] = None
  image_confidence: Optional[float] = None

class UnifiedAssessmentResponse(BaseModel):
  prediction: str
  confidence: float
  modelVersion: str
  isSupportedCategory: bool = True
  validationStatus: str
  suggestedDepartment: str
  suggestedCategory: str
  prescribedSLA: Optional[str] = None
  recommendedAction: str
  groundedAnalysis: str
  retrievedSupportingInfo: List[RetrievedInfoItem] = Field(default_factory=list)
  uncertaintyNotes: Optional[str] = None
  telemetry: Optional[Dict[str, Any]] = None

