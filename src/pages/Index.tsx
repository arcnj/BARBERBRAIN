import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation, BottomNavigation } from "@/components/layout/Navigation";
import { TodayTab } from "@/components/dashboard/TodayTab";
import { ClientsTab } from "@/components/dashboard/ClientsTab";
import { BusinessTab } from "@/components/dashboard/BusinessTab";
import { SuggestionsTab } from "@/components/dashboard/SuggestionsTab";
import { Helmet } from "react-helmet";

const Index = () => {
  const [activeTab, setActiveTab] = useState("hoje");

  const renderTab = () => {
    switch (activeTab) {
      case "hoje":
        return <TodayTab />;
      case "clientes":
        return <ClientsTab />;
      case "negocio":
        return <BusinessTab />;
      case "sugestoes":
        return <SuggestionsTab />;
      default:
        return <TodayTab />;
    }
  };

  return (
    <>
      <Helmet>
        <title>BarberBrain - O Cérebro da Sua Barbearia</title>
        <meta name="description" content="Sistema inteligente de retenção e gestão para barbearias. Aumente seu faturamento com IA, recupere clientes automaticamente e tome decisões baseadas em dados." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="container py-6">
          {renderTab()}
        </main>
        
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </>
  );
};

export default Index;
