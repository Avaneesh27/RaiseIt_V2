import { Response } from 'express';
import fs from 'fs';
import { AuthRequest } from '../middleware/auth';
import { IssueReport } from '../models/IssueReport';
import { IssueCategory } from '../models/IssueCategory';
import { Department } from '../models/Department';
import { IssueUpdate } from '../models/IssueUpdate';
import { NotificationService } from '../services/notificationService';
import { findNearbySimilarReports } from '../services/recurrenceService';
import { calculatePriority } from '../services/priorityService';
import { createReportSchema } from '../validators';
import { IssueStatus } from '../config/constants';
import { getPublicImageUrl } from '../utils/fileUpload';
import { AIProxyService } from '../services/aiProxyService';

/**
 * Helper to generate sequential civic ticket tracking IDs (e.g. RI1024)
 */
const generateNextReportId = async (): Promise<string> => {
  const count = await IssueReport.countDocuments();
  return `RI${1000 + count + 1}`;
};

export const createReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'Image evidence is mandatory for reporting an issue' });
      return;
    }

    const validated = createReportSchema.parse(req.body);
    const imageUrl = getPublicImageUrl(req, req.file.filename);

    // Look up category and its responsible department
    const categoryKey = validated.categoryName.toLowerCase().trim();
    let category = await IssueCategory.findOne({ key: categoryKey });

    // Auto-create category if missing or match by name
    if (!category) {
      category = await IssueCategory.findOne({ name: new RegExp(`^${categoryKey}$`, 'i') });
    }

    // Default department fallback if department mapping not yet configured
    let assignedDepartmentId = category?.departmentId;
    if (!assignedDepartmentId) {
      const defaultDept = await Department.findOne({ code: 'ROADS' }) || await Department.findOne();
      assignedDepartmentId = defaultDept?._id;
    }

    // Step 1: Geospatial Proximity & Recurrence Analysis (PRD Section 22)
    const recurrenceAnalysis = await findNearbySimilarReports({
      longitude: validated.longitude,
      latitude: validated.latitude,
      categoryName: categoryKey
    });

    // Step 2: Deterministic Priority Calculation (PRD Section 24)
    const priorityResult = calculatePriority({
      categoryKey,
      customBaseWeight: category?.basePriorityWeight,
      confidence: validated.aiConfidence,
      nearbyReportCount: recurrenceAnalysis.nearbyReportCount,
      hasRecentReportsWithin7Days: recurrenceAnalysis.hasRecentReportsWithin7Days
    });

    // Step 2.5: Run Unified AI Decision & Validation Pipeline
    let aiAssessment = null;
    let finalAiCategory = validated.aiDetectedCategory;
    let finalAiConfidence = validated.aiConfidence;

    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      aiAssessment = await AIProxyService.generateUnifiedAssessment({
        fileBuffer,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        category: categoryKey,
        description: validated.description,
        address: validated.address,
        latitude: validated.latitude,
        longitude: validated.longitude,
        is_recurring: recurrenceAnalysis.isRecurring,
        nearby_report_count: recurrenceAnalysis.nearbyReportCount,
        image_category: validated.aiDetectedCategory,
        image_confidence: validated.aiConfidence
      });

      if (aiAssessment) {
        finalAiCategory = aiAssessment.prediction;
        finalAiConfidence = aiAssessment.confidence;
      }
    } catch (e: any) {
      console.warn('[ReportController] Unified pipeline error:', e.message);
    }

    // Step 3: Generate sequential tracking ID (e.g. RI1024)
    const reportId = await generateNextReportId();

    const isAiRejected = aiAssessment?.validationStatus === 'REJECTED';
    const initialStatus = isAiRejected ? IssueStatus.REJECTED : IssueStatus.SUBMITTED;

    // Step 4: Create Issue Report in MongoDB with 2dsphere Point coordinates
    const report = await IssueReport.create({
      reportId,
      citizenId: req.user._id,
      imageUrl,
      categoryId: category?._id,
      categoryName: categoryKey,
      aiDetectedCategory: finalAiCategory,
      aiConfidence: finalAiConfidence,
      isCategoryOverridden: validated.isCategoryOverridden,
      aiAssessment,
      description: validated.description,
      location: {
        type: 'Point',
        coordinates: [validated.longitude, validated.latitude] // [lng, lat] GeoJSON
      },
      address: validated.address || 'Reported Location',
      ward: validated.ward,
      priorityScore: priorityResult.score,
      priorityLevel: priorityResult.level,
      isRecurring: recurrenceAnalysis.isRecurring,
      nearbyReportCount: recurrenceAnalysis.nearbyReportCount,
      assignedDepartmentId,
      status: initialStatus
    });

    // Step 5: Log initial event in timeline
    await IssueUpdate.create({
      reportId: report._id,
      authorityId: req.user._id,
      status: initialStatus,
      comment: isAiRejected
        ? `Automated AI Evidence Validation REJECTED this submission: ${aiAssessment?.uncertaintyNotes || 'Photographic evidence does not match reported category.'}`
        : 'Citizen submitted report with photo evidence and GPS verification'
    });

    // Step 6: Create confirmation notification for citizen
    await NotificationService.sendNotification({
      userId: req.user._id,
      reportId: report._id,
      title: isAiRejected ? 'AI Validation Alert - Report Rejected' : 'Report Submitted',
      message: isAiRejected
        ? `Your report #${report.reportId} was rejected by automated AI validation: ${aiAssessment?.uncertaintyNotes}`
        : `Your report #${report.reportId} for ${categoryKey} has been registered and routed to municipal authorities.`,
      type: isAiRejected ? 'SYSTEM' : 'SUBMISSION'
    });

    const populatedReport = await IssueReport.findById(report._id)
      .populate('assignedDepartmentId', 'name code')
      .populate('citizenId', 'name email phone');

    res.status(201).json({
      message: 'Civic report created successfully',
      report: populatedReport,
      analysis: {
        isRecurring: recurrenceAnalysis.isRecurring,
        nearbyReportCount: recurrenceAnalysis.nearbyReportCount,
        priority: priorityResult
      }
    });
  } catch (err: any) {
    res.status(400).json({ message: err.errors?.[0]?.message || err.message });
  }
};

