import { evaluateCoverage, extraTotal, useSubscriptionCoverage } from "@/hooks/useSubscriptionCoverage";
import { CoverageSummary } from "./CoverageSummary";

interface OrderService {
  id: string;
  name: string;
  price: number;
}

/**
 * Mostra ao barbeiro o que a assinatura do cliente cobre nesse atendimento
 * e quanto há para cobrar à parte.
 */
export function OrderCoverage({
  customerId,
  services,
  compact = false,
}: {
  customerId: string;
  services: OrderService[];
  compact?: boolean;
}) {
  const { data: coverage } = useSubscriptionCoverage(customerId);
  if (!coverage || !services.length) return null;

  const lines = evaluateCoverage(coverage, services);
  const extra = extraTotal(lines);

  if (compact) {
    return (
      <span className="text-[11px] text-muted-foreground">
        {extra > 0 ? (
          <>
            Assinatura + <span className="text-amber-500 font-medium">a cobrar R$ {extra.toFixed(2)}</span>
          </>
        ) : (
          <span className="text-primary">Coberto pela assinatura</span>
        )}
      </span>
    );
  }

  return (
    <CoverageSummary
      lines={lines}
      planName={coverage.planName}
      title="Cobertura da assinatura"
    />
  );
}
