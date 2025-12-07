import { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "./queryClient";
import type { User } from "@shared/schema";

type AuthUser = Omit<User, "passwordHash">;

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [localUser, setLocalUser] = useState<AuthUser | null>(null);

  const { data, isLoading } = useQuery<{ user: AuthUser } | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data?.user) {
      setLocalUser(data.user);
    } else {
      setLocalUser(null);
    }
  }, [data]);

  // Use data.user directly when available to avoid race condition
  // between query completion and useEffect state update
  const user = data?.user ?? localUser;

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", { username, password });
      return await response.json();
    },
    onSuccess: (data) => {
      setLocalUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      setLocalUser(null);
      queryClient.clear();
    },
  });

  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
