import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerProducts from "./pages/CustomerProducts";
import NotFound from "./pages/NotFound";
import { BarbershopLinkPage, CustomerBarbershopProvider } from "@/features/agendamento";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/cliente"
              element={
                <CustomerBarbershopProvider>
                  <CustomerDashboard />
                </CustomerBarbershopProvider>
              }
            />
            <Route
              path="/cliente/produtos"
              element={
                <CustomerBarbershopProvider>
                  <CustomerProducts />
                </CustomerBarbershopProvider>
              }
            />
            <Route path="/b/:slug" element={<BarbershopLinkPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
