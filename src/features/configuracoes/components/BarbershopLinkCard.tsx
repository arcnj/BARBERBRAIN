import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Link2, MessageCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildWhatsAppUrl } from "@/shared/lib/whatsapp";
import { useMyBarbershop } from "../hooks/useMyBarbershop";
import { EditSlugDialog } from "./EditSlugDialog";

/** Link exclusivo da barbearia para os clientes agendarem (/b/<slug>). Só aparece para o dono. */
export function BarbershopLinkCard() {
  const { data: barbershop } = useMyBarbershop();
  const [editing, setEditing] = useState(false);

  if (!barbershop) return null;

  const url = `${window.location.origin}/b/${barbershop.slug}`;
  const shareMessage = `Agende seu horário na ${barbershop.name} pelo link: ${url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  };

  return (
    <Card className="glass border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5 text-primary" />
          Link de agendamento
        </CardTitle>
        <CardDescription>Envie para seus clientes: eles agendam direto na sua barbearia.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg bg-muted/50 px-3 py-2 font-mono text-sm break-all select-all">{url}</div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={copy}>
            <Copy />
            Copiar link
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={buildWhatsAppUrl(null, shareMessage)} target="_blank" rel="noopener noreferrer">
              <MessageCircle />
              Compartilhar no WhatsApp
            </a>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              Abrir
            </a>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil />
            Mudar endereço
          </Button>
        </div>
      </CardContent>
      <EditSlugDialog barbershop={barbershop} open={editing} onOpenChange={setEditing} />
    </Card>
  );
}
