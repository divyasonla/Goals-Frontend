import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import AppLayout from "@/components/AppLayout";

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else {
      // Redirect based on user role
      if (user.role === "teacher") {
        navigate("/teacher");
      } else if (user.role === "student") {
        navigate("/student");
      }
    }
  }, [user, navigate]);

  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold">Redirecting to your dashboard...</h1>
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
