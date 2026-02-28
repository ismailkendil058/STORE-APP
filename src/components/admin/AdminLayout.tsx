import { useState, useEffect } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, Layers, Package, Warehouse, LogOut } from "lucide-react";

const AdminLayout = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin/login"); return; }
      setLoading(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) navigate("/admin/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (loading) return <div className="min-h-screen bg-background" />;

  const links = [
    { to: "/admin", icon: BarChart3, label: "Analytics", end: true },
    { to: "/admin/workers", icon: Users, label: "Workers" },
    { to: "/admin/categories", icon: Layers, label: "Categories" },
    { to: "/admin/products", icon: Package, label: "Products" },
    { to: "/admin/inventory", icon: Warehouse, label: "Inventory" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-background z-30">
        <h1 className="font-semibold tracking-tight">Luxury Parfume</h1>
        <button onClick={handleLogout} className="p-2 hover:bg-secondary rounded-xl">
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
        <div className="flex justify-around py-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`
              }
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AdminLayout;
