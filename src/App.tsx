import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Controle from "./pages/Controle";
import Dashboard from "./pages/Dashboard";
import ListaMix from "./pages/ListaMix";
import GerenciarVendedores from "./pages/GerenciarVendedores";
import ConsultaPrecos from "./pages/ConsultaPrecos";
import Promocoes from "./pages/Promocoes";
import Alertas from "./pages/Alertas";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, role, loading } = useAuth();
  const location = window.location;

  // Reset password page is always accessible
  if (location.pathname === "/reset-password") {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center animate-fade-in-up">
          <h1 className="text-2xl font-bold text-warning mb-2">CotaFlow</h1>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Vendedor goes to price consultation only
  if (role === "vendedor") {
    return <ConsultaPrecos />;
  }

  // Admin gets full app
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/controle" element={<Controle />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/lista-mix" element={<ListaMix />} />
        <Route path="/alertas" element={<Alertas />} />
        <Route path="/vendedores" element={<GerenciarVendedores />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
