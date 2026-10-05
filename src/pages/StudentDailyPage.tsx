import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchDailyGoals, addDailyGoal, updateDailyGoal, deleteDailyGoal } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, Edit, Loader2, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import GoalQualityChecker from "@/components/GoalQualityChecker";
import GoalTaskBreakdown from "@/components/GoalTaskBreakdown";
import ReflectionAnalyzer from "@/components/ReflectionAnalyzer";
import PhaseProgressCard from "@/components/PhaseProgressCard";

interface DailyGoal {
  rowIndex: number; username: string; email: string; dailyGoal: string;
  reflection: string; wentWell: string; challenges: string; left: string; date: string; status: string;
}

const emptyForm = { dailyGoal: "", reflection: "", wentWell: "", challenges: "", left: "", status: "Pending" };

const StudentDailyPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingRow, setDeletingRow] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingGoal, setEditingGoal] = useState<DailyGoal | null>(null);
  const [viewingGoal, setViewingGoal] = useState<DailyGoal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [phaseRefreshKey, setPhaseRefreshKey] = useState(0);
  const goalInputRef = useRef<HTMLInputElement>(null);

  const loadGoals = async () => {
    try {
      const data = await fetchDailyGoals(user!.email);
      setGoals(data.goals || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGoals(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dailyGoal.trim()) {
      toast({ title: "Error", description: "Goal is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingGoal) {
        await updateDailyGoal({
          rowIndex: editingGoal.rowIndex, username: user!.username, email: user!.email,
          dailyGoal: form.dailyGoal, reflection: form.reflection, wentWell: form.wentWell,
          challenges: form.challenges, left: form.left, date: editingGoal.date, status: form.status,
        });
        toast({ title: "Updated", description: "Goal updated successfully" });
      } else {
        await addDailyGoal({
          username: user!.username, email: user!.email, dailyGoal: form.dailyGoal,
          reflection: form.reflection, wentWell: form.wentWell, challenges: form.challenges,
          left: form.left, status: form.status,
        });
        setPhaseRefreshKey((value) => value + 1);
        toast({ title: "Added", description: "Goal added successfully" });
      }
      setForm(emptyForm);
      setEditingGoal(null);
      setDialogOpen(false);
      loadGoals();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (goal: DailyGoal) => {
    setEditingGoal(goal);
    setForm({ dailyGoal: goal.dailyGoal, reflection: goal.reflection, wentWell: goal.wentWell, challenges: goal.challenges, left: goal.left, status: goal.status });
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingGoal(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleDelete = async (goal: DailyGoal) => {
    const confirmed = window.confirm("Delete this daily goal and its reflection from your goals?");
    if (!confirmed) return;
    setDeletingRow(goal.rowIndex);
    try {
      await deleteDailyGoal(goal.rowIndex, user!.email);
      setGoals((current) => current.filter((item) => item.rowIndex !== goal.rowIndex));
      setPhaseRefreshKey((value) => value + 1);
      toast({ title: "Goal deleted", description: "The daily goal was removed." });
      await loadGoals();
    } catch (err: any) {
      toast({ title: "Unable to delete goal", description: err.message, variant: "destructive" });
    } finally {
      setDeletingRow(null);
    }
  };

  const statusColor = (s: string) => {
    if (s === "Completed") return "default";
    if (s === "In Progress") return "secondary";
    return "outline";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Daily Goals</h1>
            <p className="text-sm text-muted-foreground">Track your daily progress and reflections</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Goal</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingGoal ? "Edit Goal" : "Add Daily Goal"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Daily Goal *</Label>
                  <Input ref={goalInputRef} value={form.dailyGoal} onChange={(e) => setForm({ ...form, dailyGoal: e.target.value })} placeholder="What do you want to achieve today?" />
                </div>
                <GoalQualityChecker
                  goal={form.dailyGoal}
                  timeframe="daily"
                  onUseImprovedGoal={(dailyGoal) => setForm((current) => ({ ...current, dailyGoal }))}
                  onEditGoal={() => goalInputRef.current?.focus()}
                />
                <GoalTaskBreakdown goal={form.dailyGoal} timeframe="daily" />
                <div className="space-y-2">
                  <Label>Reflection</Label>
                  <Textarea value={form.reflection} onChange={(e) => setForm({ ...form, reflection: e.target.value })} placeholder="Reflect on your progress..." rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>What Went Well</Label>
                  <Textarea value={form.wentWell} onChange={(e) => setForm({ ...form, wentWell: e.target.value })} placeholder="What went well today?" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Challenges</Label>
                  <Textarea value={form.challenges} onChange={(e) => setForm({ ...form, challenges: e.target.value })} placeholder="What challenges did you face?" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>What's Left</Label>
                  <Textarea value={form.left} onChange={(e) => setForm({ ...form, left: e.target.value })} placeholder="What's remaining?" rows={2} />
                </div>
                <ReflectionAnalyzer reflection={form.reflection} wentWell={form.wentWell} challenges={form.challenges} left={form.left} />
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : editingGoal ? "Update Goal" : "Add Goal"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <PhaseProgressCard refreshKey={phaseRefreshKey} />

        <Card>
          <CardHeader><CardTitle className="text-lg">Your Goals</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : goals.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No goals yet. Add your first daily goal!</p>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <div className="inline-block min-w-full align-middle px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Goal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">Challenges</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {goals.sort((a, b) => b.date.localeCompare(a.date)).map((goal) => (
                        <TableRow key={goal.rowIndex}>
                          <TableCell className="whitespace-nowrap text-sm">{goal.date}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{goal.dailyGoal}</TableCell>
                          <TableCell><Badge variant={statusColor(goal.status)}>{goal.status}</Badge></TableCell>
                          <TableCell className="hidden sm:table-cell max-w-[150px] truncate text-sm text-muted-foreground">{goal.challenges || "—"}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Button variant="ghost" size="sm" aria-label={`View daily goal from ${goal.date}`} onClick={() => setViewingGoal(goal)}><Eye className="mr-1 h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(goal)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" aria-label={`Delete daily goal from ${goal.date}`} disabled={deletingRow === goal.rowIndex} onClick={() => handleDelete(goal)}>
                              {deletingRow === goal.rowIndex ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={Boolean(viewingGoal)} onOpenChange={(open) => { if (!open) setViewingGoal(null); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Daily Goal Details</DialogTitle><DialogDescription>Your complete goal and reflection details for this day.</DialogDescription></DialogHeader>
            {viewingGoal && <div className="space-y-4 text-sm">
              <div><p className="font-semibold">Goal · {viewingGoal.date}</p><p className="mt-1 whitespace-pre-wrap">{viewingGoal.dailyGoal}</p></div>
              <div><p className="font-semibold">Status</p><p>{viewingGoal.status}</p></div>
              <div><p className="font-semibold">Reflection</p><p className="whitespace-pre-wrap">{viewingGoal.reflection || "—"}</p></div>
              <div><p className="font-semibold">What went well</p><p className="whitespace-pre-wrap">{viewingGoal.wentWell || "—"}</p></div>
              <div><p className="font-semibold">Challenges</p><p className="whitespace-pre-wrap">{viewingGoal.challenges || "—"}</p></div>
              <div><p className="font-semibold">What's left</p><p className="whitespace-pre-wrap">{viewingGoal.left || "—"}</p></div>
            </div>}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default StudentDailyPage;
