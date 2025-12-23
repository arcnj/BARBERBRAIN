import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Scissors, User } from "lucide-react";

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration_minutes: number;
}

interface Barber {
  id: string;
  name: string;
}

interface NewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated: () => void;
}

export function NewOrderDialog({ open, onOpenChange, onOrderCreated }: NewOrderDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [preferredBarber, setPreferredBarber] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [servicesRes, barbersRes] = await Promise.all([
        supabase.from("services").select("*").eq("active", true).order("category"),
        supabase.from("barbers").select("id, name").eq("active", true),
      ]);

      if (servicesRes.error) throw servicesRes.error;
      if (barbersRes.error) throw barbersRes.error;

      setServices(servicesRes.data || []);
      setBarbers(barbersRes.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os serviços",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const calculateTotal = () => {
    return selectedServices.reduce((total, serviceId) => {
      const service = services.find((s) => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (selectedServices.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos um serviço",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const totalPrice = calculateTotal();

      // Create the order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          preferred_barber_id: preferredBarber || null,
          total_price: totalPrice,
          notes: notes || null,
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = selectedServices.map((serviceId) => {
        const service = services.find((s) => s.id === serviceId);
        return {
          order_id: order.id,
          service_id: serviceId,
          price: service?.price || 0,
        };
      });

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Pedido criado!",
        description: "Seu pedido foi enviado com sucesso",
      });

      // Reset form
      setSelectedServices([]);
      setPreferredBarber("");
      setNotes("");
      onOpenChange(false);
      onOrderCreated();
    } catch (err) {
      console.error("Error creating order:", err);
      toast({
        title: "Erro",
        description: "Não foi possível criar o pedido",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            Novo Pedido
          </DialogTitle>
          <DialogDescription>
            Selecione os serviços desejados
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Services */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Serviços *</Label>
              
              {Object.entries(groupedServices).map(([category, categoryServices]) => (
                <div key={category} className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">
                    {category}
                  </p>
                  <div className="space-y-2">
                    {categoryServices.map((service) => (
                      <div
                        key={service.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                          selectedServices.includes(service.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => handleServiceToggle(service.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedServices.includes(service.id)}
                            onCheckedChange={() => handleServiceToggle(service.id)}
                          />
                          <div>
                            <p className="font-medium text-foreground">
                              {service.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {service.duration_minutes} min
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold text-primary">
                          R$ {Number(service.price).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {services.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum serviço disponível
                </p>
              )}
            </div>

            {/* Preferred Barber */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Preferência de barbeiro (opcional)
              </Label>
              <Select value={preferredBarber} onValueChange={(val) => setPreferredBarber(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem preferência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem preferência</SelectItem>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Alguma observação especial?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Total */}
            {selectedServices.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                <span className="font-medium text-foreground">Total</span>
                <span className="text-xl font-bold text-primary">
                  R$ {calculateTotal().toFixed(2)}
                </span>
              </div>
            )}

            {/* Submit */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={submitting || selectedServices.length === 0}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar Pedido
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
