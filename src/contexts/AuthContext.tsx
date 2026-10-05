import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null, token?: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem("goal_tracker_user");
    const token = sessionStorage.getItem("goal_tracker_token");
    if (stored && token) {
      try {
        setUserState(JSON.parse(stored));
      } catch {}
    } else if (stored) {
      // Earlier app versions stored only the UI user object. Require a fresh
      // login so protected APIs never treat that client-side value as a session.
      sessionStorage.removeItem("goal_tracker_user");
    }
    setIsLoading(false);
  }, []);

  const setUser = (user: User | null, token?: string) => {
    setUserState(user);
    if (user) {
      sessionStorage.setItem("goal_tracker_user", JSON.stringify(user));
      if (token) sessionStorage.setItem("goal_tracker_token", token);
    } else {
      sessionStorage.removeItem("goal_tracker_user");
      sessionStorage.removeItem("goal_tracker_token");
    }
  };

  const logout = () => {
    setUserState(null);
    sessionStorage.removeItem("goal_tracker_user");
    sessionStorage.removeItem("goal_tracker_token");
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
