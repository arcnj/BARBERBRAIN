import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Navigation, BottomNavigation } from "@/components/layout/Navigation";
import { TodayTab } from "@/components/dashboard/TodayTab";
import { AgendaTab } from "@/components/dashboard/AgendaTab";
import { ClientsTab } from "@/components/dashboard/ClientsTab";
import { BusinessTab } from "@/components/dashboard/BusinessTab";
import { SuggestionsTab } from "@/components/dashboard/SuggestionsTab";
import { ServicesTab } from "@/components/dashboard/ServicesTab";
import { ProductsTab } from "@/components/dashboard/ProductsTab";
import { PromotionsTab } from "@/components/dashboard/PromotionsTab";
import { BarbersTab } from "@/components/dashboard/BarbersTab";
import { Helmet } from "react-helmet";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("hoje");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (!loading && user && role === "customer") {
      navigate("/cliente");
    }
  }, [user, role, loading, navigate]);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  const renderTab = () => {
    switch (activeTab) {
      case "hoje":
        return <TodayTab />;
      case "agenda":
        return <AgendaTab />;
      case "clientes":
        return <ClientsTab />;
      case "barbeiros":
        return <BarbersTab />;
      case "servicos":
        return <ServicesTab />;
      case "produtos":
        return <ProductsTab />;
      case "promocoes":
        return <PromotionsTab />;
      case "negocio":
        return <BusinessTab />;
      case "sugestoes":
        return <SuggestionsTab />;
      case "configuracoes":
        return <BusinessTab />;
      default:
        return <TodayTab />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (role !== "barber" && role !== "admin")) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - BarberBrain</title>
        <meta name="description" content="Dashboard do barbeiro - Gerencie sua barbearia com inteligência artificial." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Header onNavigate={handleNavigate} />
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="container py-6">
          {renderTab()}
        </main>
        
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </>
  );
}
