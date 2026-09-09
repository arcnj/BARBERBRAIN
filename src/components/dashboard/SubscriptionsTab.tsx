import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlansManager } from "./subscriptions/PlansManager";
import { SubscribersList } from "./subscriptions/SubscribersList";
import { RemindersLog } from "./subscriptions/RemindersLog";
import { ReminderSettings } from "./subscriptions/ReminderSettings";

export function SubscriptionsTab() {
  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      <div className="animate-fade-in">
        <h2 className="font-display text-2xl font-bold text-foreground">Assinaturas</h2>
        <p className="text-muted-foreground mt-1">
          Planos mensais, assinantes e aviso automático de renovação no WhatsApp
        </p>
      </div>

      <Tabs defaultValue="assinantes" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="assinantes">Assinantes</TabsTrigger>
          <TabsTrigger value="planos">Planos</TabsTrigger>
          <TabsTrigger value="envios">Envios</TabsTrigger>
          <TabsTrigger value="configuracao">Configuração</TabsTrigger>
        </TabsList>

        <TabsContent value="assinantes">
          <SubscribersList />
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
