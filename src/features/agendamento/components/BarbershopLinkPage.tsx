import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { CalendarCheck, Loader2, Scissors, UserPlus } from "lucide-react";
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
  const { user, role, loading: authLoading, signOut } = useAuth();
  const { data: shop, isLoading, isError, refetch, isRefetching } = useBarbershopPublic(slug);
  const join = useJoinBarbershop();

  const isStaff = role === "admin" || role === "barber";

  const goToAuth = (mode: "criar" | "entrar") => {
    if (!shop) return;
    rememberBarbershopSlug(shop.slug);
    const params = new URLSearchParams({ b: shop.slug });
    if (mode === "entrar") params.set("modo", "entrar");
    navigate(`/auth?${params.toString()}`);
  };

  // Quem está logado como equipe (ex.: o dono testando o link) sai e cria a conta de cliente
  const handleSwitchToCustomer = async () => {
    await signOut();
    goToAuth("criar");
  };

  const handleBook = async () => {
    if (!shop) return;
    rememberBarbershopSlug(shop.slug);
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

  return (
    <>
      <Helmet>
        <title>{`${shop.name} - Agende seu horário`}</title>
        <meta name="description" content={`Agende seu horário na ${shop.name} pelo BarberBrain.`} />
      </Helmet>

      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto w-full max-w-xl space-y-6">
          <BarbershopHeader shop={shop} />

          {!user ? (
            <div className="space-y-2">
              <Button size="lg" className="w-full text-base" onClick={() => goToAuth("criar")}>
                <UserPlus className="h-5 w-5" />
                Criar conta na {shop.name}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Já tem conta?
                <Button variant="link" className="px-1" onClick={() => goToAuth("entrar")}>
                  Entrar e agendar
                </Button>
              </p>
            </div>
          ) : isStaff ? (
            <div className="space-y-3 rounded-lg border border-border/50 bg-muted/40 p-4 text-center text-sm text-muted-foreground">
              <p>Você está logado como equipe. Para agendar como cliente, use uma conta de cliente.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={handleSwitchToCustomer}>
                  <UserPlus />
                  Sair e criar conta de cliente
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/dashboard">Ir para o painel</Link>
                </Button>
              </div>
            </div>
          ) : (
            <Button size="lg" className="w-full text-base" onClick={handleBook} disabled={join.isPending}>
              {join.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CalendarCheck className="h-5 w-5" />}
              Agendar na {shop.name}
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
