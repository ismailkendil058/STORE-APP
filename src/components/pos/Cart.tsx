import type { CartItem } from "@/types";
import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";

interface CartProps {
  items: CartItem[];
  total: number;
  onUpdateQuantity: (productId: string, sizeId: string | undefined, quantity: number) => void;
  onCheckout: () => void;
}

const Cart = ({ items, total, onUpdateQuantity, onCheckout }: CartProps) => {
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 luxury-shadow-lg"
    >
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="max-h-36 overflow-y-auto mb-3 space-y-2">
          {items.map((item) => {
            const key = item.product.id + (item.selectedSize?.id || "") + (item.customAmountDa ? "_custom" : "");
            const price = item.selectedSize ? item.selectedSize.selling_price : item.product.selling_price;
            return (
              <div key={key} className="flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0 mr-2">
                  <span className="text-foreground truncate block">
                    {item.product.name}
                    {item.selectedSize && ` · ${item.selectedSize.size_kg}kg`}
                    {item.customAmountDa && ` · ${item.quantity.toFixed(3)}kg`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateQuantity(item.product.id, item.selectedSize?.id, item.customAmountDa ? 0 : item.quantity - 1)}
                    className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center active:scale-90 text-destructive"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className={`${item.customAmountDa ? 'min-w-[4rem]' : 'w-10'} text-center font-medium tabular-nums`}>
                    {item.customAmountDa ? `${item.quantity.toFixed(3)} كغ` : item.quantity}
                  </span>
                  {!item.customAmountDa && (
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, item.selectedSize?.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center active:scale-90"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                  <span className="w-20 text-right font-medium tabular-nums ml-1">
                    {(item.customAmountDa || Number(price) * item.quantity).toLocaleString()} دج
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={onCheckout}
          className="w-full py-3 rounded-2xl bg-foreground text-background font-semibold text-base active:scale-[0.98] transition-transform"
        >
          الدفع · {total.toLocaleString()} دج
        </button>
      </div>
    </motion.div>
  );
};

export default Cart;
