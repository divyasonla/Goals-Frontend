import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Send, Sparkles } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { askStudentMentor } from "@/lib/api";

type MentorTurn = { question: string; answer: string; actions: string[] };

const suggestions = [
  "What should I focus on this week?",
  "What did I improve compared with last week?",
  "What patterns show up in my unfinished goals?"
];

const StudentMentorPage = () => {
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<MentorTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitQuestion = async (event: FormEvent) => {
    event.preventDefault();
    const question = message.trim();
    if (!question || loading) return;
    if (question.length > 2000) {
      setError("Your question must be 2000 characters or fewer.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const history = turns.slice(-4).map(({ question: previousQuestion, answer }) => ({ question: previousQuestion, answer }));
      const result = await askStudentMentor(question, history);
      setTurns((current) => [...current, { question, answer: result.data.answer, actions: result.data.suggestedActions }]);
      setMessage("");
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : "AI Mentor is temporarily unavailable. Please try again later.";
      setError(text === "Failed to fetch" ? "We could not reach the server. Check your connection and try again." : text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">AI Student Mentor</h1>
          <p className="text-sm text-muted-foreground">Ask about your learning progress. Your mentor uses your recent goals, reflections, weekly reports, and accepted task plans.</p>
        </div>

        <Card>
          <CardHeader><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Ask me about your learning</CardTitle></div></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2" aria-label="Suggested questions">
              {suggestions.map((suggestion) => <Button key={suggestion} type="button" variant="outline" size="sm" onClick={() => setMessage(suggestion)}>{suggestion}</Button>)}
            </div>
            <form onSubmit={submitQuestion} className="space-y-3">
              <label htmlFor="mentor-question" className="text-sm font-medium">Your question</label>
              <Textarea id="mentor-question" value={message} maxLength={2000} rows={4} onChange={(event) => setMessage(event.target.value)} placeholder="For example: What should I focus on this week?" aria-describedby="mentor-character-count" />
              <div className="flex items-center justify-between gap-3">
                <span id="mentor-character-count" className="text-xs text-muted-foreground">{message.length} / 2000</span>
                <Button type="submit" disabled={loading || !message.trim()}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Thinking...</> : <><Send className="mr-2 h-4 w-4" />Ask Mentor</>}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {error && <Alert variant="destructive"><AlertDescription>{error}{error.toLowerCase().includes("gemini api key") && <> <Link className="underline" to="/student/settings">Open Settings</Link></>}</AlertDescription></Alert>}

        <div className="space-y-4" aria-live="polite">
          {turns.map((turn, index) => <div key={`${index}-${turn.question}`} className="space-y-3">
            <Card><CardContent className="pt-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">You asked</p><p className="mt-2 text-sm">{turn.question}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Mentor response</CardTitle></CardHeader><CardContent className="space-y-3"><p className="whitespace-pre-wrap text-sm leading-6">{turn.answer}</p>{turn.actions.length > 0 && <div><h3 className="text-sm font-semibold">Ideas to try</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{turn.actions.map((action, actionIndex) => <li key={`${action}-${actionIndex}`}>{action}</li>)}</ul></div>}</CardContent></Card>
          </div>)}
        </div>
      </div>
    </AppLayout>
  );
};

export default StudentMentorPage;
