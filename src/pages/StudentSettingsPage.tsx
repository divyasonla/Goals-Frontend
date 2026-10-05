import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { fetchGeminiKeySettings, removeGeminiApiKey, saveGeminiApiKey } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const StudentSettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGeminiKeySettings()
      .then((settings) => setConfigured(settings.configured))
      .catch((error: unknown) => toast({
        title: "Unable to load settings",
        description: error instanceof Error ? error.message : "Try again later.",
        variant: "destructive",
      }))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiKey.trim()) {
      toast({ title: "Gemini API key required", description: "Paste your Gemini API key to save it.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await saveGeminiApiKey(apiKey.trim());
      setApiKey("");
      setConfigured(true);
      toast({ title: "API key saved", description: "The key is encrypted and will not be shown again." });
    } catch (error) {
      toast({
        title: "Unable to save API key",
        description: error instanceof Error ? error.message : "Try again later.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Remove your saved Gemini API key? AI features will ask you to add one again.")) return;
    setSaving(true);
    try {
      await removeGeminiApiKey();
      setApiKey("");
      setConfigured(false);
      toast({ title: "API key removed" });
    } catch (error) {
      toast({
        title: "Unable to remove API key",
        description: error instanceof Error ? error.message : "Try again later.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings & Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your profile and personal AI configuration.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><span className="font-medium">Name:</span> {user?.username}</p>
            <p><span className="font-medium">Email:</span> {user?.email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <CardTitle>Gemini API Key</CardTitle>
            </div>
            <CardDescription>Use your own Gemini key for goal feedback, reflection analysis, task breakdowns, and weekly reports.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>Your key is encrypted before storage. It is never returned to this page or shown to Admin/AA users.</AlertDescription>
            </Alert>

            {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading key status...</div> : (
              <p role="status" className="text-sm">{configured ? "A Gemini API key is configured." : "No Gemini API key is configured."}</p>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="student-gemini-api-key">{configured ? "Enter a new key to replace the saved key" : "Paste your Gemini API key"}</Label>
                <Input
                  id="student-gemini-api-key"
                  type="password"
                  autoComplete="new-password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="Gemini API key"
                  maxLength={256}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving || loading}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : configured ? "Replace API Key" : "Save API Key"}
                </Button>
                {configured && <Button type="button" variant="outline" onClick={handleRemove} disabled={saving}>
                  <Trash2 className="mr-2 h-4 w-4" />Remove API Key
                </Button>}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default StudentSettingsPage;
