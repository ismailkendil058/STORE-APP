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
      // Ensure we clean up any previous stream/controls first
      stopCamera();

      // Removed 300ms delay to ensure the request is physically closer to the user gesture (mount button click)
      if (!isMounted.current) return;

      // Simple detection for Apple's specific requirements
      const isIOSPWA = /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        ((window as any).navigator?.standalone || window.matchMedia('(display-mode: standalone)').matches);

      if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
        try {
          // Camera permission query is somewhat unstable/unsupported on many mobile platforms
          // We'll proceed regardless but use it as a helpful "early out" if denied
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          setPermissionState(result.state);

          if (result.state === 'denied' && isMounted.current) {
            setHasCamera(false);
            setScanningStatus("error");
            return;
          }
        } catch (e) {
          console.log("Permission query not supported", e);
        }
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

      // More robust constraints for iOS
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          // Using more standard dimensions instead of just ideal to help some older iOS versions
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        },
      };

      const scanCallback = (result: any, err: any) => {
        if (result && isMounted.current) {
          handleSuccess(result.getText());
        }
      };

      // Set a timeout to show retry if it takes too long
      retryTimeout = setTimeout(() => {
        if (isMounted.current && scanningStatusRef.current === "loading") {
          setShowRetry(true);
        }
      }, 5000); // Reduced to 5s for faster feedback on iOS

      if (videoRef.current) {
        // Direct stream access
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!isMounted.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;

        // CRITICAL FOR iOS PWA: 
        // We MUST attempt to play and catch any block. 
        // If it blocks, we'll need the user to tap to manually start it.
        try {
          await videoRef.current.play();
          setPermissionState('granted');
        } catch (playError) {
          console.error("Video play error (likely blocked by iOS PWA policy):", playError);
          // If playback is blocked, it means iOS didn't consider our mount as a direct enough gesture.
          // The UI will show the "Tap to retry" or we can show a specific "Start Camera" button.
          setShowRetry(true);
          return; // Stop here and wait for retry intervention
        }

        if (retryTimeout) clearTimeout(retryTimeout);

        // Start decoding from the already-playing element
        const controls = await reader.decodeFromVideoElement(videoRef.current, scanCallback);

        if (isMounted.current) {
          controlsRef.current = controls;
          setHasCamera(true);
          setScanningStatus("scanning");
        } else {
          controls.stop();
          stream.getTracks().forEach(track => track.stop());
        }
      }
    } catch (err) {
      console.error("Scanner init error:", err);
      if (retryTimeout) clearTimeout(retryTimeout);
      if (isMounted.current) {
        setHasCamera(false);
        setScanningStatus("error");
      }
    }
  }, [stopCamera]);

  useEffect(() => {
    isMounted.current = true;
    initCamera();

    return () => {
      isMounted.current = false;
      stopCamera();
    };
  }, [initCamera, stopCamera]);

  const handleRetry = () => {
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
          {scanningStatus === "loading" && (
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
              <p className="text-sm font-medium text-destructive">Camera unavailable</p>
              <p className="text-xs mt-2 opacity-70">Please check your device permissions or use manual entry on the product form.</p>
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
