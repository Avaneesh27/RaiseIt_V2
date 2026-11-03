import { Schema, model, Document, Types } from 'mongoose';
import { IssueStatus, PriorityLevel } from '../config/constants';

export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IRetrievedSupportingInfo {
  documentName: string;
  department?: string;
  section?: string;
  relevanceScore?: number;
  textSnippet?: string;
}

export interface IAIAssessment {
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
  retrievedSupportingInfo: IRetrievedSupportingInfo[];
  uncertaintyNotes?: string | null;
  generatedAt?: Date;
}

export interface IIssueReport extends Document {
  reportId: string;
  citizenId: Types.ObjectId;
  imageUrl: string;
  imagePublicId?: string;
  categoryId: Types.ObjectId;
  categoryName: string; // e.g., 'pothole', 'garbage'
  aiDetectedCategory?: string;
  aiConfidence: number; // 0.0 to 1.0
  isCategoryOverridden: boolean;
  aiAssessment?: IAIAssessment;
  description?: string;
  location: IGeoPoint;
  address?: string;
  ward?: string;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  isRecurring: boolean;
  nearbyReportCount: number;
  assignedDepartmentId: Types.ObjectId;
  assignedAuthorityId?: Types.ObjectId;
  status: IssueStatus;
  resolutionNotes?: string;
  resolutionImageUrl?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const issueReportSchema = new Schema<IIssueReport>(
  {
    reportId: { type: String, required: true, unique: true, index: true },
    citizenId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String },
    categoryId: { type: Schema.Types.ObjectId, ref: 'IssueCategory', required: true },
    categoryName: { type: String, required: true, index: true },
    aiDetectedCategory: { type: String },
    aiConfidence: { type: Number, required: true, default: 0 },
    isCategoryOverridden: { type: Boolean, default: false },
    aiAssessment: { type: Schema.Types.Mixed },
    description: { type: String, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    address: { type: String, trim: true },
    ward: { type: String, trim: true },
    priorityScore: { type: Number, required: true, default: 0 },
    priorityLevel: {
      type: String,
      enum: Object.values(PriorityLevel),
      default: PriorityLevel.LOW,
      required: true,
      index: true
    },
    isRecurring: { type: Boolean, default: false, index: true },
    nearbyReportCount: { type: Number, default: 0 },
    assignedDepartmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true
    },
    assignedAuthorityId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: Object.values(IssueStatus),
      default: IssueStatus.SUBMITTED,
      required: true,
      index: true
    },
    resolutionNotes: { type: String },
    resolutionImageUrl: { type: String },
    resolvedAt: { type: Date }
  },
  { timestamps: true }
);

// Crucial 2dsphere index for geospatial proximity & recurrence queries
issueReportSchema.index({ location: '2dsphere' });
issueReportSchema.index({ categoryName: 1, createdAt: -1 });

export const IssueReport = model<IIssueReport>('IssueReport', issueReportSchema);
