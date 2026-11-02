import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Scissors, Loader2, Package, Gift } from "lucide-react";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number | null;
  category: string;
  categories: string[];
  active: boolean;
}

interface ServiceCombo {
  id: string;
  name: string;
  description: string | null;
  promotional_price: number;
  original_price: number;
  max_redemptions: number | null;
  current_redemptions: number;
  active: boolean;
  services?: Service[];
}

const categories = [
  "Cabelo",
  "Barba",
  "Sobrancelha",
  "Combo",
  "Tratamento",
  "Outros"
];

export function ServicesTab() {
  const [activeTab, setActiveTab] = useState<"services" | "combos">("services");
  const [services, setServices] = useState<Service[]>([]);
  const [combos, setCombos] = useState<ServiceCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comboDialogOpen, setComboDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingCombo, setEditingCombo] = useState<ServiceCombo | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration_minutes: "30",
    category: "Cabelo",
    categories: ["Cabelo"] as string[],
    active: true
  });
  const [comboFormData, setComboFormData] = useState({
    name: "",
    description: "",
    promotional_price: "",
    max_redemptions: "",
    selectedServices: [] as string[],
    active: true
  });

  useEffect(() => {
    fetchServices();
    fetchCombos();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("category", { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Erro ao carregar serviços");
    } finally {
      setLoading(false);
    }
  };

  const fetchCombos = async () => {
    try {
      const { data: combosData, error: combosError } = await supabase
        .from("service_combos")
        .select("*")
        .order("created_at", { ascending: false });

      if (combosError) throw combosError;

      // Fetch services for each combo
      const combosWithServices = await Promise.all(
        (combosData || []).map(async (combo) => {
          const { data: comboServicesData } = await supabase
            .from("combo_services")
            .select("service_id")
            .eq("combo_id", combo.id);

          const serviceIds = (comboServicesData || []).map(cs => cs.service_id);
          
          if (serviceIds.length > 0) {
            const { data: servicesData } = await supabase
              .from("services")
              .select("*")
              .in("id", serviceIds);
            
            return { ...combo, services: servicesData || [] };
          }
          
          return { ...combo, services: [] };
        })
      );

      setCombos(combosWithServices);
    } catch (error) {
      console.error("Error fetching combos:", error);
      toast.error("Erro ao carregar combos");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.category) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const serviceData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        duration_minutes: parseInt(formData.duration_minutes) || 30,
        category: formData.category,
        categories: formData.categories,
        active: formData.active
      };

      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingService.id);

        if (error) throw error;
        toast.success("Serviço atualizado!");
      } else {
        const { error } = await supabase
          .from("services")
          .insert(serviceData);

        if (error) throw error;
        toast.success("Serviço criado!");
      }

      setDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error) {
      console.error("Error saving service:", error);
      toast.error("Erro ao salvar serviço");
    }
  };

  const handleComboSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comboFormData.name || !comboFormData.promotional_price || comboFormData.selectedServices.length === 0) {
      toast.error("Preencha todos os campos obrigatórios e selecione pelo menos um serviço");
      return;
    }

    try {
      // Calculate original price from selected services
      const originalPrice = comboFormData.selectedServices.reduce((total, serviceId) => {
        const service = services.find(s => s.id === serviceId);
        return total + (service?.price || 0);
      }, 0);

      const comboData = {
        name: comboFormData.name.trim(),
        description: comboFormData.description.trim() || null,
        promotional_price: parseFloat(comboFormData.promotional_price),
        original_price: originalPrice,
        max_redemptions: comboFormData.max_redemptions ? parseInt(comboFormData.max_redemptions) : null,
        active: comboFormData.active
      };

      if (editingCombo) {
        // Update combo
        const { error: comboError } = await supabase
          .from("service_combos")
          .update(comboData)
          .eq("id", editingCombo.id);

        if (comboError) throw comboError;

        // Delete existing combo services
        await supabase
          .from("combo_services")
          .delete()
          .eq("combo_id", editingCombo.id);

        // Insert new combo services
        const comboServices = comboFormData.selectedServices.map(serviceId => ({
          combo_id: editingCombo.id,
          service_id: serviceId
        }));

        const { error: servicesError } = await supabase
          .from("combo_services")
          .insert(comboServices);

        if (servicesError) throw servicesError;

        toast.success("Combo atualizado!");
      } else {
        // Create new combo
        const { data: newCombo, error: comboError } = await supabase
          .from("service_combos")
          .insert(comboData)
          .select()
          .single();

        if (comboError) throw comboError;

        // Insert combo services
        const comboServices = comboFormData.selectedServices.map(serviceId => ({
          combo_id: newCombo.id,
          service_id: serviceId
        }));

        const { error: servicesError } = await supabase
          .from("combo_services")
          .insert(comboServices);

        if (servicesError) throw servicesError;

        toast.success("Combo criado!");
      }

      setComboDialogOpen(false);
      resetComboForm();
      fetchCombos();
    } catch (error) {
      console.error("Error saving combo:", error);
      toast.error("Erro ao salvar combo");
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    const svcCategories = service.categories?.length > 0 ? service.categories : [service.category];
    setFormData({
      name: service.name,
      description: service.description || "",
      price: service.price.toString(),
      duration_minutes: (service.duration_minutes || 30).toString(),
      category: service.category,
      categories: svcCategories,
      active: service.active
    });
    setDialogOpen(true);
  };

  const handleEditCombo = (combo: ServiceCombo) => {
    setEditingCombo(combo);
    setComboFormData({
      name: combo.name,
      description: combo.description || "",
      promotional_price: combo.promotional_price.toString(),
      max_redemptions: combo.max_redemptions?.toString() || "",
      selectedServices: combo.services?.map(s => s.id) || [],
      active: combo.active
    });
    setComboDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este serviço?")) return;

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Serviço excluído!");
      fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error("Erro ao excluir serviço");
    }
  };

  const handleDeleteCombo = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este combo?")) return;

    try {
      const { error } = await supabase
        .from("service_combos")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Combo excluído!");
      fetchCombos();
    } catch (error) {
      console.error("Error deleting combo:", error);
      toast.error("Erro ao excluir combo");
    }
  };

  const toggleActive = async (service: Service) => {
    try {
      const { error } = await supabase
        .from("services")
        .update({ active: !service.active })
        .eq("id", service.id);

      if (error) throw error;
      fetchServices();
    } catch (error) {
      console.error("Error toggling service:", error);
      toast.error("Erro ao atualizar serviço");
    }
  };

  const toggleComboActive = async (combo: ServiceCombo) => {
    try {
      const { error } = await supabase
        .from("service_combos")
        .update({ active: !combo.active })
        .eq("id", combo.id);

      if (error) throw error;
      fetchCombos();
    } catch (error) {
      console.error("Error toggling combo:", error);
      toast.error("Erro ao atualizar combo");
    }
  };

  const resetForm = () => {
    setEditingService(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      duration_minutes: "30",
      category: "Cabelo",
      categories: ["Cabelo"],
      active: true
    });
  };

  const resetComboForm = () => {
    setEditingCombo(null);
    setComboFormData({
      name: "",
      description: "",
      promotional_price: "",
      max_redemptions: "",
      selectedServices: [],
      active: true
    });
  };

  const toggleServiceSelection = (serviceId: string) => {
    setComboFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId]
    }));
  };

  const calculateComboOriginalPrice = () => {
    return comboFormData.selectedServices.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
  };

  const calculateDiscount = () => {
    const originalPrice = calculateComboOriginalPrice();
    const promoPrice = parseFloat(comboFormData.promotional_price) || 0;
    if (originalPrice === 0) return 0;
    return Math.round(((originalPrice - promoPrice) / originalPrice) * 100);
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
      {/* Custom Tab Navigation */}
      <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab("services")}
          className={cn(
            "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
            activeTab === "services"
              ? "bg-background text-foreground shadow-sm"
              : "hover:bg-background/50"
          )}
        >
          <Scissors className="h-4 w-4" />
          Serviços
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("combos")}
          className={cn(
            "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
            activeTab === "combos"
              ? "bg-background text-foreground shadow-sm"
              : "hover:bg-background/50"
          )}
        >
          <Package className="h-4 w-4" />
          Combos
        </button>
      </div>

      {/* Services Tab Content */}
      {activeTab === "services" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-display font-bold">Serviços</h2>
              <p className="text-muted-foreground">Gerencie os serviços oferecidos</p>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Serviço
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingService ? "Editar Serviço" : "Novo Serviço"}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Corte de Cabelo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descrição do serviço..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Preço (R$) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duração (min)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="5"
                        step="5"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                        placeholder="30"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Categorias *</Label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => {
                        const isSelected = formData.categories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              const newCategories = isSelected
                                ? formData.categories.filter(c => c !== cat)
                                : [...formData.categories, cat];
                              if (newCategories.length === 0) return; // At least one required
                              setFormData({
                                ...formData,
                                categories: newCategories,
                                category: newCategories[0] // Primary category = first selected
                              });
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                            )}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">Selecione uma ou mais categorias</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    />
                    <Label htmlFor="active">Serviço ativo</Label>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1">
                      {editingService ? "Salvar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {services.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Scissors className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">Nenhum serviço cadastrado</h3>
                <p className="text-muted-foreground text-sm">Clique em "Novo Serviço" para começar</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{service.name}</p>
                            {service.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {service.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-muted rounded-md text-xs">
                            {service.category}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          R$ {service.price.toFixed(2)}
                        </TableCell>
                        <TableCell>{service.duration_minutes || 30} min</TableCell>
                        <TableCell>
                          <Switch
                            checked={service.active}
                            onCheckedChange={() => toggleActive(service)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(service)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(service.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Combos Tab Content */}
      {activeTab === "combos" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-display font-bold">Combos Promocionais</h2>
              <p className="text-muted-foreground">Crie combos com preços especiais e limite de uso</p>
            </div>
            
            <Dialog open={comboDialogOpen} onOpenChange={(open) => {
              setComboDialogOpen(open);
              if (!open) resetComboForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Combo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCombo ? "Editar Combo" : "Novo Combo"}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleComboSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="combo-name">Nome do Combo *</Label>
                    <Input
                      id="combo-name"
                      value={comboFormData.name}
                      onChange={(e) => setComboFormData({ ...comboFormData, name: e.target.value })}
                      placeholder="Ex: Combo Completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="combo-description">Descrição</Label>
                    <Textarea
                      id="combo-description"
                      value={comboFormData.description}
                      onChange={(e) => setComboFormData({ ...comboFormData, description: e.target.value })}
                      placeholder="Descrição do combo..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Selecione os Serviços *</Label>
                    <Card className="max-h-48 overflow-y-auto">
                      <CardContent className="p-3 space-y-2">
                        {services.filter(s => s.active).map((service) => {
                          const isSelected = comboFormData.selectedServices.includes(service.id);
                          return (
                            <label
                              key={service.id}
                              className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleServiceSelection(service.id)}
                                  className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                                />
                                <div>
                                  <p className="font-medium text-sm">{service.name}</p>
                                  <p className="text-xs text-muted-foreground">{service.category}</p>
                                </div>
                              </div>
                              <span className="text-sm font-medium">R$ {service.price.toFixed(2)}</span>
                            </label>
                          );
                        })}
                      </CardContent>
                    </Card>
                    {comboFormData.selectedServices.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Preço original: <span className="font-medium">R$ {calculateComboOriginalPrice().toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="promotional-price">Preço Promocional (R$) *</Label>
                      <Input
                        id="promotional-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={comboFormData.promotional_price}
                        onChange={(e) => setComboFormData({ ...comboFormData, promotional_price: e.target.value })}
                        placeholder="0.00"
                      />
                      {comboFormData.promotional_price && calculateDiscount() > 0 && (
                        <p className="text-xs text-green-600 font-medium">
                          {calculateDiscount()}% de desconto
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max-redemptions">Limite de Usos</Label>
                      <Input
                        id="max-redemptions"
                        type="number"
                        min="1"
                        value={comboFormData.max_redemptions}
                        onChange={(e) => setComboFormData({ ...comboFormData, max_redemptions: e.target.value })}
                        placeholder="Ex: 100 (deixe vazio para ilimitado)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Deixe vazio para uso ilimitado
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="combo-active"
                      checked={comboFormData.active}
                      onCheckedChange={(checked) => setComboFormData({ ...comboFormData, active: checked })}
                    />
                    <Label htmlFor="combo-active">Combo ativo</Label>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setComboDialogOpen(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1">
                      {editingCombo ? "Salvar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {combos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">Nenhum combo cadastrado</h3>
                <p className="text-muted-foreground text-sm">Clique em "Novo Combo" para criar um pacote promocional</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {combos.map((combo) => {
                const discount = combo.original_price > 0 
                  ? Math.round(((combo.original_price - combo.promotional_price) / combo.original_price) * 100)
                  : 0;
                const remaining = combo.max_redemptions 
                  ? combo.max_redemptions - combo.current_redemptions 
                  : null;
                
                return (
                  <Card key={combo.id} className={!combo.active ? "opacity-60" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center gap-2">
                            <Gift className="h-5 w-5 text-primary" />
                            {combo.name}
                          </CardTitle>
                          {combo.description && (
                            <p className="text-sm text-muted-foreground">{combo.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditCombo(combo)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCombo(combo.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {combo.services?.map((service) => (
                          <Badge key={service.id} variant="secondary" className="text-xs">
                            {service.name}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-primary">
                          R$ {combo.promotional_price.toFixed(2)}
                        </span>
                        {combo.original_price > 0 && (
                          <span className="text-sm text-muted-foreground line-through">
                            R$ {combo.original_price.toFixed(2)}
                          </span>
                        )}
                        {discount > 0 && (
                          <Badge className="bg-green-500 text-white">
                            -{discount}%
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        {combo.max_redemptions ? (
                          <div className="text-muted-foreground">
                            <span className="font-medium text-foreground">{remaining}</span> de {combo.max_redemptions} restantes
                          </div>
                        ) : (
                          <div className="text-muted-foreground">Uso ilimitado</div>
                        )}
                        <Switch
                          checked={combo.active}
                          onCheckedChange={() => toggleComboActive(combo)}
                        />
                      </div>

                      {remaining !== null && remaining <= 10 && remaining > 0 && (
                        <Badge variant="destructive" className="w-full justify-center">
                          Últimas {remaining} vagas!
                        </Badge>
                      )}
                      {remaining === 0 && (
                        <Badge variant="secondary" className="w-full justify-center">
                          Esgotado
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}