import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Sparkles, X } from "lucide-react";
import { analyzeReflection, ReflectionAnalysis, ReflectionInput } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReflectionAnalyzerProps extends ReflectionInput {}

const ReflectionAnalyzer = (input: ReflectionAnalyzerProps) => {
  const [analysis, setAnalysis] = useState<ReflectionAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);
  const hasReflection = Object.values(input).some((value) => value.trim().length > 0);

  useEffect(() => {
    requestVersion.current += 1;
    setAnalysis(null);
    setError("");
    setAnalyzing(false);
    return () => { requestVersion.current += 1; };
  }, [input.reflection, input.wentWell, input.challenges, input.left]);

  const handleAnalyze = async () => {
    const currentRequest = ++requestVersion.current;
    const submittedInput = { ...input };
    setAnalyzing(true);
    setError("");
    setAnalysis(null);
    try {
      const result = await analyzeReflection(submittedInput);
      if (requestVersion.current === currentRequest) setAnalysis(result.analysis);
    } catch (err) {
      if (requestVersion.current === currentRequest) {
        setError(err instanceof Error ? err.message : "Reflection analysis is temporarily unavailable.");
      }
    } finally {
      if (requestVersion.current === currentRequest) setAnalyzing(false);
    }
  };

  const dismiss = () => {
    requestVersion.current += 1;
    setAnalysis(null);
    setError("");
    setAnalyzing(false);
  };

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" onClick={handleAnalyze} disabled={analyzing || !hasReflection}>
        {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {analyzing ? "Analyzing your reflection..." : "Analyze Reflection"}
      </Button>

      {error && (
        <div role="status" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error} Your reflection is unchanged and can still be submitted.</span>
          <Button type="button" variant="ghost" size="icon" className="ml-auto h-7 w-7" aria-label="Dismiss reflection feedback" onClick={dismiss}><X className="h-4 w-4" /></Button>
        </div>
      )}

      {analysis && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />AI Reflection Feedback</span>
              <span className="text-sm font-semibold">Reflection Quality: {Math.round(analysis.score)}/100</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {([
              ["Strengths", analysis.strengths],
              ["Challenges to consider", analysis.challenges],
              ["Suggestions", analysis.suggestions],
            ] as const).map(([heading, items]) => (
              <section key={heading}>
                <h3 className="mb-1 font-medium">{heading}</h3>
                {items.length ? <ul className="list-disc space-y-1 pl-5 text-muted-foreground">{items.map((item, index) => <li key={`${heading}-${index}`}>{item}</li>)}</ul> : <p className="text-muted-foreground">No additional points.</p>}
              </section>
            ))}
            <section className="rounded-md border bg-card p-3">
              <h3 className="font-medium">A useful next action</h3>
              <p className="mt-1 text-muted-foreground">{analysis.nextAction}</p>
            </section>
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={dismiss}>Dismiss feedback</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReflectionAnalyzer;
