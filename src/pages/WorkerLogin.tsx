import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const WorkerLogin = () => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError("");
      if (newPin.length === 4) {
        authenticateWorker(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError("");
  };

  const authenticateWorker = async (workerPin: string) => {
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.rpc("authenticate_worker", {
        p_pin: workerPin,
      });
      if (fnError || data?.error) {
        setError("رمز PIN غير صالح");
        setPin("");
      } else {
        sessionStorage.setItem("worker", JSON.stringify(data.worker));
        navigate("/pos");
      }
    } catch {
      setError("خطأ في الاتصال");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xs"
      >
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            STORE APP
          </h1>
          <p className="text-sm text-muted-foreground mt-2">أدخل رمز PIN الخاص بك للمتابعة</p>
        </div>

        <div className="flex justify-center gap-3 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: pin.length > i ? 1 : 0.8 }}
              className={`w-4 h-4 rounded-full border-2 transition-colors duration-200 ${pin.length > i
                  ? "bg-foreground border-foreground"
                  : "border-muted-foreground/30"
                }`}
            />
          ))}
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-destructive text-sm mb-4"
          >
            {error}
          </motion.p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {digits.map((d, i) => (
            <div key={i}>
              {d === "" ? (
                <div />
              ) : d === "del" ? (
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full aspect-square rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors active:scale-95"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                    <line x1="18" y1="9" x2="12" y2="15" />
                    <line x1="12" y1="9" x2="18" y2="15" />
                  </svg>
                </button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleDigit(d)}
                  disabled={loading}
                  className="w-full aspect-square rounded-2xl bg-secondary text-foreground text-xl font-medium hover:bg-accent transition-colors flex items-center justify-center"
                >
                  {d}
                </motion.button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <button
            onClick={() => navigate("/admin/login")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            دخول المسؤول
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default WorkerLogin;
