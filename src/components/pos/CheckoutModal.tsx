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
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">الدفع</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">المبلغ الإجمالي</p>
            <p className="text-3xl font-bold text-foreground tabular-nums">
              {total.toLocaleString()} دج
            </p>
          </div>

          <Button
            onClick={() => {
              onConfirm();
            }}
            className="w-full h-12 rounded-xl text-base font-semibold"
          >
            تأكيد البيع
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
