import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const AdminDashboard = () => {
  const [period, setPeriod] = useState("month");
  const [stats, setStats] = useState({ revenue: 0, profit: 0, workerStats: [] as any[] });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchChartData();
  }, [period]);

  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    if (period === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
    }
    return start.toISOString();
  };

  const fetchStats = async () => {
    const since = getDateRange();
    const { data: sales } = await supabase
      .from("sales")
      .select("total, profit, worker_id")
      .gte("created_at", since);

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

  const fetchChartData = async () => {
    const year = new Date().getFullYear();
    const { data: sales } = await supabase
      .from("sales")
      .select("total, profit, created_at")
      .gte("created_at", `${year}-01-01`)
      .lte("created_at", `${year}-12-31`);

    if (!sales) return;

    const months = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(year, i).toLocaleString("default", { month: "short" });
      return { month, revenue: 0, profit: 0 };
    });

    sales.forEach((s) => {
      const m = new Date(s.created_at).getMonth();
      months[m].revenue += Number(s.total);
      months[m].profit += Number(s.profit);
    });

    setChartData(months);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32 h-9 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-2xl luxury-shadow border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Revenue</p>
            <p className="text-xl font-bold mt-1 tabular-nums">{stats.revenue.toLocaleString()} Dz</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl luxury-shadow border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Profit</p>
            <p className="text-xl font-bold mt-1 tabular-nums">{stats.profit.toLocaleString()} Dz</p>
          </CardContent>
        </Card>
      </div>

      {stats.workerStats.length > 0 && (
        <Card className="rounded-2xl luxury-shadow border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">By Worker</p>
            <div className="space-y-2">
              {stats.workerStats.map((w, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="font-medium">{w.name}</span>
                  <div className="text-right tabular-nums">
                    <span>{w.revenue.toLocaleString()} Dz</span>
                    <span className="text-muted-foreground ml-2">({w.profit.toLocaleString()} profit)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl luxury-shadow border-border/50">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Annual Overview</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="hsl(0, 0%, 15%)" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="profit" fill="hsl(0, 0%, 60%)" radius={[4, 4, 0, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
