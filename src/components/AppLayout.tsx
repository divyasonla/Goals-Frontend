import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Target, LogOut, LayoutDashboard, Calendar, BarChart3, Menu, Settings, TrendingUp, Sparkles } from "lucide-react";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

  const studentLinks = [
    { path: "/student", label: "Daily Goals", icon: Calendar },
    { path: "/student/weekly", label: "Weekly Goals", icon: LayoutDashboard },
    { path: "/student/reports", label: "AI Reports", icon: BarChart3 },
    { path: "/student/growth", label: "My Growth", icon: TrendingUp },
    { path: "/student/mentor", label: "AI Mentor", icon: Sparkles },
    { path: "/student/settings", label: "Settings / Profile", icon: Settings },
  ];

  const teacherLinks = [
    { path: "/teacher", label: "Dashboard", icon: LayoutDashboard },
  ];

  const links = user?.role === "teacher" ? teacherLinks : studentLinks;

  const handleNav = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Goal Tracker</h1>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => (
          <button
            key={link.path}
            onClick={() => handleNav(link.path)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isActive(link.path)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium text-foreground truncate">{user?.username}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
            {user?.role}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-muted/30">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground">Goal Tracker</span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 flex flex-col">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebarContent}
            </SheetContent>
          </Sheet>
        </header>
        <main className="p-4 overflow-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="w-64 bg-card border-r border-border flex flex-col sticky top-0 h-screen">
        {sidebarContent}
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
};

export default AppLayout;
