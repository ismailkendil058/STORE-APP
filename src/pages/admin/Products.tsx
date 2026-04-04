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

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*, categories(name)").order("created_at");
    if (data) setProducts(data);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data);
  };

  const resetForm = () => {
    setName(""); setPurchasePrice(""); setSellingPrice(""); setBarcode("");
    setCategoryId(""); setQuantityType("unit"); setStock("");
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
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("الاسم مطلوب"); return; }

    const productData = {
      name,
      purchase_price: Number(purchasePrice) || 0,
      selling_price: Number(sellingPrice) || 0,
      barcode: barcode || null,
      category_id: categoryId || null,
      quantity_type: quantityType,
      stock: Number(stock) || 0,
    };

    if (editing) {
      const { error } = await supabase.from("products").update(productData).eq("id", editing.id);
      if (error) { toast.error("فشل التحديث"); return; }
    } else {
      const { data, error } = await supabase.from("products").insert(productData).select().single();
      if (error || !data) { toast.error("فشل الإنشاء"); return; }
    }

    setShowDialog(false);
    resetForm();
    fetchProducts();
    toast.success(editing ? "تم تحديث المنتج" : "تمت إضافة المنتج");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف المنتج؟")) return;
    await supabase.from("products").delete().eq("id", id);
    fetchProducts();
    toast.success("تم الحذف");
  };

  const handleBarcodeScan = (scannedBarcode: string) => {
    setBarcode(scannedBarcode);
    setShowScanner(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">المنتجات</h2>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} size="sm" className="rounded-xl gap-1">
          <Plus className="w-4 h-4" /> إضافة
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
                    {p.categories?.name || "بدون فئة"} · {p.quantity_type === "kg" ? `${p.stock} كغ` : `${p.stock} في المخزون`}
                  </p>
                  <div className="flex gap-3 mt-1 text-sm tabular-nums">
                    <span>شراء: {Number(p.purchase_price).toLocaleString()} دج</span>
                    <span>بيع: {Number(p.selling_price).toLocaleString()} دج</span>
                    <span className="text-muted-foreground">
                      أرباح: {(Number(p.selling_price) - Number(p.purchase_price)).toLocaleString()} دج
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
        {products.length === 0 && <p className="text-center text-muted-foreground text-sm mt-8">لا يوجد منتجات بعد</p>}
      </div>

      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل المنتج" : "إضافة منتج"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input placeholder="اسم المنتج" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />

            <Select value={quantityType} onValueChange={setQuantityType}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unit">بالوحدة</SelectItem>
                <SelectItem value="kg">بالكيلوغرام (أوزان)</SelectItem>
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="سعر الشراء (دج)" type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="h-11 rounded-xl" />
              <Input placeholder="سعر البيع (دج)" type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="h-11 rounded-xl" />
            </div>

            {quantityType !== "kg" && (
              <div className="flex gap-2">
                <Input
                  placeholder="الرمز الشريطي (اختياري)"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="h-11 rounded-xl flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                      stream.getTracks().forEach(t => t.stop());
                      setShowScanner(true);
                    } catch (err) {
                      console.warn("Pre-permission failed or was denied", err);
                      setShowScanner(true);
                    }
                  }}
                  className="h-11 rounded-xl px-3"
                  aria-label="Scan barcode"
                >
                  <ScanBarcode className="w-5 h-5" />
                </Button>
              </div>
            )}

            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="الفئة" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(quantityType === "unit" || quantityType === "kg") && (
              <Input
                placeholder={quantityType === "unit" ? "كمية المخزون" : "الوزن الإجمالي (كغ)"}
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="h-11 rounded-xl"
              />
            )}

            <Button onClick={handleSave} className="w-full h-11 rounded-xl">{editing ? "تحديث" : "إضافة منتج"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scanner is mounted purely as an overlay outside the core flow */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default AdminProducts;
