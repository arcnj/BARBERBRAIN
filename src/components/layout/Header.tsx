import { useState } from "react";
import { Bell, Menu, Brain, LogOut, User, Lock, Users, Settings, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isTomorrow, startOfDay, endOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProfileDialog } from "./ProfileDialog";

interface HeaderProps {
  onMenuClick?: () => void;
  onNavigate?: (tab: string) => void;
}

export function Header({ onMenuClick, onNavigate }: HeaderProps) {
  const { signOut, user, role } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  
  const isAdmin = role === "admin";

  // Fetch user avatar
  const { data: userAvatar } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // For barbers, fetch from barbers table
      if (role === "barber") {
        const { data, error } = await supabase
          .from("barbers")
          .select("avatar_url, name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        return data;
      }

      // For admins/others, fetch from profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url, full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data ? { avatar_url: data.avatar_url, name: data.full_name } : null;
    },
    enabled: !!user?.id,
  });

  const getInitials = () => {
    const name = userAvatar?.name;
    if (name) {
      return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };
  const { data: upcomingOrders } = useQuery({
    queryKey: ["upcoming-orders-notifications"],
    queryFn: async () => {
      const today = startOfDay(new Date());
      const nextWeek = endOfDay(addDays(new Date(), 7));

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          scheduled_at,
          status,
          profiles!orders_customer_id_profiles_fkey (
            full_name
          ),
          order_items (
            services (
              name
            )
          )
        `)
        .gte("scheduled_at", today.toISOString())
        .lte("scheduled_at", nextWeek.toISOString())
        .in("status", ["pending", "confirmed"])
        .order("scheduled_at", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const handleSignOut = async () => {
    await signOut();
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Senha alterada com sucesso!");
      setChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setChangingPassword(false);
    }
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "dd/MM", { locale: ptBR });
  };

  const pendingCount = upcomingOrders?.filter(o => o.status === "pending").length || 0;

  return (
    <>
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-gold p-2">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-display font-bold text-lg text-foreground">
                  Barber<span className="text-primary">Brain</span>
                </h1>
                <p className="text-xs text-muted-foreground -mt-0.5">O cérebro da sua barbearia</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Notifications Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b border-border">
                  <h4 className="font-semibold">Notificações</h4>
                  <p className="text-sm text-muted-foreground">Próximos agendamentos</p>
                </div>
                <ScrollArea className="max-h-[300px]">
                  {!upcomingOrders?.length ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Nenhum agendamento próximo
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {upcomingOrders.map((order) => (
                        <div 
                          key={order.id} 
                          className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => onNavigate?.("agenda")}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {order.profiles?.full_name || "Cliente"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {order.order_items?.map(item => item.services?.name).filter(Boolean).join(", ") || "Serviço"}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-medium text-primary">
                                {getDateLabel(order.scheduled_at!)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(order.scheduled_at!), "HH:mm")}
                              </p>
                            </div>
                          </div>
                          {order.status === "pending" && (
                            <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-500/20 text-yellow-500">
                              Pendente confirmação
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {upcomingOrders && upcomingOrders.length > 0 && (
                  <div className="p-2 border-t border-border">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-between text-sm"
                      onClick={() => onNavigate?.("agenda")}
                    >
                      Ver agenda completa
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            
            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full">
                  <Avatar className="h-9 w-9 cursor-pointer hover:opacity-90 transition-opacity">
                    <AvatarImage src={userAvatar?.avatar_url || ""} />
                    <AvatarFallback className="bg-gradient-gold text-primary-foreground font-display font-semibold text-sm">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">Minha Conta</span>
                    <span className="text-xs text-muted-foreground font-normal truncate">
                      {user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <User className="h-4 w-4 mr-2" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
                  <Lock className="h-4 w-4 mr-2" />
                  Alterar Senha
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onNavigate?.("barbeiros")}>
                      <Users className="h-4 w-4 mr-2" />
                      Gerenciar Funcionários
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNavigate?.("configuracoes")}>
                      <Settings className="h-4 w-4 mr-2" />
                      Configurações
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? "Alterando..." : "Alterar Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
