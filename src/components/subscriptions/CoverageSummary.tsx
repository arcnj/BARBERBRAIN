import { AlertTriangle, BadgeCheck } from "lucide-react";
import { CoverageLine, extraTotal } from "@/hooks/useSubscriptionCoverage";
import { cn } from "@/lib/utils";

/**
 * Resumo do que a assinatura cobre e do que é pago à parte.
 * Usado no agendamento do cliente e no atendimento do barbeiro.
 */
export function CoverageSummary({
  lines,
  planName,
  className,
  title = "Assinatura",
}: {
  lines: CoverageLine[];
  planName?: string;
  className?: string;
  title?: string;
}) {
  if (!lines.length) return null;
  const extras = lines.filter((l) => !l.covered);
  const covered = lines.filter((l) => l.covered);
  const total = extraTotal(lines);

  return (
    <div className={cn("rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2", className)}>
      <p className="text-sm font-medium flex items-center gap-2">
        <BadgeCheck className="h-4 w-4 text-primary" />
        {title}
        {planName && <span className="text-muted-foreground font-normal">· {planName}</span>}
      </p>

      {covered.map((l) => (
        <div key={`c-${l.id}`} className="flex items-center justify-between text-sm">
          <span>{l.name}</span>
          <span className="text-primary">
            Incluso
            {l.limit != null && (
              <span className="text-muted-foreground">
                {" "}
                ({Math.min(l.used + 1, l.limit)} de {l.limit})
              </span>
            )}
          </span>
        </div>
      ))}

      {extras.length > 0 && (
        <div className="space-y-1 pt-1">
          {extras.map((l) => (
            <div key={`e-${l.id}`} className="flex items-center justify-between text-sm">
              <span>{l.name}</span>
              <span className="font-medium text-foreground">
                A pagar R$ {Number(l.price).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              {extras.length === 1
                ? "Este serviço não está incluso na assinatura — o pagamento é à parte."
                : "Estes serviços não estão inclusos na assinatura — o pagamento é à parte."}{" "}
              Total à parte: <strong>R$ {total.toFixed(2)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
