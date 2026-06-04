/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { 
  Camera, 
  VideoOff, 
  Cpu, 
  HelpCircle, 
  Loader2, 
  Sparkles, 
  Activity, 
  ShieldAlert, 
  RefreshCw,
  ExternalLink,
  Download,
  Upload,
  Volume2,
  VolumeX,
  Sliders,
  CheckCircle,
  FileCode,
  Info,
  SlidersHorizontal,
  FolderSync
} from 'lucide-react';
import { Landmark, SavedGesture, TrackingMetrics, MovementLog, RecognitionResult } from './types';
import { recognizeGesture, normalizeHand } from './utils/gestureDetector';
import { getInitialPredefinedGestures } from './utils/predefinedGestures';
import HandCanvasOverlay from './components/HandCanvasOverlay';
import GestureList from './components/GestureList';
import TrainingConsole from './components/TrainingConsole';

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // System Bootstrap & Lenses States
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingStep, setLoadingStep] = useState<string>('Initializing Sign Language Core...');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(0);

  // Gesture Recognition State & Database
  const [gestures, setGestures] = useState<SavedGesture[]>([]);
  const [selectedPresetGesture, setSelectedPresetGesture] = useState<SavedGesture | null>(null);
  const [matchAlgorithm, setMatchAlgorithm] = useState<'euclidean' | 'cosine'>('euclidean');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(75);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  
  // Real-time Trackers
  const [leftHandPresent, setLeftHandPresent] = useState<boolean>(false);
  const [rightHandPresent, setRightHandPresent] = useState<boolean>(false);
  const [currentLeftLandmarks, setCurrentLeftLandmarks] = useState<Landmark[] | null>(null);
  const [currentRightLandmarks, setCurrentRightLandmarks] = useState<Landmark[] | null>(null);
  const [liveRecognized, setLiveRecognized] = useState<RecognitionResult | null>(null);
  
  // Navigation & Logs HUD
  const [logs, setLogs] = useState<MovementLog[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [sessionDuration, setSessionDuration] = useState<number>(0);

  // Recognition rate limiting reference for TTS Speech Synthesis
  const lastSpokenLabelRef = useRef<string | null>(null);
  const lastSpokenTimeRef = useRef<number>(0);

  // Loop fast references to access settings without state lag
  const isTrackingRef = useRef<boolean>(false);
  const gesturesRef = useRef<SavedGesture[]>([]);
  const matchAlgorithmRef = useRef<'euclidean' | 'cosine'>('euclidean');
  const confidenceThresholdRef = useRef<number>(75);

  useEffect(() => { gesturesRef.current = gestures; }, [gestures]);
  useEffect(() => { matchAlgorithmRef.current = matchAlgorithm; }, [matchAlgorithm]);
  useEffect(() => { confidenceThresholdRef.current = confidenceThreshold; }, [confidenceThreshold]);

  // Push system diagnostic statement safely
  const addLog = (event: string, details: string, type: 'info' | 'success' | 'warning' | 'gesture' = 'info') => {
    const newLog: MovementLog = {
      id: Math.random().toString(36).substring(3, 9),
      timestamp: Date.now(),
      event,
      details,
      type
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 99)]);
  };

  // Load gestures from storage or bootstrap the 50 predefined slots
  useEffect(() => {
    const cached = localStorage.getItem('neural_sign_gestures');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGestures(parsed);
          addLog('GESTURES_LOADED', `Loaded ${parsed.length} signs from local database.`, 'info');
          return;
        }
      } catch (e) {
        console.error('Failed to parse cached signs, re-bootstrapping...', e);
      }
    }

    // Bootstrap defaults
    const initial = getInitialPredefinedGestures();
    setGestures(initial);
    localStorage.setItem('neural_sign_gestures', JSON.stringify(initial));
    addLog('SYSTEM_BOOTSTRAP', `Preloaded 50 standard sign language slots into local memory.`, 'success');
  }, []);

  const saveGesturesToDisk = (updated: SavedGesture[]) => {
    setGestures(updated);
    localStorage.setItem('neural_sign_gestures', JSON.stringify(updated));
  };

  const handleResetPredefined = () => {
    if (window.confirm('Are you sure you want to reset your predefined library nodes back to defaults? Hand pose records will be cleared.')) {
      const initial = getInitialPredefinedGestures();
      saveGesturesToDisk(initial);
      setSelectedPresetGesture(null);
      addLog('RESET_COMPLETED', 'Predefined gestures database has been reverted to factory defaults.', 'warning');
    }
  };

  // Web camera activation
  const startCamera = async () => {
    setCameraError(null);
    setCameraActive(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errStr = "Video captures are unsupported or sandboxed on this device. Use the 'Open Live Tab' button.";
      setCameraError(errStr);
      addLog('CAMERA_ERROR', errStr, 'warning');
      return;
    }

    try {
      addLog('INIT_CAMERA', 'Spawning local hardware lens video feed...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', () => {
          setCameraActive(true);
          addLog('CAMERA_ACTIVE', 'Hardware optical feed synchronized.', 'success');
        });
      }
    } catch (err: any) {
      console.error("Camera streaming failed:", err);
      let errMsg = "Access to webcam was denied. Verify browser camera permissions.";
      if (err.name === 'NotAllowedError') {
        errMsg = "Webcam permission blocked. Please accept permission prompts to resolve fingers.";
      }
      setCameraError(errMsg);
      addLog('CAMERA_ERROR', errMsg, 'warning');
    }
  };

  // Compile Google MediaPipe HandLandmarker Web Models
  useEffect(() => {
    async function initMediaPipe() {
      try {
        setLoadingStep('Accessing vision tasks resolver assets...');
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        
        setLoadingStep('Downloading AI hand tracking neural tensors (~15MB)...');
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2 // Detect both hands simultaneously as requested!
        });
        
        landmarkerRef.current = landmarker;
        setLoading(false);
        addLog('MODELS_COMPILE', 'Google MediaPipe compiled successfully.', 'success');
        
        // Connect camera on startup
        startCamera();
      } catch (error: any) {
        console.error("MediaPipe bootstrapping failed:", error);
        setLoadingStep(`Booster compilation failure: ${error.message || error}`);
        addLog('INIT_FAILURE', 'MediaPipe failed to load assets.', 'warning');
      }
    }
    initMediaPipe();
    
    return () => {
      isTrackingRef.current = false;
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Frame processing loop
  useEffect(() => {
    if (loading || !cameraActive) return;

    let animId: number;
    let framesCount = 0;
    let lastFpsTime = performance.now();
    isTrackingRef.current = true;
    setSessionStartTime(Date.now());

    const processFrame = () => {
      if (!isTrackingRef.current) return;

      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      if (video && landmarker && video.readyState >= 2) {
        const timestamp = performance.now();
        
        // FPS Meter calculation
        framesCount++;
        if (timestamp - lastFpsTime >= 1000) {
          setFps(Math.round((framesCount * 1000) / (timestamp - lastFpsTime)));
          framesCount = 0;
          lastFpsTime = timestamp;
        }

        try {
          const result = landmarker.detectForVideo(video, timestamp);
          
          let leftHand: Landmark[] | null = null;
          let rightHand: Landmark[] | null = null;

          if (result && result.landmarks && result.landmarks.length > 0) {
            for (let i = 0; i < result.landmarks.length; i++) {
              let category = 'Right'; // Default fallback
              if (result.handedness && result.handedness[i] && result.handedness[i][0]) {
                category = result.handedness[i][0].categoryName;
              }

              // Normalizing casing or matching left labels
              if (category.toLowerCase() === 'left') {
                leftHand = result.landmarks[i] as Landmark[];
              } else {
                rightHand = result.landmarks[i] as Landmark[];
              }
            }
          }

          // Apply state triggers when hands drop/enter frame
          setLeftHandPresent(!!leftHand);
          setRightHandPresent(!!rightHand);
          setCurrentLeftLandmarks(leftHand);
          setCurrentRightLandmarks(rightHand);

          // 2. Perform Similiarity Recognition
          const classification = recognizeGesture(
            leftHand,
            rightHand,
            gesturesRef.current,
            matchAlgorithmRef.current,
            confidenceThresholdRef.current
          );

          if (classification) {
            setLiveRecognized(classification);

            // Accessiblity sound out Speech triggers
            if (ttsEnabled && 'speechSynthesis' in window) {
              const nowTime = Date.now();
              const isDifferentSign = lastSpokenLabelRef.current !== classification.label;
              const hasCooldownPassed = nowTime - lastSpokenTimeRef.current > 1800; // Speak interval limits to avoid looping

              if (isDifferentSign || hasCooldownPassed) {
                lastSpokenLabelRef.current = classification.label;
                lastSpokenTimeRef.current = nowTime;

                // Stop active speaking before triggering new sign
                window.speechSynthesis.cancel();
                const textUtterance = new SpeechSynthesisUtterance(classification.label.toLowerCase());
                textUtterance.rate = 1.0;
                window.speechSynthesis.speak(textUtterance);
                
                addLog('SIGN_SPOKEN', `Text-To-Speech read translated sign: "${classification.label}"`, 'gesture');
              }
            }
          } else {
            setLiveRecognized(null);
            // Reset active spoken label when hands return to void
            if (!leftHand && !rightHand) {
              lastSpokenLabelRef.current = null;
            }
          }

        } catch (err) {
          console.error("Frame recognition error:", err);
        }
      }

      animId = requestAnimationFrame(processFrame);
    };

    animId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animId);
  }, [loading, cameraActive, matchAlgorithm, confidenceThreshold, ttsEnabled]);

  // Session timer ticker
  useEffect(() => {
    if (!cameraActive || loading) return;

    const timer = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cameraActive, loading]);

  // Training a gesture frame
  const handleSaveGesture = (label: string, hand: 'left' | 'right' | 'both') => {
    let rawLandmarks: Landmark[] = [];

    // Validations
    if (hand === 'left') {
      if (!currentLeftLandmarks) {
        alert('Action aborted: No visible left hand coordinates tracked right now.');
        return;
      }
      rawLandmarks = normalizeHand(currentLeftLandmarks);
    } else if (hand === 'right') {
      if (!currentRightLandmarks) {
        alert('Action aborted: No visible right hand coordinates tracked right now.');
        return;
      }
      rawLandmarks = normalizeHand(currentRightLandmarks);
    } else {
      // Both hands required
      if (!currentLeftLandmarks || !currentRightLandmarks) {
        alert('Action aborted: Two hands are required simultaneously to save a dual-hand posture.');
        return;
      }
      const normL = normalizeHand(currentLeftLandmarks);
      const normR = normalizeHand(currentRightLandmarks);
      rawLandmarks = [...normL, ...normR]; // Concat together to make exactly 42 coordinates
    }

    // Capture matches or updates
    const preExisting = gestures.find((g) => g.label.toUpperCase() === label.toUpperCase());
    let updated: SavedGesture[] = [];

    if (preExisting) {
      // Re-train existing slot description
      updated = gestures.map((g) => {
        if (g.id === preExisting.id) {
          return {
            ...g,
            hand: hand,
            landmarks: rawLandmarks,
            isTrained: true
          };
        }
        return g;
      });
      addLog('POSTURE_RECORDED', `Calibrated coordinates stored inside slot: "${label.toUpperCase()}"`, 'success');
    } else {
      // Build a brand new custom gesture slot
      const newGesture: SavedGesture = {
        id: `custom-${Math.random().toString(36).substring(3, 9)}`,
        label: label.toUpperCase(),
        hand,
        landmarks: rawLandmarks,
        isPredefined: false,
        isTrained: true
      };
      updated = [newGesture, ...gestures];
      addLog('POSTURE_RECORDED', `Registered new custom sign: "${label.toUpperCase()}"`, 'success');
    }

    saveGesturesToDisk(updated);
    setSelectedPresetGesture(null);
  };

  // Clearing / deleting a gesture
  const handleDeleteGesture = (id: string) => {
    const target = gestures.find((g) => g.id === id);
    if (!target) return;

    let updated: SavedGesture[] = [];

    if (target.isPredefined) {
      // If predetermined, we DO NOT delete the label/slot. We just erase the landmarks coordinates so it goes back to untrained status!
      updated = gestures.map((g) => {
        if (g.id === id) {
          return {
            ...g,
            landmarks: [],
            isTrained: false
          };
        }
        return g;
      });
      addLog('SLOT_CLEARED', `Coordinates removed from predefined slot: "${target.label}"`, 'info');
    } else {
      // Complete removal if custom gesture
      updated = gestures.filter((g) => g.id !== id);
      addLog('SIGN_DELETED', `Erase custom gesture completely: "${target.label}"`, 'warning');
    }

    saveGesturesToDisk(updated);
    if (selectedPresetGesture?.id === id) {
      setSelectedPresetGesture(null);
    }
  };

  // Triggering quick trainer setup for clicked items
  const handleTrainLiveGesture = (g: SavedGesture) => {
    setSelectedPresetGesture(g);
    addLog('TRAINER_LOCK', `Trainer locked on predefined node: "${g.label}"`, 'info');
  };

  // Format elapsed time clock
  const formatTime = (sec: number) => {
    const mm = Math.floor(sec / 60).toString().padStart(2, '0');
    const ss = (sec % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  // BACKUP EXPORT JSON FILE
  const handleExportJSON = () => {
    // Exact schema matching user's json requirement
    const payload = {
      gestures: gestures.filter(g => g.isTrained).map((g) => ({
        label: g.label,
        hand: g.hand,
        landmarks: g.landmarks
      }))
    };

    const dataString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataString);
    downloadAnchor.setAttribute("download", `sign_language_matrix_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addLog('DATABASE_EXPORT', `Exported ${payload.gestures.length} trained gesture coordinates out to JSON backup.`, 'success');
  };

  // BACKUP IMPORT JSON FILE
  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const importedData = JSON.parse(text);

        if (!importedData || !Array.isArray(importedData.gestures)) {
          alert('Upload failed: Invalid sign language JSON structure. Make sure "gestures" array exists.');
          return;
        }

        const importedList = importedData.gestures;
        let successfulLoads = 0;
        
        // Merge imported gestures into memory
        const currentLibrary = [...gestures];

        importedList.forEach((item: any) => {
          if (!item.label || !item.hand || !Array.isArray(item.landmarks)) return;

          // Check if slot with this name already exists
          const preMatchIdx = currentLibrary.findIndex((g) => g.label.toUpperCase() === item.label.toUpperCase());
          
          if (preMatchIdx !== -1) {
            // Overwirte existing slot
            currentLibrary[preMatchIdx] = {
              ...currentLibrary[preMatchIdx],
              hand: item.hand,
              landmarks: item.landmarks,
              isTrained: true
            };
          } else {
            // Append as custom signs
            currentLibrary.unshift({
              id: `custom-${Math.random().toString(36).substring(3, 9)}`,
              label: item.label.toUpperCase(),
              hand: item.hand,
              landmarks: item.landmarks,
              isPredefined: false,
              isTrained: true
            });
          }
          successfulLoads++;
        });

        saveGesturesToDisk(currentLibrary);
        addLog('DATABASE_IMPORT', `Successfully uploaded and merged ${successfulLoads} signs into spatial memory!`, 'success');
        alert(`Successfully imported and calibrated ${successfulLoads} signs into memory!`);
      } catch (err) {
        console.error('Failed to import JSON matrix:', err);
        alert('Failed parsing uploaded sign file. Verify format values.');
      }
    };
    reader.readAsText(file);
    // Clear input so same file can be imported again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F0F0F0] flex flex-col font-sans select-none selection:bg-[#D1FF26]/20 selection:text-[#D1FF26]">
      
      {/* HEADER SECTION */}
      <header className="border-b border-[#333] bg-[#080808]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#D1FF26] p-2 rounded-none shadow-[0_0_12px_rgba(209,255,38,0.25)] shrink-0">
              <Cpu className="w-5 h-5 text-[#0A0A0A]" />
            </div>
            <div>
              <h1 className="font-sans font-black italic tracking-wide text-xs sm:text-sm text-[#F0F0F0] uppercase">NEURAL MOTION LAB</h1>
              <span className="font-mono text-[9px] text-zinc-500 tracking-wider">// REAL-TIME ASL RECOGNITION PANEL</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a 
              href="https://ais-dev-vrbknqfzvemrfdlndrq53q-36953264149.asia-east1.run.app"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono text-zinc-400 hover:text-[#D1FF26] flex items-center gap-1.5 bg-[#080808] border border-[#333] px-3 py-1.5 transition-all uppercase tracking-wider"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#D1FF26]" />
              Open Live Tab
            </a>
            
            <button 
              onClick={() => {
                if (window.confirm('Reset local track timings of current session? Custom trained gestures will be preserved.')) {
                  setSessionDuration(0);
                  setSessionStartTime(Date.now());
                  addLog('TIMER_CLEARED', 'Active trainer session duration timeline cleared.', 'warning');
                }
              }}
              className="text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 bg-[#080808] border border-[#333] hover:bg-[#D1FF26]/10 hover:border-[#D1FF26] transition-all cursor-pointer text-[#F0F0F0]"
            >
              Reset Timer
            </button>
          </div>
        </div>
      </header>

      {/* UTILITY NOTIFIER ROW */}
      <div className="bg-[#D1FF26]/5 border-b border-[#D1FF26]/10 text-center py-2 px-4 text-[9px] uppercase tracking-wider text-[#D1FF26] font-mono leading-normal flex flex-wrap items-center justify-center gap-2">
        <Activity className="w-3 h-3 animate-pulse text-[#D1FF26]" />
        <span>// SYSTEM OPERATING RANGE: 30+ FPS • COMPUTER VISION JOINT COMPILER ONLINE</span>
      </div>

      {/* DASHBOARD GRID CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-5 space-y-6">
        
        {/* UPPER GRID ROW: VIDEO COMPILER VIEW + TRAINER PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* CAMERA COMPILING FEED WINDOW */}
          <div className="lg:col-span-8 bg-[#080808] border border-[#333] overflow-hidden relative flex flex-col justify-between aspect-video select-none">
            
            {/* Minimal aesthetic square bracket bounds */}
            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-[#D1FF26] z-10" />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#D1FF26] z-10" />
            <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#D1FF26] z-10" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-[#D1FF26] z-10" />

            {/* Model Downloading screen overlay */}
            {loading && (
              <div className="absolute inset-0 z-30 bg-[#050505] flex flex-col items-center justify-center p-6 text-center space-y-4">
                <Loader2 className="w-8 h-8 text-[#D1FF26] animate-spin" />
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#F0F0F0]">// Booting Kinetic Matrix Applet</p>
                  <p className="text-[10px] text-zinc-500 font-mono tracking-wide">{loadingStep}</p>
                </div>
              </div>
            )}

            {/* Camera Blocked screen overlay */}
            {!loading && !cameraActive && (
              <div className="absolute inset-0 z-20 bg-[#050505] flex flex-col items-center justify-center p-6 text-center space-y-4">
                {cameraError ? (
                  <div className="space-y-3 max-w-sm">
                    <ShieldAlert className="w-8 h-8 text-red-500 mx-auto" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-red-400">Camera Feed Blocked</p>
                      <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">{cameraError}</p>
                    </div>
                    <button 
                      onClick={startCamera}
                      className="py-1.5 px-4 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-xs font-semibold text-red-300 transition-all cursor-pointer inline-flex items-center gap-1 uppercase tracking-wider"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry Device Access
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Loader2 className="w-6 h-6 text-[#D1FF26] animate-spin mx-auto" />
                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wide">// Mapping hardware camera streams...</p>
                  </div>
                )}
              </div>
            )}

            {/* LIVE TRANSLATOR VIEWPORT */}
            <div className="relative w-full flex-1 aspect-video flex items-center justify-center bg-[#030303] overflow-hidden">
              {/* Captured video stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1] absolute inset-0 z-0 select-none pointer-events-none"
              />

              {/* Real-time sign overlay drawer */}
              <HandCanvasOverlay
                leftHandLandmarks={currentLeftLandmarks}
                rightHandLandmarks={currentRightLandmarks}
                recognizedLabel={liveRecognized?.label || null}
                recognizedConfidence={liveRecognized?.confidence || null}
                recognizedHand={liveRecognized?.hand || null}
              />

              {/* HUD Sensor stats */}
              {(currentLeftLandmarks || currentRightLandmarks) && (
                <div id="telemetry-coordinates-pane" className="absolute top-4 left-4 z-20 bg-[#050505]/95 border border-[#333] text-[8.5px] font-mono text-zinc-400 p-3.5 space-y-1">
                  <p className="text-[9.5px] font-bold text-[#D1FF26] tracking-widest">// KINETIC MATRIX OUT</p>
                  {currentRightLandmarks && (
                    <p className="text-[#D1FF26]">RIGHT_HAND: 21_LANDMARKS_RESOLVED</p>
                  )}
                  {currentLeftLandmarks && (
                    <p className="text-[#22D3EE]">LEFT_HAND: 21_LANDMARKS_RESOLVED</p>
                  )}
                  <p className="text-zinc-500 mt-2 block font-extrabold uppercase bg-zinc-950 px-1 py-0.5">// ACTIVE CALCULATIONS</p>
                  <p>COORD_COMPILER: 30+ HZ</p>
                  <p>SCALE_NORMALIZER: ACTIVE</p>
                </div>
              )}

              {/* Big, elegant translucent absolute readout of recognized word for instant view */}
              <div className="absolute bottom-4 right-4 z-20 pointer-events-none bg-[#050505]/85 border border-[#333] p-4 font-mono select-none">
                <span className="text-[8px] text-zinc-500 uppercase tracking-widest block font-bold">// SIGN TRANSLATION IN</span>
                <span className="text-xl sm:text-2xl font-sans font-black italic tracking-tighter text-[#D1FF26] uppercase block mt-1">
                  {liveRecognized ? liveRecognized.label : 'AWAITING SIGN...'}
                </span>
                {liveRecognized && (
                  <span className="text-[9px] text-zinc-400 block font-bold lowercase mt-0.5">
                    confidence: {liveRecognized.confidence}% matching via {matchAlgorithm}
                  </span>
                )}
              </div>
            </div>

            {/* BOTTOM STATUS STRIP */}
            <div className="border-t border-[#333] p-4 bg-[#080808]/80 flex flex-wrap items-center justify-between text-[10px] font-mono text-zinc-400 gap-y-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${cameraActive ? 'bg-[#D1FF26] animate-pulse shadow-[0_0_8px_#D1FF26]' : 'bg-red-500'}`} />
                <span className="uppercase text-[9.5px] tracking-wider font-extrabold text-zinc-350">
                  {cameraActive ? `CAPTURING COMPILER STREAMS (${fps} FPS)` : 'CAMERA COMPILER STREAMS DISCONNECTED'}
                </span>
              </div>
              <div className="flex items-center gap-5 text-zinc-500 text-[9.5px]">
                <span>ELAPSED RECORD TIMELINE: <span className="text-[#D1FF26] font-bold">{formatTime(sessionDuration)}</span></span>
                <span>SIGN MATCH METHOD: <span className="text-[#F0F0F0] font-bold uppercase">{matchAlgorithm}</span></span>
              </div>
            </div>

          </div>

          {/* RIGHT TRAINING CONTROL COLUMN */}
          <div className="lg:col-span-4 flex flex-col">
            <TrainingConsole
              leftHandVisible={leftHandPresent}
              rightHandVisible={rightHandPresent}
              onSaveGesture={handleSaveGesture}
              selectedPresetGesture={selectedPresetGesture}
              onClearPresetSelection={() => setSelectedPresetGesture(null)}
            />
          </div>

        </div>

        {/* ALGORITHM CALIBRATIONS AREA */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          
          {/* MATH ENGINE PARAMETERS */}
          <div className="md:col-span-4 bg-[#080808] border border-[#333] p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#D1FF26]" />
                <h3 className="font-sans font-black uppercase tracking-wider text-xs text-[#F0F0F0]">Recognition Parameters</h3>
              </div>
              <p className="text-[8.5px] text-zinc-500 font-mono">// TUNING SIMILARITY COMPILER MATRICES</p>
            </div>

            <div className="space-y-4 my-2">
              {/* Algorithm selector */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono text-zinc-500 tracking-wider uppercase block">// Distance Math Model</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setMatchAlgorithm('euclidean');
                      addLog('MATH_CHANGE', 'Switched spatial comparison logic to Euclidean distance space.', 'info');
                    }}
                    className={`p-2.5 text-[9px] font-mono border transition-all cursor-pointer ${
                      matchAlgorithm === 'euclidean'
                        ? 'bg-[#D1FF26]/10 border-[#D1FF26] text-[#D1FF26] font-bold'
                        : 'bg-[#050505] border-[#333] text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    Euclidean Distance
                  </button>
                  <button
                    onClick={() => {
                      setMatchAlgorithm('cosine');
                      addLog('MATH_CHANGE', 'Switched spatial comparison logic to Cosine similarity projection.', 'info');
                    }}
                    className={`p-2.5 text-[9px] font-mono border transition-all cursor-pointer ${
                      matchAlgorithm === 'cosine'
                        ? 'bg-[#D1FF26]/10 border-[#D1FF26] text-[#D1FF26] font-bold'
                        : 'bg-[#050505] border-[#333] text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    Cosine Similarity
                  </button>
                </div>
              </div>

              {/* Threshold Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[9px] font-mono">
                  <span className="text-zinc-505 tracking-wider">// COMPRESSION ACCURACY LIMIT</span>
                  <span className="text-[#D1FF26] font-extrabold">{confidenceThreshold}% confidence</span>
                </div>
                <input
                  type="range"
                  min="55"
                  max="95"
                  value={confidenceThreshold}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setConfidenceThreshold(val);
                    confidenceThresholdRef.current = val;
                  }}
                  className="w-full h-1 bg-[#222] rounded-lg appearance-none cursor-pointer accent-[#D1FF26]"
                />
                <span className="text-[8.5px] font-mono text-zinc-500 block leading-tight">
                  Higher thresholds request identical visual joint poses. Lower allows broader matching tolerances.
                </span>
              </div>

              {/* Text to Speech Control Toggle */}
              <div className="pt-2 border-t border-zinc-900 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono text-[#F0F0F0] uppercase block">Accessibility TTS Speech</span>
                  <span className="text-[8px] font-mono text-zinc-500 mt-0.5 block">Synthesize signs out load in real-time</span>
                </div>
                <button
                  onClick={() => {
                    setTtsEnabled(!ttsEnabled);
                    addLog('TTS_TOGGLE', `Text-to-speech audio outputs ${!ttsEnabled ? 'ENABLED' : 'DISABLED'}.`, 'info');
                  }}
                  className={`p-2 text-[9px] font-mono border transition-all flex items-center gap-1 cursor-pointer ${
                    ttsEnabled
                      ? 'bg-[#D1FF26]/10 border-[#D1FF26] text-[#D1FF26] font-bold'
                      : 'bg-[#050505] border-[#333] text-zinc-500'
                  }`}
                >
                  {ttsEnabled ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      ON
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      OFF
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-[#050505] border border-[#333] p-2.5 text-[8.5px] font-mono text-zinc-500 leading-snug flex gap-1.5 mt-1">
              <Info className="w-3.5 h-3.5 text-[#D1FF26] shrink-0" />
              <span>Cosine similarity treats hand models as high-dimension lines. Euclidean tests exact spatial coordinates metrics values.</span>
            </div>
          </div>

          {/* BACKUP RESTORE CONTROL BOARD */}
          <div className="md:col-span-4 bg-[#080808] border border-[#333] p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FolderSync className="w-4 h-4 text-[#D1FF26]" />
                <h3 className="font-sans font-black uppercase tracking-wider text-xs text-[#F0F0F0]">Backup / Restore JSON</h3>
              </div>
              <p className="text-[8.5px] text-zinc-500 font-mono">// EXPORT OR SYNC GESTURES ARRAYS</p>
            </div>

            <p className="text-[10px] text-zinc-400 font-mono leading-relaxed bg-[#050505] border border-[#333] p-3">
              Export saved sign coordinates schemas into a local backup array, or load already predefined gesture backups into the computer vision pipeline context. All files strictly preserve the validated coordinate dictionary.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-900">
              {/* Import button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 text-[9px] font-mono border border-[#333] text-zinc-300 hover:border-[#D1FF26] hover:text-[#D1FF26] hover:bg-[#D1FF26]/5 transition-all text-center cursor-pointer uppercase flex items-center justify-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                Import JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />

              {/* Export button */}
              <button
                onClick={handleExportJSON}
                className="py-2.5 text-[9px] font-mono bg-[#050505] border border-[#D1FF26] text-[#D1FF26] hover:bg-[#D1FF26] hover:text-[#0A0A0A] transition-all text-center cursor-pointer uppercase flex items-center justify-center gap-1 font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </button>
            </div>
          </div>

          {/* MOVEMENT EVENT LOGS */}
          <div className="md:col-span-4 bg-[#080808] border border-[#333] p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#D1FF26]" />
                <h3 className="font-sans font-black uppercase tracking-wider text-xs text-[#F0F0F0]">Telemetry logs</h3>
              </div>
              <p className="text-[8.5px] text-zinc-500 font-mono">// TERMINAL TTY TRANSMISSIONS</p>
            </div>

            {/* Logs List viewport */}
            <div className="bg-[#050505] border border-[#333] p-3 font-mono text-[9px] h-[142px] overflow-y-auto flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-zinc-850 scrollbar-track-zinc-950">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-650 italic">
                  // Awaiting hand activity pipeline events...
                </div>
              ) : (
                logs.map((log) => {
                  let badgeCol = 'text-[#F0F0F0] font-normal';
                  if (log.type === 'success') badgeCol = 'text-[#D1FF26] font-bold';
                  if (log.type === 'warning') badgeCol = 'text-yellow-500';
                  if (log.type === 'gesture') badgeCol = 'text-[#22D3EE] italic';

                  const timeString = new Date(log.timestamp).toLocaleTimeString([], { hour12: false, fractionSecDigits: 1 } as any);

                  return (
                    <div key={log.id} className="leading-snug flex items-start gap-1 justify-start">
                      <span className="text-zinc-650 shrink-0">[{timeString}]</span>
                      <span className={`${badgeCol} shrink-0`}>[{log.event}]</span>
                      <span className="text-zinc-400">{log.details}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* BOTTOM SECTION - HUGE DETAILED GRID LISTING GESTURES */}
        <div id="comprehensive-saved-gestures-grid">
          <GestureList
            gestures={gestures}
            activeSelectedId={selectedPresetGesture?.id || null}
            onSelectGesture={(g) => setSelectedPresetGesture(g)}
            onDeleteGesture={handleDeleteGesture}
            onResetPredefined={handleResetPredefined}
            onTrainLive={handleTrainLiveGesture}
          />
        </div>

      </main>

      {/* FOOTER STRIP */}
      <footer className="border-t border-[#333] bg-[#080808] py-8 mt-12">
        <div className="max-w-7xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between text-[9px] font-mono text-zinc-600 gap-3">
          <p>// Neural Motion Lab • Powered by Google MediaPipe Web SDK & Browser TTS APIs</p>
          <p>© 2026 Neural Motion Labs. Advanced gesture interlock sign translation engines.</p>
        </div>
      </footer>

    </div>
  );
}
