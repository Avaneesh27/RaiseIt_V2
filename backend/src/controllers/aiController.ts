import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AIProxyService } from '../services/aiProxyService';
import { findNearbySimilarReports } from '../services/recurrenceService';
import { calculatePriority } from '../services/priorityService';
import { IssueCategory } from '../models/IssueCategory';
import { IssueReport } from '../models/IssueReport';
import fs from 'fs';

export const classifyImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Image file is required for AI classification' });
      return;
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const result = await AIProxyService.classifyImage(
      fileBuffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({
      category: result.category,
      confidence: result.confidence,
      modelVersion: result.modelVersion,
      isFallback: result.isFallback || false
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Pre-submission Analysis (PRD Section 21, 22, 24, 25)
 * Allows citizen to preview recurring report counts and deterministic priority score
 */
export const analyzeReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, confidence = 0.9, longitude, latitude } = req.body;

    if (!category || longitude === undefined || latitude === undefined) {
      res.status(400).json({ message: 'Category, longitude, and latitude are required' });
      return;
    }

    const categoryKey = category.toLowerCase().trim();
    const dbCategory = await IssueCategory.findOne({ key: categoryKey });

    const recurrence = await findNearbySimilarReports({
      longitude: parseFloat(longitude),
      latitude: parseFloat(latitude),
      categoryName: categoryKey
    });

    const priority = calculatePriority({
      categoryKey,
      customBaseWeight: dbCategory?.basePriorityWeight,
      confidence: parseFloat(confidence),
      nearbyReportCount: recurrence.nearbyReportCount,
      hasRecentReportsWithin7Days: recurrence.hasRecentReportsWithin7Days
    });

    res.json({
      category: categoryKey,
      confidence: parseFloat(confidence),
      recurrence: {
        isRecurring: recurrence.isRecurring,
        nearbyReportCount: recurrence.nearbyReportCount,
        nearbyReports: recurrence.nearbyReports
      },
      priority
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * On-demand Unified AI Decision & Validation Pipeline for a complaint
 */
export const validateReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    const report = await IssueReport.findOne({ reportId });
    if (!report) {
      res.status(404).json({ message: 'Complaint not found' });
      return;
    }

    const assessment = await AIProxyService.generateUnifiedAssessment({
      category: report.categoryName,
      description: report.description,
      address: report.address,
      latitude: report.location?.coordinates ? report.location.coordinates[1] : undefined,
      longitude: report.location?.coordinates ? report.location.coordinates[0] : undefined,
      is_recurring: report.isRecurring,
      nearby_report_count: report.nearbyReportCount,
      image_category: report.aiDetectedCategory,
      image_confidence: report.aiConfidence
    });

    report.aiAssessment = assessment;
    await report.save();

    res.json({
      message: 'AI Decision & Validation Pipeline completed',
      assessment
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
