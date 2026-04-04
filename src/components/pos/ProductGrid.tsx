import { useState } from "react";
import type { Product } from "@/types";
import { motion } from "framer-motion";

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product, customAmount?: number) => void;
}

const ProductGrid = ({ products, onAddToCart }: ProductGridProps) => {
  return (
    <div className="flex-1 px-4 pb-32 overflow-y-auto">
      <div className="grid grid-cols-2 gap-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={onAddToCart} />
        ))}
      </div>
      {products.length === 0 && (
        <p className="text-center text-muted-foreground mt-12 text-sm">لا توجد منتجات</p>
      )}
    </div>
  );
};

const ProductCard = ({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (product: Product, customAmount?: number) => void;
}) => {
  const [isCustom, setIsCustom] = useState(false);
  const [amount, setAmount] = useState("");

  const isBulkKg = product.quantity_type === "kg";
  const displayPrice = product.selling_price;
  const inStock = product.stock > 0;

  const handleAdd = () => {
    if (isBulkKg) {
      if (!isCustom) {
        setIsCustom(true);
        return;
      }
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) return;
      onAdd(product, numAmount);
      setAmount("");
      setIsCustom(false);
    } else {
      onAdd(product);
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="bg-card rounded-2xl p-3 luxury-shadow border border-border/50"
    >
      <div className="mb-2">
        <h3 className="font-medium text-sm text-foreground leading-tight line-clamp-2">
          {product.name}
        </h3>
        <p className="text-lg font-bold text-foreground mt-1 tabular-nums">
          {Number(displayPrice).toLocaleString()} دج
          {product.quantity_type === "kg" && <span className="text-[10px] font-normal ml-1">/كغ</span>}
        </p>
        {!inStock && (
          <span className="text-xs text-destructive font-medium">نفدت الكمية</span>
        )}
      </div>

      {isCustom ? (
        <div className="flex gap-1">
          <input
            autoFocus
            type="number"
            placeholder="المبلغ دج"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full h-10 px-2 rounded-xl bg-secondary text-sm"
          />
          <button
            onClick={handleAdd}
            className="px-3 h-10 rounded-xl bg-foreground text-background text-sm font-medium"
          >
            تم
          </button>
        </div>
      ) : (
        <button
          onClick={handleAdd}
          disabled={!inStock}
          className="w-full py-2 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-30 active:scale-95 transition-transform"
        >
          {isBulkKg ? "بيع بالمبلغ" : "إضافة"}
        </button>
      )}
    </motion.div>
  );
};

export default ProductGrid;
