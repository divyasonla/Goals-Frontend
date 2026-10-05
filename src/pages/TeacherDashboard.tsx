import { useState, useEffect } from "react";
import { fetchDailyGoals, fetchWeeklyGoals, fetchReports, fetchAdminStudentGoals, fetchAdminStudentGrowth, fetchTeacherDashboardOverview, fetchAdminPhaseProgress, fetchAdminStudentPhaseProgress, fetchAdminPhaseConfig, fetchAdminHolidays, addAdminHoliday, deleteAdminHoliday, assignStudentPhase, fetchAdminPhaseChangeRequests, reviewAdminPhaseChangeRequest, AdminPhaseProgressRow, PhaseProgress, TeacherDashboardOverview, PhaseChangeReviewRow, CurriculumPhase, updateAdminTask, deleteAdminTask, GoalTask, GoalTaskBreakdown, AdminStudentGrowthData } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPhaseDate } from "@/lib/utils";

const TeacherDashboard = () => {
  const { toast } = useToast();
  const [dailyGoals, setDailyGoals] = useState<any[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("intelligence");
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(() => new Set());

  const [searchEmail, setSearchEmail] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchWeek, setSearchWeek] = useState("");
  const [students, setStudents] = useState<Array<{ _id: string; name: string; email: string }>>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedStudentData, setSelectedStudentData] = useState<Awaited<ReturnType<typeof fetchAdminStudentGoals>> | null>(null);
  const [selectedStudentGrowth, setSelectedStudentGrowth] = useState<AdminStudentGrowthData | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState("");
  const [taskDraft, setTaskDraft] = useState<GoalTask | null>(null);
  const [overview, setOverview] = useState<TeacherDashboardOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [overviewPage, setOverviewPage] = useState(1);
  const [overviewSearch, setOverviewSearch] = useState("");
  const [overviewDays, setOverviewDays] = useState(7);
  const [phaseRows, setPhaseRows] = useState<AdminPhaseProgressRow[]>([]);
  const [phaseRowsLoading, setPhaseRowsLoading] = useState(true);
  const [phaseRowsError, setPhaseRowsError] = useState("");
  const [phasePage, setPhasePage] = useState(1);
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [phaseStatusFilter, setPhaseStatusFilter] = useState("all");
  const [phaseTotal, setPhaseTotal] = useState(0);
  const [phaseOptions, setPhaseOptions] = useState<string[]>([]);
  const [phaseDurations, setPhaseDurations] = useState<Record<string, number>>({});
  const [curriculum, setCurriculum] = useState<CurriculumPhase[]>([]);
  const [phaseRequests, setPhaseRequests] = useState<PhaseChangeReviewRow[]>([]);
  const [phaseRequestsLoading, setPhaseRequestsLoading] = useState(true);
  const [phaseRequestsError, setPhaseRequestsError] = useState("");
  const [phaseRequestComments, setPhaseRequestComments] = useState<Record<string, string>>({});
  const [reviewingRequestId, setReviewingRequestId] = useState("");
  const [phaseRefresh, setPhaseRefresh] = useState(0);
  const [selectedStudentPhase, setSelectedStudentPhase] = useState<PhaseProgress | null>(null);
  const [phaseDateDraft, setPhaseDateDraft] = useState("");
  const [phaseDraft, setPhaseDraft] = useState("");
  const [savingPhase, setSavingPhase] = useState(false);
  const [holidays, setHolidays] = useState<Array<{ _id: string; date: string; name: string }>>([]);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [savingCalendar, setSavingCalendar] = useState(false);

  useEffect(() => {
    if (activeTab === "intelligence" || loadedTabs.has(activeTab)) return;
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        if (activeTab === "daily") {
          const result = await fetchDailyGoals();
          if (!cancelled) setDailyGoals(result.goals || []);
        } else if (activeTab === "weekly") {
          const result = await fetchWeeklyGoals();
          if (!cancelled) setWeeklyGoals(result.goals || []);
        } else {
          const result = await fetchReports();
          if (!cancelled) setReports(result.reports || []);
        }
        if (!cancelled) setLoadedTabs((current) => new Set(current).add(activeTab));
      } catch (err: any) {
        if (!cancelled) toast({ title: "Error", description: err.message, variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeTab, loadedTabs, toast]);

  useEffect(() => {
    let cancelled = false;
    setOverviewLoading(true);
    fetchTeacherDashboardOverview({ search: overviewSearch, page: overviewPage, limit: 20, days: overviewDays })
      .then((result) => {
        if (cancelled) return;
        setOverview(result.data);
        setStudents(result.data.students.map((student) => ({ _id: student.id, name: student.name, email: student.email })));
        setOverviewError("");
      })
      .catch((err: any) => { if (!cancelled) setOverviewError(err.message || "Unable to load intelligence overview."); })
      .finally(() => { if (!cancelled) setOverviewLoading(false); });
    return () => { cancelled = true; };
  }, [overviewSearch, overviewPage, overviewDays]);

  useEffect(() => {
    let cancelled = false;
    setPhaseRowsLoading(true);
    Promise.all([
      fetchAdminPhaseProgress({ page: phasePage, limit: 20, phase: phaseFilter, status: phaseStatusFilter, search: overviewSearch }),
      fetchAdminPhaseConfig(), fetchAdminHolidays(), fetchAdminPhaseChangeRequests("PENDING")
    ]).then(([result, config, holidayResult, requestResult]) => {
      if (cancelled) return;
      setPhaseRows(result.data.students);
      setPhaseTotal(result.data.total);
      setPhaseOptions(result.data.phases);
      setPhaseDurations(config.phaseDurations);
      setCurriculum(config.phases);
      setHolidays(holidayResult.holidays);
      setPhaseRequests(requestResult.requests);
      setPhaseRequestsError("");
      setPhaseRowsError("");
    }).catch((error: any) => { if (!cancelled) { setPhaseRowsError(error.message || "Unable to load phase progress."); setPhaseRequestsError(error.message || "Unable to load phase-change requests."); } })
      .finally(() => { if (!cancelled) { setPhaseRowsLoading(false); setPhaseRequestsLoading(false); } });
    return () => { cancelled = true; };
  }, [phasePage, phaseFilter, phaseStatusFilter, overviewSearch, phaseRefresh]);

  const reloadAdminStudent = async (studentId = selectedStudentId) => {
    if (!studentId) return;
    setTaskLoading(true);
    try {
      const [studentGoals, studentGrowth, phaseResult] = await Promise.all([
        fetchAdminStudentGoals(studentId),
        fetchAdminStudentGrowth(studentId),
        fetchAdminStudentPhaseProgress(studentId),
      ]);
      setSelectedStudentData(studentGoals);
      setSelectedStudentGrowth(studentGrowth.data);
      setSelectedStudentPhase(phaseResult.data);
      setPhaseDraft(phaseResult.data.phase || "");
      setPhaseDateDraft(phaseResult.data.phaseStartDate || "");
    } catch (err: any) {
      setSelectedStudentData(null);
      setSelectedStudentGrowth(null);
      setSelectedStudentPhase(null);
      toast({ title: "Unable to load student growth and tasks", description: err.message, variant: "destructive" });
    } finally {
      setTaskLoading(false);
    }
  };

  useEffect(() => { if (selectedStudentId) reloadAdminStudent(selectedStudentId); }, [selectedStudentId]);

  const saveAdminTask = async () => {
    if (!editingTaskId || !taskDraft) return;
    try {
      await updateAdminTask(editingTaskId, taskDraft);
      setEditingTaskId("");
      setTaskDraft(null);
      await reloadAdminStudent();
      toast({ title: "Task updated", description: "The student task now records Admin/AA as its source." });
    } catch (err: any) {
      toast({ title: "Unable to update task", description: err.message, variant: "destructive" });
    }
  };

  const removeAdminTask = async (task: GoalTask) => {
    if (!task._id || !window.confirm("Are you sure you want to delete this task?\n\nThis will remove the task from the student's goal.")) return;
    try {
      await deleteAdminTask(task._id);
      await reloadAdminStudent();
      toast({ title: "Task deleted", description: "The goal and reflection were left unchanged." });
    } catch (err: any) {
      toast({ title: "Unable to delete task", description: err.message, variant: "destructive" });
    }
  };

  const saveStudentPhase = async () => {
    if (!selectedStudentId || !phaseDraft || !phaseDateDraft) return;
    setSavingPhase(true);
    try {
      await assignStudentPhase(selectedStudentId, { phase: phaseDraft, phaseStartDate: phaseDateDraft });
      await reloadAdminStudent();
      setPhaseRefresh((value) => value + 1);
      toast({ title: "Phase assigned", description: "Phase progress will use goals saved on or after this start date." });
    } catch (error: any) {
      toast({ title: "Unable to assign phase", description: error.message, variant: "destructive" });
    } finally { setSavingPhase(false); }
  };

  const reviewPhaseRequest = async (requestId: string, decision: "approve" | "reject") => {
    setReviewingRequestId(requestId);
    try {
      await reviewAdminPhaseChangeRequest(requestId, decision, phaseRequestComments[requestId] || "");
      setPhaseRequests((current) => current.filter((item) => item.request._id !== requestId));
      setPhaseRequestComments((current) => { const next = { ...current }; delete next[requestId]; return next; });
      setPhaseRefresh((value) => value + 1);
      if (selectedStudentId) await reloadAdminStudent(selectedStudentId);
      toast({ title: decision === "approve" ? "Phase change approved" : "Phase change rejected" });
    } catch (error: any) { toast({ title: "Unable to review phase request", description: error.message, variant: "destructive" }); }
    finally { setReviewingRequestId(""); }
  };

  const saveHoliday = async () => {
    if (!holidayDate || !holidayName.trim()) return;
    setSavingCalendar(true);
    try {
      await addAdminHoliday(holidayDate, holidayName);
      setHolidayDate(""); setHolidayName("");
      setPhaseRefresh((value) => value + 1);
      toast({ title: "Holiday added" });
    } catch (error: any) { toast({ title: "Unable to add holiday", description: error.message, variant: "destructive" }); }
    finally { setSavingCalendar(false); }
  };

  const removeHoliday = async (holidayId: string) => {
    setSavingCalendar(true);
    try {
      await deleteAdminHoliday(holidayId);
      setPhaseRefresh((value) => value + 1);
      toast({ title: "Holiday removed" });
    } catch (error: any) { toast({ title: "Unable to remove holiday", description: error.message, variant: "destructive" }); }
    finally { setSavingCalendar(false); }
  };

  const filterDaily = (items: any[]) => {
    return items.filter(item => {
      const matchEmail = !searchEmail || item.email?.toLowerCase().includes(searchEmail.toLowerCase()) || item.username?.toLowerCase().includes(searchEmail.toLowerCase());
      const matchDate = !searchDate || item.date === searchDate;
      return matchEmail && matchDate;
    });
  };

  const filterWeekly = (items: any[]) => {
    return items.filter(item => {
      const matchEmail = !searchEmail || item.email?.toLowerCase().includes(searchEmail.toLowerCase()) || item.username?.toLowerCase().includes(searchEmail.toLowerCase());
      const matchWeek = !searchWeek || item.week === searchWeek;
      return matchEmail && matchWeek;
    });
  };

  const filterReports = (items: any[]) => {
    return items.filter(item => {
      const matchEmail = !searchEmail || item.email?.toLowerCase().includes(searchEmail.toLowerCase()) || item.username?.toLowerCase().includes(searchEmail.toLowerCase());
      const matchWeek = !searchWeek || item.week === searchWeek;
      return matchEmail && matchWeek;
    });
  };

  const statusColor = (s: string) => {
    if (s === "Completed") return "default" as const;
    if (s === "In Progress") return "secondary" as const;
    return "outline" as const;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Teacher Dashboard</h1>
          <p className="text-sm text-muted-foreground">Review cohort evidence, student progress and saved growth insights</p>
        </div>

        {/* Filters */}
        {activeTab !== "intelligence" && <div className="flex flex-col md:flex-row gap-4 mb-4">
          <Input
            placeholder="Search by student name or email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="flex-1"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-muted-foreground">Daily Date:</span>
              <Input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full sm:w-auto"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-muted-foreground">Week:</span>
              <Input
                type="week"
                value={searchWeek}
                onChange={(e) => setSearchWeek(e.target.value)}
                className="w-full sm:w-[180px]"
              />
            </div>
          </div>
        </div>}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
            <TabsTrigger value="daily">Daily Goals</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Goals</TabsTrigger>
            <TabsTrigger value="reports">AI Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="intelligence" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cohort overview</CardTitle>
                <p className="text-sm text-muted-foreground">Deterministic Google Sheets and task data for the selected period. Goal and reflection metrics below summarize the current student page.</p>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                  <Input aria-label="Search students" placeholder="Search by name or email" value={overviewSearch} onChange={(event) => { setOverviewSearch(event.target.value); setOverviewPage(1); }} />
                  <select aria-label="Reporting period" className="h-10 rounded-md border bg-background px-3 text-sm" value={overviewDays} onChange={(event) => { setOverviewDays(Number(event.target.value)); setOverviewPage(1); }}>
                    <option value={7}>Last 7 days</option><option value={14}>Last 14 days</option><option value={30}>Last 30 days</option>
                  </select>
                </div>
                {overviewLoading ? <div role="status" className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /><span className="sr-only">Loading intelligence overview</span></div> : overviewError ? <p role="alert" className="py-6 text-sm text-destructive">Unable to load dashboard overview. {overviewError}</p> : overview && <>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Total students</p><p className="text-2xl font-semibold">{overview.totalStudents}</p></div>
                    <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Active on this page</p><p className="text-2xl font-semibold">{overview.overview.activeStudents}</p></div>
                    <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Daily goal completion · page</p><p className="text-2xl font-semibold">{overview.overview.completionPercent === null ? "—" : `${overview.overview.completionPercent}%`}</p><p className="text-xs text-muted-foreground">{overview.overview.goalsCompleted} completed / {overview.overview.dailyGoals} daily goals</p></div>
                    <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Reflection coverage · page</p><p className="text-2xl font-semibold">{overview.overview.reflectionCoverage === null ? "—" : `${overview.overview.reflectionCoverage}%`}</p><p className="text-xs text-muted-foreground">{overview.overview.reflectionGoals} of {overview.overview.dailyGoals} daily goals</p></div>
                    <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Goals created · page</p><p className="text-2xl font-semibold">{overview.overview.goalsCreated}</p></div>
                    <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Tasks completed · page plans</p><p className="text-2xl font-semibold">{overview.overview.tasksCompleted}</p><p className="text-xs text-muted-foreground">{overview.overview.tasksRemaining} remaining</p></div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Period: {overview.period.startDate} – {overview.period.endDate}. {overview.overview.taskScope}. Phase and status progress filters are available in the section below.</p>
                  <div className="mt-5 overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Goals</TableHead><TableHead>Completion</TableHead><TableHead>Reflections</TableHead><TableHead>Tasks done / remaining</TableHead><TableHead>Last activity</TableHead><TableHead>Review</TableHead></TableRow></TableHeader>
                      <TableBody>{overview.students.map((student) => <TableRow key={student.id}>
                        <TableCell><p className="font-medium">{student.name}</p><p className="text-xs text-muted-foreground">{student.email}</p></TableCell>
                        <TableCell>{student.goals}</TableCell><TableCell>{student.completionPercent === null ? "—" : `${student.completionPercent}%`}</TableCell>
                        <TableCell>{student.reflections} / {student.dailyGoals}{student.reflectionCoverage === null ? "" : ` · ${student.reflectionCoverage}%`}</TableCell><TableCell>{student.tasksCompleted} / {student.tasksRemaining}</TableCell>
                        <TableCell>{student.lastActivity || "—"}</TableCell>
                        <TableCell><Button variant="outline" size="sm" onClick={() => { setSelectedStudentId(student.id); document.getElementById("student-detail")?.scrollIntoView({ behavior: "smooth" }); }}>Open details</Button></TableCell>
                      </TableRow>)}</TableBody>
                    </Table>
                    {overview.students.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No students match this search.</p>}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Page {overview.page} · {overview.totalStudents} students</p>
                    <div className="flex gap-2"><Button variant="outline" disabled={overviewPage <= 1} onClick={() => setOverviewPage((value) => Math.max(1, value - 1))}>Previous</Button><Button variant="outline" disabled={overviewPage * overview.limit >= overview.totalStudents} onClick={() => setOverviewPage((value) => value + 1)}>Next</Button></div>
                  </div>
                  {overview.commonChallenges.length > 0 && <div className="mt-5 rounded-md border p-3"><h3 className="text-sm font-semibold">Repeated challenge entries · exact text matches</h3><ul className="mt-2 space-y-1 text-sm">{overview.commonChallenges.map((challenge) => <li key={challenge.text}>{challenge.text} · {challenge.count} mentions</li>)}</ul></div>}
                </>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Phase change requests</CardTitle><p className="text-sm text-muted-foreground">Review student requests. Approval changes the active phase and starts its Milestone 1 duration on the approval date.</p></CardHeader>
              <CardContent className="space-y-4">
                {phaseRequestsLoading ? <div role="status" className="flex justify-center py-5"><Loader2 className="h-5 w-5 animate-spin" /><span className="sr-only">Loading phase requests</span></div> : phaseRequestsError ? <p role="alert" className="text-sm text-destructive">{phaseRequestsError}</p> : phaseRequests.length === 0 ? <p className="text-sm text-muted-foreground">No pending phase-change requests.</p> : phaseRequests.map(({ student, request, progress, phaseHistory, requestedPhaseCurriculum }) => <div key={request._id} className="space-y-3 rounded-md border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{student.name} · {request.currentPhase} → {request.requestedPhase}</p><p className="text-xs text-muted-foreground">{student.email} · requested {new Date(request.requestedAt).toLocaleString()}</p></div><Badge variant="secondary">PENDING</Badge></div>
                  <p className="text-sm">{request.reason}</p>
                  <div className="grid gap-2 text-sm sm:grid-cols-3"><p>Current progress: {progress.configured ? `${progress.learningDaysCompleted}/${progress.requiredLearningDays} days · ${progress.progressPercent}%` : "Not configured"}</p><p>Current deadline: {formatPhaseDate(progress.currentDeadline)}</p><p>Requested phase duration: {requestedPhaseCurriculum?.durationDays ?? "NOT DEFINED IN MILESTONE 1"} days</p></div>
                  {requestedPhaseCurriculum && <div className="text-sm"><p className="font-medium">Requested phase learning topics</p><ul className="list-inside list-disc text-muted-foreground">{requestedPhaseCurriculum.learningTopics.map((topic) => <li key={topic}>{topic}</li>)}</ul></div>}
                  {phaseHistory.length > 0 && <details><summary className="cursor-pointer text-sm font-medium">Previous phase history ({phaseHistory.length})</summary><ul className="mt-2 space-y-1 text-sm">{phaseHistory.map((item, index) => <li key={`${item.phase}-${index}`}>{item.phase}: {item.learningDaysCompleted}/{item.requiredLearningDays} days, {item.status}</li>)}</ul></details>}
                  <Textarea aria-label={`Review comment for ${student.name}`} placeholder="Optional comment for the student" maxLength={1000} value={phaseRequestComments[request._id] || ""} onChange={(event) => setPhaseRequestComments((current) => ({ ...current, [request._id]: event.target.value }))} />
                  <div className="flex gap-2"><Button type="button" disabled={Boolean(reviewingRequestId)} onClick={() => reviewPhaseRequest(request._id, "approve")}>{reviewingRequestId === request._id ? "Saving…" : "Approve"}</Button><Button type="button" variant="outline" disabled={Boolean(reviewingRequestId)} onClick={() => reviewPhaseRequest(request._id, "reject")}>Reject</Button></div>
                </div>)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Phase progress and deadlines</CardTitle><p className="text-sm text-muted-foreground">Goal submission dates count once per local date. Deadlines skip Sundays and configured holidays.</p></CardHeader>
              <CardContent>
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <select aria-label="Filter by phase" className="h-10 rounded-md border bg-background px-3 text-sm" value={phaseFilter} onChange={(event) => { setPhaseFilter(event.target.value); setPhasePage(1); }}>
                    <option value="all">All phases</option>{phaseOptions.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
                  </select>
                  <select aria-label="Filter by phase status" className="h-10 rounded-md border bg-background px-3 text-sm" value={phaseStatusFilter} onChange={(event) => { setPhaseStatusFilter(event.target.value); setPhasePage(1); }}>
                    <option value="all">All statuses</option><option value="NOT_CONFIGURED">Not configured</option><option value="NOT_STARTED">Not started</option><option value="ON_TRACK">On track</option><option value="BEHIND">Behind</option><option value="DUE_SOON">Due soon</option><option value="OVERDUE">Overdue</option><option value="COMPLETED">Completed</option>
                  </select>
                  <p className="self-center text-sm text-muted-foreground">{phaseTotal} student(s)</p>
                </div>
                {phaseRowsLoading ? <div role="status" className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /><span className="sr-only">Loading phase progress</span></div> : phaseRowsError ? <p role="alert" className="py-5 text-sm text-destructive">Phase progress is unavailable right now.</p> : <>
                  <div className="overflow-x-auto"><Table>
                    <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Phase</TableHead><TableHead>Progress</TableHead><TableHead>Learning days</TableHead><TableHead>Baseline deadline</TableHead><TableHead>Current deadline</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                    <TableBody>{phaseRows.map(({ student, progress }) => <TableRow key={student.id}>
                      <TableCell><p className="font-medium">{student.name}</p><p className="text-xs text-muted-foreground">{student.email}</p></TableCell>
                      <TableCell>{progress.phase || "—"}</TableCell>
                      <TableCell>{progress.configured ? `${progress.progressPercent}%` : "—"}</TableCell>
                      <TableCell>{progress.configured ? `${progress.learningDaysCompleted}/${progress.requiredLearningDays} · ${progress.remainingLearningDays} remaining` : "—"}</TableCell>
                      <TableCell>{formatPhaseDate(progress.baselineDeadline)}</TableCell><TableCell>{formatPhaseDate(progress.currentDeadline)}</TableCell>
                      <TableCell><Badge variant={progress.status === "OVERDUE" ? "destructive" : progress.status === "COMPLETED" ? "default" : "secondary"}>{progress.status.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell><Button variant="outline" size="sm" onClick={() => { setSelectedStudentId(student.id); document.getElementById("student-detail")?.scrollIntoView({ behavior: "smooth" }); }}>View details</Button></TableCell>
                    </TableRow>)}</TableBody>
                  </Table></div>
                  {phaseRows.length === 0 && <p className="py-7 text-center text-sm text-muted-foreground">No students match these phase filters.</p>}
                  <div className="mt-4 flex items-center justify-between"><p className="text-sm text-muted-foreground">Page {phasePage}</p><div className="flex gap-2"><Button variant="outline" disabled={phasePage <= 1} onClick={() => setPhasePage((value) => value - 1)}>Previous</Button><Button variant="outline" disabled={phasePage * 20 >= phaseTotal} onClick={() => setPhasePage((value) => value + 1)}>Next</Button></div></div>
                </>}
                <div className="mt-6 grid gap-6 border-t pt-5 lg:grid-cols-2">
                  <div className="space-y-3"><h3 className="font-semibold">Milestone 1 curriculum</h3><p className="text-xs text-muted-foreground">Durations and topics are sourced from Milestone 1.pdf and are not editable here.</p>
                    <div className="max-h-80 space-y-3 overflow-y-auto">{curriculum.map((phase) => <div key={phase.name} className="rounded border p-3 text-sm"><p className="font-medium">{phase.name} · {phase.durationDays} days</p>{phase.learningTopics.length > 0 && <ul className="list-inside list-disc text-muted-foreground">{phase.learningTopics.map((topic) => <li key={topic}>{topic}</li>)}</ul>}<p className="mt-1 text-xs text-muted-foreground">Prerequisites: {phase.prerequisites?.join(", ") || "NOT DEFINED IN MILESTONE 1"}</p>{phase.problemSolvingTrack && <p className="mt-1 text-xs text-muted-foreground">Problem-solving track: {phase.problemSolvingTrack}</p>}</div>)}</div>
                    <p className="text-xs text-muted-foreground">Problem Solving: 2 hours a day, facilitated from day 1.</p>
                    <p className="text-xs text-muted-foreground">Milestone 1 also lists a separate 30-day flowcharts + FCC pathway block. Its experiment description is truncated in the source; remaining details are NOT DEFINED IN MILESTONE 1.</p>
                  </div>
                  <div className="space-y-3"><h3 className="font-semibold">Holiday calendar</h3><div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><Input aria-label="Holiday date" type="date" value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} /><Input aria-label="Holiday name" placeholder="Holiday name" value={holidayName} onChange={(event) => setHolidayName(event.target.value)} /><Button type="button" size="sm" disabled={savingCalendar || !holidayDate || !holidayName.trim()} onClick={saveHoliday}>Add</Button></div>
                    {holidays.length ? <ul className="space-y-2 text-sm">{holidays.map((holiday) => <li key={holiday._id} className="flex items-center justify-between gap-2"><span>{holiday.date} · {holiday.name}</span><Button type="button" size="sm" variant="ghost" disabled={savingCalendar} onClick={() => removeHoliday(holiday._id)}>Remove</Button></li>)}</ul> : <p className="text-sm text-muted-foreground">No configured holidays.</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily">
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto -mx-6">
                  <div className="inline-block min-w-full align-middle px-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Goal</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden md:table-cell">Went Well</TableHead>
                          <TableHead className="hidden sm:table-cell">Challenges</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterDaily(dailyGoals).sort((a, b) => b.date.localeCompare(a.date)).map((g, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div><p className="font-medium text-sm">{g.username}</p><p className="text-xs text-muted-foreground hidden sm:block">{g.email}</p></div>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{g.date}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">{g.dailyGoal}</TableCell>
                            <TableCell><Badge variant={statusColor(g.status)}>{g.status}</Badge></TableCell>
                            <TableCell className="hidden md:table-cell max-w-[150px] truncate text-sm text-muted-foreground">{g.wentWell || "—"}</TableCell>
                            <TableCell className="hidden sm:table-cell max-w-[150px] truncate text-sm text-muted-foreground">{g.challenges || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {filterDaily(dailyGoals).length === 0 && <p className="text-center py-8 text-muted-foreground">No daily goals found.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly">
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto -mx-6">
                  <div className="inline-block min-w-full align-middle px-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Week</TableHead>
                          <TableHead>Goal</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden sm:table-cell">Challenges</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterWeekly(weeklyGoals).sort((a, b) => b.week.localeCompare(a.week)).map((g, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div><p className="font-medium text-sm">{g.username}</p><p className="text-xs text-muted-foreground hidden sm:block">{g.email}</p></div>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{g.week}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">{g.weeklyGoal}</TableCell>
                            <TableCell><Badge variant={statusColor(g.status)}>{g.status}</Badge></TableCell>
                            <TableCell className="hidden sm:table-cell max-w-[150px] truncate text-sm text-muted-foreground">{g.challenges || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {filterWeekly(weeklyGoals).length === 0 && <p className="text-center py-8 text-muted-foreground">No weekly goals found.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <div className="space-y-4">
              {filterReports(reports).length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No AI reports found.</CardContent></Card>
              ) : (
                filterReports(reports).sort((a, b) => b.createdAt?.localeCompare(a.createdAt) || 0).map((r, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">{r.username} — Week {r.week}</CardTitle>
                          <p className="text-sm text-muted-foreground">{r.email}</p>
                        </div>
                        <div className={`text-sm font-semibold px-3 py-1 rounded-full w-fit ${r.completionPercent >= 80 ? "bg-green-100 text-green-700" :
                            r.completionPercent >= 50 ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                          }`}>
                          {r.completionPercent}%
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap">{r.aiFeedback}</div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Card id="student-detail">
          <CardHeader>
            <CardTitle className="text-lg">Student Goal & Task Management</CardTitle>
            <p className="text-sm text-muted-foreground">Admin/AA access is checked by the backend using your JWT and teacher role.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="admin-student" className="text-sm font-medium">Select a student</label>
              <select id="admin-student" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
                <option value="">Choose student</option>
                {students.map((student) => <option key={student._id} value={student._id}>{student.name} · {student.email}</option>)}
              </select>
            </div>
            {selectedStudentData && selectedStudentPhase && <Card>
              <CardHeader><CardTitle className="text-lg">Phase Progress · {selectedStudentData.student.name}</CardTitle><p className="text-sm text-muted-foreground">Saved goal dates are deduplicated. Sundays and configured holidays are excluded.</p></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                  <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Current phase</p><p className="font-semibold">{selectedStudentPhase.phase || "—"}</p></div>
                  <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Phase start</p><p className="font-semibold">{formatPhaseDate(selectedStudentPhase.phaseStartDate)}</p></div>
                  <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Learning days</p><p className="font-semibold">{selectedStudentPhase.configured ? `${selectedStudentPhase.learningDaysCompleted}/${selectedStudentPhase.requiredLearningDays} · ${selectedStudentPhase.remainingLearningDays} remaining` : "—"}</p></div>
                  <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Progress</p><p className="font-semibold">{selectedStudentPhase.configured ? `${selectedStudentPhase.progressPercent}%` : "Not configured"}</p></div>
                  <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Baseline deadline</p><p className="font-semibold">{formatPhaseDate(selectedStudentPhase.baselineDeadline)}</p></div>
                  <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Current deadline</p><p className="font-semibold">{formatPhaseDate(selectedStudentPhase.currentDeadline)}</p></div>
                  <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Status</p><p className="font-semibold">{selectedStudentPhase.status.replace(/_/g, " ")}{selectedStudentPhase.status === "OVERDUE" ? ` · ${selectedStudentPhase.overdueDays} days overdue` : ""}</p></div>
                  <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Completed on</p><p className="font-semibold">{formatPhaseDate(selectedStudentPhase.completedOn)}</p></div>
                </div>
                {selectedStudentPhase.extensionDays ? <p className="text-sm">Deadline extension: {selectedStudentPhase.extensionDays} day(s) · {selectedStudentPhase.extensionReasons?.join(", ") || "Reason not recorded"}</p> : <p className="text-xs text-muted-foreground">{selectedStudentPhase.deadlineNote}</p>}
                {selectedStudentPhase.configured && <div className="text-xs text-muted-foreground">Timezone: {selectedStudentPhase.timezone}<p className="mt-1">Learning dates counted: {selectedStudentPhase.learningDates?.map(formatPhaseDate).join(", ") || "none"}</p></div>}
                {!selectedStudentPhase.phase && <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <select aria-label="Assigned phase" className="h-10 rounded-md border bg-background px-3 text-sm" value={phaseDraft} onChange={(event) => { setPhaseDraft(event.target.value); setPhaseDateDraft(""); }}>
                    <option value="">Choose phase</option>{phaseOptions.map((phase) => <option key={phase} value={phase}>{phase} · {phaseDurations[phase]} days</option>)}
                  </select>
                  <Input aria-label="Phase start date" type="date" value={phaseDateDraft} onChange={(event) => setPhaseDateDraft(event.target.value)} />
                  <Button type="button" disabled={savingPhase || !phaseDraft || !phaseDateDraft} onClick={saveStudentPhase}>{savingPhase ? "Saving…" : "Assign initial phase"}</Button>
                </div>}
                {selectedStudentPhase.phase && <p className="text-xs text-muted-foreground">Phase changes must be approved from the student request queue. Historical goals stay in Google Sheets and remain tagged to their submitted phase.</p>}
                {selectedStudentPhase.phaseDetails?.learningTopics?.length ? <div><p className="text-sm font-medium">Current phase topics</p><ul className="list-inside list-disc text-sm text-muted-foreground">{selectedStudentPhase.phaseDetails.learningTopics.map((topic) => <li key={topic}>{topic}</li>)}</ul></div> : null}
                {(selectedStudentPhase.phaseHistory || []).length > 0 && <details><summary className="cursor-pointer text-sm font-medium">Previous phase history</summary><ul className="mt-2 space-y-1 text-sm">{(selectedStudentPhase.phaseHistory || []).map((entry, index) => <li key={`${entry.phase}-${index}`}>{entry.phase}: {entry.learningDaysCompleted}/{entry.requiredLearningDays} days ({entry.status}), {formatPhaseDate(entry.phaseStartDate)}–{formatPhaseDate(entry.phaseEndDate)}. Learning dates: {entry.learningDates?.map(formatPhaseDate).join(", ") || "none"}</li>)}</ul></details>}
                {(selectedStudentPhase.phaseChangeRequests || []).length > 0 && <details><summary className="cursor-pointer text-sm font-medium">Phase-change requests</summary><ul className="mt-2 space-y-1 text-sm">{(selectedStudentPhase.phaseChangeRequests || []).map((request) => <li key={request._id}>{request.currentPhase} → {request.requestedPhase} · {request.status} · {request.reason}{request.reviewComment ? ` · Team: ${request.reviewComment}` : ""}</li>)}</ul></details>}
              </CardContent>
            </Card>}
            {taskLoading && <div className="flex justify-center py-5"><Loader2 className="h-5 w-5 animate-spin" /></div>}
            {selectedStudentData && !taskLoading && <div className="space-y-4">
              {selectedStudentGrowth && <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Student Growth · {selectedStudentGrowth.student.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">Observed metrics · {selectedStudentGrowth.period.startDate} – {selectedStudentGrowth.period.endDate}</p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Daily completion</p><p className="mt-1 text-xl font-semibold">{selectedStudentGrowth.metrics.current.dailyGoals.completionPercent === null ? "—" : `${selectedStudentGrowth.metrics.current.dailyGoals.completionPercent}%`}</p><p className="text-xs text-muted-foreground">{selectedStudentGrowth.metrics.current.dailyGoals.completed} / {selectedStudentGrowth.metrics.current.dailyGoals.total} goals</p></div>
                    <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Weekly completion</p><p className="mt-1 text-xl font-semibold">{selectedStudentGrowth.metrics.current.weeklyGoals.completionPercent === null ? "—" : `${selectedStudentGrowth.metrics.current.weeklyGoals.completionPercent}%`}</p><p className="text-xs text-muted-foreground">{selectedStudentGrowth.metrics.current.weeklyGoals.completed} / {selectedStudentGrowth.metrics.current.weeklyGoals.total} goals</p></div>
                    <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Reflection coverage</p><p className="mt-1 text-xl font-semibold">{selectedStudentGrowth.metrics.current.reflectionCoverage.count} / {selectedStudentGrowth.metrics.current.reflectionCoverage.totalDailyGoals}</p><p className="text-xs text-muted-foreground">daily goal entries with reflection</p></div>
                    <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Task completion</p><p className="mt-1 text-xl font-semibold">{selectedStudentGrowth.metrics.taskCompletion.completed} / {selectedStudentGrowth.metrics.taskCompletion.total}</p><p className="text-xs text-muted-foreground">recent accepted plans; dates unavailable</p></div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Observed evidence</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{selectedStudentGrowth.observedEvidence.map((evidence, index) => <li key={`${evidence}-${index}`}>{evidence}</li>)}</ul>
                  </div>
                  {selectedStudentGrowth.aiInsights.length > 0 && <div className="space-y-3">
                    <h3 className="text-sm font-semibold">AI Insights · interpretations, not confirmed facts</h3>
                    {selectedStudentGrowth.aiInsights.map((report, index) => <div key={`${report.period?.startDate || "period"}-${index}`} className="rounded-md border p-3 text-sm">
                      <p className="mb-2 text-xs text-muted-foreground">{report.evidence}{report.period && ` · ${report.period.startDate} – ${report.period.endDate}`}</p>
                      <p className="font-medium">{report.insights.summary}</p>
                      {report.insights.strengths.length > 0 && <p className="mt-2"><span className="font-medium">Strengths suggested by AI:</span> {report.insights.strengths.slice(0, 3).join(" · ")}</p>}
                      {report.insights.challenges.length > 0 && <p className="mt-2"><span className="font-medium">Challenges suggested by AI:</span> {report.insights.challenges.slice(0, 3).join(" · ")}</p>}
                      {report.insights.unfinished.length > 0 && <p className="mt-2"><span className="font-medium">Unfinished patterns suggested by AI:</span> {report.insights.unfinished.slice(0, 3).join(" · ")}</p>}
                      {report.insights.nextActions.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{report.insights.nextActions.slice(0, 3).map((action, actionIndex) => <li key={`${action}-${actionIndex}`}>{action}</li>)}</ul>}
                    </div>)}
                  </div>}
                  {selectedStudentGrowth.aiInsights.length === 0 && <p className="text-sm text-muted-foreground">No generated weekly AI insights are available for this student yet.</p>}
                </CardContent>
              </Card>}
              <div className="space-y-3">
                <h3 className="font-semibold">Weekly AI reports</h3>
                {reports.filter((report) => report.email?.toLowerCase() === selectedStudentData.student.email.toLowerCase()).sort((a, b) => b.createdAt?.localeCompare(a.createdAt) || 0).slice(0, 3).map((report, index) => <div key={`${report.week}-${index}`} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3"><p className="font-medium">Week {report.week}</p><span>{report.completionPercent}% completion</span></div>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{report.aiFeedback || "No report narrative saved."}</p>
                </div>)}
                {loadedTabs.has("reports") && reports.filter((report) => report.email?.toLowerCase() === selectedStudentData.student.email.toLowerCase()).length === 0 && <p className="text-sm text-muted-foreground">No weekly reports found for this student.</p>}
                {!loadedTabs.has("reports") && <p className="text-sm text-muted-foreground">Open the AI Reports tab to load saved reports for this student.</p>}
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Goals</h3>
                {[...selectedStudentData.goals.daily, ...selectedStudentData.goals.weekly].map((goal, index) => (
                  <div key={`${goal.timeframe}-${goal.date}-${index}`} className="rounded-md border p-3 text-sm">
                    <div className="flex justify-between gap-3"><span className="font-medium">{goal.timeframe === "daily" ? "Daily" : "Weekly"} · {goal.date}</span><span>{goal.status}</span></div>
                    <p className="mt-1">{goal.goal}</p>
                    {(goal.reflection || goal.wentWell || goal.challenges || goal.left) && <div className="mt-2 space-y-1 border-t pt-2 text-muted-foreground">
                      {goal.reflection && <p><span className="font-medium text-foreground">Reflection:</span> {goal.reflection}</p>}
                      {goal.wentWell && <p><span className="font-medium text-foreground">Went well:</span> {goal.wentWell}</p>}
                      {goal.challenges && <p><span className="font-medium text-foreground">Challenges:</span> {goal.challenges}</p>}
                      {goal.left && <p><span className="font-medium text-foreground">Still to do:</span> {goal.left}</p>}
                    </div>}
                  </div>
                ))}
                {selectedStudentData.goals.daily.length + selectedStudentData.goals.weekly.length === 0 && <p className="text-sm text-muted-foreground">No goals found in Google Sheets.</p>}
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">Task breakdowns</h3>
                {selectedStudentData.breakdowns.map((breakdown: GoalTaskBreakdown) => <div key={breakdown._id} className="space-y-3 rounded-md border p-3">
                  <div><p className="text-xs text-muted-foreground">{breakdown.timeframe} · {breakdown.studentName} · {breakdown.studentEmail}</p><p className="font-medium">{breakdown.goal}</p></div>
                  {breakdown.tasks.map((task, index) => {
                    const taskId = task._id || "";
                    const isEditing = editingTaskId === taskId;
                    return <div key={taskId || index} className="space-y-2 rounded-md bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">Source: {task.source || "student"} · Status: {task.status || "Pending"}</p>
                        <div className="flex gap-1">
                          {isEditing ? <>
                            <Button type="button" size="sm" onClick={saveAdminTask}><Save className="mr-1 h-4 w-4" />Save</Button>
                            <Button type="button" size="icon" variant="ghost" aria-label="Cancel task edit" onClick={() => { setEditingTaskId(""); setTaskDraft(null); }}><X className="h-4 w-4" /></Button>
                          </> : <Button type="button" size="sm" variant="outline" onClick={() => { setEditingTaskId(taskId); setTaskDraft({ ...task }); }}>Edit</Button>}
                          <Button type="button" size="icon" variant="ghost" aria-label="Delete task" onClick={() => removeAdminTask(task)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      {isEditing && taskDraft ? <>
                        <Input aria-label="Task title" value={taskDraft.title} onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })} />
                        <Textarea aria-label="Task description" value={taskDraft.description} onChange={(event) => setTaskDraft({ ...taskDraft, description: event.target.value })} rows={2} />
                        <div className="flex gap-2">
                          <Input aria-label="Task order" type="number" min={1} value={taskDraft.order} onChange={(event) => setTaskDraft({ ...taskDraft, order: Number(event.target.value) })} />
                          <select aria-label="Task status" className="h-10 rounded-md border bg-background px-3 text-sm" value={taskDraft.status || "Pending"} onChange={(event) => setTaskDraft({ ...taskDraft, status: event.target.value as GoalTask["status"] })}>
                            <option>Pending</option><option>In Progress</option><option>Completed</option>
                          </select>
                        </div>
                      </> : <><p className="font-medium">{task.order}. {task.title}</p><p className="text-sm text-muted-foreground">{task.description}</p></>}
                    </div>;
                  })}
                  {breakdown.tasks.length === 0 && <p className="text-sm text-muted-foreground">This goal has no remaining tasks.</p>}
                </div>)}
                {selectedStudentData.breakdowns.length === 0 && <p className="text-sm text-muted-foreground">No accepted task breakdowns for this student.</p>}
              </div>
            </div>}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default TeacherDashboard;
