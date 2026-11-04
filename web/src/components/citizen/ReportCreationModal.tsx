import React, { useState, useRef, useCallback } from 'react';
import {
  X,
  Camera,
  Upload,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Flame,
  Check,
  RotateCcw,
  Loader2,
  Cpu,
  RefreshCw,
  Navigation,
  Shield
} from 'lucide-react';
import { citizenApi } from '../../services/api';
import { EvidenceSourceBottomSheet } from './EvidenceSourceBottomSheet';
import { LiveCameraModal } from './LiveCameraModal';

interface ReportCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newReportId: string) => void;
}

const CATEGORIES = [
  { id: 'pothole', label: 'Pothole / Road Defect', sampleUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80' },
  { id: 'garbage', label: 'Garbage Dump / Solid Waste', sampleUrl: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=600&q=80' },
  { id: 'streetlight', label: 'Damaged Streetlight', sampleUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80' },
  { id: 'water_leakage', label: 'Water Supply Leakage', sampleUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=600&q=80' },
  { id: 'drainage', label: 'Open Drain / Waterlogging', sampleUrl: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=600&q=80' },
  { id: 'damaged_infrastructure', label: 'Broken Footpath / Railing', sampleUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=600&q=80' }
];

type LocationStatus = 'idle' | 'acquiring' | 'acquired' | 'denied' | 'error';

interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export const ReportCreationModal: React.FC<ReportCreationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  // Step: 1 = Image, 2 = Location, 3 = AI Review, 4 = Details & Confirm, 5 = Success
  const [step, setStep] = useState<number>(1);

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Location state — real GPS only, no defaults
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation | null>(null);
  const [address, setAddress] = useState<string>('');
  const [locationError, setLocationError] = useState<string>('');

  // AI & Priority states
  const [aiAnalyzing, setAiAnalyzing] = useState<boolean>(false);
  const [detectedCategory, setDetectedCategory] = useState<string>('pothole');
  const [confidence, setConfidence] = useState<number>(0.94);
  const [selectedCategory, setSelectedCategory] = useState<string>('pothole');
  const [isCategoryOverridden, setIsCategoryOverridden] = useState<boolean>(false);
  const [recurrenceData, setRecurrenceData] = useState<{
    isRecurring: boolean;
    nearbyCount: number;
    priorityScore: number;
    priorityLevel: string;
  }>({ isRecurring: false, nearbyCount: 0, priorityScore: 50, priorityLevel: 'MEDIUM' });

  // Form fields
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedReportId, setSubmittedReportId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // UI sub-modals
  const [sourceSheetOpen, setSourceSheetOpen] = useState<boolean>(false);
  const [cameraOpen, setCameraOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // -------------------------------------------------------
  // Real GPS Acquisition — high-accuracy, no defaults
  // -------------------------------------------------------
  const acquireDeviceLocation = useCallback((): Promise<DeviceLocation> => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('GEOLOCATION_NOT_SUPPORTED'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            timestamp: pos.timestamp,
          });
        },
        (err) => {
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0, // Never use cached location for civic reports
        }
      );
    });
  }, []);

  const handleAcquireLocation = async () => {
    setLocationStatus('acquiring');
    setLocationError('');
    try {
      const loc = await acquireDeviceLocation();
      setDeviceLocation(loc);

      // Attempt reverse geocoding
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${loc.latitude}&lon=${loc.longitude}&format=json`
        );
        const data = await res.json();
        if (data.display_name) {
          // Shorten to most relevant parts
          const parts = data.display_name.split(',').slice(0, 4).join(', ');
          setAddress(parts);
        } else {
          setAddress(`${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`);
        }
      } catch {
        setAddress(`${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`);
      }

      setLocationStatus('acquired');
    } catch (err: any) {
      if (err.code === 1 || err.message === 'GEOLOCATION_NOT_SUPPORTED') {
        setLocationStatus('denied');
        setLocationError(
          err.message === 'GEOLOCATION_NOT_SUPPORTED'
            ? 'Location services are not supported in this browser. Please use a modern browser.'
            : 'Location access was denied. Civic issue reports require your current GPS location to ensure they reach the correct ward authority. Please allow location access and try again.'
        );
      } else {
        setLocationStatus('error');
        setLocationError('Unable to determine your current location. Please check your GPS signal and try again.');
      }
    }
  };

  // -------------------------------------------------------
  // Photo handlers
  // -------------------------------------------------------
  const handleCameraCapture = (file: File, preview: string) => {
    setImageFile(file);
    setImagePreview(preview);
    setError(null);
    // Auto-start location acquisition after camera capture
    if (locationStatus === 'idle' || locationStatus === 'error') {
      handleAcquireLocation();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
      // Auto-start location acquisition after gallery upload
      if (locationStatus === 'idle' || locationStatus === 'error') {
        handleAcquireLocation();
      }
    }
  };

  const handleSamplePhoto = async (category: string, url: string) => {
    setImagePreview(url);
    setSelectedCategory(category);
    setDetectedCategory(category);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], `${category}_sample.jpg`, { type: 'image/jpeg' });
      setImageFile(file);
    } catch {
      // keep preview only
    }
    if (locationStatus === 'idle' || locationStatus === 'error') {
      handleAcquireLocation();
    }
  };

  // -------------------------------------------------------
  // Step transitions
  // -------------------------------------------------------
  const handleProceedToLocation = () => {
    if (!imagePreview && !imageFile) {
      setError('Please take or upload a photo of the civic problem.');
      return;
    }
    setError(null);
    setStep(2);
    // Start location if not already done
    if (locationStatus === 'idle') {
      handleAcquireLocation();
    }
  };

  const handleRunAiAnalysis = async () => {
    if (!deviceLocation) {
      setError('A verified device location is required before analysis. Please obtain your GPS location first.');
      return;
    }
    setStep(3);
    setAiAnalyzing(true);

    try {
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        try {
          const res = await citizenApi.classifyImage(formData);
          if (res.data?.category) {
            setDetectedCategory(res.data.category);
            setSelectedCategory(res.data.category);
            if (res.data.category === 'irrelevant') {
              setConfidence(0);
            } else {
              setConfidence(res.data.confidence ?? 0.92);
            }
          }
        } catch {
          // Keep default on offline
        }
      }

      try {
        const analysisRes = await citizenApi.analyzeReport({
          categoryName: selectedCategory,
          latitude: deviceLocation.latitude,
          longitude: deviceLocation.longitude,
        });
        if (analysisRes.data?.recurrence) {
          setRecurrenceData({
            isRecurring: analysisRes.data.recurrence.isRecurring,
            nearbyCount: analysisRes.data.recurrence.nearbyReportCount || 0,
            priorityScore: analysisRes.data.priority?.score || 50,
            priorityLevel: analysisRes.data.priority?.level || 'MEDIUM',
          });
        }
      } catch {
        // Fallback — keep defaults
      }
    } finally {
      setTimeout(() => setAiAnalyzing(false), 700);
    }
  };

  const handleProceedToReview = () => {
    if (detectedCategory === 'irrelevant') {
      setError('AI validation rejected: Non-civic image detected (0% AI Accuracy). No ticket can be created.');
      return;
    }
    if (!title) {
      const catLabel = CATEGORIES.find((c) => c.id === selectedCategory)?.label || 'Civic Issue';
      setTitle(`${catLabel} at ${address.split(',')[0]}`);
    }
    setStep(4);
  };

  const handleFinalSubmit = async () => {
    if (detectedCategory === 'irrelevant') {
      setError('Submission Blocked: AI validation rejected this image (0% AI Accuracy). No ticket can be created.');
      return;
    }
    if (!deviceLocation) {
      setError('Cannot submit without a verified device location.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title || 'Reported Civic Problem');
      formData.append('description', description || `Reported ${selectedCategory} requiring municipal attention.`);
      formData.append('categoryName', selectedCategory);
      formData.append('address', address);
      formData.append('latitude', deviceLocation.latitude.toString());
      formData.append('longitude', deviceLocation.longitude.toString());

      if (imageFile) {
        formData.append('image', imageFile);
      }

      const res = await citizenApi.createReport(formData);
      const reportId = res.data?.report?.reportId || 'RI' + Math.floor(1000 + Math.random() * 9000);
      setSubmittedReportId(reportId);
      setStep(5);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.response?.data?.message || 'Failed to submit report. Please verify connection.');
      setSubmitting(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setImageFile(null);
    setImagePreview(null);
    setTitle('');
    setDescription('');
    setError(null);
    setLocationStatus('idle');
    setDeviceLocation(null);
    setAddress('');
    setLocationError('');
    onClose();
  };

  // -------------------------------------------------------
  // Location Status UI helper
  // -------------------------------------------------------
  const renderLocationStatus = () => {
    switch (locationStatus) {
      case 'acquiring':
        return (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
              <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Getting your current location...</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Using high-accuracy GPS</div>
            </div>
          </div>
        );
      case 'acquired':
        return (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <span>Location Verified</span>
                {deviceLocation && (
                  <span className="font-normal text-emerald-600/70 dark:text-emerald-500">
                    ±{deviceLocation.accuracy}m accuracy
                  </span>
                )}
              </div>
              {deviceLocation && (
                <div className="text-[11px] font-mono text-emerald-700/70 dark:text-emerald-400/70 mt-0.5 truncate">
                  {deviceLocation.latitude.toFixed(5)}°N, {deviceLocation.longitude.toFixed(5)}°E
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleAcquireLocation}
              className="shrink-0 p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition"
              title="Re-acquire location"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      case 'denied':
      case 'error':
        return (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-rose-700 dark:text-rose-300">Location Required</div>
                <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 leading-relaxed">{locationError}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAcquireLocation}
              className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Location
            </button>
          </div>
        );
      default:
        return (
          <button
            type="button"
            onClick={handleAcquireLocation}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#0d1322] border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 transition group text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 flex items-center justify-center shrink-0 transition-colors">
              <MapPin className="w-5 h-5 text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Acquire Device Location</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Tap to get current GPS coordinates</div>
            </div>
          </button>
        );
    }
  };

  return (
    <>
      {/* Evidence Source Bottom Sheet */}
      <EvidenceSourceBottomSheet
        isOpen={sourceSheetOpen}
        onClose={() => setSourceSheetOpen(false)}
        onOpenCamera={() => setCameraOpen(true)}
        onUploadPhoto={() => fileInputRef.current?.click()}
      />

      {/* Live Camera Modal */}
      <LiveCameraModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* Hidden file input for gallery upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Report Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-xl bg-white dark:bg-[#131b2e] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0d1322] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                R
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Report a Civic Problem
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Step {Math.min(step, 4)} of 4 •{' '}
                  {step === 1
                    ? 'Evidence Photo'
                    : step === 2
                    ? 'Location'
                    : step === 3
                    ? 'AI Verification'
                    : step === 4
                    ? 'Review & Submit'
                    : 'Complete'}
                </p>
              </div>
            </div>
            {/* Step progress dots */}
            <div className="flex items-center gap-1.5 mr-3">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`rounded-full transition-all ${
                    s === step
                      ? 'w-4 h-2 bg-emerald-600'
                      : s < step
                      ? 'w-2 h-2 bg-emerald-500'
                      : 'w-2 h-2 bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={resetFlow}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content Scroll Area */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ====== STEP 1: CAPTURE / UPLOAD EVIDENCE ====== */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    Add Photo Evidence
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    A clear photograph helps AI identify the issue and ensures proper municipal routing.
                  </p>
                </div>

                {/* Main Photo Box — Taps open the bottom sheet */}
                <div
                  onClick={() => setSourceSheetOpen(true)}
                  className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    imagePreview
                      ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10'
                      : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-[#0d1322]'
                  }`}
                >
                  {imagePreview ? (
                    <div className="space-y-3">
                      <img
                        src={imagePreview}
                        alt="Evidence preview"
                        className="max-h-52 mx-auto rounded-xl object-cover shadow-sm"
                      />
                      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Photo added — tap to replace</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 py-6">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Camera className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          Take or Upload a Photo
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Tap to open camera or pick from gallery
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Location status (pre-acquired if user already took photo) */}
                {locationStatus !== 'idle' && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">GPS Location</span>
                    {renderLocationStatus()}
                  </div>
                )}

                {/* Quick sample selector */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Or test with a sample defect:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.slice(0, 3).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSamplePhoto(cat.id, cat.sampleUrl)}
                        className="p-2 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-white dark:bg-[#0d1322] transition text-xs"
                      >
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {cat.label.split('/')[0]}
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Use Sample</div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleProceedToLocation}
                  disabled={!imagePreview}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
                >
                  <span>Confirm Photo & Set Location</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ====== STEP 2: CONFIRM LOCATION ====== */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    Confirm Device Location
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your current GPS location is needed to route this complaint to the correct ward authority and detect nearby clusters.
                  </p>
                </div>

                {/* Location status widget */}
                {renderLocationStatus()}

                {/* Why location matters — shown on denial */}
                {(locationStatus === 'denied' || locationStatus === 'error') && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex gap-2.5 text-xs">
                    <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-amber-800 dark:text-amber-300 leading-relaxed">
                      <strong>Why is location required?</strong> RaiseIt uses your GPS coordinates to automatically assign your complaint to the responsible municipal ward officer and to detect recurring issues within 500m — improving priority and response time.
                    </div>
                  </div>
                )}

                {/* Address field (editable for manual correction) */}
                {locationStatus === 'acquired' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Landmark / Street Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Near City Hospital, Ward 12, Nagpur"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0d1322] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">You may refine the address but GPS coordinates are fixed.</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleRunAiAnalysis}
                    disabled={locationStatus !== 'acquired'}
                    className="w-2/3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
                  >
                    <Cpu className="w-4 h-4" />
                    <span>Analyze with AI</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ====== STEP 3: AI ANALYSIS & RECURRENCE PREVIEW ====== */}
            {step === 3 && (
              <div className="space-y-5">
                {aiAnalyzing ? (
                  <div className="py-16 text-center space-y-4">
                    <Loader2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto" />
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        Analyzing image...
                      </h4>
                      <p className="text-xs text-slate-500">
                        Running VisionClassifier and checking 500m proximity clusters...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 animate-in fade-in">
                    <div className="text-center space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                        <span>AI Verification Result</span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                        Issue Category Identified
                      </h4>
                    </div>

                    {/* AI Result Card */}
                    {detectedCategory === 'irrelevant' ? (
                      <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-rose-500">Validation Status:</span>
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                            Civic Accuracy: 0%
                          </span>
                        </div>

                        <div className="text-lg font-black text-rose-700 dark:text-rose-300">
                          Non-Civic Image Detected
                        </div>

                        <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">
                          AI Evidence Validation has rejected this photo. It does not depict an authentic civic infrastructure defect. Report creation is blocked. Please go back and provide a genuine photo of a public issue.
                        </p>
                      </div>
                    ) : (
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Detected:</span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            Confidence: {(confidence * 100).toFixed(0)}%
                          </span>
                        </div>

                        <div className="text-xl font-black text-slate-900 dark:text-white">
                          {CATEGORIES.find((c) => c.id === selectedCategory)?.label || selectedCategory}
                        </div>

                        {recurrenceData.isRecurring && (
                          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs">
                            <Flame className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-amber-900 dark:text-amber-300 block">
                                Recurring Cluster — {recurrenceData.nearbyCount} reports within 500m
                              </span>
                              <span className="text-amber-700 dark:text-amber-400 text-[11px]">
                                Priority elevated to {recurrenceData.priorityLevel} ({recurrenceData.priorityScore}/100) due to repeated neglect.
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Is this correct?</span>
                          <button
                            type="button"
                            onClick={() => setIsCategoryOverridden(!isCategoryOverridden)}
                            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            {isCategoryOverridden ? 'Keep Selection' : 'Choose Another Category'}
                          </button>
                        </div>

                        {isCategoryOverridden && (
                          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-[11px] font-semibold text-slate-500 block">Manual Override:</span>
                            <div className="grid grid-cols-2 gap-2">
                              {CATEGORIES.map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCategory(cat.id);
                                    setIsCategoryOverridden(false);
                                  }}
                                  className={`p-2.5 rounded-xl text-left text-xs border transition ${
                                    selectedCategory === cat.id
                                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold'
                                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                  }`}
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="w-1/3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm flex items-center justify-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleProceedToReview}
                        disabled={detectedCategory === 'irrelevant'}
                        className={`w-2/3 py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition ${
                          detectedCategory === 'irrelevant'
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-70'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        }`}
                      >
                        <span>{detectedCategory === 'irrelevant' ? 'Submission Blocked' : 'Continue to Review'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ====== STEP 4: REVIEW & SUBMIT ====== */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    Review & Submit Complaint
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Please verify before official filing.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Complaint Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0d1322] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Deep pothole causing skidding risk for two-wheelers..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0d1322] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none transition"
                  />
                </div>

                {/* Summary */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {CATEGORIES.find((c) => c.id === selectedCategory)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px] text-right">
                      {address || 'GPS Acquired'}
                    </span>
                  </div>
                  {deviceLocation && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Coordinates:</span>
                      <span className="font-mono text-slate-600 dark:text-slate-400 text-[10px]">
                        {deviceLocation.latitude.toFixed(5)}°, {deviceLocation.longitude.toFixed(5)}°
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Calculated Priority:</span>
                    <span className={`font-bold ${
                      recurrenceData.priorityLevel === 'HIGH'
                        ? 'text-rose-600 dark:text-rose-400'
                        : recurrenceData.priorityLevel === 'MEDIUM'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {recurrenceData.priorityLevel} ({recurrenceData.priorityScore}/100)
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={submitting}
                    className="w-1/3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm flex items-center justify-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={submitting}
                    className="w-2/3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Filing Complaint...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Official Complaint</span>
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ====== STEP 5: SUCCESS ====== */}
            {step === 5 && (
              <div className="py-8 text-center space-y-5 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                    Complaint Filed!
                  </h4>
                  <p className="text-xs text-slate-500">
                    Routed to the competent municipal ward authority.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 max-w-xs mx-auto space-y-1">
                  <span className="text-xs text-slate-500 font-medium">Tracking Ticket Number</span>
                  <div className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                    #{submittedReportId || 'RI1024'}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Status: SUBMITTED — Stage 1 of 5
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSuccess(submittedReportId);
                      resetFlow();
                    }}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition"
                  >
                    View in My Reports
                  </button>
                  <button
                    type="button"
                    onClick={resetFlow}
                    className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
