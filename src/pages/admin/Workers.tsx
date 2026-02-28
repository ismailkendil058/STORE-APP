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
    if (!name || pin.length !== 4) {
      toast.error("Name and 4-digit PIN required");
      return;
    }
    if (editing) {
      const { error } = await supabase.from("workers").update({ name, pin }).eq("id", editing.id);
      if (error) { toast.error("Update failed"); return; }
    } else {
      const { error } = await supabase.from("workers").insert({ name, pin });
      if (error) { toast.error("Creation failed"); return; }
    }
    setShowDialog(false);
    setEditing(null);
    setName("");
    setPin("");
    fetchWorkers();
    toast.success(editing ? "Worker updated" : "Worker added");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this worker?")) return;
    await supabase.from("workers").delete().eq("id", id);
    fetchWorkers();
    toast.success("Worker deleted");
  };

  const openEdit = (worker: any) => {
    setEditing(worker);
    setName(worker.name);
    setPin(worker.pin);
    setShowDialog(true);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Workers</h2>
        <Button
          onClick={() => { setEditing(null); setName(""); setPin(""); setShowDialog(true); }}
          size="sm"
          className="rounded-xl gap-1"
        >
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      <div className="space-y-3">
        {workers.map((w) => {
          const stat = workerStats.get(w.id);
          return (
            <Card key={w.id} className="rounded-2xl luxury-shadow border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{w.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {stat?.sessions || 0} sessions · {(stat?.revenue || 0).toLocaleString()} Dz total
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(w)} className="p-2 hover:bg-secondary rounded-xl">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(w.id)} className="p-2 hover:bg-secondary rounded-xl text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {workers.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-8">No workers yet</p>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Worker" : "Add Worker"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Worker name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl"
            />
            <Input
              placeholder="4-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4}
              inputMode="numeric"
              className="h-11 rounded-xl"
            />
            <Button onClick={handleSave} className="w-full h-11 rounded-xl">
              {editing ? "Update" : "Add Worker"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWorkers;
