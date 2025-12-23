import { SuggestionCard } from "@/components/ui/suggestion-card";
import { RefreshCw, Clock, Gem, CalendarHeart, AlertCircle, MessageSquare, Brain } from "lucide-react";

const aiMessages = [
  {
    time: "Hoje, 9h47",
    message: "Você ainda tem 5 horários vagos à tarde. Quer que eu envie mensagens para 12 clientes em risco oferecendo encaixe?",
    actions: ["Ver clientes", "Gerar mensagens"],
  },
  {
    time: "Hoje, 8h30",
    message: "⚠️ Faturamento desta semana está 12% abaixo da semana passada. Principais causas: 3 no-shows (terça e quarta) e menos combos Corte + Barba.",
    actions: ["Ver detalhes"],
  },
  {
    time: "Ontem, 20h15",
    message: "✅ Boa! Você atendeu 2 clientes a mais que a média de segunda. Continue assim!",
    actions: [],
  },
];

export function SuggestionsTab() {
  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="font-display text-2xl font-bold text-foreground">IA Coach</h2>
        <p className="text-muted-foreground mt-1">Sugestões inteligentes para aumentar seu faturamento</p>
      </div>
      
      {/* AI Messages */}
      <div className="glass rounded-xl p-5 animate-slide-up [animation-delay:100ms]">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-gradient-gold p-2">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Seu assistente IA</h3>
            <p className="text-sm text-muted-foreground">Insights do dia</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {aiMessages.map((msg, index) => (
            <div key={index} className="border-l-2 border-primary/30 pl-4 py-2">
              <p className="text-xs text-muted-foreground mb-1">{msg.time}</p>
              <p className="text-sm text-foreground">{msg.message}</p>
              {msg.actions.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {msg.actions.map((action, i) => (
                    <button 
                      key={i}
                      className="text-xs text-primary font-medium hover:underline"
                    >
                      [{action}]
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Suggestions */}
      <div className="space-y-4">
        <SuggestionCard
          icon={RefreshCw}
          badge="OPORTUNIDADE DE COMBO"
          title="Combo Corte + Barba"
          description="61% dos clientes que fazem barba também fazem corte no mesmo dia."
          suggestion='Criar combo "Corte + Barba" por R$ 55 (em vez de R$ 60). Economia de R$ 5 pro cliente, ticket garantido maior pra você.'
          stats="Potencial: 47 clientes podem aderir"
          primaryAction="Criar campanha"
          secondaryAction="Ver dados"
          onDismiss={() => {}}
          className="[animation-delay:200ms]"
        />
        
        <SuggestionCard
          icon={Clock}
          badge="HORÁRIO VAZIO"
          title="Terças-feiras 14h-17h"
          description="Apenas 18% ocupadas nas últimas 4 semanas."
          suggestion='"Horário do Patrão" - 10% de desconto para quem agendar nesse período.'
          stats="Público sugerido: 23 clientes em risco"
          primaryAction="Gerar mensagens"
          secondaryAction="Ver ocupação"
          onDismiss={() => {}}
          className="[animation-delay:300ms]"
        />
        
        <SuggestionCard
          icon={Gem}
          badge="SERVIÇO PREMIUM IGNORADO"
          title="Hidratação subutilizada"
          description="Aparece em apenas 8% dos atendimentos, mas aumenta o ticket médio em R$ 28."
          suggestion='"Primeira hidratação com 50% off" para clientes VIP.'
          stats="Potencial: 12 clientes VIP nunca fizeram"
          primaryAction="Criar oferta"
          secondaryAction="Ver VIPs"
          onDismiss={() => {}}
          className="[animation-delay:400ms]"
        />
        
        <SuggestionCard
          icon={CalendarHeart}
          badge="CAMPANHA SAZONAL"
          title="Dia dos Pais se aproxima"
          description="No último Dia dos Pais você atendeu 28% a mais que a média do mês."
          suggestion='Campanha "Pai & Filho" - Combo especial: 2 cortes por R$ 100.'
          stats="15 dias para o Dia dos Pais"
          primaryAction="Gerar campanha"
          secondaryAction="Ver histórico"
          onDismiss={() => {}}
          className="[animation-delay:500ms]"
        />
        
        <SuggestionCard
          icon={AlertCircle}
          badge="ALERTA DE RETENÇÃO"
          title="23 clientes em risco"
          description="18 deles são VIPs! 😰"
          suggestion="Enviar mensagem hoje oferecendo agendamento prioritário. Mensagens personalizadas prontas!"
          primaryAction="Ver lista e mensagens"
          secondaryAction="Agendar envio"
          onDismiss={() => {}}
          className="[animation-delay:600ms]"
        />
      </div>
    </div>
  );
}
