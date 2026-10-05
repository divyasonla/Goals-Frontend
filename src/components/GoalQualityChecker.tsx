import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { analyzeGoal, GoalAnalysis } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GoalQualityCheckerProps {
  goal: string;
  timeframe: "daily" | "weekly";
  onUseImprovedGoal: (goal: string) => void;
  onEditGoal: () => void;
}

const criteria = [
  { key: "isSpecific", label: "Specific" },
  { key: "isMeasurable", label: "Measurable" },
  { key: "isClear", label: "Clear" },
  { key: "isAchievable", label: "Achievable" },
  { key: "isTimeBound", label: "Time-bound" },
] as const;

const GoalQualityChecker = ({ goal, timeframe, onUseImprovedGoal, onEditGoal }: GoalQualityCheckerProps) => {
  const [analysis, setAnalysis] = useState<GoalAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);

  useEffect(() => {
    requestVersion.current += 1;
    setAnalysis(null);
    setError("");
    setAnalyzing(false);
  }, [goal, timeframe]);

  const handleAnalyze = async () => {
    const currentRequest = ++requestVersion.current;
    setAnalyzing(true);
    setError("");
    setAnalysis(null);
    try {
      const result = await analyzeGoal(goal, timeframe);
      if (requestVersion.current === currentRequest) setAnalysis(result.analysis);
    } catch (err) {
      if (requestVersion.current === currentRequest) {
        setError(err instanceof Error ? err.message : "Goal analysis is temporarily unavailable.");
      }
    } finally {
      if (requestVersion.current === currentRequest) setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" onClick={handleAnalyze} disabled={analyzing || !goal.trim()}>
        {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
        {analyzing ? "Analyzing your goal..." : "Check Goal with AI"}
      </Button>

      {error && (
        <div role="status" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error} You can still submit your goal.</span>
        </div>
      )}

      {analysis && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />AI Goal Feedback</span>
              <span className="text-sm font-semibold">Goal Quality: {Math.round(analysis.score)}/100</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">A guidance score to help you improve your goal.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Goal review</p>
              {criteria.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className={`h-4 w-4 ${analysis[key] ? "text-emerald-600" : "text-muted-foreground/40"}`} />
                  <span>{label}: {analysis[key] ? "Good" : "Needs improvement"}</span>
                </div>
              ))}
              <p className="pt-1 text-sm text-muted-foreground">{analysis.reason}</p>
            </div>

            <div className="space-y-1.5 rounded-md border bg-card p-3">
              <p className="text-sm font-medium">Suggested goal</p>
              <p className="text-sm">{analysis.improvedGoal}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => onUseImprovedGoal(analysis.improvedGoal)}>Use Improved Goal</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setAnalysis(null)}>Keep My Goal</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setAnalysis(null); onEditGoal(); }}>Edit Goal</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GoalQualityChecker;
