import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { CalendarCheck, Loader2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import { useBarbershopPublic } from "../hooks/useBarbershopPublic";
import { useJoinBarbershop } from "../hooks/useJoinBarbershop";
import { rememberBarbershopSlug } from "../domain/last-barbershop";
import { BarbershopHeader } from "./BarbershopHeader";
import { PublicServiceList } from "./PublicServiceList";
import { PublicBarberList } from "./PublicBarberList";

/** Página do link exclusivo da barbearia: /b/<slug> */
export function BarbershopLinkPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const { data: shop, isLoading, isError } = useBarbershopPublic(slug);
  const join = useJoinBarbershop();

  const isStaff = role === "admin" || role === "barber";

  const handleBook = async () => {
    if (!shop) return;
    rememberBarbershopSlug(shop.slug);
    if (!user) {
      navigate(`/auth?b=${encodeURIComponent(shop.slug)}`);
      return;
    }
    try {
      await join.mutateAsync(shop.slug);
      navigate("/cliente");
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível entrar na barbearia"));
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !shop) {
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

  return (
    <>
      <Helmet>
        <title>{`${shop.name} - Agende seu horário`}</title>
        <meta name="description" content={`Agende seu horário na ${shop.name} pelo BarberBrain.`} />
      </Helmet>

      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto w-full max-w-xl space-y-6">
          <BarbershopHeader shop={shop} />

          {isStaff ? (
            <div className="rounded-lg border border-border/50 bg-muted/40 p-4 text-center text-sm text-muted-foreground">
              Você está logado como equipe. Para agendar como cliente, entre com uma conta de cliente.
              <Button asChild variant="link" className="px-1">
                <Link to="/dashboard">Ir para o painel</Link>
              </Button>
            </div>
          ) : (
            <Button size="lg" className="w-full text-base" onClick={handleBook} disabled={join.isPending}>
              {join.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CalendarCheck className="h-5 w-5" />}
              Agendar horário
            </Button>
          )}

          <PublicServiceList services={shop.services} />
          <PublicBarberList barbers={shop.barbers} />

          <p className="text-center text-xs text-muted-foreground">
            Agendamento online por <span className="font-semibold text-primary">BarberBrain</span>
          </p>
        </div>
      </div>
    </>
  );
}
