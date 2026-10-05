import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2, MessageCircle, RefreshCw, TrendingUp } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchGrowthInsights, GrowthPeriodMetrics } from "@/lib/api";

const MetricCard = ({ title, value, detail }: { title: string; value: string; detail: string }) => (
  <Card>
    <CardContent className="pt-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </CardContent>
  </Card>
);

const percentChange = (current: number | null, previous: number | null) => {
  if (current === null || previous === null) return "Not enough previous data to compare.";
  if (current === previous) return "No change from the previous period.";
  return `${current > previous ? "Up" : "Down"} ${Math.abs(current - previous)} percentage points from the previous period.`;
};

const GrowthBar = ({ label, value }: { label: string; value: number | null }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-sm"><span>{label}</span><span>{value === null ? "No goals" : `${value}%`}</span></div>
    <div className="h-3 overflow-hidden rounded bg-muted" role="img" aria-label={`${label}: ${value === null ? "no goals" : `${value}%`}`}>
      <div className="h-full bg-primary transition-all" style={{ width: `${value ?? 0}%` }} />
    </div>
  </div>
);

const GrowthList = ({ title, items }: { title: string; items: string[] }) => (
  <Card>
    <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
    <CardContent>
      {items.length ? <ul className="list-disc space-y-2 pl-5 text-sm">{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p className="text-sm text-muted-foreground">No pattern to show yet.</p>}
    </CardContent>
  </Card>
);

const StudentGrowthPage = () => {
  const query = useQuery({ queryKey: ["student-growth-insights"], queryFn: fetchGrowthInsights, staleTime: 5 * 60 * 1000 });
  const data = query.data?.data;

  if (query.isLoading) return <AppLayout><div className="flex justify-center py-16" role="status"><Loader2 className="h-6 w-6 animate-spin" /><span className="sr-only">Loading growth insights...</span></div></AppLayout>;
  if (query.isError || !data) return <AppLayout><Alert variant="destructive"><AlertDescription>We could not load your growth data. Please try again later.</AlertDescription></Alert></AppLayout>;

  const current: GrowthPeriodMetrics = data.metrics.current;
  const previous: GrowthPeriodMetrics = data.metrics.previous;
  const dailyPercent = current.dailyGoals.completionPercent;
  const weeklyPercent = current.weeklyGoals.completionPercent;

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Growth</h1>
            <p className="text-sm text-muted-foreground">{data.period.startDate} – {data.period.endDate} · your recent learning progress</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />Refresh</Button>
            <Button asChild><Link to="/student/mentor"><MessageCircle className="mr-2 h-4 w-4" />Ask Mentor</Link></Button>
          </div>
        </div>

        <section aria-label="Observed progress">
          <h2 className="mb-3 text-lg font-semibold">Your progress · observed data</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Daily goal completion" value={dailyPercent === null ? "—" : `${dailyPercent}%`} detail={`${current.dailyGoals.completed} of ${current.dailyGoals.total} completed`} />
            <MetricCard title="Weekly goal completion" value={weeklyPercent === null ? "—" : `${weeklyPercent}%`} detail={`${current.weeklyGoals.completed} of ${current.weeklyGoals.total} completed`} />
            <MetricCard title="Reflection coverage" value={current.reflectionCoverage.totalDailyGoals ? `${current.reflectionCoverage.count} / ${current.reflectionCoverage.totalDailyGoals}` : "—"} detail={current.reflectionCoverage.percent === null ? "No daily goals in this period" : `${current.reflectionCoverage.percent}% of daily goal entries`} />
            <MetricCard title="Task completion" value={`${data.metrics.taskCompletion.completed} / ${data.metrics.taskCompletion.total}`} detail="Completed tasks · recent accepted plans" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Task progress uses up to the 8 most recently updated accepted plans; task completion dates are not recorded.</p>
          {data.observed.length > 0 && <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">{data.observed.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>}
        </section>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Progress trend</CardTitle></div>
            <CardDescription>Goal completion in the current and previous 7-day periods.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GrowthBar label={`Previous · ${previous.period.startDate} – ${previous.period.endDate}`} value={previous.dailyGoals.completionPercent} />
            <GrowthBar label={`Current · ${current.period.startDate} – ${current.period.endDate}`} value={dailyPercent} />
            <p className="text-sm text-muted-foreground">{percentChange(dailyPercent, previous.dailyGoals.completionPercent)}</p>
          </CardContent>
        </Card>

        {!data.dataSufficient && <Alert><AlertDescription>You need at least three recent goals and one reflection before we can generate meaningful AI growth insights. Your recorded progress metrics above are still available.</AlertDescription></Alert>}
        {data.keyConfigured === false && <Alert><AlertDescription>Please add your Gemini API key to use AI Growth Insights. <Link className="underline" to="/student/settings">Open Settings</Link></AlertDescription></Alert>}
        {data.aiMessage && data.keyConfigured !== false && <Alert><AlertDescription>{data.aiMessage}</AlertDescription></Alert>}

        {data.insights && <div className="space-y-4">
          <div><h2 className="text-lg font-semibold">AI growth insights</h2><p className="text-xs text-muted-foreground">AI interpretation · {data.insights.confidence} confidence · based on the displayed period’s goals, reflections, reports, and task progress.</p></div>
          <Card><CardHeader><CardTitle className="text-lg">Growth summary</CardTitle></CardHeader><CardContent><p className="text-sm leading-6">{data.insights.summary}</p></CardContent></Card>
          <div className="grid gap-4 md:grid-cols-2">
            <GrowthList title="What you’re doing well" items={data.insights.strengths} />
            <GrowthList title="Recent improvements" items={data.insights.improvements} />
            <GrowthList title="Patterns to watch" items={data.insights.repeatedChallenges} />
            <GrowthList title="Unfinished goal patterns" items={data.insights.unfinishedPatterns} />
          </div>
          <GrowthList title="Recommended next actions" items={data.insights.nextActions} />
        </div>}
      </div>
    </AppLayout>
  );
};

export default StudentGrowthPage;
