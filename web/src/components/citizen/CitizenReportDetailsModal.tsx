import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Flame,
  Building2,
  FileCheck,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Calendar,
  Cpu
} from 'lucide-react';
import { citizenApi } from '../../services/api';

interface CitizenReportDetailsModalProps {
  reportId: string | null;
  onClose: () => void;
  onOpenAssistant: (reportId: string) => void;
}

export const CitizenReportDetailsModal: React.FC<CitizenReportDetailsModalProps> = ({
  reportId,
  onClose,
  onOpenAssistant
}) => {
  const [report, setReport] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reportId) return;
    setLoading(true);

    citizenApi
      .getReportById(reportId)
      .then((res) => {
        setReport(res.data.report);
      })
      .catch((err) => console.error('Failed to load report:', err))
      .finally(() => setLoading(false));

    citizenApi
      .getReportTimeline(reportId)
      .then((res) => {
        setTimeline(res.data.timeline || []);
      })
      .catch(() => {});
  }, [reportId]);

  if (!reportId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#131b2e] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0d1322]">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              #{report?.reportId || reportId}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {report?.status || 'SUBMITTED'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-700 dark:text-slate-300">
          {loading ? (
            <div className="py-16 text-center text-slate-400">Loading complaint details...</div>
          ) : !report ? (
            <div className="py-16 text-center text-slate-400">Report details not found.</div>
          ) : (
            <>
              {/* Evidence & Defect Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="rounded-2xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center">
                  <img
                    src={report.imageUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'}
                    alt={report.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {report.title}
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                      report.status === 'REJECTED' || report.aiCategory === 'irrelevant'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {report.status === 'REJECTED' || report.aiCategory === 'irrelevant'
                        ? 'INVALID / REJECTED'
                        : report.categoryName?.replace('_', ' ').toUpperCase()}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        report.status === 'REJECTED' || report.aiCategory === 'irrelevant'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : report.priorityLevel === 'HIGH'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : report.priorityLevel === 'MEDIUM'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {report.status === 'REJECTED' || report.aiCategory === 'irrelevant'
                        ? 'REJECTED (0/100)'
                        : `${report.priorityLevel} PRIORITY (${report.priorityScore}/100)`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {report.description || 'No additional description provided.'}
                  </p>

                  <div className="pt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{report.address}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reported on {new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI & Recurrence Verification Details */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">AI Vision Classifier:</span>
                  {report.status === 'REJECTED' || report.aiCategory === 'irrelevant' || report.aiDetectedCategory === 'irrelevant' || report.aiAssessment?.validationStatus === 'REJECTED' ? (
                    <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-rose-500" />
                      Rejected / Non-Civic (0% Accuracy)
                    </span>
                  ) : (
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                      {report.aiCategory || report.categoryName} ({Math.round((report.aiConfidence ?? 0.94) * 100)}%)
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Recurrence Cluster:</span>
                  {report.isRecurring ? (
                    <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" />
                      Active ({report.nearbyReportCount || 2} reports in 500m)
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Isolated Incident
                    </span>
                  )}
                </div>
              </div>

              {/* Resolution Proof (if resolved) */}
              {report.status === 'RESOLVED' && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Resolution Inspected &amp; Completed</span>
                  </div>
                  {report.resolutionNotes && (
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      Notes: {report.resolutionNotes}
                    </p>
                  )}
                  {report.resolutionProofUrl && (
                    <div className="mt-2">
                      <span className="text-[11px] font-semibold text-slate-500 block mb-1">Work Proof Photo:</span>
                      <img
                        src={report.resolutionProofUrl}
                        alt="Resolution proof"
                        className="max-h-36 rounded-xl object-cover border border-emerald-500/30"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Lifecycle Progression Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                  Municipal Progression Timeline
                </h4>

                <div className="space-y-3 border-l-2 border-slate-200 dark:border-slate-700 ml-2 pl-4 py-1">
                  {timeline.length > 0 ? (
                    timeline.map((item, idx) => (
                      <div key={idx} className="relative space-y-1">
                        <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-white dark:ring-[#131b2e]" />
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {item.status || 'Status Update'}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {item.comment && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {item.comment}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="relative space-y-1">
                      <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-white dark:ring-[#131b2e]" />
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Report Registered ({report.status})
                      </div>
                      <p className="text-xs text-slate-500">
                        Complaint lodged and assigned to competent authority.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ask About This Issue CTA (RAG Integration PRD 18) */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => onOpenAssistant(report?.reportId || reportId || '')}
                  className="w-full py-3 px-4 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Ask Civic Assistant About This Issue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
