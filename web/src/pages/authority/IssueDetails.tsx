import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  MapPin,
  Calendar,
  User,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  Sparkles,
  Send,
  Upload,
  Layers,
  BrainCircuit,
  BookOpen,
  RefreshCw,
  FileCheck,
  XCircle
} from 'lucide-react';
import { authorityApi } from '../../services/api';
import { CivicAssistantModal } from '../../components/CivicAssistantModal';
import { IssueReport, IssueUpdate } from '../../types';

export const IssueDetails: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<IssueReport | null>(null);
  const [timeline, setTimeline] = useState<IssueUpdate[]>([]);
  const [nearby, setNearby] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Assistant modal state
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [validatingAI, setValidatingAI] = useState(false);

  // Status transition form
  const [statusLoading, setStatusLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');

  // Progress update form
  const [progressComment, setProgressComment] = useState('');
  const [progressFile, setProgressFile] = useState<File | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  // Resolution form
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveFile, setResolveFile] = useState<File | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);

  const fetchDetails = async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const res = await authorityApi.getIssueById(reportId);
      setReport(res.data.report);
      setTimeline(res.data.timeline || []);
      setNearby(res.data.nearbyReports || []);
      setSelectedStatus(res.data.report.status);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load complaint details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [reportId]);

  const handleRunAiValidation = async () => {
    if (!reportId) return;
    setValidatingAI(true);
    try {
      await authorityApi.validateReport(reportId);
      await fetchDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to execute AI validation');
    } finally {
      setValidatingAI(false);
    }
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !selectedStatus) return;
    setStatusLoading(true);
    try {
      await authorityApi.updateStatus(report.reportId, {
        status: selectedStatus,
        comment: statusComment
      });
      setStatusComment('');
      await fetchDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !progressComment.trim()) return;
    setProgressLoading(true);
    try {
      const formData = new FormData();
      formData.append('comment', progressComment);
      if (progressFile) {
        formData.append('image', progressFile);
      }
      await authorityApi.addProgressUpdate(report.reportId, formData);
      setProgressComment('');
      setProgressFile(null);
      await fetchDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to post progress update');
    } finally {
      setProgressLoading(false);
    }
  };

  const handleResolveIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !resolveNotes.trim()) return;
    setResolveLoading(true);
    try {
      const formData = new FormData();
      formData.append('resolutionNotes', resolveNotes);
      if (resolveFile) {
        formData.append('image', resolveFile);
      }
      await authorityApi.resolveIssue(report.reportId, formData);
      setShowResolveModal(false);
      setResolveNotes('');
      setResolveFile(null);
      await fetchDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resolve issue');
    } finally {
      setResolveLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading complaint details...</div>;
  }

  if (error || !report) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400">
        <p className="font-semibold">{error || 'Complaint not found'}</p>
        <Link to="/issues" className="text-xs text-slate-300 underline mt-2 block">
          &larr; Back to complaints queue
        </Link>
      </div>
    );
  }

  const isResolved = report.status === 'RESOLVED' || report.status === 'REJECTED';

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/issues"
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-white tracking-tight">Report #{report.reportId}</h2>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                  report.priorityLevel === 'HIGH'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : report.priorityLevel === 'MEDIUM'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {report.priorityLevel} PRIORITY ({report.priorityScore}/100)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Assigned to {report.assignedDepartmentId?.name} • Submitted on {new Date(report.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Ask RAG about this issue button */}
          <button
            onClick={() => setAssistantOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
          >
            <Bot className="w-4 h-4" />
            <span>Ask About This Issue</span>
          </button>

          {!isResolved && (
            <button
              onClick={() => setShowResolveModal(true)}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Resolved</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Evidence, Location, and Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photographic Evidence & AI Classification Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="font-bold text-white text-base mb-4 flex items-center justify-between">
              <span>Photographic Evidence</span>
              <span className="text-xs text-slate-400 font-normal">Original Citizen Upload</span>
            </h3>

            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 max-h-96 flex items-center justify-center">
              <img
                src={report.imageUrl}
                alt="Civic Issue Evidence"
                className="w-full h-full object-contain"
                onError={(e: any) => {
                  e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800';
                }}
              />
            </div>

            {/* AI Vision Metadata Banner (PRD Section 19 & 20) */}
            <div className="mt-4 p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">AI Identified Issue:</span>
                  <span className="font-bold text-sm text-white capitalize">
                    {report.categoryName.replace('_', ' ')}
                  </span>
                  {report.isCategoryOverridden && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-medium">
                      User Overrode AI
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pre-trained civic vision classifier mapped to department SOPs
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-xs text-slate-400">AI Confidence</div>
                  <div className="text-lg font-black text-emerald-400">
                    {Math.round(report.aiConfidence * 100)}%
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-emerald-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </div>

            {/* Citizen Description */}
            {report.description && (
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Citizen Notes:
                </span>
                <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                  {report.description}
                </p>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* UNIFIED AI DECISION AND VALIDATION PIPELINE PANEL            */}
          {/* ============================================================ */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">AI Decision & Validation Pipeline</h3>
                  <p className="text-xs text-slate-400">
                    PyTorch EfficientNet-B0 + FAISS Dense Retrieval + Grounded Gemini Assessment
                  </p>
                </div>
              </div>

              <button
                onClick={handleRunAiValidation}
                disabled={validatingAI}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${validatingAI ? 'animate-spin' : ''}`} />
                <span>{validatingAI ? 'Running Pipeline...' : report.aiAssessment ? 'Re-run Pipeline' : 'Run AI Validation'}</span>
              </button>
            </div>

            {report.aiAssessment ? (
              <div className="space-y-6">
                {/* Validation Status Banner */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                  report.aiAssessment.validationStatus === 'VALIDATED'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : report.aiAssessment.validationStatus === 'REJECTED'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : report.aiAssessment.validationStatus === 'MANUAL_REVIEW_REQUIRED'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                }`}>
                  <div className="flex items-center space-x-3">
                    {report.aiAssessment.validationStatus === 'VALIDATED' ? (
                      <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-400" />
                    ) : report.aiAssessment.validationStatus === 'REJECTED' ? (
                      <XCircle className="w-6 h-6 shrink-0 text-rose-400" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 shrink-0 text-amber-400" />
                    )}
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider flex items-center space-x-2">
                        <span>Validation Status: {report.aiAssessment.validationStatus}</span>
                        {report.aiAssessment.validationStatus === 'REJECTED' && (
                          <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                            AI Rejected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {report.aiAssessment.validationStatus === 'VALIDATED'
                          ? 'Visual evidence confirmed by neural model and verified against municipal SOP thresholds.'
                          : report.aiAssessment.validationStatus === 'REJECTED'
                          ? report.aiAssessment.uncertaintyNotes || 'AI Evidence Validation Failed: Image does not match claimed category or contains invalid non-civic content.'
                          : report.aiAssessment.uncertaintyNotes || 'Requires supervisory verification before field dispatch.'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block">Model Confidence</span>
                    <span className="text-lg font-black">{Math.round(report.aiAssessment.confidence * 100)}%</span>
                  </div>
                </div>

                {/* 2-Column Metrics: ML Vision & Department Routing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ML Model Output */}
                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span>Vision Classification</span>
                    </div>
                    <div className="text-xs space-y-1.5 text-slate-400">
                      <div className="flex justify-between">
                        <span>Predicted Defect:</span>
                        <span className="font-bold text-white capitalize">{report.aiAssessment.prediction.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Architecture:</span>
                        <span className="font-mono text-emerald-400">{report.aiAssessment.modelVersion}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Citizen Selection:</span>
                        <span className="text-slate-300 capitalize">{report.categoryName.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Routing & SLA */}
                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>Routing & Prescribed SLA</span>
                    </div>
                    <div className="text-xs space-y-1.5 text-slate-400">
                      <div className="flex justify-between">
                        <span>Suggested Dept:</span>
                        <span className="font-bold text-white truncate max-w-[180px]">{report.aiAssessment.suggestedDepartment}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Resolution SLA:</span>
                        <span className="font-bold text-emerald-400">{report.aiAssessment.prescribedSLA || '48-72 Hours Standard'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Category Key:</span>
                        <span className="text-slate-300 capitalize">{report.aiAssessment.suggestedCategory}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommended Next Operational Action */}
                <div className="p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl">
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block mb-1">
                    Recommended Operational Action:
                  </span>
                  <p className="text-xs text-indigo-100 font-medium">
                    {report.aiAssessment.recommendedAction}
                  </p>
                </div>

                {/* Grounded AI Analysis from Gemini / RAG */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span>Grounded Civic Analysis</span>
                  </span>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                    {report.aiAssessment.groundedAnalysis}
                  </div>
                </div>

                {/* Retrieved SOP Supporting Citations */}
                {report.aiAssessment.retrievedSupportingInfo && report.aiAssessment.retrievedSupportingInfo.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                      <span>Retrieved Verified SOP Documents ({report.aiAssessment.retrievedSupportingInfo.length})</span>
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {report.aiAssessment.retrievedSupportingInfo.map((info, idx) => (
                        <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-indigo-400 font-bold">
                            <span className="truncate max-w-[200px]">{info.documentName}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                              Score: {Math.round((info.relevanceScore || 0) * 100)}%
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Section: <span className="text-slate-200">{info.section}</span>
                          </div>
                          {info.textSnippet && (
                            <p className="text-[11px] text-slate-500 italic line-clamp-2">
                              "{info.textSnippet}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800 text-center space-y-3">
                <BrainCircuit className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  This report has not yet been processed through the Unified AI Decision & Validation Pipeline.
                </p>
                <button
                  onClick={handleRunAiValidation}
                  disabled={validatingAI}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
                >
                  {validatingAI ? 'Running Pipeline...' : 'Run Unified AI Pipeline Now'}
                </button>
              </div>
            )}
          </div>

          {/* Timeline & Progress Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <h3 className="font-bold text-white text-base">Resolution Audit Timeline</h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {timeline.map((update, idx) => (
                <div key={update._id || idx} className="relative">
                  <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" />
                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-emerald-400">{update.status}</span>
                      <span className="text-slate-500">{new Date(update.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-300">{update.comment}</p>
                    {update.updateImageUrl && (
                      <img
                        src={update.updateImageUrl}
                        alt="Progress proof"
                        className="mt-3 w-32 h-24 object-cover rounded-lg border border-slate-700"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Progress Update Form */}
            {!isResolved && (
              <form onSubmit={handleAddProgress} className="pt-4 border-t border-slate-800 space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Post Progress Update (Visible to Citizen)
                </h4>
                <textarea
                  value={progressComment}
                  onChange={(e) => setProgressComment(e.target.value)}
                  placeholder="E.g. Field inspection concluded. Asphalt paving scheduled for 10:00 AM tomorrow..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
                <div className="flex items-center justify-between">
                  <label className="cursor-pointer text-xs text-slate-400 hover:text-white flex items-center space-x-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{progressFile ? progressFile.name : 'Attach field photo (optional)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProgressFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={progressLoading || !progressComment.trim()}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold transition"
                  >
                    {progressLoading ? 'Posting...' : 'Post Update'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right 1 Col: Location, Recurrence & Status Manager */}
        <div className="space-y-6">
          {/* Status Progression State Machine (PRD Section 46 & 78) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-base">Status Management</h3>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-500">Current Status:</span>{' '}
              <span className="font-bold text-emerald-400">{report.status}</span>
            </div>

            {!isResolved ? (
              <form onSubmit={handleStatusChange} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Transition Next State:
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="SUBMITTED">SUBMITTED</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Transition Note (Optional):
                  </label>
                  <input
                    type="text"
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    placeholder="E.g. Verified by Ward Junior Engineer..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={statusLoading || selectedStatus === report.status}
                  className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 py-2.5 rounded-xl text-xs font-semibold transition"
                >
                  {statusLoading ? 'Updating...' : 'Confirm Status Change'}
                </button>
              </form>
            ) : (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400">
                Ticket is closed in {report.status} state.
                {report.resolutionNotes && <p className="mt-1 text-slate-300">Notes: {report.resolutionNotes}</p>}
              </div>
            )}
          </div>

          {/* Location & Geospatial Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Location Coordinates</span>
            </h3>

            <p className="text-xs text-slate-300 font-medium">{report.address}</p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-400">
              Latitude: {report.location.coordinates[1]} <br />
              Longitude: {report.location.coordinates[0]}
            </div>
          </div>

          {/* Recurrence & Priority Score Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-base flex items-center justify-between">
              <span>Recurrence Analysis</span>
              {report.isRecurring ? (
                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Cluster Detected
                </span>
              ) : (
                <span className="text-slate-500 text-xs font-normal">Isolated</span>
              )}
            </h3>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Nearby Reports (500m radius):</span>
                <span className="font-bold text-white">{report.nearbyReportCount}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Deterministic Priority Score:</span>
                <span className="font-bold text-emerald-400">{report.priorityScore} / 100</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Priority Tier:</span>
                <span className="font-bold text-white">{report.priorityLevel}</span>
              </div>
            </div>

            {nearby.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-2">
                  Similar Nearby Reports:
                </span>
                <div className="space-y-1.5">
                  {nearby.map((n) => (
                    <Link
                      key={n._id}
                      to={`/issues/${n.reportId}`}
                      className="block p-2 bg-slate-950 hover:bg-slate-800 rounded-xl border border-slate-800 text-xs text-slate-300 transition"
                    >
                      <div className="flex justify-between">
                        <span className="font-bold text-emerald-400">#{n.reportId}</span>
                        <span className="text-[10px] text-slate-500">{n.status}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resolution Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Mark Complaint as Resolved</span>
            </h3>
            <p className="text-xs text-slate-400">
              Provide resolution findings and proof photo. The citizen will be notified immediately.
            </p>

            <form onSubmit={handleResolveIssue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Resolution Notes (Required):
                </label>
                <textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="E.g. Asphalt patch applied, compacted, and leveled. Road reopened for regular traffic."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Resolution Proof Photo (Optional):
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setResolveFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveLoading || !resolveNotes.trim()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-emerald-600/30"
                >
                  {resolveLoading ? 'Submitting Resolution...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RAG Civic Assistant Modal linked contextually to this complaint */}
      <CivicAssistantModal
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        reportId={report.reportId}
        contextTitle={`${report.categoryName.toUpperCase()} #${report.reportId} (${report.status})`}
      />
    </div>
  );
};
