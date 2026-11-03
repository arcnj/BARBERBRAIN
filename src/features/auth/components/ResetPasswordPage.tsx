import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { translateAuthError } from "@/lib/auth-errors";
import { updatePassword } from "../api/password.api";

const MIN_LENGTH = 6;

/** /redefinir-senha: destino do link "Esqueci minha senha". */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const barbershopSlug = searchParams.get("b");
  const { user, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const loginPath = `/auth?modo=entrar${barbershopSlug ? `&b=${encodeURIComponent(barbershopSlug)}` : ""}`;
  // O Supabase devolve o erro do link (ex.: expirado) no endereço
  const linkError = /error_code=|error=/.test(window.location.hash + window.location.search);

  const save = useMutation({
    mutationFn: updatePassword,
    onSuccess: () => {
      toast.success("Senha alterada! Você já está conectado.");
      navigate(barbershopSlug ? `/auth?b=${encodeURIComponent(barbershopSlug)}` : "/auth", { replace: true });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH) return setFormError(`A senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`);
    if (password !== confirm) return setFormError("As duas senhas não são iguais.");
    setFormError(null);
    save.mutate(password);
  };

  return (
    <>
      <Helmet>
        <title>Nova senha - BarberBrain</title>
      </Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass border-border/50">
          <CardHeader className="text-center">
            <KeyRound className="mx-auto h-10 w-10 text-primary" />
            <CardTitle>Criar nova senha</CardTitle>
            <CardDescription>Escolha uma senha que você vai lembrar.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !user || linkError ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Este link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".
                </p>
                <Button asChild className="w-full">
                  <Link to={loginPath}>Voltar para entrar</Link>
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Repita a nova senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                {(formError || save.isError) && (
                  <p className="text-sm text-destructive" role="alert">
                    {formError ?? translateAuthError(save.error, "Não foi possível salvar a nova senha")}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={save.isPending}>
                  {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar nova senha
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
