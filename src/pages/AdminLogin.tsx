import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from "sonner";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const loginEmail = email.endsWith('@gmail.com') ? email : `${email}@gmail.com`;
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error) {
      toast.error("بيانات الاعتماد غير صالحة");
    } else {
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
            type="text"
            placeholder="اسم المستخدم (مثال: admin)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl"
          />
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
