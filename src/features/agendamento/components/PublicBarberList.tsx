import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicBarber } from "../domain/barbershop-public";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export function PublicBarberList({ barbers }: { barbers: PublicBarber[] }) {
  if (barbers.length === 0) return null;

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle className="text-lg">Nossa equipe</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4">
        {barbers.map((barber) => (
          <div key={barber.id} className="flex w-20 flex-col items-center gap-2 text-center">
            <Avatar className="h-14 w-14">
              {barber.avatar_url && <AvatarImage src={barber.avatar_url} alt={barber.name} />}
              <AvatarFallback>{initials(barber.name)}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-foreground">{barber.name}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
