import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, CheckCircle, Copy } from "lucide-react";

interface MFAEnrollProps {
  onEnrolled: () => void;
  onSkip?: () => void;
}

export function MFAEnroll({ onEnrolled, onSkip }: MFAEnrollProps) {
  const { toast } = useToast();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    enrollMFA();
  }, []);

  const enrollMFA = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "BarberBrain Authenticator",
      });

      if (error) {
        toast({
          title: "Erro ao configurar 2FA",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setFactorId(data.id);
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
      }
    } catch (err) {
      console.error("MFA enroll error:", err);
      toast({
        title: "Erro",
        description: "Não foi possível configurar a autenticação de dois fatores",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndActivate = async () => {
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

      toast({
        title: "2FA ativado!",
        description: "A autenticação de dois fatores foi configurada com sucesso",
      });
      onEnrolled();
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

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      toast({
        title: "Copiado!",
        description: "Chave secreta copiada para a área de transferência",
      });
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
        <CardTitle>Configurar Autenticação 2FA</CardTitle>
        <CardDescription>
          Adicione uma camada extra de segurança à sua conta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Scan QR Code */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">1. Escaneie o QR Code</h3>
          <p className="text-sm text-muted-foreground">
            Use um aplicativo autenticador como Google Authenticator, Microsoft Authenticator ou Authy
          </p>
          {qrCode && (
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <img src={qrCode} alt="QR Code para 2FA" className="w-48 h-48" />
            </div>
          )}
        </div>

        {/* Manual Entry */}
        {secret && (
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Ou digite a chave manualmente:</h3>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                {secret}
              </code>
              <Button variant="outline" size="icon" onClick={copySecret}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Verify */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">2. Digite o código de verificação</h3>
          <div className="space-y-2">
            <Label htmlFor="verify-code">Código de 6 dígitos</Label>
            <Input
              id="verify-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-widest"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={verifyAndActivate}
            disabled={isVerifying || verifyCode.length !== 6}
            className="w-full"
          >
            {isVerifying ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Ativar 2FA
          </Button>
          {onSkip && (
            <Button variant="ghost" onClick={onSkip} className="w-full">
              Pular por agora
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
