export enum UserRole {
  CITIZEN = 'CITIZEN',
  AUTHORITY = 'AUTHORITY',
  ADMIN = 'ADMIN'
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export enum IssueStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED'
}

export enum PriorityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export const ALLOWED_STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  [IssueStatus.SUBMITTED]: [IssueStatus.UNDER_REVIEW, IssueStatus.REJECTED],
  [IssueStatus.UNDER_REVIEW]: [IssueStatus.ASSIGNED, IssueStatus.REJECTED],
  [IssueStatus.ASSIGNED]: [IssueStatus.IN_PROGRESS, IssueStatus.REJECTED],
  [IssueStatus.IN_PROGRESS]: [IssueStatus.RESOLVED, IssueStatus.UNDER_REVIEW],
  [IssueStatus.RESOLVED]: [], // Terminal state
  [IssueStatus.REJECTED]: []  // Terminal state
};

export const SUPPORTED_CATEGORIES = [
  'pothole',
  'garbage',
  'streetlight',
  'water_leakage',
  'drainage',
  'damaged_infrastructure'
] as const;

export type SupportedCategory = typeof SUPPORTED_CATEGORIES[number];
