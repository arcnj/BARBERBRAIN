import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCommissions } from "@/hooks/useCommissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, XCircle, Clock, Scissors, ClipboardList, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type OrderStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";

interface Order {
  id: string;
  scheduled_at: string;
  status: OrderStatus;
  notes: string | null;
  total_price: number | null;
  customer_id: string;
  barber_id: string | null;
  profiles: {
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
    birth_date: string | null;
  } | null;
  barbers: {
    name: string;
  } | null;
  order_items: {
    id: string;
    price: number;
    services: {
      name: string;
      duration_minutes: number | null;
    } | null;
  }[];
  order_products: {
    id: string;
    price: number;
    quantity: number;
    products: {
      name: string;
    } | null;
  }[];
}

interface TodayAppointmentsProps {
  orders: Order[];
  isLoading?: boolean;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: "Pendente", color: "text-yellow-400", bgColor: "bg-yellow-500/20 border-yellow-500/50" },
  confirmed: { label: "Confirmado", color: "text-blue-400", bgColor: "bg-blue-500/20 border-blue-500/50" },
  in_progress: { label: "Em Andamento", color: "text-primary", bgColor: "bg-primary/20 border-primary/50" },
  completed: { label: "Concluído", color: "text-green-400", bgColor: "bg-green-500/20 border-green-500/50" },
  cancelled: { label: "Cancelado", color: "text-red-400", bgColor: "bg-red-500/20 border-red-500/50" },
};

export function TodayAppointments({ orders, isLoading }: TodayAppointmentsProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "complete" | "cancel" | "complete_all";
    orderId?: string;
    cancelReason?: string;
  } | null>(null);

  const { registerCommissions } = useCommissions();

  // Filter only active orders (not completed or cancelled)
  const activeOrders = orders.filter(o => 
    ["pending", "confirmed", "in_progress"].includes(o.status)
  );

  // Helper function to calculate totals and register commissions
  const registerOrderCommissions = async (order: Order) => {
    if (!order.barber_id) return;
    
    const serviceTotal = order.order_items?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;
    const productTotal = order.order_products?.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0) || 0;
    
    if (serviceTotal > 0 || productTotal > 0) {
      await registerCommissions.mutateAsync({
        orderId: order.id,
        barberId: order.barber_id,
        scheduledAt: order.scheduled_at,
        serviceTotal,
        productTotal,
      });
    }
  };

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);

      if (error) throw error;
      
      // Register commissions when completing an order
      if (status === "completed") {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          await registerOrderCommissions(order);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-orders"] });
      toast.success("Status atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  // Batch update mutation
  const batchUpdateMutation = useMutation({
    mutationFn: async ({ orderIds, status }: { orderIds: string[]; status: OrderStatus }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .in("id", orderIds);

      if (error) throw error;
      
      // Register commissions for all completed orders
      if (status === "completed") {
        for (const orderId of orderIds) {
          const order = orders.find(o => o.id === orderId);
          if (order) {
            await registerOrderCommissions(order);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-orders"] });
      toast.success("Todos os atendimentos foram finalizados!");
    },
    onError: () => {
      toast.error("Erro ao finalizar atendimentos");
    },
  });

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    
    if (confirmAction.type === "complete" && confirmAction.orderId) {
      updateStatusMutation.mutate({ orderId: confirmAction.orderId, status: "completed" });
    } else if (confirmAction.type === "cancel" && confirmAction.orderId) {
      updateStatusMutation.mutate({ orderId: confirmAction.orderId, status: "cancelled" });
    } else if (confirmAction.type === "complete_all") {
      const orderIds = activeOrders.map(o => o.id);
      batchUpdateMutation.mutate({ orderIds, status: "completed" });
    }
    setConfirmAction(null);
  };

  const isPending = updateStatusMutation.isPending || batchUpdateMutation.isPending;

  if (activeOrders.length === 0) {
    return null;
  }

  return (
    <>
      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "complete" && "Finalizar atendimento?"}
              {confirmAction?.type === "complete_all" && "Finalizar todos os atendimentos?"}
              {confirmAction?.type === "cancel" && "Cancelar agendamento?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "complete" && 
                "Tem certeza que deseja finalizar este atendimento?"
              }
              {confirmAction?.type === "complete_all" && 
                `Tem certeza que deseja finalizar todos os ${activeOrders.length} atendimentos pendentes?`
              }
              {confirmAction?.type === "cancel" && 
                `Tem certeza que deseja cancelar este agendamento? Motivo: ${confirmAction?.cancelReason || "Não informado"}`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction}
              className={
                confirmAction?.type === "cancel"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }
            >
              {confirmAction?.type === "complete" && "Sim, finalizar"}
              {confirmAction?.type === "complete_all" && "Sim, finalizar todos"}
              {confirmAction?.type === "cancel" && "Sim, cancelar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Atendimentos</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {activeOrders.length}
            </Badge>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 sm:w-96 p-0" align="start">
          <div className="p-3 border-b flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Atendimentos de Hoje
            </h4>
            {activeOrders.length > 1 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setConfirmAction({ type: "complete_all" })}
                disabled={isPending}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Finalizar Todos
              </Button>
            )}
          </div>
          
          <ScrollArea className="max-h-[300px]">
            <div className="p-2 space-y-2">
              {activeOrders.map((order) => (
                <div
                  key={order.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border transition-colors",
                    statusConfig[order.status].bgColor
                  )}
                >
                  {/* Avatar */}
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={order.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                      {order.profiles?.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {order.profiles?.full_name || "Cliente"}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(order.scheduled_at), "HH:mm", { locale: ptBR })}</span>
                      <span>•</span>
                      <Scissors className="h-3 w-3" />
                      <span className="truncate">{order.order_items[0]?.services?.name || "Serviço"}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-xs font-bold text-primary flex-shrink-0">
                    R$ {(order.total_price || 0).toFixed(0)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                      onClick={() => setConfirmAction({ type: "complete", orderId: order.id })}
                      disabled={isPending}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={isPending}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() =>
                            setConfirmAction({
                              type: "cancel",
                              orderId: order.id,
                              cancelReason: "Cliente cancelou",
                            })
                          }
                        >
                          Cliente cancelou
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            setConfirmAction({
                              type: "cancel",
                              orderId: order.id,
                              cancelReason: "Cliente não veio",
                            })
                          }
                        >
                          Cliente não veio
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            setConfirmAction({
                              type: "cancel",
                              orderId: order.id,
                              cancelReason: "Cancelado pelo barbeiro",
                            })
                          }
                        >
                          Cancelado pelo barbeiro
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </>
  );
}
