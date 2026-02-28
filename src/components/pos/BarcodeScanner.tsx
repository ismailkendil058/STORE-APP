import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

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
    const scanner = new Html5Qrcode("barcode-reader");
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 150 } },
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
