import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Megaphone, Loader2, Calendar, Percent, Package, Scissors } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Product {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

interface Service {
  id: string;
  name: string;
  price: number;
  category: string;
  active: boolean;
}

interface PromotionItem {
  id?: string;
  promotion_id?: string;
  product_id: string | null;
  service_id: string | null;
  discount_percentage: number;
  name?: string;
  price?: number;
  type?: 'product' | 'service';
}

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
  items?: PromotionItem[];
}

export function PromotionsTab() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    active: true
  });
  const [selectedItems, setSelectedItems] = useState<PromotionItem[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [promotionsRes, productsRes, servicesRes] = await Promise.all([
        supabase.from("promotions").select("*").order("created_at", { ascending: false }),
        supabase.from("products").select("*").eq("active", true).order("name"),
        supabase.from("services").select("*").eq("active", true).order("name")
      ]);

      if (promotionsRes.error) throw promotionsRes.error;
      if (productsRes.error) throw productsRes.error;
      if (servicesRes.error) throw servicesRes.error;

      // Fetch promotion items for each promotion
      const promotionsWithItems = await Promise.all(
        (promotionsRes.data || []).map(async (promo) => {
          const { data: items } = await supabase
            .from("promotion_items")
            .select("*")
            .eq("promotion_id", promo.id);
          
          return { ...promo, items: items || [] };
        })
      );

      setPromotions(promotionsWithItems);
      setProducts(productsRes.data || []);
      setServices(servicesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
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

    if (selectedItems.length === 0) {
      toast.error("Selecione pelo menos um produto ou serviço");
      return;
    }

    try {
      const promotionData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        discount_percentage: null,
        discount_value: null,
        start_date: formData.start_date || new Date().toISOString(),
        end_date: formData.end_date || null,
        active: formData.active
      };

      let promotionId: string;

      if (editingPromotion) {
        const { error } = await supabase
          .from("promotions")
          .update(promotionData)
          .eq("id", editingPromotion.id);

        if (error) throw error;
        promotionId = editingPromotion.id;

        // Delete existing items
        await supabase
          .from("promotion_items")
          .delete()
          .eq("promotion_id", editingPromotion.id);
      } else {
        const { data, error } = await supabase
          .from("promotions")
          .insert(promotionData)
          .select()
          .single();

        if (error) throw error;
        promotionId = data.id;
      }

      // Insert new items
      const itemsToInsert = selectedItems.map(item => ({
        promotion_id: promotionId,
        product_id: item.product_id,
        service_id: item.service_id,
        discount_percentage: item.discount_percentage
      }));

      const { error: itemsError } = await supabase
        .from("promotion_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success(editingPromotion ? "Promoção atualizada!" : "Promoção criada!");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving promotion:", error);
      toast.error("Erro ao salvar promoção");
    }
  };

  const handleEdit = async (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      title: promotion.title,
      description: promotion.description || "",
      start_date: format(new Date(promotion.start_date), "yyyy-MM-dd"),
      end_date: promotion.end_date ? format(new Date(promotion.end_date), "yyyy-MM-dd") : "",
      active: promotion.active
    });

    // Load existing items with names
    const items: PromotionItem[] = (promotion.items || []).map(item => {
      if (item.product_id) {
        const product = products.find(p => p.id === item.product_id);
        return {
          ...item,
          name: product?.name || "Produto",
          price: product?.price || 0,
          type: 'product' as const
        };
      } else {
        const service = services.find(s => s.id === item.service_id);
        return {
          ...item,
          name: service?.name || "Serviço",
          price: service?.price || 0,
          type: 'service' as const
        };
      }
    });

    setSelectedItems(items);
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
      fetchData();
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
      fetchData();
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
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: "",
      active: true
    });
    setSelectedItems([]);
  };

  const toggleItemSelection = (type: 'product' | 'service', id: string, name: string, price: number) => {
    const existingIndex = selectedItems.findIndex(
      item => (type === 'product' ? item.product_id === id : item.service_id === id)
    );

    if (existingIndex >= 0) {
      setSelectedItems(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      setSelectedItems(prev => [...prev, {
        product_id: type === 'product' ? id : null,
        service_id: type === 'service' ? id : null,
        discount_percentage: 10,
        name,
        price,
        type
      }]);
    }
  };

  const updateItemDiscount = (index: number, discount: number) => {
    setSelectedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, discount_percentage: Math.min(100, Math.max(0, discount)) } : item
    ));
  };

  const isItemSelected = (type: 'product' | 'service', id: string) => {
    return selectedItems.some(
      item => (type === 'product' ? item.product_id === id : item.service_id === id)
    );
  };

  const isExpired = (endDate: string | null) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  const getItemName = (item: PromotionItem) => {
    if (item.product_id) {
      return products.find(p => p.id === item.product_id)?.name || "Produto";
    }
    return services.find(s => s.id === item.service_id)?.name || "Serviço";
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
          <p className="text-muted-foreground">Crie promoções para seus produtos e serviços</p>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

              {/* Products Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produtos
                </Label>
                <Card className="max-h-40 overflow-y-auto">
                  <CardContent className="p-3 space-y-2">
                    {products.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">Nenhum produto cadastrado</p>
                    ) : (
                      products.map((product) => {
                        const isSelected = isItemSelected('product', product.id);
                        return (
                          <label
                            key={product.id}
                            className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleItemSelection('product', product.id, product.name, product.price)}
                                className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                              />
                              <div>
                                <p className="font-medium text-sm">{product.name}</p>
                                <p className="text-xs text-muted-foreground">R$ {product.price.toFixed(2)}</p>
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Services Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Scissors className="h-4 w-4" />
                  Serviços
                </Label>
                <Card className="max-h-40 overflow-y-auto">
                  <CardContent className="p-3 space-y-2">
                    {services.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">Nenhum serviço cadastrado</p>
                    ) : (
                      services.map((service) => {
                        const isSelected = isItemSelected('service', service.id);
                        return (
                          <label
                            key={service.id}
                            className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleItemSelection('service', service.id, service.name, service.price)}
                                className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                              />
                              <div>
                                <p className="font-medium text-sm">{service.name}</p>
                                <p className="text-xs text-muted-foreground">{service.category} • R$ {service.price.toFixed(2)}</p>
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Selected Items with Discount */}
              {selectedItems.length > 0 && (
                <div className="space-y-2">
                  <Label>Itens Selecionados - Defina o desconto (%)</Label>
                  <Card>
                    <CardContent className="p-3 space-y-3">
                      {selectedItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between gap-4 p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {item.type === 'product' ? (
                              <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <Scissors className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                R$ {item.price?.toFixed(2)} → R$ {((item.price || 0) * (1 - item.discount_percentage / 100)).toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount_percentage}
                              onChange={(e) => updateItemDiscount(index, parseFloat(e.target.value) || 0)}
                              className="w-20 text-center"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}

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
                  {/* Show promotion items */}
                  {promotion.items && promotion.items.length > 0 && (
                    <div className="space-y-1">
                      {promotion.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1">
                            {item.product_id ? (
                              <Package className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Scissors className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className="truncate max-w-[120px]">{getItemName(item)}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            <Percent className="h-3 w-3 mr-1" />
                            {item.discount_percentage}%
                          </Badge>
                        </div>
                      ))}
                      {promotion.items.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{promotion.items.length - 3} mais itens
                        </p>
                      )}
                    </div>
                  )}
                  
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