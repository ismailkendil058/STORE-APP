import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { CartItem, Product, Category, ProductSize, Session } from "@/types";
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
    const { data } = await supabase.from("products").select("*, product_sizes(*)");
    if (data) setProducts(data as unknown as Product[]);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*");
    if (data) setCategories(data as unknown as Category[]);
  };

  const openSection = async () => {
    if (!worker) return;
    const { data, error } = await supabase
      .from("sessions")
      .insert({ worker_id: worker.id })
      .select()
      .single();
    if (error) { toast.error("Failed to open section"); return; }
    setSession(data as unknown as Session);
    setSectionRevenue(0);
    toast.success("Section opened");
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
    toast.success("Section closed");
  };

  const addToCart = useCallback((product: Product, size?: ProductSize) => {
    setCart((prev) => {
      const key = product.id + (size?.id || "");
      const existing = prev.find(
        (item) => item.product.id === product.id && item.selectedSize?.id === size?.id
      );
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.selectedSize?.id === size?.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, selectedSize: size }];
    });
  }, []);

  const updateCartQuantity = (productId: string, sizeId: string | undefined, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) =>
        prev.filter(
          (item) => !(item.product.id === productId && item.selectedSize?.id === sizeId)
        )
      );
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === productId && item.selectedSize?.id === sizeId
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  const cartTotal = cart.reduce((sum, item) => {
    const price = item.selectedSize ? item.selectedSize.selling_price : item.product.selling_price;
    return sum + price * item.quantity;
  }, 0);

  const cartProfit = cart.reduce((sum, item) => {
    const sell = item.selectedSize ? item.selectedSize.selling_price : item.product.selling_price;
    const buy = item.selectedSize ? item.selectedSize.purchase_price : item.product.purchase_price;
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

    if (error || !sale) { toast.error("Sale failed"); return; }

    const items = cart.map((item) => ({
      sale_id: sale.id,
      product_id: item.product.id,
      product_name: item.product.name,
      size_ml: item.selectedSize?.size_ml || null,
      quantity: item.quantity,
      unit_price: item.selectedSize ? item.selectedSize.selling_price : item.product.selling_price,
      purchase_price: item.selectedSize ? item.selectedSize.purchase_price : item.product.purchase_price,
    }));

    await supabase.from("sale_items").insert(items);

    const newRevenue = sectionRevenue + cartTotal;
    setSectionRevenue(newRevenue);
    await supabase.from("sessions").update({ total_revenue: newRevenue }).eq("id", session.id);

    setCart([]);
    setShowCheckout(false);
    fetchProducts(); // refresh stock
    toast.success("Sale completed!");
  };

  const handleBarcodeScan = (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode);
    if (product) {
      addToCart(product);
      toast.success(`Added ${product.name}`);
    } else {
      toast.error("Product not found");
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
            Open a section to start selling
          </p>
        </div>
      )}
    </div>
  );
};

export default WorkerPOS;
