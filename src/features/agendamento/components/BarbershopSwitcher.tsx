import { Store } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { MemberBarbershop } from "../api/my-barbershops.api";

interface BarbershopSwitcherProps {
  barbershops: MemberBarbershop[];
  currentSlug: string | undefined;
  onSelect: (slug: string) => void;
}

/** Seletor de barbearia: só aparece para quem é cliente de mais de uma. */
export function BarbershopSwitcher({ barbershops, currentSlug, onSelect }: BarbershopSwitcherProps) {
  if (barbershops.length < 2) return null;

  return (
    <Select value={currentSlug} onValueChange={onSelect}>
      <SelectTrigger className="h-8 w-auto max-w-[200px] gap-2 text-sm" aria-label="Escolher barbearia">
        <Store className="h-4 w-4 shrink-0 text-primary" />
        <SelectValue placeholder="Barbearia" />
      </SelectTrigger>
      <SelectContent>
        {barbershops.map((shop) => (
          <SelectItem key={shop.id} value={shop.slug}>
            {shop.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Cliente que ainda não entrou em nenhuma barbearia (não usou um link de agendamento). */
export function NoBarbershopNotice() {
  return (
    <Card className="mb-6 glass border-border/50">
      <CardContent className="py-6 text-center text-sm text-muted-foreground">
        Você ainda não está em nenhuma barbearia. Peça à sua barbearia o <strong>link de agendamento</strong> e
        abra-o para começar a agendar.
      </CardContent>
    </Card>
  );
}
