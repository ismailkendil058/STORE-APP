import { useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

// All supported barcode formats
const SUPPORTED_FORMATS: number[] = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.PDF_417,
  Html5QrcodeSupportedFormats.AZTEC,
  Html5QrcodeSupportedFormats.MAXICODE,
  Html5QrcodeSupportedFormats.RSS_14,
  Html5QrcodeSupportedFormats.RSS_EXPANDED,
];

const BarcodeScanner = ({ onScan, onClose }: BarcodeScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanning = useRef(false);

  const handleClose = async () => {
    if (scannerRef.current && isScanning.current) {
      try {
        await scannerRef.current.stop();
        isScanning.current = false;
      } catch (err) {
        // Scanner may already be stopped
        console.log("Scanner stop error:", err);
      }
    }
    onClose();
  };

  useEffect(() => {
    const scanner = new Html5Qrcode("barcode-reader", {
      formatsToSupport: SUPPORTED_FORMATS,
      verbose: false,
    });
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 },
      (decodedText) => {
        isScanning.current = false;
        scanner.stop().then(() => onScan(decodedText)).catch(() => {});
      },
      () => {}
    ).then(() => {
      isScanning.current = true;
    }).catch(() => {});

    return () => {
      if (scannerRef.current && isScanning.current) {
        scannerRef.current.stop().catch(() => {});
        isScanning.current = false;
      }
    };
  }, [onScan]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background/95 flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="font-semibold">Scan Barcode</h2>
        <button onClick={handleClose} className="p-2 hover:bg-secondary rounded-xl" aria-label="Close scanner">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <div id="barcode-reader" className="w-full max-w-sm rounded-2xl overflow-hidden" />
      </div>
      <p className="text-center text-sm text-muted-foreground pb-6">
        Point your camera at a barcode
      </p>
    </motion.div>
  );
};

export default BarcodeScanner;
