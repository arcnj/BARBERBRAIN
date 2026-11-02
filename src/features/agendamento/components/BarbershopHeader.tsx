import { MapPin, Scissors } from "lucide-react";
import type { BarbershopPublic } from "../domain/barbershop-public";

export function BarbershopHeader({ shop }: { shop: BarbershopPublic }) {
  return (
    <div className="flex flex-col items-center text-center gap-3">
      {shop.logo_url ? (
        <img
          src={shop.logo_url}
          alt={`Logo da ${shop.name}`}
          className="h-20 w-20 rounded-2xl object-cover border border-border/50"
        />
      ) : (
        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Scissors className="h-10 w-10 text-primary" />
        </div>
      )}
      <h1 className="font-heading text-3xl font-bold text-foreground">{shop.name}</h1>
      {shop.address && (
        <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {shop.address}
        </p>
      )}
    </div>
  );
}
