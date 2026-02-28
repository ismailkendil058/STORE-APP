import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  total: number;
  onConfirm: () => void;
}

const CheckoutModal = ({ open, onClose, total, onConfirm }: CheckoutModalProps) => {
  const [paid, setPaid] = useState("");
  const paidAmount = Number(paid) || 0;
  const change = paidAmount - total;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">Checkout</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-3xl font-bold text-foreground tabular-nums">
              {total.toLocaleString()} Dz
            </p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Money Received</label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              className="h-12 rounded-xl text-lg text-center font-semibold"
              autoFocus
            />
          </div>

          {paidAmount > 0 && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Change</p>
              <p className={`text-2xl font-bold tabular-nums ${change >= 0 ? "text-foreground" : "text-destructive"}`}>
                {change >= 0 ? change.toLocaleString() : "—"} Dz
              </p>
            </div>
          )}

          <Button
            onClick={() => {
              onConfirm();
              setPaid("");
            }}
            disabled={paidAmount < total}
            className="w-full h-12 rounded-xl text-base font-semibold"
          >
            Confirm Sale
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
