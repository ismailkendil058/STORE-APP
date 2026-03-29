import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import BarcodeScanner from "./BarcodeScanner";

interface ProductSearchProps {
  search: string;
  onSearchChange: (value: string) => void;
  onBarcodeScan: (barcode: string) => void;
}

const ProductSearch = ({ search, onSearchChange, onBarcodeScan }: ProductSearchProps) => {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <div className="px-4 py-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="البحث عن المنتجات أو الرمز الشريطي..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-11 rounded-xl bg-secondary border-0"
          />
        </div>
        <button
          onClick={async () => {
            try {
              // Same user gesture stack fix for iOS Safari shortcuts
              const stream = await navigator.mediaDevices.getUserMedia({ video: true });
              stream.getTracks().forEach(t => t.stop());
              setShowScanner(true);
            } catch (err) {
              setShowScanner(true);
            }
          }}
          className="h-11 w-11 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0 active:scale-95 transition-transform"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="7" y1="8" x2="13" y2="8" />
            <line x1="7" y1="16" x2="17" y2="16" />
          </svg>
        </button>
      </div>

      {showScanner && (
        <BarcodeScanner
          continuous={true}
          onScan={(code) => {
            onBarcodeScan(code);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default ProductSearch;
