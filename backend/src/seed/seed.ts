import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import { User } from '../models/User';
import { Department } from '../models/Department';
import { IssueCategory } from '../models/IssueCategory';
import { IssueReport } from '../models/IssueReport';
import { IssueUpdate } from '../models/IssueUpdate';
import { CivicDocument } from '../models/CivicDocument';
import { UserRole, UserStatus, IssueStatus, PriorityLevel } from '../config/constants';

export const runSeed = async () => {
  console.log(`[Seed] Running seeder on active database connection...`);

  console.log('[Seed] Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    IssueCategory.deleteMany({}),
    IssueReport.deleteMany({}),
    IssueUpdate.deleteMany({}),
    CivicDocument.deleteMany({})
  ]);

  console.log('[Seed] Seeding Departments...');
  const departments = await Department.create([
    {
      name: 'Roads & Infrastructure Department',
      code: 'ROADS',
      description: 'Responsible for road surfaces, potholes, sidewalk repairs, and bridge structural integrity.',
      contactEmail: 'roads@raiseit.gov',
      contactPhone: '+1-800-555-0101'
    },
    {
      name: 'Solid Waste & Sanitation Department',
      code: 'SANITATION',
      description: 'Manages municipal garbage collection, black spot clearing, and public sanitation.',
      contactEmail: 'sanitation@raiseit.gov',
      contactPhone: '+1-800-555-0102'
    },
    {
      name: 'Electrical & Public Lighting Department',
      code: 'ELECTRICAL',
      description: 'Maintains streetlights, high-mast lamps, electrical poles, and public power safety.',
      contactEmail: 'electrical@raiseit.gov',
      contactPhone: '+1-800-555-0103'
    },
    {
      name: 'Water Supply & Sewerage Board',
      code: 'WATER',
      description: 'Handles municipal water supply lines, pipe bursts, leakage control, and water purity.',
      contactEmail: 'water@raiseit.gov',
      contactPhone: '+1-800-555-0104'
    },
    {
      name: 'Stormwater Drainage Department',
      code: 'DRAINAGE',
      description: 'Maintains flood channels, storm drains, manhole covers, and monsoon overflow prevention.',
      contactEmail: 'drainage@raiseit.gov',
      contactPhone: '+1-800-555-0105'
    }
  ]);

  const deptMap = departments.reduce((acc, d) => ({ ...acc, [d.code]: d._id }), {} as Record<string, any>);

  console.log('[Seed] Seeding Issue Categories...');
  const categories = await IssueCategory.create([
    {
      name: 'Pothole',
      key: 'pothole',
      description: 'Crater, surface depression, or asphalt failure on roadway',
      departmentId: deptMap['ROADS'],
      basePriorityWeight: 25
    },
    {
      name: 'Garbage Accumulation',
      key: 'garbage',
      description: 'Unattended waste piles, overflowing bins, or illegal dumping',
      departmentId: deptMap['SANITATION'],
      basePriorityWeight: 15
    },
    {
      name: 'Damaged Streetlight',
      key: 'streetlight',
      description: 'Unlit lamp, broken pole, or malfunctioning street lighting',
      departmentId: deptMap['ELECTRICAL'],
      basePriorityWeight: 20
    },
    {
      name: 'Water Leakage',
      key: 'water_leakage',
      description: 'Main pipe burst, valve leak, or fresh water flooding street',
      departmentId: deptMap['WATER'],
      basePriorityWeight: 30
    },
    {
      name: 'Drainage / Sewage Overflow',
      key: 'drainage',
      description: 'Blocked stormwater culvert, missing manhole cover, or sewage backup',
      departmentId: deptMap['DRAINAGE'],
      basePriorityWeight: 35
    },
    {
      name: 'Damaged Infrastructure',
      key: 'damaged_infrastructure',
      description: 'Broken guardrails, collapsed footpaths, or hazardous public structures',
      departmentId: deptMap['ROADS'],
      basePriorityWeight: 35
    }
  ]);

  const catMap = categories.reduce((acc, c) => ({ ...acc, [c.key]: c._id }), {} as Record<string, any>);

  console.log('[Seed] Seeding Users...');
  const salt = await bcrypt.genSalt(10);
  const commonPasswordHash = await bcrypt.hash('Password@123', salt);

  const admin = await User.create({
    name: 'Municipal Administrator',
    email: 'admin@raiseit.gov',
    passwordHash: commonPasswordHash,
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    phone: '+1-800-ADMIN-01'
  });

  const roadsOfficer = await User.create({
    name: 'Er. Rajesh Sharma (Roads AE)',
    email: 'roads.officer@raiseit.gov',
    passwordHash: commonPasswordHash,
    role: UserRole.AUTHORITY,
    status: UserStatus.ACTIVE,
    departmentId: deptMap['ROADS'],
    phone: '+1-800-ROADS-01'
  });

  const sanitationOfficer = await User.create({
    name: 'Smt. Priya Nair (Sanitation Insp.)',
    email: 'sanitation.officer@raiseit.gov',
    passwordHash: commonPasswordHash,
    role: UserRole.AUTHORITY,
    status: UserStatus.ACTIVE,
    departmentId: deptMap['SANITATION'],
    phone: '+1-800-SANIT-01'
  });

  const citizen = await User.create({
    name: 'Avaneesh (Citizen)',
    email: 'citizen@example.com',
    passwordHash: commonPasswordHash,
    role: UserRole.CITIZEN,
    status: UserStatus.ACTIVE,
    phone: '+1-555-0199'
  });

  console.log('[Seed] Seeding Recurring Pothole Cluster & Civic Reports...');
  // Coords centered on municipal main avenue: [77.5946, 12.9716]
  const mainRoadCoords = [77.5946, 12.9716];

  // Report 1: Historical Pothole (Submitted 5 days ago)
  const report1 = await IssueReport.create({
    reportId: 'RI1001',
    citizenId: citizen._id,
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
    categoryId: catMap['pothole'],
    categoryName: 'pothole',
    aiConfidence: 0.94,
    description: 'Deep road crater in middle lane causing vehicular slowdown and motorcycle skidding risk.',
    location: { type: 'Point', coordinates: [77.5947, 12.9718] },
    address: 'Main Avenue, Near Central Metro Pillar 44',
    priorityScore: 78,
    priorityLevel: PriorityLevel.HIGH,
    isRecurring: true,
    nearbyReportCount: 3,
    assignedDepartmentId: deptMap['ROADS'],
    assignedAuthorityId: roadsOfficer._id,
    status: IssueStatus.IN_PROGRESS,
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000)
  });

  // Report 2: Secondary report nearby (Submitted 3 days ago)
  const report2 = await IssueReport.create({
    reportId: 'RI1002',
    citizenId: citizen._id,
    imageUrl: 'https://images.unsplash.com/photo-1584463699039-4458d98d022b?w=800',
    categoryId: catMap['pothole'],
    categoryName: 'pothole',
    aiConfidence: 0.91,
    description: 'Another severe pothole 40 meters from metro pillar.',
    location: { type: 'Point', coordinates: [77.5949, 12.9719] },
    address: 'Main Avenue Junction, Ward 14',
    priorityScore: 78,
    priorityLevel: PriorityLevel.HIGH,
    isRecurring: true,
    nearbyReportCount: 3,
    assignedDepartmentId: deptMap['ROADS'],
    assignedAuthorityId: roadsOfficer._id,
    status: IssueStatus.UNDER_REVIEW,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000)
  });

  // Report 3: Third report in same cluster (Submitted 1 day ago)
  const report3 = await IssueReport.create({
    reportId: 'RI1003',
    citizenId: citizen._id,
    imageUrl: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800',
    categoryId: catMap['pothole'],
    categoryName: 'pothole',
    aiConfidence: 0.96,
    description: 'Expanding road fissure and crater cluster on Main Avenue during heavy rainfall.',
    location: { type: 'Point', coordinates: [77.5945, 12.9715] },
    address: 'Main Avenue & Crossroad 3',
    priorityScore: 88,
    priorityLevel: PriorityLevel.CRITICAL,
    isRecurring: true,
    nearbyReportCount: 3,
    assignedDepartmentId: deptMap['ROADS'],
    status: IssueStatus.SUBMITTED,
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000)
  });

  // Report 4: Garbage accumulation in Ward 8
  const report4 = await IssueReport.create({
    reportId: 'RI1004',
    citizenId: citizen._id,
    imageUrl: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?w=800',
    categoryId: catMap['garbage'],
    categoryName: 'garbage',
    aiConfidence: 0.89,
    description: 'Uncollected community waste accumulating near residential park boundary.',
    location: { type: 'Point', coordinates: [77.6101, 12.9805] },
    address: 'Greenwood Park Sector 2, Ward 8',
    priorityScore: 48,
    priorityLevel: PriorityLevel.MEDIUM,
    isRecurring: false,
    nearbyReportCount: 0,
    assignedDepartmentId: deptMap['SANITATION'],
    assignedAuthorityId: sanitationOfficer._id,
    status: IssueStatus.ASSIGNED,
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000)
  });

  // Report 5: Resolved Streetlight ticket
  const report5 = await IssueReport.create({
    reportId: 'RI1005',
    citizenId: citizen._id,
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800',
    categoryId: catMap['streetlight'],
    categoryName: 'streetlight',
    aiConfidence: 0.95,
    description: 'Streetlight out for 3 consecutive days causing dark spot.',
    location: { type: 'Point', coordinates: [77.5855, 12.9655] },
    address: '14th Cross, Malleshwaram West',
    priorityScore: 30,
    priorityLevel: PriorityLevel.LOW,
    isRecurring: false,
    nearbyReportCount: 0,
    assignedDepartmentId: deptMap['ELECTRICAL'],
    status: IssueStatus.RESOLVED,
    resolutionNotes: 'LED luminaire unit replaced and circuit breaker reset. Verified operational.',
    resolutionImageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800',
    resolvedAt: new Date(Date.now() - 12 * 3600 * 1000),
    createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000)
  });

  // Report 6: Damaged Infrastructure (Footpath / Railing)
  const report6 = await IssueReport.create({
    reportId: 'RI1006',
    citizenId: citizen._id,
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
    categoryId: catMap['damaged_infrastructure'],
    categoryName: 'damaged_infrastructure',
    aiConfidence: 0.93,
    description: 'Collapsed pedestrian footpath pavers and broken metallic railing near bus terminal.',
    location: { type: 'Point', coordinates: [77.596, 12.9725] },
    address: 'Subhash Road Pedestrian Walkway, Ward 04',
    priorityScore: 74,
    priorityLevel: PriorityLevel.HIGH,
    isRecurring: false,
    nearbyReportCount: 0,
    assignedDepartmentId: deptMap['ROADS'],
    assignedAuthorityId: roadsOfficer._id,
    status: IssueStatus.UNDER_REVIEW,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000)
  });

  // Report 7: Main Water Pipeline Leakage (Critical)
  const report7 = await IssueReport.create({
    reportId: 'RI1007',
    citizenId: citizen._id,
    imageUrl: 'https://images.unsplash.com/photo-1584463699039-4458d98d022b?w=800',
    categoryId: catMap['water_leakage'],
    categoryName: 'water_leakage',
    aiConfidence: 0.94,
    description: 'High-pressure municipal supply line ruptured; street submerged under 2ft of potable water.',
    location: { type: 'Point', coordinates: [77.602, 12.978] },
    address: 'Tank Bund Road Junction, Ward 11',
    priorityScore: 92,
    priorityLevel: PriorityLevel.CRITICAL,
    isRecurring: false,
    nearbyReportCount: 0,
    assignedDepartmentId: deptMap['WATER'],
    status: IssueStatus.ASSIGNED,
    createdAt: new Date(Date.now() - 4 * 3600 * 1000)
  });

  // Report 8: Open Stormwater Drain Hazard
  const report8 = await IssueReport.create({
    reportId: 'RI1008',
    citizenId: citizen._id,
    imageUrl: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800',
    categoryId: catMap['drainage'],
    categoryName: 'drainage',
    aiConfidence: 0.91,
    description: 'Concrete culvert cover displaced; open sewer poses night hazard for two-wheelers.',
    location: { type: 'Point', coordinates: [77.608, 12.974] },
    address: 'Market Lane Storm Drain, Ward 02',
    priorityScore: 56,
    priorityLevel: PriorityLevel.MEDIUM,
    isRecurring: false,
    nearbyReportCount: 0,
    assignedDepartmentId: deptMap['DRAINAGE'],
    status: IssueStatus.SUBMITTED,
    createdAt: new Date(Date.now() - 18 * 3600 * 1000)
  });

  // Report 9: Minor sidewalk settlement (Low Priority)
  const report9 = await IssueReport.create({
    reportId: 'RI1009',
    citizenId: citizen._id,
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
    categoryId: catMap['damaged_infrastructure'],
    categoryName: 'damaged_infrastructure',
    aiConfidence: 0.9,
    description: 'Slightly uneven paver stone along residential pathway, no pedestrian injury risk.',
    location: { type: 'Point', coordinates: [77.591, 12.969] },
    address: 'Civil Lines 5th Cross, Ward 04',
    priorityScore: 26,
    priorityLevel: PriorityLevel.LOW,
    isRecurring: false,
    nearbyReportCount: 0,
    assignedDepartmentId: deptMap['ROADS'],
    status: IssueStatus.SUBMITTED,
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000)
  });

  console.log('[Seed] Seeding Timeline Updates...');
  await IssueUpdate.create([
    {
      reportId: report1._id,
      authorityId: citizen._id,
      status: IssueStatus.SUBMITTED,
      comment: 'Citizen logged issue with camera photo and GPS coordinate.'
    },
    {
      reportId: report1._id,
      authorityId: roadsOfficer._id,
      status: IssueStatus.UNDER_REVIEW,
      comment: 'Engineer reviewed evidence. Identified as part of Recurring Road Failure Cluster #RC-14.'
    },
    {
      reportId: report1._id,
      authorityId: roadsOfficer._id,
      status: IssueStatus.IN_PROGRESS,
      comment: 'Work order #WO-902 issued. Asphalt repair truck dispatched.'
    },
    {
      reportId: report5._id,
      authorityId: citizen._id,
      status: IssueStatus.SUBMITTED,
      comment: 'Citizen reported faulty streetlight pole #LP-109.'
    },
    {
      reportId: report5._id,
      authorityId: admin._id,
      status: IssueStatus.RESOLVED,
      comment: 'Fixture replaced. Light lux output tested to meet municipal standards.'
    }
  ]);

  console.log('[Seed] Seeding Civic Documents...');
  await CivicDocument.create([
    {
      name: 'Road Maintenance & Pothole Repair SOP',
      departmentId: deptMap['ROADS'],
      documentType: 'SOP',
      version: '2.1',
      fileUrl: '/documents/civic/road_maintenance_sop.md',
      fileName: 'road_maintenance_sop.md',
      status: 'INDEXED',
      chunkCount: 8,
      uploadedBy: admin._id,
      indexedAt: new Date()
    },
    {
      name: 'Solid Waste Management & Sanitation Protocol',
      departmentId: deptMap['SANITATION'],
      documentType: 'Policy',
      version: '3.0',
      fileUrl: '/documents/civic/solid_waste_management_policy.md',
      fileName: 'solid_waste_management_policy.md',
      status: 'INDEXED',
      chunkCount: 6,
      uploadedBy: admin._id,
      indexedAt: new Date()
    },
    {
      name: 'Citizen Complaint Lifecycle & Escalation Charter',
      departmentId: deptMap['ROADS'],
      documentType: 'Charter',
      version: '1.0',
      fileUrl: '/documents/civic/citizen_complaint_and_escalation_charter.md',
      fileName: 'citizen_complaint_and_escalation_charter.md',
      status: 'INDEXED',
      chunkCount: 5,
      uploadedBy: admin._id,
      indexedAt: new Date()
    }
  ]);

  console.log('========================================================');
  console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  console.log('Credentials:');
  console.log('  Admin:     admin@raiseit.gov         / Password@123');
  console.log('  Authority: roads.officer@raiseit.gov / Password@123 (Roads Dept)');
  console.log('  Authority: sanitation.officer@raiseit.gov / Password@123 (Sanitation)');
  console.log('  Citizen:   citizen@example.com       / Password@123');
  console.log('========================================================');

  console.log('========================================================');
};
