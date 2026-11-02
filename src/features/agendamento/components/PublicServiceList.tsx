import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/shared/lib/money";
import { groupServicesByCategory, type PublicService } from "../domain/barbershop-public";

export function PublicServiceList({ services }: { services: PublicService[] }) {
  if (services.length === 0) {
    return <p className="text-center text-sm text-muted-foreground">Os serviços ainda não foram cadastrados.</p>;
  }

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle className="text-lg">Serviços</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {groupServicesByCategory(services).map(([category, items]) => (
          <div key={category} className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{category}</p>
            {items.map((service) => (
              <div key={service.id} className="flex items-start justify-between gap-4 rounded-lg bg-muted/40 p-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{service.name}</p>
                  {service.description && <p className="text-sm text-muted-foreground">{service.description}</p>}
                  {service.duration_minutes != null && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {service.duration_minutes} min
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-semibold text-primary">{formatBRL(service.price)}</span>
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
