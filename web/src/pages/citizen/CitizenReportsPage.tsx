import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  User as UserIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Eye,
  Plus,
  MapPin,
  ChevronRight,
  Shield,
  Layers,
  Building2,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { citizenApi } from '../../services/api';
import { CitizenReportDetailsModal } from '../../components/citizen/CitizenReportDetailsModal';
import { CivicAssistantModal } from '../../components/CivicAssistantModal';

export const CitizenReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const outletCtx = useOutletContext<{
    onOpenAssistant?: (reportId?: string) => void;
  }>();

  const [reports, setReports] = useState<any[]>([]);
  const [nearbyIssues, setNearbyIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [localAssistantOpen, setLocalAssistantOpen] = useState(false);
  const [assistantReportId, setAssistantReportId] = useState<string | undefined>();

  const handleOpenAssistant = (reportId?: string) => {
    setSelectedReportId(null);
    if (outletCtx?.onOpenAssistant) {
      outletCtx.onOpenAssistant(reportId);
    } else {
      setAssistantReportId(reportId);
      setLocalAssistantOpen(true);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user's reports
      const myRes = await citizenApi.getMyReports();
      setReports(myRes.data?.reports || []);

      // 2. Fetch nearby community issues for the "Nearby Issues in Your Area" section
      try {
        const nearbyRes = await citizenApi.getNearbyReports(79.0882, 21.1458, 5000);
        setNearbyIssues(nearbyRes.data?.reports || []);
      } catch {
        // Fallback sample nearby issues if server returns empty
        setNearbyIssues([
          {
            _id: 'n1',
            title: 'Water Main Pressure Drop',
            categoryName: 'Water Supply & Sewerage Board',
            address: 'Ward 08 • Shankar Nagar Square',
            latitude: 21.1324,
            longitude: 79.0652,
            priority: 'Medium',
            status: 'IN_PROGRESS',
          },
          {
            _id: 'n2',
            title: 'Commercial Dumpster Overflow',
            categoryName: 'Solid Waste Management',
            address: 'Ward 12 • Sitabuldi Market',
            latitude: 21.1480,
            longitude: 79.0825,
            priority: 'High',
            status: 'ASSIGNED',
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  // Metrics Calculation
  const totalReportsCount = reports.length;
  const openReportsCount = reports.filter(
    (r) => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW' || r.status === 'PENDING'
  ).length;
  const inProgressCount = reports.filter(
    (r) => r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS'
  ).length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length;

  // Filter Logic
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.reportId?.toLowerCase().includes(search.toLowerCase()) ||
      r.categoryName?.toLowerCase().includes(search.toLowerCase()) ||
      r.address?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'OPEN') {
      return r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW' || r.status === 'PENDING';
    }
    if (statusFilter === 'IN_PROGRESS') {
      return r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS';
    }
    if (statusFilter === 'RESOLVED') {
      return r.status === 'RESOLVED';
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          My Reports Status
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Track the progress of your submitted community issues.
        </p>
      </div>

      {/* 2. Top Metric Cards Architecture (Matching Image 2) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Reports */}
        <div className="bg-white dark:bg-[#131b2e] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
              Total Reports
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 block">
              {totalReportsCount}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
            <UserIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Open */}
        <div className="bg-white dark:bg-[#131b2e] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
              Open
            </span>
            <span className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 mt-1 block">
              {openReportsCount}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white dark:bg-[#131b2e] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
              In Progress
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-500 dark:text-amber-400 mt-1 block">
              {inProgressCount}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-white dark:bg-[#131b2e] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
              Resolved
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              {resolvedCount}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Search and Status Filter Bar (Matching Image 2) */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-[#131b2e] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, category, or location..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 ml-1" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* 4. Reports List / Empty State */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 font-mono text-sm">
          Loading your reporting history...
        </div>
      ) : filteredReports.length === 0 ? (
        /* Empty State (Matching Image 2) */
        <div className="bg-white dark:bg-[#131b2e] rounded-3xl p-12 sm:p-16 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
            <Eye className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              No reports yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Start making a difference by reporting community issues.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/citizen/report"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Report Your First Issue</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Active Reports Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report) => (
            <div
              key={report._id}
              onClick={() => setSelectedReportId(report.reportId)}
              className="p-5 rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 cursor-pointer shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 group"
            >
              <div className="flex items-start gap-4">
                <img
                  src={
                    report.imageUrl ||
                    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'
                  }
                  alt={report.title}
                  className="w-20 h-20 rounded-2xl object-cover bg-slate-900 shrink-0 border border-slate-100 dark:border-slate-800"
                />
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                      #{report.reportId}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase border ${
                        report.status === 'RESOLVED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : report.status === 'IN_PROGRESS' || report.status === 'ASSIGNED'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                    {report.title}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{report.address}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                <span className="text-slate-400 text-[11px] font-mono">
                  {new Date(report.createdAt).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                  <span>Inspect Progress</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Nearby Issues in Your Area (Matching Image 2) */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Nearby Issues in Your Area
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Ward 12 Radius (5km)
          </span>
        </div>

        <div className="space-y-3">
          {nearbyIssues.slice(0, 4).map((issue) => (
            <div
              key={issue._id}
              className="bg-white dark:bg-[#131b2e] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {issue.title}
                </h4>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <span>
                    {issue.latitude?.toFixed ? issue.latitude.toFixed(5) : issue.latitude},{' '}
                    {issue.longitude?.toFixed ? issue.longitude.toFixed(5) : issue.longitude}
                  </span>
                  <span>•</span>
                  <span>{issue.categoryName || 'Civic Infrastructure'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {issue.priority && (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {issue.priority}
                  </span>
                )}
                <span
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border ${
                    issue.status === 'RESOLVED'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                  }`}
                >
                  {issue.status?.replace('_', ' ') || 'IN PROGRESS'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ticket Details Modal */}
      <CitizenReportDetailsModal
        reportId={selectedReportId}
        onClose={() => setSelectedReportId(null)}
        onOpenAssistant={handleOpenAssistant}
      />

      {/* Standalone Fallback Assistant Modal if not provided by layout */}
      {!outletCtx?.onOpenAssistant && (
        <CivicAssistantModal
          isOpen={localAssistantOpen}
          onClose={() => setLocalAssistantOpen(false)}
          reportId={assistantReportId}
        />
      )}
    </div>
  );
};
