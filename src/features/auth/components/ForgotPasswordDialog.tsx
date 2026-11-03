import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { translateAuthError } from "@/lib/auth-errors";
import { requestPasswordReset } from "../api/password.api";
import { EmailTypoHint } from "./EmailTypoHint";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail: string;
  barbershopSlug?: string;
}

export function ForgotPasswordDialog({ open, onOpenChange, defaultEmail, barbershopSlug }: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState(defaultEmail);
  const reset = useMutation({
    mutationFn: (value: string) => requestPasswordReset(value, barbershopSlug),
  });

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setEmail(defaultEmail);
      reset.reset();
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Esqueci minha senha</DialogTitle>
          <DialogDescription>
            Informe o e-mail da sua conta. Enviamos um link para você criar uma senha nova.
          </DialogDescription>
        </DialogHeader>

        {reset.isSuccess ? (
          <div className="space-y-3 text-center">
            <MailCheck className="mx-auto h-10 w-10 text-primary" />
            <p className="text-sm text-muted-foreground">
              Se existir uma conta com <span className="font-medium text-foreground">{email.trim()}</span>, o link
              chega em alguns minutos. Abra o e-mail neste aparelho e toque no link.
            </p>
            <p className="text-xs text-muted-foreground">Não chegou? Confira a caixa de spam e se o e-mail está certo.</p>
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Entendi
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              reset.mutate(email);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="forgot-email">E-mail</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <EmailTypoHint email={email} onFix={setEmail} />
            </div>
            {reset.isError && (
              <p className="text-sm text-destructive" role="alert">
                {translateAuthError(reset.error, "Não foi possível enviar o link")}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={reset.isPending}>
              {reset.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar link
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
