import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Scissors, 
  Calendar, 
  Users, 
  BarChart3, 
  Shield, 
  Sparkles, 
  Package, 
  Megaphone,
  Gift,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle2,
  Star,
  Zap,
  Lock,
  Smartphone,
  ArrowRight,
  Play
} from "lucide-react";
import { cn } from "@/lib/utils";

const Landing = () => {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);

  const features = [
    {
      icon: Calendar,
      title: "Agenda Inteligente",
      description: "Gerencie todos os agendamentos da sua barbearia em tempo real. Visualize horários disponíveis, confirme atendimentos e organize sua rotina."
    },
    {
      icon: Users,
      title: "Gestão de Clientes",
      description: "Tenha o histórico completo de cada cliente. Preferências, serviços realizados, frequência de visitas e muito mais."
    },
    {
      icon: Sparkles,
      title: "Analista Barber IA",
      description: "Inteligência artificial que analisa seu negócio e fornece insights valiosos para aumentar seu faturamento e reter clientes."
    },
    {
      icon: Package,
      title: "Controle de Produtos",
      description: "Gerencie seu estoque de produtos, controle vendas e saiba exatamente o que está vendendo mais."
    },
    {
      icon: Megaphone,
      title: "Promoções Inteligentes",
      description: "Crie promoções personalizadas para atrair e fidelizar clientes. Descubra qual estratégia funciona melhor."
    },
    {
      icon: Gift,
      title: "Cupons de Aniversário",
      description: "Surpreenda seus clientes no aniversário com cupons automáticos. Mensagens personalizadas via WhatsApp."
    },
    {
      icon: MessageSquare,
      title: "Integração WhatsApp",
      description: "Envie mensagens automáticas para seus clientes. Confirmação de agendamento, lembretes e promoções."
    },
    {
      icon: TrendingUp,
      title: "Relatórios Detalhados",
      description: "Acompanhe o crescimento do seu negócio com gráficos e métricas em tempo real."
    }
  ];

  const basicFeatures = [
    "Painel Administrativo Completo",
    "Aba Hoje - Visão geral diária",
    "Agenda - Gestão de horários",
    "Clientes - Cadastro e histórico",
    "Barbeiros - Gestão da equipe",
    "Serviços - Catálogo completo",
    "Suporte por email",
    "Atualizações gratuitas"
  ];

  const proFeatures = [
    "Tudo do plano Básico",
    "Produtos - Controle de estoque",
    "Promoções - Campanhas inteligentes",
    "Analista Barber IA - Insights",
    "Cupons de Aniversário automáticos",
    "Integração WhatsApp",
    "Relatórios avançados",
    "Suporte prioritário 24/7",
    "Treinamento personalizado"
  ];

  const testimonials = [
    {
      name: "Carlos Silva",
      role: "Dono da Barbearia Style",
      content: "Depois que comecei a usar o BarberBrain, meu faturamento aumentou 40%. A função de recuperação de clientes é incrível!",
      rating: 5
    },
    {
      name: "Roberto Santos",
      role: "Barbeiro há 15 anos",
      content: "Nunca imaginei que tecnologia poderia fazer tanta diferença. Agora tenho controle total do meu negócio na palma da mão.",
      rating: 5
    },
    {
      name: "André Lima",
      role: "Rede de Barbearias ALM",
      content: "O Analista Barber IA me mostrou insights que eu nunca tinha percebido. Excelente investimento!",
      rating: 5
    }
  ];

  const stats = [
    { value: "500+", label: "Barbearias Ativas" },
    { value: "50mil+", label: "Clientes Atendidos" },
    { value: "98%", label: "Satisfação" },
    { value: "40%", label: "Aumento Médio" }
  ];

  return (
    <>
      <Helmet>
        <title>BarberBrain - O Cérebro da Sua Barbearia</title>
        <meta name="description" content="Sistema inteligente de gestão para barbearias. Aumente seu faturamento com IA, gerencie clientes, agenda e muito mais. Experimente grátis!" />
        <meta name="keywords" content="barbearia, gestão, software, barbeiro, agendamento, clientes, IA" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
          <div className="container flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary">
                <Scissors className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-gradient">BarberBrain</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Preços</a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Depoimentos</a>
            </nav>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/auth")}>
                Entrar
              </Button>
              <Button onClick={() => navigate("/auth")} className="bg-primary hover:bg-primary/90">
                Começar Grátis
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-32 pb-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
          
          <div className="container relative">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                <Zap className="h-3 w-3 mr-1" />
                Novo: Analista Barber com IA
              </Badge>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                O <span className="text-gradient">Cérebro</span> da Sua{" "}
                <span className="text-gradient">Barbearia</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Sistema completo de gestão com inteligência artificial. Aumente seu faturamento, 
                recupere clientes automaticamente e tome decisões baseadas em dados.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8 bg-primary hover:bg-primary/90">
                  Começar Agora - 7 dias grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8">
                  <Play className="mr-2 h-5 w-5" />
                  Ver Demonstração
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-border/50">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl md:text-4xl font-bold text-gradient">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-muted/30">
          <div className="container">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">Funcionalidades</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Tudo que você precisa em um só lugar
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Desenvolvido por barbeiros para barbeiros. Cada funcionalidade foi pensada para 
                resolver problemas reais do dia a dia.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="card-elevated border-border/50 hover:border-primary/50 transition-all duration-300 group">
                  <CardHeader>
                    <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="py-20">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4 bg-green-500/10 text-green-500 border-green-500/20">
                  <Shield className="h-3 w-3 mr-1" />
                  Segurança
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Seus dados estão seguros conosco
                </h2>
                <p className="text-muted-foreground mb-8">
                  Utilizamos as mais avançadas tecnologias de segurança para proteger 
                  os dados da sua barbearia e dos seus clientes.
                </p>
                
                <div className="space-y-4">
                  {[
                    { icon: Lock, text: "Criptografia de ponta a ponta" },
                    { icon: Shield, text: "Servidores seguros na nuvem" },
                    { icon: Clock, text: "Backups automáticos diários" },
                    { icon: Smartphone, text: "Autenticação em dois fatores" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <item.icon className="h-4 w-4 text-green-500" />
                      </div>
                      <span className="text-foreground">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl" />
                <Card className="relative card-elevated p-8">
                  <div className="flex items-center justify-center mb-6">
                    <div className="p-6 rounded-full bg-green-500/10">
                      <Shield className="h-16 w-16 text-green-500" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-center mb-2">100% Seguro</h3>
                  <p className="text-muted-foreground text-center">
                    Certificação de segurança e conformidade com LGPD
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-muted/30">
          <div className="container">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Preços</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Escolha o plano ideal para você
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Comece com 7 dias grátis. Sem compromisso, cancele quando quiser.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Basic Plan */}
              <Card className="card-elevated border-border/50 relative overflow-hidden">
                <CardHeader className="pb-8">
                  <CardTitle className="text-2xl">Básico</CardTitle>
                  <CardDescription>Ideal para começar</CardDescription>
                  <div className="pt-4">
                    <span className="text-4xl font-bold">R$ 99,90</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {basicFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  <Button 
                    className="w-full mt-6" 
                    variant="outline"
                    onClick={() => navigate("/auth")}
                  >
                    Começar Grátis
                  </Button>
                </CardContent>
              </Card>

              {/* Pro Plan */}
              <Card className="card-elevated border-primary relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-medium rounded-bl-lg">
                  Mais Popular
                </div>
                <CardHeader className="pb-8">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    Pro
                    <Sparkles className="h-5 w-5 text-primary" />
                  </CardTitle>
                  <CardDescription>Acesso completo a tudo</CardDescription>
                  <div className="pt-4">
                    <span className="text-4xl font-bold text-gradient">R$ 199,90</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {proFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  <Button 
                    className="w-full mt-6 bg-primary hover:bg-primary/90"
                    onClick={() => navigate("/auth")}
                  >
                    Começar Grátis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            <p className="text-center text-muted-foreground mt-8">
              Todos os planos incluem 7 dias de teste grátis. Cancele a qualquer momento.
            </p>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-20">
          <div className="container">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">Depoimentos</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                O que nossos clientes dizem
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="card-elevated border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6">"{testimonial.content}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-bold">{testimonial.name[0]}</span>
                      </div>
                      <div>
                        <div className="font-medium">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pronto para revolucionar sua barbearia?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Junte-se a mais de 500 barbearias que já estão aumentando seu faturamento com o BarberBrain.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8 bg-primary hover:bg-primary/90">
              Começar Agora - É Grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-border/50">
          <div className="container">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary">
                  <Scissors className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-gradient">BarberBrain</span>
              </div>
              <p className="text-sm text-muted-foreground">
                © 2024 BarberBrain. Todos os direitos reservados.
              </p>
              <div className="flex gap-6">
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Termos</a>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacidade</a>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contato</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Landing;
