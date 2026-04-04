import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from "sonner";

const AdminLogin = () => {
  const [email] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await (supabase as any)
      .from("workers")
      .select("id")
      .eq("pin", password)
      .eq("is_admin", true)
      .single();

    if (error || !data) {
      toast.error("بيانات الاعتماد غير صالحة");
    } else {
      sessionStorage.setItem("admin", "true");
      navigate("/admin");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">لوحة تحكم المسؤول</h1>
          <p className="text-sm text-muted-foreground mt-1">STORE APP</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl"
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-base font-medium"
          >
            {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← نقطة بيع العامل
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
