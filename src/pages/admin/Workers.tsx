import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const AdminWorkers = () => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [workerStats, setWorkerStats] = useState<Map<string, { sessions: number; revenue: number }>>(new Map());
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => { fetchWorkers(); }, []);

  const fetchWorkers = async () => {
    const { data } = await supabase.from("workers").select("*").order("created_at");
    if (data) {
      setWorkers(data);
      // Fetch stats
      const { data: sessions } = await supabase.from("sessions").select("worker_id, total_revenue");
      const stats = new Map<string, { sessions: number; revenue: number }>();
      (sessions || []).forEach((s: any) => {
        const existing = stats.get(s.worker_id) || { sessions: 0, revenue: 0 };
        existing.sessions += 1;
        existing.revenue += Number(s.total_revenue) || 0;
        stats.set(s.worker_id, existing);
      });
      setWorkerStats(stats);
    }
  };

  const handleSave = async () => {
    if (!name || pin.length < 4) {
      toast.error("الاسم ورمز PIN مطلوبان (على الأقل 4 أرقام)");
      return;
    }
    if (editing) {
      const { error } = await supabase.from("workers").update({ name, pin, is_admin: isAdmin }).eq("id", editing.id);
      if (error) { toast.error("فشل التحديث"); return; }
    } else {
      const { error } = await supabase.from("workers").insert({ name, pin, is_admin: isAdmin });
      if (error) { toast.error("فشل الإنشاء"); return; }
    }
    setShowDialog(false);
    setEditing(null);
    setName("");
    setPin("");
    fetchWorkers();
    toast.success(editing ? "تم تحديث العامل" : "تمت إضافة العامل");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا العامل؟")) return;
    await supabase.from("workers").delete().eq("id", id);
    fetchWorkers();
    toast.success("تم حذف العامل");
  };

  const openEdit = (worker: any) => {
    setEditing(worker);
    setName(worker.name);
    setPin(worker.pin);
    setIsAdmin(worker.is_admin || false);
    setShowDialog(true);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">العمال</h2>
        <Button
          onClick={() => { setEditing(null); setName(""); setPin(""); setShowDialog(true); }}
          size="sm"
          className="rounded-xl gap-1"
        >
          <Plus className="w-4 h-4" /> إضافة
        </Button>
      </div>

      <div className="space-y-3">
        {workers.map((w) => {
          const stat = workerStats.get(w.id);
          return (
            <Card key={w.id} className="rounded-2xl luxury-shadow border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{w.name}</p>
                    {w.is_admin && (
                      <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">مسؤول</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stat?.sessions || 0} جلسات · {(stat?.revenue || 0).toLocaleString()} دج إجمالي
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(w)} className="p-2 hover:bg-secondary rounded-xl">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="p-2 hover:bg-secondary rounded-xl text-destructive disabled:opacity-30"
                    disabled={w.is_admin}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {workers.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-8">لا يوجد عمال بعد</p>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setEditing(null);
          setName("");
          setPin("");
          setIsAdmin(false);
        }
      }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل العامل" : "إضافة عامل"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="اسم العامل"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl"
            />
            <Input
              placeholder="رمز PIN / كلمة المرور"
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="h-11 rounded-xl"
            />
            <label className="flex items-center gap-2 px-1 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="rounded text-primary border-border"
              />
              إعطاء صلاحيات مسؤول
            </label>
            <Button onClick={handleSave} className="w-full h-11 rounded-xl mt-2">
              {editing ? "تحديث" : "إضافة عامل"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWorkers;
