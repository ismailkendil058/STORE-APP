import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronRight, Package, History } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const AdminDashboard = () => {
  const [period, setPeriod] = useState("today");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState({ revenue: 0, profit: 0, workerStats: [] as any[] });

  // Session details state
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionItems, setSessionItems] = useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchRecentSessions();
  }, [period, selectedDate]);

  const getFilters = () => {
    const now = new Date();
    let start: Date;
    let end: Date | null = null;

    if (period === "today") {
      start = new Date(selectedDate);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    } else if (period === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
    }
    return { start: start.toISOString(), end: end ? end.toISOString() : null };
  };

  const fetchStats = async () => {
    const { start, end } = getFilters();
    let query = supabase
      .from("sales")
      .select("total, profit, worker_id")
      .gte("created_at", start);

    if (end) query = query.lt("created_at", end);

    const { data: sales } = await query;

    if (!sales) return;

    const revenue = sales.reduce((s, r) => s + Number(r.total), 0);
    const profit = sales.reduce((s, r) => s + Number(r.profit), 0);

    const { data: workers } = await supabase.from("workers").select("id, name");
    const workerMap = new Map((workers || []).map((w: any) => [w.id, w.name]));

    const byWorker = new Map<string, { revenue: number; profit: number; name: string }>();
    sales.forEach((s) => {
      const existing = byWorker.get(s.worker_id) || { revenue: 0, profit: 0, name: workerMap.get(s.worker_id) || "Unknown" };
      existing.revenue += Number(s.total);
      existing.profit += Number(s.profit);
      byWorker.set(s.worker_id, existing);
    });

    setStats({
      revenue,
      profit,
      workerStats: Array.from(byWorker.values()),
    });
  };


  const fetchRecentSessions = async () => {
    const { start, end } = getFilters();
    let query = supabase
      .from("sessions")
      .select(`
        *,
        workers (name)
      `)
      .gte("started_at", start);

    if (end) query = query.lt("started_at", end);

    const { data } = await query
      .order("started_at", { ascending: false })
      .limit(period === "today" ? 50 : 10);

    if (data) setSessions(data);
  };

  const fetchSessionItems = async (sessionId: string) => {
    setItemsLoading(true);
    const { data } = await supabase
      .from("sale_items")
      .select(`
        *,
        sales!inner(session_id)
      `)
      .eq("sales.session_id", sessionId);

    if (data) {
      const grouped = data.reduce((acc: any[], item: any) => {
        const key = `${item.product_name}-${item.size_ml || 'unit'}`;
        const existing = acc.find(i => i.key === key);
        if (existing) {
          existing.quantity += item.quantity;
          existing.total += item.quantity * Number(item.unit_price);
        } else {
          acc.push({
            key,
            product_name: item.product_name,
            size_ml: item.size_ml,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * Number(item.unit_price)
          });
        }
        return acc;
      }, []);
      setSessionItems(grouped);
    }
    setItemsLoading(false);
  };

  const handleSessionClick = (session: any) => {
    setSelectedSession(session);
    fetchSessionItems(session.id);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">لوحة الإحصائيات</h2>
        <div className="flex items-center gap-2">
          {period === "today" && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors w-[140px]"
            />
          )}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 h-9 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">يومي</SelectItem>
              <SelectItem value="month">هذا الشهر</SelectItem>
              <SelectItem value="year">هذا العام</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-2xl luxury-shadow border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">الإيرادات</p>
            <p className="text-xl font-bold mt-1 tabular-nums">{stats.revenue.toLocaleString()} دج</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl luxury-shadow border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">الأرباح</p>
            <p className="text-xl font-bold mt-1 tabular-nums">{stats.profit.toLocaleString()} دج</p>
          </CardContent>
        </Card>
      </div>

      {
        stats.workerStats.length > 0 && (
          <Card className="rounded-2xl luxury-shadow border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">حسب العامل</p>
              <div className="space-y-2">
                {stats.workerStats.map((w, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="font-medium">{w.name}</span>
                    <div className="text-right tabular-nums">
                      <span>{w.revenue.toLocaleString()} دج</span>
                      <span className="text-muted-foreground ml-2">({w.profit.toLocaleString()} أرباح)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      }


      {/* Recent Sessions Logic moved here */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <History className="w-4 h-4" />
            الجلسات الأخيرة
          </h3>
        </div>
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card
              key={session.id}
              className="rounded-2xl luxury-shadow border-border/50 cursor-pointer active:scale-95 transition-transform overflow-hidden"
              onClick={() => handleSessionClick(session)}
            >
              <CardContent className="p-0">
                <div className="p-4 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                        {session.workers?.name?.charAt(0) || "W"}
                      </div>
                      <span className="font-bold text-sm">{session.workers?.name}</span>
                      {!session.closed_at && (
                        <span className="bg-green-500/10 text-green-600 text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">نشط الآن</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                        {format(new Date(session.started_at), "EEEE, d MMMM", { locale: ar })}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                        من {format(new Date(session.started_at), "HH:mm", { locale: ar })}
                        {session.closed_at ? ` إلى ${format(new Date(session.closed_at), "HH:mm", { locale: ar })}` : " (حالياً)"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-lg font-black tabular-nums tracking-tight">
                      {Number(session.total_revenue).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">دج</span>
                    </p>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground bg-secondary/50 px-2 py-1 rounded-lg">
                      <Package className="w-3 h-3" />
                      <span>التفاصيل</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {sessions.length === 0 && (
            <p className="text-center text-muted-foreground text-xs py-8">لا يوجد جلسات في هذه الفترة</p>
          )}
        </div>
      </div>

      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-md rounded-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              تفاصيل مبيعات الجلسة
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
            {itemsLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">جاري التحميل...</div>
            ) : sessionItems.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-secondary/30 p-3 rounded-xl space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>العامل:</span>
                    <span className="text-foreground font-medium">{selectedSession?.workers?.name}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>البداية:</span>
                    <span className="text-foreground">{selectedSession && format(new Date(selectedSession.started_at), "HH:mm", { locale: ar })}</span>
                  </div>
                  {selectedSession?.closed_at && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>النهاية:</span>
                      <span className="text-foreground">{format(new Date(selectedSession.closed_at), "HH:mm", { locale: ar })}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">المنتجات المباعة</h4>
                  {sessionItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-card p-3 rounded-xl border border-border/50">
                      <div>
                        <p className="text-sm font-medium">{item.product_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.size_ml ? `${item.size_ml} مل` : 'وحدة'} × {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold tabular-nums">{item.total.toLocaleString()} دج</p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">{item.unit_price} دج/وحدة</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-dashed border-border">
                  <div className="flex justify-between items-center px-1">
                    <span className="font-bold">الإجمالي</span>
                    <span className="text-lg font-black tabular-nums">
                      {Number(selectedSession?.total_revenue).toLocaleString()} دج
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">لا يوجد مبيعات مسجلة</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default AdminDashboard;
