import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { login, forgotPassword } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Target, AlertCircle, ArrowRight, Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{
    title: string;
    message: string;
    type: "password_mismatch" | "not_found" | "error";
  } | null>(null);

  const { setUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertInfo(null);

    if (!email.trim() || !password.trim()) {
      setAlertInfo({
        title: "Missing Fields",
        message: "Please enter both your email and password.",
        type: "error"
      });
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      setUser(data.user, data.token);
      toast({
        title: "Welcome back!",
        description: "Logged in successfully."
      });
      navigate("/dashboard");
    } catch (err: any) {
      const msg = err.message || "Failed to log in.";
      const isPasswordMismatch =
        err.code === "INCORRECT_PASSWORD" ||
        msg.toLowerCase().includes("incorrect password") ||
        msg.toLowerCase().includes("invalid credentials");

      const isNotFound =
        err.code === "USER_NOT_FOUND" ||
        msg.toLowerCase().includes("no account found") ||
        msg.toLowerCase().includes("user not found");

      if (isPasswordMismatch) {
        setAlertInfo({
          title: "Incorrect Password",
          message: "The password you entered does not match our records. Please try again or reset your password.",
          type: "password_mismatch"
        });
        toast({
          title: "Incorrect Password",
          description: "Please verify your password and try again.",
          variant: "destructive"
        });
      } else if (isNotFound) {
        setAlertInfo({
          title: "Account Not Found",
          message: "No account exists with this email address. Please check your spelling or sign up.",
          type: "not_found"
        });
        toast({
          title: "Account Not Found",
          description: "No account exists with this email. Please sign up.",
          variant: "destructive"
        });
      } else {
        setAlertInfo({
          title: "Login Failed",
          message: msg,
          type: "error"
        });
        toast({ title: "Login Failed", description: msg, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Form Component
  function ForgotPasswordForm() {
    const [forgotEmail, setForgotEmail] = useState(email);
    const [forgotLoading, setForgotLoading] = useState(false);
    const { toast } = useToast();

    const handleForgot = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!forgotEmail.trim()) {
        toast({ title: "Error", description: "Please enter your email", variant: "destructive" });
        return;
      }
      setForgotLoading(true);
      try {
        const data = await forgotPassword(forgotEmail.trim());
        toast({ title: "OTP Sent", description: data.message || "Reset OTP sent to your email" });
        setIsForgotOpen(false);
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      } finally {
        setForgotLoading(false);
      }
    };

    return (
      <form onSubmit={handleForgot} className="space-y-4">
        <div>
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            type="email"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Cancel</Button>
          </DialogClose>
          <Button type="submit" disabled={forgotLoading}>
            {forgotLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send Reset OTP
          </Button>
        </DialogFooter>
      </form>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 w-full">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Target className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center font-bold">Goal Tracker</CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {alertInfo && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-semibold">{alertInfo.title}</AlertTitle>
              <AlertDescription className="mt-1">
                <p>{alertInfo.message}</p>
                {alertInfo.type === "password_mismatch" && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotOpen(true)}
                      className="inline-flex items-center text-sm font-semibold underline hover:opacity-80"
                    >
                      Forgot your password? Click here to reset
                    </button>
                  </div>
                )}
                {alertInfo.type === "not_found" && (
                  <div className="mt-2">
                    <Link
                      to="/signup"
                      className="inline-flex items-center text-sm font-semibold underline hover:opacity-80 gap-1"
                    >
                      Create a new account instead <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (alertInfo) setAlertInfo(null);
                }}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(true)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (alertInfo) setAlertInfo(null);
                }}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center space-y-4">
          <Dialog open={isForgotOpen} onOpenChange={setIsForgotOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                  Enter your email address and we'll send you an OTP to reset your password.
                </DialogDescription>
              </DialogHeader>
              <ForgotPasswordForm />
            </DialogContent>
          </Dialog>

          <div className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;

