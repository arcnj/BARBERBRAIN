import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Helmet } from "react-helmet";
import { Scissors, LogOut, Calendar, Clock, User, Loader2, Megaphone, Percent, BadgeDollarSign, CalendarPlus, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppointmentScheduler } from "@/components/customer/AppointmentScheduler";

interface Order {
  id: string;
  status: string;
  scheduled_at: string | null;
  total_price: number;
  notes: string | null;
  created_at: string;
  preferred_barber: {
    name: string;
  } | null;
  order_items: {
    id: string;
    price: number;
    service: {
      name: string;
    };
  }[];
}

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  discount_percentage: number | null;
  discount_value: number | null;
  end_date: string | null;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "default" },
  in_progress: { label: "Em andamento", variant: "default" },
  completed: { label: "Concluído", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { user, role, loading, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [activeTab, setActiveTab] = useState("agendar");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (!loading && user && (role === "barber" || role === "admin")) {
      navigate("/dashboard");
    }
  }, [user, role, loading, navigate]);

  const fetchOrders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          scheduled_at,
          total_price,
          notes,
          created_at,
          preferred_barber:barbers!orders_preferred_barber_id_fkey(name),
          order_items(
            id,
            price,
            service:services(name)
          )
        `)
        .eq("customer_id", user.id)
        .in("status", ["pending", "confirmed", "in_progress"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from("promotions")
        .select("id, title, description, discount_percentage, discount_value, end_date")
        .eq("active", true);

      if (error) throw error;
      setPromotions(data || []);
    } catch (err) {
      console.error("Error fetching promotions:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchPromotions();
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Meus Pedidos - BarberBrain</title>
        <meta name="description" content="Visualize seus agendamentos e faça novos pedidos na BarberBrain." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 glass border-b border-border/50">
          <div className="container flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Scissors className="h-5 w-5 text-primary" />
              </div>
              <span className="font-heading text-xl font-bold text-foreground">
                Barber<span className="text-primary">Brain</span>
              </span>
            </div>

            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="container py-6 pb-24">
          {/* Welcome Section */}
          <div className="mb-6">
            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
              Olá! 👋
            </h1>
            <p className="text-muted-foreground">
              Agende seu horário e acompanhe seus pedidos
            </p>
          </div>

          {/* Promotions Section */}
          {promotions.length > 0 && (
            <div className="mb-6">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Promoções
              </h2>
              <div className="space-y-3">
                {promotions.map((promo) => (
                  <Card key={promo.id} className="glass border-primary/30 bg-primary/5">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">{promo.title}</h3>
                          {promo.description && (
                            <p className="text-sm text-muted-foreground mt-1">{promo.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {promo.discount_percentage && (
                            <Badge variant="default" className="gap-1">
                              <Percent className="h-3 w-3" />
                              {promo.discount_percentage}% OFF
                            </Badge>
                          )}
                          {promo.discount_value && (
                            <Badge variant="default" className="gap-1">
                              <BadgeDollarSign className="h-3 w-3" />
                              R$ {promo.discount_value.toFixed(2)} OFF
                            </Badge>
                          )}
                        </div>
                      </div>
                      {promo.end_date && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Válido até {format(new Date(promo.end_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Tabs for Scheduling and Orders */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="agendar" className="flex items-center gap-2">
                <CalendarPlus className="h-4 w-4" />
                Agendar
              </TabsTrigger>
              <TabsTrigger value="pedidos" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Meus Pedidos
              </TabsTrigger>
            </TabsList>

            {/* Scheduling Tab */}
            <TabsContent value="agendar">
              <AppointmentScheduler 
                onAppointmentCreated={() => {
                  fetchOrders();
                  setActiveTab("pedidos");
                }} 
              />
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="pedidos">
              {loadingOrders ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : orders.length === 0 ? (
                <Card className="glass border-border/50">
                  <CardContent className="py-12 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Você ainda não tem agendamentos
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setActiveTab("agendar")}
                    >
                      Agendar agora
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card key={order.id} className="glass border-border/50">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            Agendamento #{order.id.slice(0, 8)}
                          </CardTitle>
                          <Badge variant={statusMap[order.status]?.variant || "secondary"}>
                            {statusMap[order.status]?.label || order.status}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          {order.scheduled_at ? (
                            <span className="flex items-center gap-1 text-primary font-medium">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(new Date(order.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                          {order.preferred_barber && (
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {order.preferred_barber.name}
                            </span>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Services */}
                        <div className="space-y-1 mb-3">
                          {order.order_items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-foreground">{item.service.name}</span>
                              <span className="text-muted-foreground">
                                R$ {Number(item.price).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <span className="font-medium text-foreground">Total</span>
                          <span className="font-bold text-primary">
                            R$ {Number(order.total_price).toFixed(2)}
                          </span>
                        </div>

                        {/* Notes */}
                        {order.notes && (
                          <p className="text-sm text-muted-foreground mt-3 p-2 bg-muted/50 rounded">
                            {order.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
