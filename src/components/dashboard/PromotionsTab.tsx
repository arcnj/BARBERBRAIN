import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Megaphone, Loader2, Calendar, Percent, BadgeDollarSign } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  discount_percentage: number | null;
  discount_value: number | null;
  start_date: string;
  end_date: string | null;
  active: boolean;
  created_at: string;
}

export function PromotionsTab() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    discount_percentage: "",
    discount_value: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    active: true
  });

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error("Error fetching promotions:", error);
      toast.error("Erro ao carregar promoções");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast.error("Preencha o título da promoção");
      return;
    }

    try {
      const promotionData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : null,
        discount_value: formData.discount_value ? parseFloat(formData.discount_value) : null,
        start_date: formData.start_date || new Date().toISOString(),
        end_date: formData.end_date || null,
        active: formData.active
      };

      if (editingPromotion) {
        const { error } = await supabase
          .from("promotions")
          .update(promotionData)
          .eq("id", editingPromotion.id);

        if (error) throw error;
        toast.success("Promoção atualizada!");
      } else {
        const { error } = await supabase
          .from("promotions")
          .insert(promotionData);

        if (error) throw error;
        toast.success("Promoção criada!");
      }

      setDialogOpen(false);
      resetForm();
      fetchPromotions();
    } catch (error) {
      console.error("Error saving promotion:", error);
      toast.error("Erro ao salvar promoção");
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      title: promotion.title,
      description: promotion.description || "",
      discount_percentage: promotion.discount_percentage?.toString() || "",
      discount_value: promotion.discount_value?.toString() || "",
      start_date: format(new Date(promotion.start_date), "yyyy-MM-dd"),
      end_date: promotion.end_date ? format(new Date(promotion.end_date), "yyyy-MM-dd") : "",
      active: promotion.active
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta promoção?")) return;

    try {
      const { error } = await supabase
        .from("promotions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Promoção excluída!");
      fetchPromotions();
    } catch (error) {
      console.error("Error deleting promotion:", error);
      toast.error("Erro ao excluir promoção");
    }
  };

  const toggleActive = async (promotion: Promotion) => {
    try {
      const { error } = await supabase
        .from("promotions")
        .update({ active: !promotion.active })
        .eq("id", promotion.id);

      if (error) throw error;
      fetchPromotions();
    } catch (error) {
      console.error("Error toggling promotion:", error);
      toast.error("Erro ao atualizar promoção");
    }
  };

  const resetForm = () => {
    setEditingPromotion(null);
    setFormData({
      title: "",
      description: "",
      discount_percentage: "",
      discount_value: "",
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: "",
      active: true
    });
  };

  const isExpired = (endDate: string | null) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Promoções</h2>
          <p className="text-muted-foreground">Crie promoções para seus clientes</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Promoção
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPromotion ? "Editar Promoção" : "Nova Promoção"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Desconto de Verão"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes da promoção..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount_percentage">Desconto (%)</Label>
                  <Input
                    id="discount_percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                    placeholder="Ex: 20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_value">ou Valor (R$)</Label>
                  <Input
                    id="discount_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    placeholder="Ex: 10.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data Início</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">Data Fim (opcional)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Promoção ativa</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {editingPromotion ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {promotions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Nenhuma promoção cadastrada</h3>
            <p className="text-muted-foreground text-sm">Clique em "Nova Promoção" para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {promotions.map((promotion) => {
            const expired = isExpired(promotion.end_date);
            
            return (
              <Card 
                key={promotion.id} 
                className={`relative overflow-hidden ${!promotion.active || expired ? "opacity-60" : ""}`}
              >
                {promotion.active && !expired && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-lg">
                    Ativa
                  </div>
                )}
                {expired && (
                  <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground px-3 py-1 text-xs font-medium rounded-bl-lg">
                    Expirada
                  </div>
                )}
                
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{promotion.title}</CardTitle>
                  {promotion.description && (
                    <CardDescription>{promotion.description}</CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    {promotion.discount_percentage && (
                      <div className="flex items-center gap-1 text-primary font-bold">
                        <Percent className="h-4 w-4" />
                        {promotion.discount_percentage}% OFF
                      </div>
                    )}
                    {promotion.discount_value && (
                      <div className="flex items-center gap-1 text-primary font-bold">
                        <BadgeDollarSign className="h-4 w-4" />
                        R$ {promotion.discount_value.toFixed(2)} OFF
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(promotion.start_date), "dd/MM/yyyy", { locale: ptBR })}
                      {promotion.end_date && (
                        <> até {format(new Date(promotion.end_date), "dd/MM/yyyy", { locale: ptBR })}</>
                      )}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Switch
                      checked={promotion.active}
                      onCheckedChange={() => toggleActive(promotion)}
                    />
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(promotion)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(promotion.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
