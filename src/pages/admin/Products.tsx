import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, X, ScanBarcode } from "lucide-react";
import { toast } from "sonner";
import BarcodeScanner from "@/components/pos/BarcodeScanner";

interface SizeEntry {
  size_ml: string;
  selling_price: string;
  purchase_price: string;
  stock: string;
}

const AdminProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const [name, setName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [quantityType, setQuantityType] = useState("unit");
  const [stock, setStock] = useState("");
  const [sizes, setSizes] = useState<SizeEntry[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*, product_sizes(*), categories(name)").order("created_at");
    if (data) setProducts(data);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data);
  };

  const resetForm = () => {
    setName(""); setPurchasePrice(""); setSellingPrice(""); setBarcode("");
    setCategoryId(""); setQuantityType("unit"); setStock(""); setSizes([]);
    setEditing(null);
    setShowScanner(false);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setName(p.name);
    setPurchasePrice(String(p.purchase_price));
    setSellingPrice(String(p.selling_price));
    setBarcode(p.barcode || "");
    setCategoryId(p.category_id || "");
    setQuantityType(p.quantity_type);
    setStock(String(p.stock));
    setSizes(
      (p.product_sizes || []).map((s: any) => ({
        size_ml: String(s.size_ml),
        selling_price: String(s.selling_price),
        purchase_price: String(s.purchase_price),
        stock: String(s.stock),
      }))
    );
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name required"); return; }

    const productData = {
      name,
      purchase_price: Number(purchasePrice) || 0,
      selling_price: Number(sellingPrice) || 0,
      barcode: barcode || null,
      category_id: categoryId || null,
      quantity_type: quantityType,
      stock: Number(stock) || 0,
    };

    let productId: string;

    if (editing) {
      const { error } = await supabase.from("products").update(productData).eq("id", editing.id);
      if (error) { toast.error("Update failed"); return; }
      productId = editing.id;
      await supabase.from("product_sizes").delete().eq("product_id", productId);
    } else {
      const { data, error } = await supabase.from("products").insert(productData).select().single();
      if (error || !data) { toast.error("Creation failed"); return; }
      productId = data.id;
    }

    if (quantityType === "ml" && sizes.length > 0) {
      const sizeData = sizes
        .filter((s) => s.size_ml)
        .map((s) => ({
          product_id: productId,
          size_ml: Number(s.size_ml),
          selling_price: Number(s.selling_price) || 0,
          purchase_price: Number(s.purchase_price) || 0,
          stock: Number(s.stock) || 0,
        }));
      if (sizeData.length > 0) {
        await supabase.from("product_sizes").insert(sizeData);
      }
    }

    setShowDialog(false);
    resetForm();
    fetchProducts();
    toast.success(editing ? "Product updated" : "Product added");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete product?")) return;
    await supabase.from("products").delete().eq("id", id);
    fetchProducts();
    toast.success("Deleted");
  };

  const addSize = () => setSizes([...sizes, { size_ml: "", selling_price: "", purchase_price: "", stock: "" }]);
  const removeSize = (i: number) => setSizes(sizes.filter((_, idx) => idx !== i));
  const updateSize = (i: number, field: keyof SizeEntry, value: string) => {
    const newSizes = [...sizes];
    newSizes[i][field] = value;
    setSizes(newSizes);
  };

  const handleBarcodeScan = (scannedBarcode: string) => {
    setBarcode(scannedBarcode);
    setShowScanner(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Products</h2>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} size="sm" className="rounded-xl gap-1">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      <div className="space-y-3">
        {products.map((p) => (
          <Card key={p.id} className="rounded-2xl luxury-shadow border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.categories?.name || "No category"} · {p.quantity_type === "ml" ? "ML sizes" : `${p.stock} in stock`}
                  </p>
                  <div className="flex gap-3 mt-1 text-sm tabular-nums">
                    <span>Buy: {Number(p.purchase_price).toLocaleString()} Dz</span>
                    <span>Sell: {Number(p.selling_price).toLocaleString()} Dz</span>
                    <span className="text-muted-foreground">
                      Profit: {(Number(p.selling_price) - Number(p.purchase_price)).toLocaleString()} Dz
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => openEdit(p)} className="p-2 hover:bg-secondary rounded-xl" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-secondary rounded-xl text-destructive" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {products.length === 0 && <p className="text-center text-muted-foreground text-sm mt-8">No products yet</p>}
      </div>

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className={`max-w-md rounded-2xl ${showScanner ? 'max-h-[500px] p-0' : 'max-h-[90vh] overflow-y-auto'}`}>
          <DialogHeader className="relative">
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
            <button
              onClick={() => setShowDialog(false)}
              className="absolute right-4 top-4 p-2 hover:bg-secondary rounded-xl transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </DialogHeader>
          
          {showScanner ? (
            <div className="space-y-0">
              <div className="flex items-center justify-between px-6 py-3 border-b">
                <p className="font-medium">Scan Barcode</p>
                <button onClick={() => setShowScanner(false)} className="p-2 hover:bg-secondary rounded-xl" title="Close scanner">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <BarcodeScanner 
                onScan={handleBarcodeScan}
                onClose={() => setShowScanner(false)}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <Input placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />

              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Purchase price (Dz)" type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="h-11 rounded-xl" />
                <Input placeholder="Selling price (Dz)" type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="h-11 rounded-xl" />
              </div>

              <div className="flex gap-2">
                <Input 
                  placeholder="Barcode (optional)" 
                  value={barcode} 
                  onChange={(e) => setBarcode(e.target.value)} 
                  className="h-11 rounded-xl flex-1" 
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowScanner(true)} 
                  className="h-11 rounded-xl px-3"
                  aria-label="Scan barcode"
                >
                  <ScanBarcode className="w-5 h-5" />
                </Button>
              </div>

              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={quantityType} onValueChange={setQuantityType}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unit">Unit-based</SelectItem>
                  <SelectItem value="ml">ML-based (sizes)</SelectItem>
                </SelectContent>
              </Select>

              {quantityType === "unit" && (
                <Input placeholder="Stock quantity" type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="h-11 rounded-xl" />
              )}

              {quantityType === "ml" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Sizes</p>
                    <Button type="button" variant="outline" size="sm" onClick={addSize} className="rounded-xl gap-1">
                      <Plus className="w-3 h-3" /> Size
                    </Button>
                  </div>
                  {sizes.map((s, i) => (
                    <div key={i} className="grid grid-cols-5 gap-1 items-center">
                      <Input placeholder="ml" value={s.size_ml} onChange={(e) => updateSize(i, "size_ml", e.target.value)} className="h-9 rounded-lg text-xs" />
                      <Input placeholder="Buy" value={s.purchase_price} onChange={(e) => updateSize(i, "purchase_price", e.target.value)} className="h-9 rounded-lg text-xs" />
                      <Input placeholder="Sell" value={s.selling_price} onChange={(e) => updateSize(i, "selling_price", e.target.value)} className="h-9 rounded-lg text-xs" />
                      <Input placeholder="Stock" value={s.stock} onChange={(e) => updateSize(i, "stock", e.target.value)} className="h-9 rounded-lg text-xs" />
                      <button onClick={() => removeSize(i)} className="p-1 text-destructive" title="Remove size"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={handleSave} className="w-full h-11 rounded-xl">{editing ? "Update" : "Add Product"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
