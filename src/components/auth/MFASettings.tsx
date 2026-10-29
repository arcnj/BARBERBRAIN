import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, ShieldCheck, ShieldOff, Plus, Trash2 } from "lucide-react";
import { MFAEnroll } from "./MFAEnroll";
import { getErrorMessage } from "@/lib/errors";

interface MFAFactor {
  id: string;
  friendly_name?: string;
  status: "verified" | "unverified";
  created_at: string;
}

export function MFASettings() {
  const { toast } = useToast();
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [removingFactorId, setRemovingFactorId] = useState<string | null>(null);

  useEffect(() => {
    loadFactors();
  }, []);

  const loadFactors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (error) {
        console.error("Error loading factors:", error);
        return;
      }

      // Only show verified TOTP factors
      const verifiedFactors = data.totp
        .filter((f) => f.status === "verified")
        .map((f) => ({
          id: f.id,
          friendly_name: f.friendly_name,
          status: f.status,
          created_at: f.created_at,
        }));

      setFactors(verifiedFactors);
    } catch (err) {
      console.error("Load factors error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFactor = async (factorId: string) => {
    setRemovingFactorId(factorId);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });

      if (error) {
        toast({
          title: "Erro ao remover",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "2FA removido",
        description: "A autenticação de dois fatores foi desativada",
      });
      loadFactors();
    } catch (err) {
      console.error("Remove factor error:", err);
      toast({
        title: "Erro",
        description: getErrorMessage(err, "Não foi possível remover o 2FA"),
        variant: "destructive",
      });
    } finally {
      setRemovingFactorId(null);
    }
  };

  const handleEnrolled = () => {
    setEnrollDialogOpen(false);
    loadFactors();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasVerifiedFactor = factors.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {hasVerifiedFactor ? (
            <ShieldCheck className="h-6 w-6 text-primary" />
          ) : (
            <Shield className="h-6 w-6 text-muted-foreground" />
          )}
          <div>
            <CardTitle className="text-lg">Autenticação de Dois Fatores</CardTitle>
            <CardDescription>
              {hasVerifiedFactor
                ? "2FA está ativo na sua conta"
                : "Adicione uma camada extra de segurança"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {factors.length > 0 ? (
          <div className="space-y-3">
            {factors.map((factor) => (
              <div
                key={factor.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">
                      {factor.friendly_name || "Autenticador TOTP"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Adicionado em {formatDate(factor.created_at)}
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover 2FA?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso desativará a autenticação de dois fatores. Sua conta ficará menos segura.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => removeFactor(factor.id)}
                      >
                        {removingFactorId === factor.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <ShieldOff className="h-4 w-4 mr-2" />
                        )}
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhum método 2FA configurado</p>
            <p className="text-xs mt-1">
              Recomendamos ativar para maior segurança da sua conta
            </p>
          </div>
        )}

        <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
          <DialogTrigger asChild>
            <Button variant={hasVerifiedFactor ? "outline" : "default"} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {hasVerifiedFactor ? "Adicionar outro autenticador" : "Configurar 2FA"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader className="sr-only">
              <DialogTitle>Configurar Autenticação 2FA</DialogTitle>
              <DialogDescription>
                Configure a autenticação de dois fatores para sua conta
              </DialogDescription>
            </DialogHeader>
            <MFAEnroll
              onEnrolled={handleEnrolled}
              onSkip={() => setEnrollDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
