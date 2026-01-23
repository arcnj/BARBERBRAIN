import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, KeyRound } from "lucide-react";

interface MFAVerifyProps {
  onVerified: () => void;
  onCancel?: () => void;
}

export function MFAVerify({ onVerified, onCancel }: MFAVerifyProps) {
  const { toast } = useToast();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    loadMFAFactors();
  }, []);

  const loadMFAFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (error) {
        console.error("Error loading MFA factors:", error);
        return;
      }

      // Find first verified TOTP factor
      const totpFactor = data.totp.find((f) => f.status === "verified");
      if (totpFactor) {
        setFactorId(totpFactor.id);
      }
    } catch (err) {
      console.error("MFA load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMFA = async () => {
    if (!factorId || verifyCode.length !== 6) {
      toast({
        title: "Código inválido",
        description: "Digite o código de 6 dígitos do seu aplicativo autenticador",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) {
        throw challengeError;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) {
        toast({
          title: "Código incorreto",
          description: "Verifique se o código está correto e tente novamente",
          variant: "destructive",
        });
        return;
      }

      onVerified();
    } catch (err: any) {
      console.error("MFA verify error:", err);
      toast({
        title: "Erro ao verificar",
        description: err.message || "Não foi possível verificar o código",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && verifyCode.length === 6) {
      verifyMFA();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>Verificação de Dois Fatores</CardTitle>
        <CardDescription>
          Digite o código do seu aplicativo autenticador para continuar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="mfa-code">Código de verificação</Label>
          <Input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={handleKeyDown}
            className="text-center text-2xl tracking-widest"
            autoFocus
          />
          <p className="text-xs text-muted-foreground text-center">
            Abra seu aplicativo autenticador e digite o código de 6 dígitos
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={verifyMFA}
            disabled={isVerifying || verifyCode.length !== 6}
            className="w-full"
          >
            {isVerifying ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <KeyRound className="h-4 w-4 mr-2" />
            )}
            Verificar
          </Button>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} className="w-full">
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
