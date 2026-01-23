import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Scissors, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { z } from "zod";
import { MFAVerify } from "@/components/auth/MFAVerify";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const signupSchema = z.object({
  full_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, role, loading, signIn, signUp, needsMFAVerification, refreshMFAStatus } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMFAVerify, setShowMFAVerify] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupData, setSignupData] = useState({
    full_name: "",
    email: "",
    phone: "",
    birth_date: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!loading && user && role) {
      // Check if MFA verification is needed
      if (needsMFAVerification) {
        setShowMFAVerify(true);
        return;
      }
      
      // Redirect based on role
      if (role === "barber" || role === "admin") {
        navigate("/dashboard");
      } else {
        navigate("/cliente");
      }
    }
  }, [user, role, loading, navigate, needsMFAVerification]);

  const handleMFAVerified = async () => {
    setShowMFAVerify(false);
    await refreshMFAStatus();
    // After MFA verification, redirect
    if (role === "barber" || role === "admin") {
      navigate("/dashboard");
    } else {
      navigate("/cliente");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
      if (!validation.success) {
        toast({
          title: "Erro de validação",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      const { error } = await signIn(loginEmail, loginPassword);

      if (error) {
        let message = "Erro ao fazer login";
        if (error.message.includes("Invalid login credentials")) {
          message = "Email ou senha incorretos";
        } else if (error.message.includes("Email not confirmed")) {
          message = "Confirme seu email antes de fazer login";
        }
        toast({
          title: "Erro",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível conectar com o Google",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Google login error:", err);
      toast({
        title: "Erro",
        description: "Erro ao tentar fazer login com Google",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validation = signupSchema.safeParse(signupData);
      if (!validation.success) {
        toast({
          title: "Erro de validação",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      const { error } = await signUp(signupData.email, signupData.password, {
        full_name: signupData.full_name,
        phone: signupData.phone || undefined,
        birth_date: signupData.birth_date || undefined,
      });

      if (error) {
        let message = "Erro ao criar conta";
        if (error.message.includes("already registered")) {
          message = "Este email já está cadastrado";
        }
        toast({
          title: "Erro",
          description: message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Conta criada!",
          description: "Bem-vindo ao BarberBrain!",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show MFA verification screen if needed
  if (showMFAVerify) {
    return (
      <>
        <Helmet>
          <title>Verificação 2FA - BarberBrain</title>
        </Helmet>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Scissors className="h-8 w-8 text-primary" />
                </div>
                <span className="font-heading text-3xl font-bold text-foreground">
                  Barber<span className="text-primary">Brain</span>
                </span>
              </div>
            </div>
            <MFAVerify
              onVerified={handleMFAVerified}
              onCancel={() => {
                setShowMFAVerify(false);
              }}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Login - BarberBrain</title>
        <meta name="description" content="Acesse sua conta BarberBrain para agendar seus cortes e acompanhar seus pedidos." />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Back Button */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao início</span>
          </Link>

          {/* Logo */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Scissors className="h-8 w-8 text-primary" />
              </div>
              <span className="font-heading text-3xl font-bold text-foreground">
                Barber<span className="text-primary">Brain</span>
              </span>
            </div>
            <p className="text-muted-foreground">O cérebro da sua barbearia</p>
          </div>

          <Card className="glass border-border/50">
            <CardHeader className="text-center">
              <CardTitle>Bem-vindo!</CardTitle>
              <CardDescription>
                Entre ou crie sua conta para continuar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Criar conta</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Senha</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Entrar
                    </Button>

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                          ou continue com
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleGoogleLogin}
                      disabled={isGoogleLoading}
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                      )}
                      Google
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nome completo *</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome"
                        value={signupData.full_name}
                        onChange={(e) =>
                          setSignupData({ ...signupData, full_name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email *</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={signupData.email}
                        onChange={(e) =>
                          setSignupData({ ...signupData, email: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-phone">Telefone</Label>
                        <Input
                          id="signup-phone"
                          type="tel"
                          placeholder="(11) 99999-9999"
                          value={signupData.phone}
                          onChange={(e) =>
                            setSignupData({ ...signupData, phone: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-birth">Nascimento</Label>
                        <Input
                          id="signup-birth"
                          type="date"
                          value={signupData.birth_date}
                          onChange={(e) =>
                            setSignupData({ ...signupData, birth_date: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha *</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupData.password}
                        onChange={(e) =>
                          setSignupData({ ...signupData, password: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Confirmar senha *</Label>
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={signupData.confirmPassword}
                        onChange={(e) =>
                          setSignupData({ ...signupData, confirmPassword: e.target.value })
                        }
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Criar conta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
