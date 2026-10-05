import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { breakdownGoal, acceptTaskBreakdown, fetchMyTaskBreakdowns, GoalTask } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  goal: string;
  timeframe: "daily" | "weekly";
}

const GoalTaskBreakdown = ({ goal, timeframe }: Props) => {
  const [tasks, setTasks] = useState<GoalTask[]>([]);
  const [breakdownId, setBreakdownId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);
  const activeGoal = useRef(goal);

  useEffect(() => {
    activeGoal.current = goal;
    const version = ++requestVersion.current;
    setTasks([]);
    setBreakdownId("");
    setAccepted(false);
    setError("");
    if (!goal.trim()) return;

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetchMyTaskBreakdowns(goal.trim(), timeframe);
        if (requestVersion.current !== version) return;
        const latest = response.breakdowns[0];
        if (latest) {
          setTasks(latest.tasks);
          setBreakdownId(latest._id || latest.id || "");
          setAccepted(true);
        }
      } catch {
        // Saved-task lookup is best-effort; it must not block writing or submitting a goal.
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [goal, timeframe]);

  const generate = async () => {
    if (!goal.trim()) {
      setError("Enter a goal before breaking it into tasks.");
      return;
    }
    const version = ++requestVersion.current;
    const goalAtRequest = goal;
    setLoading(true);
    setError("");
    setAccepted(false);
    try {
      const response = await breakdownGoal(goal.trim(), timeframe);
      if (requestVersion.current !== version || activeGoal.current !== goalAtRequest) return;
      setTasks(response.breakdown.tasks);
      setBreakdownId(response.breakdown.id || response.breakdown._id || "");
    } catch (err) {
      if (requestVersion.current === version) setError(err instanceof Error ? err.message : "Unable to create tasks. Try again.");
    } finally {
      if (requestVersion.current === version) setLoading(false);
    }
  };

  const changeTask = (index: number, patch: Partial<GoalTask>) => {
    setTasks((current) => current.map((task, taskIndex) => taskIndex === index ? { ...task, ...patch } : task));
    setAccepted(false);
  };

  const removeTask = (index: number) => {
    setTasks((current) => current.filter((_, taskIndex) => taskIndex !== index).map((task, order) => ({ ...task, order: order + 1 })));
    setAccepted(false);
  };

  const moveTask = (index: number, offset: number) => {
    const destination = index + offset;
    if (destination < 0 || destination >= tasks.length) return;
    setTasks((current) => {
      const reordered = [...current];
      [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
      return reordered.map((task, order) => ({ ...task, order: order + 1 }));
    });
    setAccepted(false);
  };

  const addTask = () => {
    if (tasks.length >= 20) return;
    setTasks((current) => [...current, { title: "", description: "", order: current.length + 1, source: "student" }]);
    setAccepted(false);
  };

  const useTasks = async () => {
    if (!breakdownId) {
      setError("Generate tasks first, then save the task plan.");
      return;
    }
    if (tasks.some((task) => !task.title.trim() || !task.description.trim())) {
      setError("Add a title and description to every task before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await acceptTaskBreakdown(breakdownId, tasks.map((task, index) => ({ ...task, order: index + 1 })));
      setTasks(response.breakdown.tasks);
      setAccepted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save these tasks.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border p-4" aria-label="AI goal task breakdown">
      <div>
        <p className="font-medium">Break this goal into tasks</p>
        <p className="text-xs text-muted-foreground">Review and edit the suggestions. Your original goal stays unchanged.</p>
      </div>
      <Button type="button" variant="outline" onClick={generate} disabled={loading || saving}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating tasks...</> : <><Sparkles className="mr-2 h-4 w-4" />{tasks.length ? "Try Again" : "Break Into Tasks"}</>}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {(tasks.length > 0 || breakdownId) && <div className="space-y-3">
        <h3 className="text-sm font-semibold">{accepted ? "Your task plan is saved" : "AI suggested tasks"}</h3>
        {tasks.map((task, index) => (
          <div key={task._id || task.sourceTaskId || `task-${index}`} className="space-y-2 rounded-md bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Task {index + 1} · {task.source || "student"}</span>
              <div className="flex gap-1">
                <Button type="button" size="icon" variant="ghost" aria-label="Move task up" onClick={() => moveTask(index, -1)} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" aria-label="Move task down" onClick={() => moveTask(index, 1)} disabled={index === tasks.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" aria-label="Remove task" onClick={() => removeTask(index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <Input aria-label={`Task ${index + 1} title`} value={task.title} onChange={(event) => changeTask(index, { title: event.target.value })} placeholder="Task title" maxLength={200} />
            <Textarea aria-label={`Task ${index + 1} description`} value={task.description} onChange={(event) => changeTask(index, { description: event.target.value })} placeholder="What to do" maxLength={600} rows={2} />
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={addTask} disabled={tasks.length >= 20 || saving}><Plus className="mr-2 h-4 w-4" />Add My Task</Button>
          <Button type="button" onClick={useTasks} disabled={saving || accepted}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : accepted ? "Tasks Saved" : "Use These Tasks"}
          </Button>
        </div>
      </div>}
    </section>
  );
};

export default GoalTaskBreakdown;
