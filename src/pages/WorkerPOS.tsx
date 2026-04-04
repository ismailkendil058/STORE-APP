import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { CartItem, Product, Category, Session } from "@/types";
import SectionControl from "@/components/pos/SectionControl";
import ProductSearch from "@/components/pos/ProductSearch";
import CategoryCarousel from "@/components/pos/CategoryCarousel";
import ProductGrid from "@/components/pos/ProductGrid";
import Cart from "@/components/pos/Cart";
import CheckoutModal from "@/components/pos/CheckoutModal";
import { toast } from "sonner";

const WorkerPOS = () => {
  const navigate = useNavigate();
  const [worker, setWorker] = useState<{ id: string; name: string } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [sectionRevenue, setSectionRevenue] = useState(0);

  useEffect(() => {
    const w = sessionStorage.getItem("worker");
    if (!w) { navigate("/"); return; }
    setWorker(JSON.parse(w));
  }, [navigate]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!worker) return;
    // Check for existing open session
    const checkSession = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("worker_id", worker.id)
        .is("closed_at", null)
        .order("started_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setSession(data[0] as unknown as Session);
        setSectionRevenue(Number(data[0].total_revenue) || 0);
      }
    };
    checkSession();
  }, [worker]);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*");
    if (error) {
      console.error("Error fetching products:", error);
      toast.error("خطأ في جلب المنتجات: " + error.message);
    }
    if (data) setProducts(data as unknown as Product[]);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase.from("categories").select("*");
    if (error) console.error("Error fetching categories:", error);
    if (data) setCategories(data as unknown as Category[]);
  };

  const openSection = async () => {
    if (!worker) return;

    // Get start of today in local timezone
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // Check if the worker already has a session today
    const { data: existingSessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("worker_id", worker.id)
      .gte("started_at", startOfDay)
      .order("started_at", { ascending: false })
      .limit(1);

    if (existingSessions && existingSessions.length > 0) {
      const sess = existingSessions[0];
      // Reopen the existing daily session
      await supabase.from("sessions").update({ closed_at: null }).eq("id", sess.id);
      sess.closed_at = null;
      setSession(sess as unknown as Session);
      setSectionRevenue(Number(sess.total_revenue) || 0);
      toast.success("تم استئناف الجلسة اليومية");
      return;
    }

    const { data, error } = await supabase
      .from("sessions")
      .insert({ worker_id: worker.id })
      .select()
      .single();
    if (error) { toast.error("فشل فتح الجلسة"); return; }
    setSession(data as unknown as Session);
    setSectionRevenue(0);
    toast.success("تم فتح الجلسة");
  };

  const closeSection = async () => {
    if (!session) return;
    await supabase
      .from("sessions")
      .update({ closed_at: new Date().toISOString(), total_revenue: sectionRevenue })
      .eq("id", session.id);
    setSession(null);
    setSectionRevenue(0);
    setCart([]);
    sessionStorage.removeItem("worker");
    navigate("/");
    toast.success("تم إغلاق الجلسة");
  };

  const addToCart = useCallback((product: Product, customAmount?: number) => {
    setCart((prev) => {
      if (customAmount) {
        const existingCustom = prev.find(
          (item) => item.product.id === product.id && item.customAmountDa
        );
        if (existingCustom) {
          const newAmount = (existingCustom.customAmountDa || 0) + customAmount;
          return prev.map((item) =>
            item.product.id === product.id && item.customAmountDa
              ? {
                ...item,
                customAmountDa: newAmount,
                quantity: newAmount / product.selling_price,
              }
              : item
          );
        }
        const quantity = customAmount / product.selling_price;
        return [...prev, { product, quantity, customAmountDa: customAmount }];
      }

      const existing = prev.find(
        (item) => item.product.id === product.id && !item.customAmountDa
      );
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && !item.customAmountDa
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) =>
        prev.filter((item) => item.product.id !== productId)
      );
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === productId
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  const cartTotal = cart.reduce((sum, item) => {
    if (item.customAmountDa) return sum + item.customAmountDa;
    const price = item.product.selling_price;
    return sum + price * item.quantity;
  }, 0);

  const cartProfit = cart.reduce((sum, item) => {
    const sell = item.product.selling_price;
    const buy = item.product.purchase_price;
    return sum + (sell - buy) * item.quantity;
  }, 0);

  const confirmSale = async () => {
    if (!session || !worker || cart.length === 0) return;

    const { data: sale, error } = await supabase
      .from("sales")
      .insert({
        session_id: session.id,
        worker_id: worker.id,
        total: cartTotal,
        profit: cartProfit,
      })
      .select()
      .single();

    if (error || !sale) { toast.error("فشلت عملية البيع"); return; }

    const items = cart.map((item) => ({
      sale_id: sale.id,
      product_id: item.product.id,
      product_name: item.product.name,
      size_kg: null,
      quantity: item.quantity,
      unit_price: item.product.selling_price,
      purchase_price: item.product.purchase_price,
    }));

    await supabase.from("sale_items").insert(items);

    const newRevenue = sectionRevenue + cartTotal;
    setSectionRevenue(newRevenue);
    await supabase.from("sessions").update({ total_revenue: newRevenue }).eq("id", session.id);

    setCart([]);
    setShowCheckout(false);
    fetchProducts(); // refresh stock
    toast.success("اكتملت عملية البيع!");
  };

  const handleBarcodeScan = (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode);
    if (product) {
      addToCart(product);
      toast.success(`تمت إضافة ${product.name}`);
    } else {
      toast.error("المنتج غير موجود");
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search));
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (!worker) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SectionControl
        workerName={worker.name}
        sectionRevenue={sectionRevenue}
        isOpen={!!session}
        onOpen={openSection}
        onClose={closeSection}
      />

      {session ? (
        <>
          <ProductSearch
            search={search}
            onSearchChange={setSearch}
            onBarcodeScan={handleBarcodeScan}
          />
          <CategoryCarousel
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
          <ProductGrid
            products={filteredProducts}
            onAddToCart={addToCart}
          />
          {cart.length > 0 && (
            <Cart
              items={cart}
              total={cartTotal}
              onUpdateQuantity={updateCartQuantity}
              onCheckout={() => setShowCheckout(true)}
            />
          )}
          <CheckoutModal
            open={showCheckout}
            onClose={() => setShowCheckout(false)}
            total={cartTotal}
            onConfirm={confirmSale}
          />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-muted-foreground text-center">
            افتح جلسة لبدء البيع
          </p>
        </div>
      )}
    </div>
  );
};

export default WorkerPOS;
