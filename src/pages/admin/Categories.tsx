import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const AdminCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("created_at");
    if (data) setCategories(data);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    if (editing) {
      await supabase.from("categories").update({ name }).eq("id", editing.id);
    } else {
      await supabase.from("categories").insert({ name });
    }
    setShowDialog(false);
    setEditing(null);
    setName("");
    fetchCategories();
    toast.success(editing ? "Updated" : "Added");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete category?")) return;
    await supabase.from("categories").delete().eq("id", id);
    fetchCategories();
    toast.success("Deleted");
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Categories</h2>
        <Button onClick={() => { setEditing(null); setName(""); setShowDialog(true); }} size="sm" className="rounded-xl gap-1">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      <div className="space-y-3">
        {categories.map((c) => (
          <Card key={c.id} className="rounded-2xl luxury-shadow border-border/50">
            <CardContent className="p-4 flex items-center justify-between">
              <p className="font-medium">{c.name}</p>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(c); setName(c.name); setShowDialog(true); }} className="p-2 hover:bg-secondary rounded-xl">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-secondary rounded-xl text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
        {categories.length === 0 && <p className="text-center text-muted-foreground text-sm mt-8">No categories yet</p>}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
            <Button onClick={handleSave} className="w-full h-11 rounded-xl">{editing ? "Update" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCategories;
