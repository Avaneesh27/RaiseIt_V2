export type UserRole = 'CITIZEN' | 'AUTHORITY' | 'ADMIN';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';
export type IssueStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  department?: {
    _id: string;
    name: string;
    code: string;
  };
  departmentId?: string;
}

export interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface IssueCategory {
  _id: string;
  name: string;
  key: string;
  description?: string;
  departmentId: Department | string;
  basePriorityWeight: number;
}

export interface RetrievedInfoItem {
  documentName: string;
  department?: string;
  section?: string;
  relevanceScore?: number;
  textSnippet?: string;
}

export interface AIAssessment {
  prediction: string;
  confidence: number;
  modelVersion: string;
  isSupportedCategory: boolean;
  validationStatus: 'VALIDATED' | 'UNCERTAIN' | 'MANUAL_REVIEW_REQUIRED' | string;
  suggestedDepartment: string;
  suggestedCategory: string;
  prescribedSLA?: string;
  recommendedAction: string;
  groundedAnalysis: string;
  retrievedSupportingInfo: RetrievedInfoItem[];
  uncertaintyNotes?: string | null;
  generatedAt?: string;
}

export interface IssueReport {
  _id: string;
  reportId: string;
  citizenId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  imageUrl: string;
  categoryId: string;
  categoryName: string;
  aiDetectedCategory?: string;
  aiConfidence: number;
  isCategoryOverridden: boolean;
  aiAssessment?: AIAssessment;
  description?: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  address?: string;
  ward?: string;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  isRecurring: boolean;
  nearbyReportCount: number;
  assignedDepartmentId: {
    _id: string;
    name: string;
    code: string;
  };
  assignedAuthorityId?: {
    _id: string;
    name: string;
    email: string;
  };
  status: IssueStatus;
  resolutionNotes?: string;
  resolutionImageUrl?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueUpdate {
  _id: string;
  reportId: string;
  authorityId: {
    _id: string;
    name: string;
    role: string;
  };
  status: IssueStatus;
  comment?: string;
  updateImageUrl?: string;
  createdAt: string;
}

export interface RAGSource {
  documentName: string;
  department?: string;
  pageOrSection?: string;
  relevanceScore?: number;
}

export interface CivicDocument {
  _id: string;
  name: string;
  departmentId?: {
    _id: string;
    name: string;
    code: string;
  };
  documentType: string;
  version: string;
  fileUrl: string;
  fileName: string;
  status: 'UPLOADED' | 'PROCESSING' | 'INDEXED' | 'FAILED';
  chunkCount: number;
  createdAt: string;
}
