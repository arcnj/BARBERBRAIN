import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Loader2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBarbershopPublic } from "../hooks/useBarbershopPublic";
import { rememberBarbershopSlug } from "../domain/last-barbershop";

/**
 * Link exclusivo da barbearia: /b/<slug>.
 * Leva direto para entrar / criar conta com a marca da barbearia (/auth?b=<slug>).
 * Quem já é cliente logado segue de lá direto para o agendamento.
 */
export function BarbershopLinkPage() {
  const { slug = "" } = useParams();
  const { data: shop, isLoading, isError, refetch, isRefetching } = useBarbershopPublic(slug);

  useEffect(() => {
    if (shop) rememberBarbershopSlug(shop.slug);
  }, [shop]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4 text-center">
        <Scissors className="h-10 w-10 text-primary" />
        <h1 className="font-heading text-2xl font-bold">Não foi possível carregar a barbearia</h1>
        <p className="text-muted-foreground">Verifique sua internet e tente de novo em instantes.</p>
        <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
          {isRefetching && <Loader2 className="animate-spin" />}
          Tentar de novo
        </Button>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4 text-center">
        <Scissors className="h-10 w-10 text-primary" />
        <h1 className="font-heading text-2xl font-bold">Barbearia não encontrada</h1>
        <p className="text-muted-foreground">Confira se o link está certo ou peça um novo para a barbearia.</p>
        <Button asChild variant="outline">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    );
  }

  return <Navigate replace to={`/auth?b=${encodeURIComponent(shop.slug)}`} />;
}
