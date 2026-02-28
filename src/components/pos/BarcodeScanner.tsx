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

  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
  }, []);

  const initCamera = useCallback(async () => {
    let mounted = true;
    setScanningStatus("loading");

    // Configuration for high accuracy and difficult barcodes
    // EAN_13 is the standard for Algerian GS1 barcodes (startsWith 613)
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, // GS1 Algeria (613)
      BarcodeFormat.EAN_8,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128, // GS1-128
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.CODABAR,
      BarcodeFormat.ITF,
    ]);

    const reader = new BrowserMultiFormatReader(hints);

    try {
      // By skipping listVideoInputDevices, we instantly request the camera, which is significantly faster.
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 720 }, // Lowered from 1280 to 720 for instantly fast loading on mobile
          height: { ideal: 480 },
          advanced: [{ focusMode: "continuous" } as any],
        },
      };

      const scanCallback = (result: any, err: any) => {
        if (result && mounted) {
          handleSuccess(result.getText());
        }
      };

      if (videoRef.current) {
        // Direct request to constraints without Device ID lookup overhead
        const controls = await reader.decodeFromConstraints(constraints, videoRef.current, scanCallback);
        if (mounted) {
          controlsRef.current = controls;
          setHasCamera(true);
          setScanningStatus("scanning");
        } else {
          controls.stop();
        }
      }
    } catch (err) {
      console.error("Scanner init error:", err);
      if (mounted) {
        setHasCamera(false);
        setScanningStatus("error");
      }
    }

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    initCamera();
    return () => {
      stopCamera();
    };
  }, [initCamera, stopCamera]);

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
        if (isPaused.current) {
          setScanningStatus("scanning");
          isPaused.current = false;
        }
      }, 1200);
    } else {
      setTimeout(() => onClose(), 600); // Wait a bit for success animation
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex md:items-center items-end justify-center md:p-4 pb-0"
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-background w-full max-w-md md:rounded-[24px] rounded-t-[24px] md:rounded-b-[24px] shadow-2xl overflow-hidden flex flex-col border border-border/50"
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
              <p className="text-sm font-medium">Accessing camera...</p>
              <p className="text-xs mt-2 opacity-70">Please allow camera permissions if prompted</p>
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
