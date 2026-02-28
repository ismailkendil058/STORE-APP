import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const AdminInventory = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from("products").select("*, product_sizes(*)").order("name");
      if (data) setProducts(data);
    };
    fetchProducts();
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Inventory</h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-11 rounded-xl bg-secondary border-0"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">Product</th>
              <th className="text-right py-3 px-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">Stock</th>
              <th className="text-right py-3 px-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">Buy</th>
              <th className="text-right py-3 px-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">Sell</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const isLow = p.quantity_type === "unit" && p.stock <= 5;
              return (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {isLow && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                          Low
                        </span>
                      )}
                    </div>
                    {p.quantity_type === "ml" && p.product_sizes?.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p.product_sizes.map((s: any) => `${s.size_ml}ml: ${s.stock}`).join(" · ")}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-right tabular-nums">
                    {p.quantity_type === "unit" ? p.stock : "—"}
                  </td>
                  <td className="py-3 px-2 text-right tabular-nums">
                    {Number(p.purchase_price).toLocaleString()}
                  </td>
                  <td className="py-3 px-2 text-right tabular-nums">
                    {Number(p.selling_price).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-8">No products found</p>
        )}
      </div>
    </div>
  );
};

export default AdminInventory;