export const getMyReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { statusType } = req.query; // 'active' | 'resolved' | 'all'
    const query: any = { citizenId: req.user._id };

    if (statusType === 'active') {
      query.status = { $in: [IssueStatus.SUBMITTED, IssueStatus.UNDER_REVIEW, IssueStatus.ASSIGNED, IssueStatus.IN_PROGRESS] };
    } else if (statusType === 'resolved') {
      query.status = { $in: [IssueStatus.RESOLVED, IssueStatus.REJECTED] };
    }

    const reports = await IssueReport.find(query)
      .sort({ createdAt: -1 })
      .populate('assignedDepartmentId', 'name code');

    res.json({ reports });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getReportById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;

    const report = await IssueReport.findOne({
      $or: [{ reportId }, { _id: reportId.match(/^[0-9a-fA-F]{24}$/) ? reportId : null }]
    })
      .populate('assignedDepartmentId', 'name code contactEmail contactPhone')
      .populate('assignedAuthorityId', 'name email')
      .populate('citizenId', 'name email phone');

    if (!report) {
      res.status(404).json({ message: 'Report not found' });
      return;
    }

    // Timeline updates
    const timeline = await IssueUpdate.find({ reportId: report._id })
      .sort({ createdAt: 1 })
      .populate('authorityId', 'name role');

    // Nearby reports for recurring context display
    const nearby = await IssueReport.find({
      categoryName: report.categoryName,
      _id: { $ne: report._id },
      location: {
        $nearSphere: {
          $geometry: report.location,
          $maxDistance: 500
        }
      }
    })
      .limit(5)
      .select('reportId categoryName status priorityLevel createdAt')
      .lean();

    res.json({
      report,
      timeline,
      nearbyReports: nearby
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getReportTimeline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    const report = await IssueReport.findOne({
      $or: [{ reportId }, { _id: reportId.match(/^[0-9a-fA-F]{24}$/) ? reportId : null }]
    });

    if (!report) {
      res.status(404).json({ message: 'Report not found' });
      return;
    }

    const timeline = await IssueUpdate.find({ reportId: report._id })
      .sort({ createdAt: 1 })
      .populate('authorityId', 'name role');

    res.json({ timeline });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Nearby Issues for Citizens Map (PRD Section 31 & 76)
 * Strips citizen identity for privacy
 */
export const getNearbyReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lng = parseFloat(req.query.lng as string);
    const lat = parseFloat(req.query.lat as string);
    const radiusMeters = parseInt((req.query.radius as string) || '1500', 10);

    if (isNaN(lng) || isNaN(lat)) {
      res.status(400).json({ message: 'Valid lng and lat query parameters are required' });
      return;
    }

    const query: any = {
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radiusMeters
        }
      }
    };

    const reports = await IssueReport.find(query)
      .select('reportId categoryName priorityLevel status address location createdAt nearbyReportCount isRecurring imageUrl')
      .limit(50)
      .lean();

    res.json({ reports });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getCitizenDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const total = await IssueReport.countDocuments({ citizenId: req.user._id });
    const active = await IssueReport.countDocuments({
      citizenId: req.user._id,
      status: { $in: [IssueStatus.SUBMITTED, IssueStatus.UNDER_REVIEW, IssueStatus.ASSIGNED, IssueStatus.IN_PROGRESS] }
    });
    const resolved = await IssueReport.countDocuments({
      citizenId: req.user._id,
      status: IssueStatus.RESOLVED
    });

    const recentReports = await IssueReport.find({ citizenId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('assignedDepartmentId', 'name code');

    res.json({
      stats: { total, active, resolved },
      recentReports
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
