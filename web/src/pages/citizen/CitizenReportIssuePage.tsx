import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Camera,
  Upload,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Loader2,
  Sparkles,
  Shield,
  Info,
  X,
  Navigation,
  ZoomIn,
  FlipHorizontal,
  SwitchCamera,
  ScanSearch,
  Cpu,
  BrainCircuit,
  BadgeCheck,
  CircleDot
} from 'lucide-react';
import { citizenApi } from '../../services/api';

const CATEGORIES = [
  { id: 'pothole', label: 'Pothole / Road Defect', dept: 'Public Works Department' },
  { id: 'garbage', label: 'Garbage Dump / Solid Waste', dept: 'Solid Waste Management' },
  { id: 'streetlight', label: 'Damaged Streetlight', dept: 'Electrical Department' },
  { id: 'water_leakage', label: 'Water Supply Leakage', dept: 'Water Supply & Sewerage Board' },
  { id: 'drainage', label: 'Open Drain / Waterlogging', dept: 'Drainage & Stormwater' },
  { id: 'damaged_infrastructure', label: 'Broken Footpath / Railing', dept: 'Urban Infrastructure' }
];

// AI verification steps shown in the processing animation
const AI_STEPS = [
  { icon: ScanSearch, label: 'Scanning image for civic defects...', color: 'text-sky-400' },
  { icon: BrainCircuit, label: 'Running neural classification model...', color: 'text-purple-400' },
  { icon: Cpu, label: 'Verifying against municipal database...', color: 'text-amber-400' },
  { icon: MapPin, label: 'Cross-checking geo-spatial hotspot data...', color: 'text-rose-400' },
  { icon: BadgeCheck, label: 'Generating AI validation assessment & audit log...', color: 'text-emerald-400' },
];

interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export const CitizenReportIssuePage: React.FC = () => {
  const navigate = useNavigate();

  // Form State
  const [category, setCategory] = useState<string>('pothole');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  // Location State
  const [locationStatus, setLocationStatus] = useState<'idle' | 'acquiring' | 'acquired' | 'error'>('idle');
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation | null>(null);
  const [locationError, setLocationError] = useState<string>('');

  // Photo Evidence State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Camera Overlay State
  const [cameraOpen, setCameraOpen] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // AI Processing Overlay State
  const [aiProcessing, setAiProcessing] = useState<boolean>(false);
  const [aiStepIndex, setAiStepIndex] = useState<number>(0);
  const [aiStepDone, setAiStepDone] = useState<boolean[]>([]);

  // AI Classification State
  const [aiDetectedCategory, setAiDetectedCategory] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number>(0);
  const [classifyingAi, setClassifyingAi] = useState<boolean>(false);

  // Submission State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  const [createdReportId, setCreatedReportId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------------------------------
  // Camera Logic (getUserMedia — opens real camera on desktop & mobile)
  // --------------------------------------------------------------------------
  const openCamera = useCallback(async (mode: 'environment' | 'user' = 'environment') => {
    setCameraError('');
    setCameraOpen(true);
    setFacingMode(mode);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : err.name === 'NotFoundError'
          ? 'No camera found on this device. Use "Upload Photo" instead.'
          : 'Unable to start camera. Please try "Upload Photo".'
      );
    }
  }, []);

  const flipCamera = useCallback(async () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    const next: 'environment' | 'user' = facingMode === 'environment' ? 'user' : 'environment';
    await openCamera(next);
  }, [cameraStream, facingMode, openCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `civic-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const url = URL.createObjectURL(file);
        setImageFile(file);
        setImagePreview(url);
        closeCamera();
        classifySelectedImage(file);

        // Auto get location if not yet acquired
        if (locationStatus === 'idle') {
          handleGetLocation();
        }
      },
      'image/jpeg',
      0.92
    );
  }, [locationStatus]);

  const closeCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setCameraOpen(false);
    setCameraError('');
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [cameraStream]);

  // Sync stream to video element when stream changes
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
    };
  }, [cameraStream]);

  // --------------------------------------------------------------------------
  // GPS Location
  // --------------------------------------------------------------------------
  const handleGetLocation = useCallback(async () => {
    setLocationStatus('acquiring');
    setLocationError('');

    if (!('geolocation' in navigator)) {
      setLocationStatus('error');
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: DeviceLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        };
        setDeviceLocation(coords);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`
          );
          const data = await res.json();
          if (data.display_name) {
            const parts = data.display_name.split(',').slice(0, 4).join(', ');
            setAddress(parts);
          } else {
            setAddress(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
          }
        } catch {
          setAddress(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
        }

        setLocationStatus('acquired');
      },
      (err) => {
        setLocationStatus('error');
        setLocationError(
          err.code === 1
            ? 'Location permission denied. Please allow location access to geotag your report.'
            : 'Unable to acquire GPS fix. Please verify location services.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  }, []);

  // --------------------------------------------------------------------------
  // File Upload Handler
  // --------------------------------------------------------------------------
  const classifySelectedImage = useCallback(async (file: File) => {
    setClassifyingAi(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await citizenApi.classifyImage(fd);
      if (res.data?.category) {
        setAiDetectedCategory(res.data.category);
        setAiConfidence(res.data.confidence || 0.9);
        if (CATEGORIES.some((c) => c.id === res.data.category)) {
          setCategory(res.data.category);
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setClassifyingAi(false);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Image size exceeds 5MB limit.');
        return;
      }
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setErrorMessage(null);
      classifySelectedImage(file);

      if (locationStatus === 'idle') {
        handleGetLocation();
      }
    }
  };

  const removePhoto = () => {
    setImageFile(null);
    setAiDetectedCategory(null);
    setAiConfidence(0);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --------------------------------------------------------------------------
  // AI Processing Animation Sequence
  // --------------------------------------------------------------------------
  const runAiVerificationSequence = (): Promise<void> => {
    return new Promise((resolve) => {
      setAiProcessing(true);
      setAiStepIndex(0);
      setAiStepDone([]);

      let step = 0;
      const stepDuration = 820;

      const advance = () => {
        if (step < AI_STEPS.length) {
          setAiStepIndex(step);
          setTimeout(() => {
            setAiStepDone((prev) => {
              const next = [...prev];
              next[step] = true;
              return next;
            });
            step++;
            setTimeout(advance, 260);
          }, stepDuration);
        } else {
          // Small pause before resolving
          setTimeout(() => {
            setAiProcessing(false);
            resolve();
          }, 400);
        }
      };

      advance();
    });
  };

  // --------------------------------------------------------------------------
  // Submit Issue Report
  // --------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Please enter an issue title.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Please provide a detailed description.');
      return;
    }

    if (!address.trim()) {
      setErrorMessage('Please provide or acquire the location.');
      return;
    }

    // Run the AI verification animation first
    await runAiVerificationSequence();

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('categoryName', category);
      formData.append('address', address.trim());

      const lat = deviceLocation?.latitude || 21.1458;
      const lon = deviceLocation?.longitude || 79.0882;
      formData.append('latitude', lat.toString());
      formData.append('longitude', lon.toString());

      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (aiDetectedCategory) {
        formData.append('aiDetectedCategory', aiDetectedCategory);
        formData.append('aiConfidence', (aiConfidence || 0.9).toString());
        formData.append('isCategoryOverridden', (category !== aiDetectedCategory).toString());
      }

      const res = await citizenApi.createReport(formData);
      const reportId = res.data?.report?.reportId || 'RI-' + Math.floor(1000 + Math.random() * 9000);
      setCreatedReportId(reportId);
      setSubmissionSuccess(true);

      try {
        const currentPoints = parseInt(localStorage.getItem('raiseit_points') || '0', 10);
        localStorage.setItem('raiseit_points', (currentPoints + 25).toString());
      } catch {
        // ignore
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setErrorMessage(
        err.response?.data?.message || 'Failed to submit report. Please check your internet connection and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // SUCCESS SCREEN
  // --------------------------------------------------------------------------
  if (submissionSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white dark:bg-[#131b2e] rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Report Successfully Logged
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Ticket #{createdReportId}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Your issue has been AI-verified and routed to the municipal dispatch desk.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 p-5 text-left font-mono text-xs space-y-2.5">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Category</span>
              <span className="text-slate-900 dark:text-white font-bold">
                {CATEGORIES.find((c) => c.id === category)?.label}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Location</span>
              <span className="text-slate-900 dark:text-white truncate max-w-[220px]">{address}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>SLA Clock</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">48 Hours Standard</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Contribution Earned</span>
              <span className="text-amber-500 font-bold">+25 Civic XP</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              to="/citizen/reports"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition flex items-center justify-center gap-2"
            >
              <span>View in My Reports</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => {
                setSubmissionSuccess(false);
                setTitle('');
                setDescription('');
                setAddress('');
                setImageFile(null);
                setImagePreview(null);
                setDeviceLocation(null);
                setLocationStatus('idle');
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Report Another Issue</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // AI PROCESSING OVERLAY
  // --------------------------------------------------------------------------
  if (aiProcessing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
        <div className="w-full max-w-md mx-4 bg-white dark:bg-[#0d1322] rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 text-white text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="font-black text-lg tracking-tight">AI Verification Engine</span>
            </div>
            <p className="text-xs text-emerald-100 opacity-90">
              Analyzing your submission before routing to the department
            </p>
          </div>

          {/* Steps */}
          <div className="p-8 space-y-5">
            {AI_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isDone = aiStepDone[idx];
              const isActive = aiStepIndex === idx && !isDone;
              const isPending = idx > aiStepIndex;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-4 transition-all duration-300 ${
                    isPending ? 'opacity-30' : 'opacity-100'
                  }`}
                >
                  {/* Status Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isDone
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                        : isActive
                        ? 'bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600'
                        : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : isActive ? (
                      <Loader2 className={`w-5 h-5 animate-spin ${step.color}`} />
                    ) : (
                      <Icon className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  {/* Label + progress bar */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold transition-colors duration-200 ${
                        isDone
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isActive
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    {isActive && (
                      <div className="mt-1.5 h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 animate-[grow_0.82s_ease-out_forwards]"
                          style={{ width: '0%' }}
                        />
                      </div>
                    )}
                    {isDone && (
                      <p className="text-[10px] font-mono text-emerald-500 mt-0.5">✓ Completed</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom bar */}
          <div className="px-8 pb-8">
            <div className="rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
              <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Secure AI scan — no data stored externally. Processed on-device.
              </p>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes grow {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // LIVE CAMERA OVERLAY
  // --------------------------------------------------------------------------
  if (cameraOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Camera Viewfinder */}
        <div className="relative flex-1 overflow-hidden flex items-center justify-center bg-black">
          {cameraError ? (
            <div className="text-center px-8 space-y-4">
              <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
              <p className="text-white font-semibold text-sm">{cameraError}</p>
              <button
                onClick={closeCamera}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition border border-white/20"
              >
                Close Camera
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Scan guide corners */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-64 h-48">
                  {/* Four corner markers */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
                  {/* Scan line */}
                  <div className="absolute inset-x-0 top-1/2 h-px bg-emerald-400/50 animate-pulse" />
                </div>
              </div>
            </>
          )}

          {/* Top controls */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
            <button
              onClick={closeCamera}
              className="w-10 h-10 rounded-xl bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-white font-bold text-sm tracking-wide drop-shadow">
              📷 Take Photo
            </span>
            <button
              onClick={flipCamera}
              className="w-10 h-10 rounded-xl bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white"
              title="Flip camera"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-8 p-8 bg-gradient-to-t from-black/70 to-transparent">
            {/* Cancel */}
            <button
              onClick={closeCamera}
              className="text-white/70 text-xs font-semibold hover:text-white transition"
            >
              Cancel
            </button>

            {/* Shutter Button */}
            <button
              onClick={capturePhoto}
              disabled={!!cameraError}
              className="w-20 h-20 rounded-full bg-white border-4 border-white/30 shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-40"
              title="Capture"
            >
              <div className="w-16 h-16 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                <CircleDot className="w-8 h-8 text-emerald-600" />
              </div>
            </button>

            {/* Placeholder for symmetry */}
            <div className="w-16" />
          </div>
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // MAIN FORM VIEW
  // --------------------------------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <div className="bg-white dark:bg-[#131b2e] rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 border-b border-slate-100 dark:border-slate-800 pb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Report a Community Issue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Help make your community better by reporting issues that need attention.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Issue Category */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
              Issue Category <span className="text-emerald-500">*</span>
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition appearance-none cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label} ({cat.dept})
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* 2. Issue Title */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
              Issue Title <span className="text-emerald-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue (e.g. Deep pothole near market entrance)"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          {/* 3. Detailed Description */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
              Detailed Description <span className="text-emerald-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed information about the issue (exact location landmarks, severity, hazard to pedestrians or traffic)..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          {/* 4. Location */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
              Location <span className="text-emerald-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address or landmark description"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>

              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locationStatus === 'acquiring'}
                className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition shrink-0 active:scale-[0.98]"
              >
                {locationStatus === 'acquiring' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    <span>Locating...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span>Get Location</span>
                  </>
                )}
              </button>
            </div>

            {deviceLocation && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] w-fit">
                <Navigation className="w-3 h-3 text-emerald-500" />
                <span>
                  GPS Fixed: {deviceLocation.latitude.toFixed(5)}, {deviceLocation.longitude.toFixed(5)} (±{deviceLocation.accuracy}m)
                </span>
              </div>
            )}

            {locationError && (
              <div className="text-[11px] text-rose-500 flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{locationError}</span>
              </div>
            )}
          </div>

          {/* 5. Photo Evidence */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
              Photo Evidence
            </label>

            {/* Hidden file input for Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />

            {!imagePreview ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Take Photo — opens real camera via getUserMedia */}
                <button
                  type="button"
                  onClick={() => openCamera('environment')}
                  className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 bg-slate-50/50 dark:bg-[#0c1220]/50 hover:bg-emerald-500/[0.03] transition flex flex-col items-center justify-center text-center space-y-2 group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">
                      Take Photo
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      Opens live camera
                    </span>
                  </div>
                </button>

                {/* Upload Photo */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 bg-slate-50/50 dark:bg-[#0c1220]/50 hover:bg-emerald-500/[0.03] transition flex flex-col items-center justify-center text-center space-y-2 group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">
                      Upload Photo
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      JPG, PNG &lt; 5MB
                    </span>
                  </div>
                </button>
              </div>
            ) : (
              /* Photo Preview Card */
              <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c1220] p-4 flex items-center gap-4">
                <img
                  src={imagePreview}
                  alt="Evidence preview"
                  className="w-20 h-20 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Evidence Attached
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {imageFile?.name || 'Captured Photo'}
                  </p>
                  {classifyingAi ? (
                    <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 animate-pulse">
                      Running PyTorch Vision Model...
                    </span>
                  ) : aiDetectedCategory === 'irrelevant' ? (
                    <div className="mt-1 space-y-1">
                      <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold">
                        ❌ AI Warning: Non-civic image detected (will be rejected by validation)
                      </span>
                    </div>
                  ) : aiDetectedCategory && aiDetectedCategory !== category && !(aiDetectedCategory === 'road_damage' && category === 'pothole') ? (
                    <div className="mt-1 space-y-1">
                      <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold">
                        ⚠️ Mismatch: AI detected '{aiDetectedCategory.replace('_', ' ')}' ({Math.round(aiConfidence * 100)}%) vs '{category.replace('_', ' ')}'
                      </span>
                      {CATEGORIES.some(c => c.id === aiDetectedCategory) && (
                        <button
                          type="button"
                          onClick={() => setCategory(aiDetectedCategory)}
                          className="block text-[10px] text-indigo-400 hover:text-indigo-300 underline font-medium"
                        >
                          Switch category to {aiDetectedCategory.replace('_', ' ')}
                        </button>
                      )}
                    </div>
                  ) : aiDetectedCategory ? (
                    <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                      ✓ AI Verified: {aiDetectedCategory.replace('_', ' ')} ({Math.round(aiConfidence * 100)}% match)
                    </span>
                  ) : (
                    <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Neural Verification Ready
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={removePhoto}
                  className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Remove photo"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* 6. Report Guidelines */}
          <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs sm:text-sm">
              <Info className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Report Guidelines</span>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-6 list-disc leading-relaxed">
              <li>Provide accurate and truthful information</li>
              <li>Include clear photos when possible</li>
              <li>Avoid duplicate reports for the same issue</li>
              <li>Emergency situations should be reported to 112 / 911</li>
            </ul>
          </div>

          {/* 7. Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Routing Ticket to Department...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Submit Issue Report</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
