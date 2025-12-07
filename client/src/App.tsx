import { useState, useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import Leads from "@/pages/Leads";
import Events from "@/pages/Events";
import EventSummary from "@/pages/EventSummary";
import Forms from "@/pages/Forms";
import FormBuilder from "@/pages/FormBuilder";
import FormSubmissions from "@/pages/FormSubmissions";
import PublicForm from "@/pages/PublicForm";
import Booking from "@/pages/Booking";
import Settings from "@/pages/Settings";
import DevTest from "@/pages/DevTest";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { useTranslation } from "react-i18next";
import logoDarkUrl from "@assets/logo_1762426754494.png";
import logoLightUrl from "@assets/logo_white_1762533626956.png";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }
  
  return <>{children}</>;
}

// Component to handle root path redirect based on user role
// This component is rendered OUTSIDE Switch to avoid route matching issues
function RootRedirect() {
  const [, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  
  useEffect(() => {
    // Only redirect if we're actually on the root path
    // IMPORTANT: Only use window.location.pathname, NOT wouter's location state
    // because wouter's location might initially be "/" before it reads the real URL
    const isRootPath = window.location.pathname === '/';
    if (isRootPath && !isLoading) {
      if (isAuthenticated && user) {
        // Authenticated: redirect based on user role
        if (user.role === "viewer") {
          setLocation("/events");
        } else {
          setLocation("/leads");
        }
      } else {
        // Not authenticated: redirect to login
        setLocation("/login");
      }
    }
  }, [user, isLoading, isAuthenticated, setLocation]);
  
  // This component doesn't render anything - it just handles the redirect
  return null;
}

function Router() {
  const [, setLocation] = useLocation();
  
  return (
    <>
      {/* Handle root path redirect outside Switch to avoid prefix matching issues */}
      <RootRedirect />
      <Switch>
      <Route path="/login" component={Login} />
      <Route path="/dev" component={DevTest} />
      
      {/* Demo routes - protected */}
      <Route path="/demo/leads">
        {() => (
          <ProtectedRoute>
            <Leads />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/demo/events/:id/summary">
        {(params) => (
          <ProtectedRoute>
            <EventSummary />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/demo/events">
        {() => (
          <ProtectedRoute>
            <Events />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/demo/booking">
        {() => (
          <ProtectedRoute>
            <Booking />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/demo/forms/:id/public">
        {(params) => (
          <ProtectedRoute>
            <PublicForm />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/demo/forms/:id/submissions">
        {(params) => (
          <ProtectedRoute>
            <FormSubmissions />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/demo/forms/:id/builder">
        {(params) => (
          <ProtectedRoute>
            <FormBuilder />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/demo/forms">
        {() => (
          <ProtectedRoute>
            <Forms />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/demo/settings">
        {() => (
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/demo">
        {() => {
          setLocation("/demo/leads");
          return null;
        }}
      </Route>
      
      {/* Main routes - protected */}
      <Route path="/leads">
        {() => (
          <ProtectedRoute>
            <Leads />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/events/:id/summary">
        {(params) => (
          <ProtectedRoute>
            <EventSummary />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/events">
        {() => (
          <ProtectedRoute>
            <Events />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/booking">
        {() => (
          <ProtectedRoute>
            <Booking />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/forms/:id/public">
        {(params) => (
          <ProtectedRoute>
            <PublicForm />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/forms/:id/submissions">
        {(params) => (
          <ProtectedRoute>
            <FormSubmissions />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/forms/:id/builder">
        {(params) => (
          <ProtectedRoute>
            <FormBuilder />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/forms">
        {() => (
          <ProtectedRoute>
            <Forms />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/settings">
        {() => (
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
    </>
  );
}


export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppRouter() {
  const [location] = useLocation();
  
  // Check window.location.pathname for initial load
  const pathname = typeof window !== 'undefined' ? window.location.pathname : location;
  
  // Dev mode: render directly without Bitrix24 checks
  if (location === "/dev" || pathname === "/dev") {
    return (
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    );
  }

  // Demo mode and standalone: render with sidebar
  return <AppInDemoMode />;
}

function AppInDemoMode() {
  return <AppContent />;
}

function AppContent() {
  const { t } = useTranslation();
  const { logout, user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Initialize theme from localStorage and DOM
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial = stored || "light";
    setTheme(initial);

    // Watch for theme changes on documentElement
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const logoUrl = theme === "dark" ? logoLightUrl : logoDarkUrl;
  
  // Login page doesn't need sidebar/header
  if (location === "/login") {
    return (
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <div className="flex items-center gap-3">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <img src={logoUrl} alt="Unique Travel" className="h-8 w-auto" data-testid="img-logo" />
              </div>
              <div className="flex items-center gap-2">
                {isAuthenticated && user && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground" data-testid="text-username">
                      {user.firstName} {user.lastName}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      data-testid="button-logout"
                      title="Выход"
                    >
                      {isLoggingOut ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1 overflow-auto">
              <Router />
            </main>
          </div>
        </div>
      </SidebarProvider>
      <Toaster />
    </TooltipProvider>
  );
}

