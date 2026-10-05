import { useEffect, useState } from "react";
import { createPhaseChangeRequest, fetchMyPhaseProgress, PhaseProgress } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatPhaseDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function PhaseProgressCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [progress, setProgress] = useState<PhaseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [requestedPhase, setRequestedPhase] = useState("");
  const [reason, setReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestNotice, setRequestNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMyPhaseProgress().then((result) => {
      if (!cancelled) { setProgress(result.data); setFailed(false); }
    }).catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey, refresh]);

  if (loading) return <Card><CardContent role="status" className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /><span className="sr-only">Loading phase progress</span></CardContent></Card>;
  if (failed || !progress) return <Card><CardContent role="alert" className="py-5 text-sm text-muted-foreground">Phase progress is temporarily unavailable.</CardContent></Card>;
  if (!progress.configured) return <Card><CardHeader><CardTitle>Phase Progress</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{progress.message || "Your current phase has not been assigned yet. Ask your teacher or Academic Associate."}</CardContent></Card>;

  const statusVariant = progress.status === "COMPLETED" ? "default" : progress.status === "OVERDUE" ? "destructive" : "secondary";
  return <Card>
    <CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><CardTitle>{progress.phase} Progress</CardTitle><Badge variant={statusVariant}>{progress.status.replace(/_/g, " ")}</Badge></div></CardHeader>
    <CardContent className="space-y-4">
      {progress.phaseDetails?.learningTopics?.length || progress.phaseDetails?.problemSolvingTrack ? <div className="rounded-md bg-muted/50 p-3"><p className="text-sm font-medium">Learning focus</p>{progress.phaseDetails.learningTopics.length > 0 && <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">{progress.phaseDetails.learningTopics.map((topic) => <li key={topic}>{topic}</li>)}</ul>}{progress.phaseDetails.problemSolvingTrack && <p className="mt-1 text-sm text-muted-foreground">Problem-solving track: {progress.phaseDetails.problemSolvingTrack}</p>}</div> : null}
      <div><div className="mb-2 flex justify-between text-sm"><span>{progress.learningDaysCompleted} / {progress.requiredLearningDays} learning days</span><span>{progress.progressPercent}%</span></div><Progress value={progress.progressPercent} aria-label="Phase progress" /></div>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><p className="text-xs text-muted-foreground">Phase start</p><p>{formatPhaseDate(progress.phaseStartDate)}</p></div>
        <div><p className="text-xs text-muted-foreground">Baseline deadline</p><p>{formatPhaseDate(progress.baselineDeadline)}</p></div>
        <div><p className="text-xs text-muted-foreground">Current deadline</p><p>{formatPhaseDate(progress.currentDeadline)}</p></div>
        <div><p className="text-xs text-muted-foreground">Days remaining</p><p>{progress.remainingLearningDays}</p></div>
      </div>
      {progress.status === "OVERDUE" && <p className="text-sm font-medium text-destructive">Overdue by {progress.overdueDays} calendar day(s).</p>}
      {progress.status === "COMPLETED" && progress.completedOn && <p className="text-sm font-medium">Completed on {formatPhaseDate(progress.completedOn)}.</p>}
      {progress.extensionDays ? <p className="text-xs text-muted-foreground">Deadline extension: {progress.extensionDays} day(s) · {progress.extensionReasons?.join(", ")}</p> : <p className="text-xs text-muted-foreground">{progress.deadlineNote}</p>}
      <details><summary className="cursor-pointer text-sm font-medium">Learning days counted</summary>
        {progress.learningDates?.length ? <ul className="mt-2 flex flex-wrap gap-2 text-xs">{progress.learningDates.map((date) => <li key={date} className="rounded border px-2 py-1">{formatPhaseDate(date)}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No saved goal dates count yet.</p>}
      </details>
      <div className="border-t pt-4">
        <h3 className="font-medium">Phase change requests</h3>
        {(progress.phaseChangeRequests || []).length > 0 ? <ul className="mt-2 space-y-2">{(progress.phaseChangeRequests || []).map((request) => <li key={request._id} className="rounded-md border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2"><strong>{request.currentPhase} → {request.requestedPhase}</strong><Badge variant={request.status === "REJECTED" ? "destructive" : request.status === "APPROVED" ? "default" : "secondary"}>{request.status}</Badge></div>
          <p className="mt-1 text-muted-foreground">Requested {new Date(request.requestedAt).toLocaleDateString()}</p><p className="mt-1">{request.reason}</p>
          {request.reviewComment && <p className="mt-1 text-muted-foreground">Team comment: {request.reviewComment}</p>}
          {request.newPhaseStartDate && <p className="mt-1">New phase started {formatPhaseDate(request.newPhaseStartDate)}.</p>}
        </li>)}</ul> : <p className="mt-1 text-sm text-muted-foreground">No phase-change requests yet.</p>}
        {requestNotice && <p role="status" className="mt-2 text-sm">{requestNotice}</p>}{requestError && <p role="alert" className="mt-2 text-sm text-destructive">{requestError}</p>}
        {progress.curriculum?.phases && <form className="mt-3 space-y-2" onSubmit={async (event) => {
          event.preventDefault(); setRequestError(""); setRequestNotice(""); setSubmittingRequest(true);
          try { await createPhaseChangeRequest(requestedPhase, reason); setReason(""); setRequestedPhase(""); setRequestNotice("Your request was sent to the Team for review."); setRefresh((value) => value + 1); }
          catch (error: any) { setRequestError(error.message || "Unable to submit the request."); }
          finally { setSubmittingRequest(false); }
        }}>
          <label htmlFor="requested-phase" className="text-sm font-medium">Request a different phase</label>
          <select id="requested-phase" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={requestedPhase} onChange={(event) => setRequestedPhase(event.target.value)} required>
            <option value="">Choose a phase</option>{progress.curriculum.phases.filter((phase) => phase.name !== progress.phase).map((phase) => <option key={phase.name} value={phase.name}>{phase.name} · {phase.durationDays} days</option>)}
          </select>
          <Textarea aria-label="Reason for phase change" maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why you are requesting this phase change" required />
          <Button type="submit" disabled={submittingRequest || !requestedPhase || !reason.trim()}>{submittingRequest ? "Sending…" : "Request Phase Change"}</Button>
        </form>}
      </div>
      {(progress.phaseHistory || []).length > 0 && <details className="border-t pt-3"><summary className="cursor-pointer text-sm font-medium">Previous phase history</summary><ul className="mt-2 space-y-2">{(progress.phaseHistory || []).map((entry, index) => <li key={`${entry.phase}-${entry.phaseEndDate}-${index}`} className="rounded-md border p-3 text-sm"><p className="font-medium">{entry.phase} · {entry.status.replace(/_/g, " ")}</p><p>{entry.learningDaysCompleted}/{entry.requiredLearningDays} learning days · {entry.progressPercent}%</p><p className="text-muted-foreground">{formatPhaseDate(entry.phaseStartDate)} – {formatPhaseDate(entry.phaseEndDate)} · deadline {formatPhaseDate(entry.currentDeadline)}</p><p className="mt-1 text-xs text-muted-foreground">Learning dates counted: {entry.learningDates?.map(formatPhaseDate).join(", ") || "none"}</p></li>)}</ul></details>}
      <p className="text-xs text-muted-foreground">Curriculum source: {progress.curriculum?.source || "Milestone 1"}. Problem-solving practice is scheduled for 2 hours daily from day 1.</p>
    </CardContent>
  </Card>;
}
