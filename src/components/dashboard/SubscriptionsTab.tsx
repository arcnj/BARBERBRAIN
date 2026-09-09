import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlansManager } from "./subscriptions/PlansManager";
import { SubscribersList } from "./subscriptions/SubscribersList";
import { RenewalsTab } from "./subscriptions/RenewalsTab";
import { RequestsTab } from "./subscriptions/RequestsTab";
import { RemindersLog } from "./subscriptions/RemindersLog";
import { ReminderSettings } from "./subscriptions/ReminderSettings";
import { useSubscriptionRequests } from "@/hooks/useSubscriptionRequests";

export function SubscriptionsTab() {
  const { data: requests } = useSubscriptionRequests();
  const pendingCount = (requests ?? []).filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      <div className="animate-fade-in">
        <h2 className="font-display text-2xl font-bold text-foreground">Assinaturas</h2>
        <p className="text-muted-foreground mt-1">
          Planos mensais, assinantes, pedidos dos clientes, renovações com pagamento manual e aviso
          automático no WhatsApp
        </p>
      </div>

      <Tabs defaultValue={pendingCount > 0 ? "pedidos" : "assinantes"} className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="assinantes">Assinantes</TabsTrigger>
          <TabsTrigger value="pedidos" className="gap-1.5">
            Pedidos
            {pendingCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="renovacoes">Renovações</TabsTrigger>
          <TabsTrigger value="planos">Planos</TabsTrigger>
          <TabsTrigger value="envios">Envios</TabsTrigger>
          <TabsTrigger value="configuracao">Configuração</TabsTrigger>
        </TabsList>

        <TabsContent value="assinantes">
          <SubscribersList />
        </TabsContent>
        <TabsContent value="pedidos">
          <RequestsTab />
        </TabsContent>
        <TabsContent value="renovacoes">
          <RenewalsTab />
        </TabsContent>
        <TabsContent value="planos">
          <PlansManager />
        </TabsContent>
        <TabsContent value="envios">
          <RemindersLog />
        </TabsContent>
        <TabsContent value="configuracao">
          <ReminderSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
