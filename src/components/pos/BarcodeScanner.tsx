import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  continuous?: boolean;
}

const BarcodeScanner = ({ onScan, onClose, continuous = false }: BarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<any>(null);
  const isPaused = useRef(false);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [scanningStatus, setScanningStatus] = useState<"scanning" | "success" | "loading" | "error">("loading");
  const [permissionState, setPermissionState] = useState<PermissionState | 'unknown'>('unknown');
  const [showRetry, setShowRetry] = useState(false);
  const [detailedError, setDetailedError] = useState<string>("");
  const scanningStatusRef = useRef<string>("loading");

  // Keep ref in sync with state
  useEffect(() => {
    scanningStatusRef.current = scanningStatus;
  }, [scanningStatus]);

  const isMounted = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    // Stop all tracks in the stream manually for more robust cleanup
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }


    if (controlsRef.current) {
      if (typeof controlsRef.current.stop === 'function') {
        controlsRef.current.stop();
      }
      controlsRef.current = null;
    }
  }, []);

  const initCamera = useCallback(async () => {
    setScanningStatus("loading");
    setShowRetry(false);

    let retryTimeout: NodeJS.Timeout | null = null;

    try {
      stopCamera();
      setDetailedError("");

      if (!isMounted.current) return;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setDetailedError("Media Devices API totally missing, make sure you are on HTTPS.");
        setHasCamera(false);
        setScanningStatus("error");
        return;
      }

      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.CODABAR,
        BarcodeFormat.ITF,
      ]);

      const reader = new BrowserMultiFormatReader(hints);

      const scanCallback = (result: any, err: any) => {
        if (result && isMounted.current) {
          handleSuccess(result.getText());
        }
      };

      retryTimeout = setTimeout(() => {
        if (isMounted.current && scanningStatusRef.current === "loading") {
          setShowRetry(true);
        }
      }, 5000);

      if (videoRef.current) {
        let stream: MediaStream | null = null;
        let finalErrorCapture: any = null;

        try {
          // Robust Fallback Chain #1: Enumerate Devices First (Ideal for Android Chrome)
          const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
          const videoDevices = devices.filter(device => device.kind === 'videoinput');

          if (videoDevices.length > 0) {
            // Find a rear/back camera specifically
            const rearCamera = videoDevices.find(d =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
            );

            if (rearCamera) {
              try {
                stream = await navigator.mediaDevices.getUserMedia({
                  video: { deviceId: { exact: rearCamera.deviceId } }
                });
              } catch (e: any) { finalErrorCapture = e; }
            }
          }
        } catch (e: any) { finalErrorCapture = e; }

        // Fallback Chain #2: Standard Environment constraint
        if (!stream) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          } catch (err1: any) {
            finalErrorCapture = err1;
            // Fallback Chain #3: Any video constraint
            try {
              stream = await navigator.mediaDevices.getUserMedia({ video: true });
            } catch (err2: any) {
              finalErrorCapture = err2;
              throw finalErrorCapture; // Totally failed
            }
          }
        }

        if (!stream) throw new Error("Stream object is null.");

        if (!isMounted.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;

        try {
          await videoRef.current.play();
          setPermissionState('granted');

          if (isMounted.current) {
            setScanningStatus("scanning");
            setHasCamera(true);
          }
        } catch (playError) {
          console.error("Video play error:", playError);
          setDetailedError(String(playError));
          setShowRetry(true);
          return;
        }

        if (retryTimeout) clearTimeout(retryTimeout);

        try {
          const controls = await reader.decodeFromVideoElement(videoRef.current, scanCallback);
          if (isMounted.current) {
            controlsRef.current = controls;
          } else {
            controls.stop();
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
          }
        } catch (decoderError) {
          console.error("Scanner decoder error:", decoderError);
        }
      }
    } catch (err: any) {
      console.error("Scanner init final error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
      }
      setDetailedError(`[${err.name || 'Error'}] ${err.message || 'Check site settings to reset camera permissions.'}`);

      if (retryTimeout) clearTimeout(retryTimeout);
      if (isMounted.current) {
        setHasCamera(false);
        setScanningStatus("error");
      }
    }
  }, [stopCamera]);

  const isAndroidChrome = /Android/i.test(navigator.userAgent) && /Chrome/i.test(navigator.userAgent);
  const [needsManualStart, setNeedsManualStart] = useState<boolean>(isAndroidChrome);

  useEffect(() => {
    isMounted.current = true;

    // Auto-start for iOS and non-Android-Chrome browsers
    if (!needsManualStart) {
      initCamera();
    }

    return () => {
      isMounted.current = false;
      stopCamera();
    };
  }, [initCamera, stopCamera, needsManualStart]);

  const handleRetry = () => {
    setNeedsManualStart(false);
    initCamera();
  };

  const handleSuccess = (decodedText: string) => {
    if (isPaused.current) return;

    isPaused.current = true;
    setScanningStatus("success");

    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]); // luxury double tap vibration
    }

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        setTimeout(() => osc.stop(), 50);
      }
    } catch (e) { }

    onScan(decodedText);

    if (continuous) {
      setTimeout(() => {
        if (isPaused.current && isMounted.current) {
          setScanningStatus("scanning");
          isPaused.current = false;
        }
      }, 1200);
    } else {
      setTimeout(() => {
        if (isMounted.current) onClose();
      }, 600); // Wait a bit for success animation
    }
  };

  const handleClose = () => {
    isMounted.current = false;
    stopCamera();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-background w-full max-w-md md:rounded-[24px] rounded-[24px] shadow-2xl overflow-hidden flex flex-col border border-border/50"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-semibold text-lg leading-none">Scan Barcode</h2>
            <p className="text-xs text-muted-foreground mt-1">Point your camera at the barcode</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 -mr-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 relative bg-black/5 aspect-square md:aspect-[4/3] flex items-center justify-center overflow-hidden m-4 rounded-2xl border border-black/5 dark:border-white/5">
          {needsManualStart ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-black/40 absolute inset-0 z-50">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Camera Ready</h3>
              <p className="text-white/70 text-sm mb-6 max-w-[200px]">Tap to initialize the scanner</p>

              <button
                onClick={() => setNeedsManualStart(false)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-xl font-medium shadow-xl active:scale-95 transition-all text-sm w-full max-w-[200px]"
              >
                Scan Product
              </button>
            </div>
          ) : scanningStatus === "loading" && (
            <div className="flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p className="text-sm font-medium">
                {permissionState === 'prompt' ? "Camera access requested..." : "Initializing camera..."}
              </p>
              <p className="text-xs mt-2 opacity-70">
                {permissionState === 'prompt'
                  ? "Please click 'Allow' in the browser prompt to start scanning."
                  : "Setting up the scanner. This usually takes just a second."}
              </p>
              {showRetry && (
                <button
                  onClick={handleRetry}
                  className="mt-6 text-xs bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-sm active:scale-95 transition-all animate-pulse"
                >
                  Tap to Start Camera
                </button>
              )}
            </div>
          )}

          {!hasCamera && scanningStatus !== "loading" ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <p className="text-sm font-medium text-destructive">Live Camera Unavailable</p>
              <p className="text-xs mt-2 opacity-70">
                {!navigator.mediaDevices ? "HTTPS connection is required to access the live camera. " : ""}
                Please check your device permissions or use native fallback. {detailedError && <span className="block mt-2 text-[10px] text-red-500 font-mono bg-red-500/10 p-2 rounded-md border border-red-500/20">{detailedError}</span>}
              </p>

              <div className="mt-6 w-full flex flex-col gap-3">

                {permissionState === 'denied' || detailedError.includes('NotAllowedError') ? (
                  <button
                    onClick={() => {
                      setHasCamera(true);
                      setPermissionState('unknown');
                      initCamera();
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-medium text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                    Start Camera Manually
                  </button>
                ) : null}

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-muted-foreground/20"></div>
                  <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs opacity-70">OR</span>
                  <div className="flex-grow border-t border-muted-foreground/20"></div>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  id="native-camera-fallback"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setScanningStatus("loading");
                    setDetailedError("Processing image...");

                    try {
                      const hints = new Map();
                      hints.set(DecodeHintType.TRY_HARDER, true);
                      const reader = new BrowserMultiFormatReader(hints);

                      const imageUrl = URL.createObjectURL(file);
                      const img = new Image();
                      img.src = imageUrl;
                      await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                      });

                      const result = await reader.decodeFromImageElement(img);
                      URL.revokeObjectURL(imageUrl);

                      if (isMounted.current) {
                        handleSuccess(result.getText());
                      }
                    } catch (err) {
                      if (isMounted.current) {
                        setDetailedError("No barcode found in image. Try again or use manual entry.");
                        setScanningStatus("error");
                      }
                    }
                  }}
                />
                <label
                  htmlFor="native-camera-fallback"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-xl font-medium text-sm shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                  Take Photo of Barcode
                </label>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${scanningStatus === "loading" ? "opacity-0" : "opacity-100"}`}
                playsInline
                muted
                autoPlay
              />

              {scanningStatus !== "loading" && hasCamera && (
                <div className="relative z-10 w-[70%] max-w-[280px] aspect-video border-[3px] border-white/80 rounded-xl shadow-[0_0_0_999px_rgba(0,0,0,0.45)] flex items-center justify-center overflow-hidden">
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br-lg" />

                  <AnimatePresence>
                    {scanningStatus === "scanning" && (
                      <motion.div
                        className="absolute left-0 right-0 h-[2px] bg-red-500 shadow-[0_0_12px_3px_rgba(239,68,68,0.8)]"
                        animate={{ top: ["0%", "100%", "0%"] }}
                        transition={{ duration: 3, ease: "linear", repeat: Infinity }}
                      />
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {scanningStatus === "success" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-green-500/80 backdrop-blur-[2px]"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="bg-white rounded-full p-3 shadow-xl"
                        >
                          <Check className="w-8 h-8 text-green-600" />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}

          {/* Status pill */}
          {scanningStatus !== "loading" && hasCamera && (
            <div className="absolute bottom-4 z-20">
              <div className={`px-4 py-1.5 rounded-full backdrop-blur-md text-xs font-semibold shadow-lg transition-colors ${scanningStatus === "success"
                ? "bg-green-500/90 text-white"
                : "bg-black/60 text-white"
                }`}>
                {scanningStatus === "success" ? "Valid Barcode Detected" : "Position barcode within frame"}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BarcodeScanner;
