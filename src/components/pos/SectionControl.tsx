import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface SectionControlProps {
  workerName: string;
  sectionRevenue: number;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const SectionControl = ({ workerName, sectionRevenue, isOpen, onOpen, onClose }: SectionControlProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 pt-4 pb-3 border-b border-border bg-background sticky top-0 z-30"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Worker</p>
          <p className="font-semibold text-foreground">{workerName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Section Total</p>
          <p className="text-xl font-bold text-foreground tabular-nums">
            {sectionRevenue.toLocaleString()} Dz
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {!isOpen ? (
          <Button onClick={onOpen} className="flex-1 h-10 rounded-xl text-sm font-medium">
            Open Section
          </Button>
        ) : (
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 h-10 rounded-xl text-sm font-medium"
          >
            Close Section
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default SectionControl;
