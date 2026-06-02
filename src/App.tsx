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
  ExternalLink
} from 'lucide-react';
import { Landmark, HandGesture, TrackingMetrics, MovementLog, DrawingStroke } from './types';
import { classifyGesture, calculateHandOpenScore } from './utils/gestureDetector';
import HandCanvasOverlay from './components/HandCanvasOverlay';
import MetricsDashboard from './components/MetricsDashboard';
import DrawingBoard from './components/DrawingBoard';
import AIReviewer from './components/AIReviewer';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  
  // App States
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingStep, setLoadingStep] = useState<string>('Booting core analyzer...');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Telemetry metrics & history states
  const [activeMetrics, setActiveMetrics] = useState<TrackingMetrics | null>(null);
  const [lastMetrics, setLastMetrics] = useState<TrackingMetrics | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [logs, setLogs] = useState<MovementLog[]>([]);
  const [gestureCounts, setGestureCounts] = useState<Record<HandGesture, number>>({
    'None': 0, 'Fist': 0, 'High Five': 0, 'Peace': 0, 'Thumbs Up': 0,
    'Thumbs Down': 0, 'OK': 0, 'Pointing': 0, 'Rock On': 0, 'Pinch': 0
  });
  
  // Tracking math fields
  const [peakSpeed, setPeakSpeed] = useState<number>(0);
  const [averageOpenScore, setAverageOpenScore] = useState<number>(0.5);
  const [openScoreSum, setOpenScoreSum] = useState<number>(0);
  const [openScoreCount, setOpenScoreCount] = useState<number>(0);
  
  // Whiteboard drawing states
  const [drawMode, setDrawMode] = useState<boolean>(false);
  const [brushColor, setBrushColor] = useState<string>('#D1FF26'); // Default lime
  const [brushSize, setBrushSize] = useState<number>(6); // Normal
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [currentLandmarks, setCurrentLandmarks] = useState<Landmark[]>([]);
  
  // Dynamic refs to avoid stale closures in frame anim loop
  const drawModeRef = useRef<boolean>(false);
  const brushColorRef = useRef<string>('#D1FF26');
  const brushSizeRef = useRef<number>(6);
  const strokesRef = useRef<DrawingStroke[]>([]);
  const activeStrokeIdRef = useRef<string | null>(null);
  const lastWristPosRef = useRef<Landmark | null>(null);
  const lastFrameTimeRef = useRef<number>(-1);
  const isTrackingRef = useRef<boolean>(false);

  // Synchronize state values into fast refs
  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
  useEffect(() => { brushColorRef.current = brushColor; }, [brushColor]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);

  // Append a diagnostic statement down into the log list (limit to 100)
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

  // Reset metrics counters
  const resetSessionStats = () => {
    setSessionStartTime(Date.now());
    setSessionDuration(0);
    setPeakSpeed(0);
    setOpenScoreSum(0.5);
    setOpenScoreCount(1);
    setAverageOpenScore(0.5);
    setGestureCounts({
      'None': 0, 'Fist': 0, 'High Five': 0, 'Peace': 0, 'Thumbs Up': 0,
      'Thumbs Down': 0, 'OK': 0, 'Pointing': 0, 'Rock On': 0, 'Pinch': 0
    });
    setStrokes([]);
    strokesRef.current = [];
    activeStrokeIdRef.current = null;
    lastWristPosRef.current = null;
    addLog('RESET', 'Biometric tracking timeline cleared and restarted.', 'warning');
  };

  // Trigger media capturing streams
  const startCamera = async () => {
    setCameraError(null);
    setCameraActive(false);
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorStr = "Camera access is not supported by this browser. If running inside an iframe, please open this application in a new dedicated tab using the button at the top-right.";
      setCameraError(errorStr);
      addLog('CAMERA_ERROR', errorStr, 'warning');
      return;
    }

    try {
      addLog('INIT_CAMERA', 'Requesting user media feeds...');
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
          addLog('CAMERA_ACTIVE', 'Webcam video pipeline fully connected.', 'success');
        });
      }
    } catch (err: any) {
      console.error("Camera loading failed:", err);
      let errMsg = "Access to webcam was denied or is blocked by your browser settings.";
      if (err.name === 'NotAllowedError') {
        errMsg = "Webcam access permission denied. Please grant camera permission to let our neural engine resolve landmarks.";
      }
      setCameraError(errMsg);
      addLog('CAMERA_ERROR', errMsg, 'warning');
    }
  };

  // Bootstrap Google MediaPipe HandLandmarker models
  useEffect(() => {
    async function initMediaPipe() {
      try {
        setLoadingStep('Downloading fileset compiler...');
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        
        setLoadingStep('Compiling hand landmark model weights (~15MB)...');
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        landmarkerRef.current = landmarker;
        setLoading(false);
        addLog('MODELS_LOADED', 'MediaPipe HandLandmarker compiled successfully.', 'success');
        
        // Start camera right after models complete bootstrapping
        startCamera();
      } catch (error: any) {
        console.error("Failed to initialize system core models:", error);
        setLoadingStep(`Failed to compile engine: ${error.message || error}`);
        addLog('LOAD_ERROR', 'MediaPipe initialization failed.', 'warning');
      }
    }
    initMediaPipe();
    
    // Cleanup capture on destroy
    return () => {
      isTrackingRef.current = false;
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Frame processing loop
  useEffect(() => {
    if (loading || !cameraActive) return;

    let animId: number;
    let lastTime = -1;
    isTrackingRef.current = true;
    setSessionStartTime(Date.now());

    const runModelFrame = () => {
      if (!isTrackingRef.current) return;

      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      if (video && landmarker && video.readyState >= 2) {
        const now = performance.now();
        if (video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          
          try {
            const result = landmarker.detectForVideo(video, now);
            
            // Standard tracking variables
            let handList: Landmark[][] = [];
            let activeGesture: HandGesture = 'None';
            let handOpenScore = 0.5;
            let currentSpeed = 0;
            
            if (result && result.landmarks && result.landmarks.length > 0) {
              handList = result.landmarks as Landmark[][];
              const landmarks = handList[0]; // Primary tracked hand
              setCurrentLandmarks(landmarks);
              
              // 1. Calculate classified Gesture
              activeGesture = classifyGesture(landmarks);
              
              // 2. Calculate Palm Open Score
              handOpenScore = calculateHandOpenScore(landmarks);
              
              // Keep average up-to-date
              setOpenScoreSum((prev) => prev + handOpenScore);
              setOpenScoreCount((prev) => {
                const newCount = prev + 1;
                setAverageOpenScore((sum) => (sum + handOpenScore) / newCount);
                return newCount;
              });

              // 3. Speed calculation
              const wrist = landmarks[0];
              const dT = now - lastFrameTimeRef.current;
              
              if (lastWristPosRef.current && lastFrameTimeRef.current > 0 && dT > 0) {
                const lastWrist = lastWristPosRef.current;
                const dx = wrist.x - lastWrist.x;
                const dy = wrist.y - lastWrist.y;
                const dz = wrist.z - lastWrist.z;
                
                // Calculate speed as units / second
                const computedSpeed = Math.sqrt(dx*dx + dy*dy + dz*dz) / (dT / 1000);
                
                // Discard frames with massive speed spikes caused by camera jumps
                if (computedSpeed < 8) {
                  currentSpeed = computedSpeed;
                  setPeakSpeed((prev) => Math.max(prev, computedSpeed));
                }
              }
              
              lastWristPosRef.current = wrist;
              lastFrameTimeRef.current = now;

              // 4. Update gesture aggregate statistics when gesture changes
              setLastMetrics((prevLast) => {
                const prevGesture = prevLast?.gesture || 'None';
                if (activeGesture !== 'None' && activeGesture !== prevGesture) {
                  setGestureCounts((prevHist) => ({
                    ...prevHist,
                    [activeGesture]: (prevHist[activeGesture] || 0) + 1
                  }));
                  
                  addLog(
                    'GESTURE_SPOTTED', 
                    `Classified posture shifted to ${activeGesture.toUpperCase()}`, 
                    'gesture'
                  );
                }
                return {
                  timestamp: Date.now(),
                  activeHandCount: 1,
                  handOpenScore,
                  speed: currentSpeed,
                  gesture: activeGesture,
                  handPosition: { x: wrist.x, y: wrist.y, z: wrist.z },
                  boundingBox: null,
                  fingerStates: null
                };
              });

              // 5. Drawing Board core logic
              if (drawModeRef.current) {
                const indexTip = landmarks[8]; // Index tip
                
                if (activeGesture === 'Pointing' || activeGesture === 'Pinch') {
                  // Core drawing is trigger
                  const strokeColor = brushColorRef.current;
                  const strokeSize = brushSizeRef.current;
                  const currentStrokes = [...strokesRef.current];
                  const currentStrokeId = activeStrokeIdRef.current;

                  if (!currentStrokeId) {
                    // Create new brush stroke
                    const newId = Math.random().toString(36).substring(3, 9);
                    activeStrokeIdRef.current = newId;
                    
                    const newStroke: DrawingStroke = {
                      id: newId,
                      points: [{ x: indexTip.x, y: indexTip.y, isNewStroke: true }],
                      color: strokeColor,
                      brushSize: strokeSize
                    };
                    
                    setStrokes([...currentStrokes, newStroke]);
                    addLog('PAINT_RUN', 'Doodle brush started in virtual workspace.', 'success');
                  } else {
                    // Append coordinates to ongoing brush stroke
                    const updatedStrokes = currentStrokes.map((str) => {
                      if (str.id === currentStrokeId) {
                        return {
                          ...str,
                          points: [...str.points, { x: indexTip.x, y: indexTip.y }]
                        };
                      }
                      return str;
                    });
                    setStrokes(updatedStrokes);
                  }
                } else {
                  // Reset active stroke when gesture breaks
                  if (activeStrokeIdRef.current) {
                    activeStrokeIdRef.current = null;
                  }
                }
              }

              // Apply current state outputs
              setActiveMetrics({
                timestamp: Date.now(),
                activeHandCount: 1,
                handOpenScore,
                speed: currentSpeed,
                gesture: activeGesture,
                handPosition: { x: wrist.x, y: wrist.y, z: wrist.z },
                boundingBox: null,
                fingerStates: null
              });

            } else {
              // No hand detected
              setCurrentLandmarks([]);
              setActiveMetrics(null);
              lastWristPosRef.current = null;
              
              // End active gesture drawing
              if (activeStrokeIdRef.current) {
                activeStrokeIdRef.current = null;
              }
            }
          } catch (e) {
            console.error("Frame landmark resolution failed:", e);
          }
        }
      }

      animId = requestAnimationFrame(runModelFrame);
    };

    animId = requestAnimationFrame(runModelFrame);
    return () => cancelAnimationFrame(animId);

  }, [loading, cameraActive]);

  // Handle session clock ticking
  useEffect(() => {
    if (!cameraActive || loading) return;

    const timer = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cameraActive, loading]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#F0F0F0] flex flex-col font-sans select-none selection:bg-[#D1FF26]/20 selection:text-[#D1FF26]">
      
      {/* HEADER BAR */}
      <header className="border-b border-[#333] bg-[#080808]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#D1FF26] p-2 rounded-none shadow-[0_0_12px_rgba(209,255,38,0.25)] shrink-0">
              <Cpu className="w-5 h-5 text-[#0A0A0A]" />
            </div>
            <div>
              <h1 className="font-sans font-black italic tracking-wide text-sm text-[#F0F0F0] uppercase">NEURAL MOTION LAB</h1>
              <span className="font-mono text-[9px] text-zinc-550 tracking-wider">// VERSION 2.1 • KINETIC DETECT</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* If sandboxed in iframe, allow direct opening */}
            <a 
              href="https://ais-dev-vrbknqfzvemrfdlndrq53q-36953264149.asia-east1.run.app"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono text-zinc-400 hover:text-[#D1FF26] flex items-center gap-1 bg-[#080808] border border-[#333] px-3 py-1.5 transition-all uppercase tracking-wider"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#D1FF26]" />
              Open Live Tab
            </a>
            
            <button 
              onClick={resetSessionStats}
              className="text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 bg-[#080808] border border-[#333] hover:bg-[#D1FF26]/10 hover:border-[#D1FF26] transition-all cursor-pointer text-[#F0F0F0]"
            >
              Reset Session
            </button>
          </div>
        </div>
      </header>

      {/* SYSTEM DIAGNOSTIC NOTIFICATION */}
      <div className="bg-[#D1FF26]/5 border-b border-[#D1FF26]/10 text-center py-2.5 px-4 text-[10px] uppercase tracking-wider text-[#D1FF26] font-mono leading-normal flex items-center justify-center gap-2">
        <Activity className="w-3.5 h-3.5 animate-pulse shrink-0 text-[#D1FF26]" />
        // Note: For seamless webcam frame capturing speed, accept permission prompts, or use the "Open Live Tab" pathway.
      </div>

      {/* MAIN SCREEN WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-5 space-y-6">
        
        {/* UPPER PANEL: CAMERA WORKSPACE AND TOOLBOX COLUMN */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* CAMERA FEED WORKSPACE */}
          <div className="lg:col-span-8 bg-[#080808] border border-[#333] overflow-hidden relative flex flex-col justify-between aspect-video select-none">
            
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#D1FF26] z-10" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#D1FF26] z-10" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#D1FF26] z-10" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#D1FF26] z-10" />

            {/* BACKGROUND GLASS CAMERA GLASS */}
            <div className="absolute inset-0 bg-radial-at-t from-zinc-900/10 via-transparent to-transparent pointer-events-none" />
            
            {/* INTERACTION WEB FEED DISPLAY */}
            <div className="relative w-full flex-1 aspect-video flex items-center justify-center bg-[#050505]">
              
              {/* MODEL LOADING SCREEN */}
              {loading && (
                <div className="absolute inset-0 z-30 bg-[#050505] flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <Loader2 className="w-8 h-8 text-[#D1FF26] animate-spin" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#F0F0F0]">// Booting Kinetic Tracker</p>
                    <p className="text-[10px] text-zinc-500 font-mono tracking-wide">{loadingStep}</p>
                  </div>
                </div>
              )}

              {/* CAMERA NOT ON OR PERMISSION BLOCKED */}
              {!loading && !cameraActive && (
                <div className="absolute inset-0 z-20 bg-[#050505] flex flex-col items-center justify-center p-6 text-center space-y-4">
                  {cameraError ? (
                    <div className="space-y-3 max-w-sm">
                      <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto" />
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Camera Feed Blocked</p>
                        <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">{cameraError}</p>
                      </div>
                      <button 
                        onClick={startCamera}
                        className="py-1.5 px-4 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-xs font-semibold text-rose-300 transition-all cursor-pointer inline-flex items-center gap-1 uppercase tracking-wider"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry Access
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Loader2 className="w-6 h-6 text-[#D1FF26] animate-spin mx-auto" />
                      <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wide">// Opening hardware capture lens...</p>
                    </div>
                  )}
                </div>
              )}

              {/* RAW VIDEO CAPTURE FEED */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1] absolute inset-0 z-0 select-none pointer-events-none"
              />

              {/* COMPUTER VISION SKELETAL OVERLAY */}
              <HandCanvasOverlay
                landmarksList={currentLandmarks.length > 0 ? [currentLandmarks] : []} 
                activeGesture={activeMetrics?.gesture || 'None'}
                boundingBox={null}
                drawMode={drawMode}
                brushColor={brushColor}
                brushSize={brushSize}
                strokes={strokes}
              />

              {/* REAL-TIME OVERLAY COORDINATES CORNER */}
              {activeMetrics && (
                <div id="telemetry-hud-tag" className="absolute top-4 left-4 z-20 bg-[#050505]/95 border border-[#333] text-[9px] font-mono text-zinc-400 p-3 space-y-1 select-all-none">
                  <p className="text-[10px] font-bold text-[#D1FF26] tracking-widest">// MATRIX OK</p>
                  <p>X_CORD_P: {activeMetrics.handPosition.x.toFixed(4)}</p>
                  <p>Y_CORD_P: {activeMetrics.handPosition.y.toFixed(4)}</p>
                  <p>Z_CORD_P: {activeMetrics.handPosition.z.toFixed(4)}</p>
                </div>
              )}

            </div>

            {/* BASE STAT BAR CONTAINER */}
            <div className="border-t border-[#333] p-4 bg-[#080808]/80 flex flex-wrap items-center justify-between text-[10px] font-mono text-zinc-400 gap-y-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-[#D1FF26] shadow-[0_0_8px_#D1FF26]' : 'bg-red-500'}`} />
                <span className="uppercase text-[10px] tracking-wider font-bold text-zinc-300">
                  {cameraActive ? 'HARDWARE FEED ACTIVE' : 'FEED STAT_OFFLINE'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-zinc-500 text-[9.5px]">
                <span>PEAK SPEED: <span className="text-[#D1FF26] font-bold">{peakSpeed.toFixed(2)} rel/s</span></span>
                <span>AVERAGE OPENNESS: <span className="text-[#F0F0F0] font-bold">{Math.round(averageOpenScore * 100)}%</span></span>
              </div>
            </div>

          </div>

          {/* DYNAMIC Whiteboard control and AI analytics column */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Whiteboard module */}
            <DrawingBoard
              drawMode={drawMode}
              setDrawMode={setDrawMode}
              brushColor={brushColor}
              setBrushColor={setBrushColor}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
              clearCanvas={() => {
                setStrokes([]);
                strokesRef.current = [];
              }}
              hasDrawings={strokes.length > 0}
            />

            {/* AI Reviewer module */}
            <AIReviewer
              logs={logs}
              gestureCounts={gestureCounts}
              averageOpenScore={averageOpenScore}
              maxSpeed={peakSpeed}
              sessionDuration={sessionDuration}
              resetSessionStats={resetSessionStats}
            />

          </div>

        </div>

        {/* LOWER PANEL: COMPREHENSIVE SENSOR METRICS COMPONENT */}
        <MetricsDashboard
          metrics={activeMetrics}
          logs={logs}
          sessionDuration={sessionDuration}
        />

      </main>

      {/* FOOTER BAR */}
      <footer className="border-t border-[#333] bg-[#080808] py-8 mt-12">
        <div className="max-w-7xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-zinc-650 gap-3">
          <p>// Neural Motion Lab • Powered by Google Gemini & MediaPipe Solutions</p>
          <p>© 2026 Neural Motion Labs. Advanced computer vision biomechanical analysis.</p>
        </div>
      </footer>

    </div>
  );
}
