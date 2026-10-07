import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { signup } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Target, AlertCircle, Info, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SignupPage = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{
    title: string;
    message: string;
    type: "exists" | "mismatch" | "validation" | "error";
  } | null>(null);

  const { setUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertInfo(null);

    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !role) {
      setAlertInfo({
        title: "Missing Fields",
        message: "Please fill in all fields (Full Name, Email, Password, Confirm Password, and Role).",
        type: "validation"
      });
      toast({ title: "Validation Error", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      setAlertInfo({
        title: "Password Too Short",
        message: "Password must be at least 6 characters long.",
        type: "validation"
      });
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      setAlertInfo({
        title: "Passwords Do Not Match",
        message: "The password and confirm password you entered do not match. Please verify and re-type them.",
        type: "mismatch"
      });
      toast({
        title: "Passwords Do Not Match",
        description: "Please verify and re-enter both password fields.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const data = await signup(username.trim(), email.trim(), password, role, confirmPassword);
      setUser(data.user, data.token);
      toast({
        title: "Account Created!",
        description: "Welcome to AI Daily Goal Tracker."
      });
      navigate(data.user.role === "teacher" ? "/teacher" : "/student");
    } catch (err: any) {
      const msg = err.message || "Failed to create account.";
      const isAlreadyExists =
        msg.toLowerCase().includes("already exist") ||
        err.code === "ACCOUNT_ALREADY_EXISTS" ||
        err.status === 409 ||
        err.status === 400 && msg.toLowerCase().includes("exist");

      if (isAlreadyExists) {
        setAlertInfo({
          title: "Account Already Exists",
          message: "An account with this email is already registered. You can log in directly.",
          type: "exists"
        });
        toast({
          title: "Account Already Exists",
          description: "This email is already registered. Please sign in instead.",
          variant: "destructive"
        });
      } else {
        setAlertInfo({
          title: "Signup Failed",
          message: msg,
          type: "error"
        });
        toast({ title: "Signup Failed", description: msg, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Target className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Join the AI Daily Goal Tracker</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {alertInfo && (
              <Alert variant={alertInfo.type === "exists" ? "default" : "destructive"} className={alertInfo.type === "exists" ? "border-primary/50 bg-primary/5" : ""}>
                {alertInfo.type === "exists" ? (
                  <Info className="h-4 w-4 text-primary" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle className="font-semibold">{alertInfo.title}</AlertTitle>
                <AlertDescription className="mt-1">
                  <p>{alertInfo.message}</p>
                  {alertInfo.type === "exists" && (
                    <div className="mt-2">
                      <Link
                        to="/login"
                        className="inline-flex items-center text-sm font-semibold text-primary hover:underline gap-1"
                      >
                        Sign in to your account <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Full Name</Label>
              <Input
                id="username"
                placeholder="John Doe"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (alertInfo) setAlertInfo(null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (alertInfo) setAlertInfo(null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (alertInfo) setAlertInfo(null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (alertInfo) setAlertInfo(null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(val) => { setRole(val); if (alertInfo) setAlertInfo(null); }}>
                <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Teacher/Admin accounts are provisioned by an administrator.</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SignupPage;

