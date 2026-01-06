import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Settings, Store, Clock, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
}

interface BarbershopSettings {
  id: string;
  name: string | null;
  address: string | null;
  whatsapp_phone: string | null;
  logo_url: string | null;
  monday_open: string | null;
  monday_close: string | null;
  monday_closed: boolean | null;
  tuesday_open: string | null;
  tuesday_close: string | null;
  tuesday_closed: boolean | null;
  wednesday_open: string | null;
  wednesday_close: string | null;
  wednesday_closed: boolean | null;
  thursday_open: string | null;
  thursday_close: string | null;
  thursday_closed: boolean | null;
  friday_open: string | null;
  friday_close: string | null;
  friday_closed: boolean | null;
  saturday_open: string | null;
  saturday_close: string | null;
  saturday_closed: boolean | null;
  sunday_open: string | null;
  sunday_close: string | null;
  sunday_closed: boolean | null;
}

const DAYS = [
  { key: "monday", label: "Segunda-feira" },
  { key: "tuesday", label: "Terça-feira" },
  { key: "wednesday", label: "Quarta-feira" },
  { key: "thursday", label: "Quinta-feira" },
  { key: "friday", label: "Sexta-feira" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
] as const;

export function SettingsTab() {
  const [settings, setSettings] = useState<BarbershopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    whatsapp_phone: "",
    logo_url: "",
  });
  
  const [scheduleData, setScheduleData] = useState<Record<string, DaySchedule>>({
    monday: { open: "09:00", close: "18:00", closed: false },
    tuesday: { open: "09:00", close: "18:00", closed: false },
    wednesday: { open: "09:00", close: "18:00", closed: false },
    thursday: { open: "09:00", close: "18:00", closed: false },
    friday: { open: "09:00", close: "18:00", closed: false },
    saturday: { open: "09:00", close: "14:00", closed: false },
    sunday: { open: "09:00", close: "18:00", closed: true },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("barbershop_settings")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setSettings(data as BarbershopSettings);
        setFormData({
          name: data.name || "",
          address: data.address || "",
          whatsapp_phone: data.whatsapp_phone || "",
          logo_url: (data as BarbershopSettings).logo_url || "",
        });
        setScheduleData({
          monday: { 
            open: data.monday_open?.substring(0, 5) || "09:00", 
            close: data.monday_close?.substring(0, 5) || "18:00", 
            closed: data.monday_closed || false 
          },
          tuesday: { 
            open: data.tuesday_open?.substring(0, 5) || "09:00", 
            close: data.tuesday_close?.substring(0, 5) || "18:00", 
            closed: data.tuesday_closed || false 
          },
          wednesday: { 
            open: data.wednesday_open?.substring(0, 5) || "09:00", 
            close: data.wednesday_close?.substring(0, 5) || "18:00", 
            closed: data.wednesday_closed || false 
          },
          thursday: { 
            open: data.thursday_open?.substring(0, 5) || "09:00", 
            close: data.thursday_close?.substring(0, 5) || "18:00", 
            closed: data.thursday_closed || false 
          },
          friday: { 
            open: data.friday_open?.substring(0, 5) || "09:00", 
            close: data.friday_close?.substring(0, 5) || "18:00", 
            closed: data.friday_closed || false 
          },
          saturday: { 
            open: data.saturday_open?.substring(0, 5) || "09:00", 
            close: data.saturday_close?.substring(0, 5) || "14:00", 
            closed: data.saturday_closed || false 
          },
          sunday: { 
            open: data.sunday_open?.substring(0, 5) || "09:00", 
            close: data.sunday_close?.substring(0, 5) || "18:00", 
            closed: data.sunday_closed ?? true 
          },
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const updateSchedule = (day: string, field: keyof DaySchedule, value: string | boolean) => {
    setScheduleData(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem");
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      // Delete old logo if exists
      if (formData.logo_url) {
        const oldPath = formData.logo_url.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("barbershop").remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("barbershop")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("barbershop")
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
      toast.success("Logo carregado com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload do logo");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!formData.logo_url) return;

    try {
      const fileName = formData.logo_url.split("/").pop();
      if (fileName) {
        await supabase.storage.from("barbershop").remove([fileName]);
      }
      setFormData(prev => ({ ...prev, logo_url: "" }));
      toast.success("Logo removido");
    } catch (error) {
      console.error("Erro ao remover logo:", error);
      toast.error("Erro ao remover logo");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const scheduleFields = {
        monday_open: scheduleData.monday.open,
        monday_close: scheduleData.monday.close,
        monday_closed: scheduleData.monday.closed,
        tuesday_open: scheduleData.tuesday.open,
        tuesday_close: scheduleData.tuesday.close,
        tuesday_closed: scheduleData.tuesday.closed,
        wednesday_open: scheduleData.wednesday.open,
        wednesday_close: scheduleData.wednesday.close,
        wednesday_closed: scheduleData.wednesday.closed,
        thursday_open: scheduleData.thursday.open,
        thursday_close: scheduleData.thursday.close,
        thursday_closed: scheduleData.thursday.closed,
        friday_open: scheduleData.friday.open,
        friday_close: scheduleData.friday.close,
        friday_closed: scheduleData.friday.closed,
        saturday_open: scheduleData.saturday.open,
        saturday_close: scheduleData.saturday.close,
        saturday_closed: scheduleData.saturday.closed,
        sunday_open: scheduleData.sunday.open,
        sunday_close: scheduleData.sunday.close,
        sunday_closed: scheduleData.sunday.closed,
      };

      if (settings?.id) {
        const { error } = await supabase
          .from("barbershop_settings")
          .update({
            name: formData.name || null,
            address: formData.address || null,
            whatsapp_phone: formData.whatsapp_phone || null,
            logo_url: formData.logo_url || null,
            ...scheduleFields,
          })
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("barbershop_settings")
          .insert({
            name: formData.name || null,
            address: formData.address || null,
            whatsapp_phone: formData.whatsapp_phone || null,
            logo_url: formData.logo_url || null,
            ...scheduleFields,
          });

        if (error) throw error;
      }

      toast.success("Configurações salvas com sucesso!");
      fetchSettings();
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
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
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Configurações</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Dados da Barbearia
          </CardTitle>
          <CardDescription>
            Configure as informações básicas da sua barbearia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Logo da Barbearia</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 rounded-lg">
                <AvatarImage src={formData.logo_url} alt="Logo" className="object-cover" />
                <AvatarFallback className="rounded-lg bg-muted">
                  <Store className="h-8 w-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ImagePlus className="h-4 w-4 mr-2" />
                  )}
                  {formData.logo_url ? "Alterar Logo" : "Adicionar Logo"}
                </Button>
                {formData.logo_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome da Barbearia</Label>
            <Input
              id="name"
              placeholder="Ex: Barbearia Premium"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              placeholder="Ex: Rua das Flores, 123 - Centro"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">Número do WhatsApp</Label>
            <Input
              id="whatsapp"
              placeholder="Ex: 11999999999"
              value={formData.whatsapp_phone}
              onChange={(e) => setFormData({ ...formData, whatsapp_phone: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Apenas números, incluindo DDD (ex: 11999999999)
            </p>
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horário de Funcionamento
          </CardTitle>
          <CardDescription>
            Configure os horários de abertura e fechamento por dia da semana
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS.map(({ key, label }) => (
            <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between sm:w-40">
                <span className="font-medium">{label}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={!scheduleData[key].closed}
                  onCheckedChange={(checked) => updateSchedule(key, "closed", !checked)}
                />
                <span className="text-sm text-muted-foreground">
                  {scheduleData[key].closed ? "Fechado" : "Aberto"}
                </span>
              </div>

              {!scheduleData[key].closed && (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={scheduleData[key].open}
                    onChange={(e) => updateSchedule(key, "open", e.target.value)}
                    className="w-28"
                  />
                  <span className="text-muted-foreground">às</span>
                  <Input
                    type="time"
                    value={scheduleData[key].close}
                    onChange={(e) => updateSchedule(key, "close", e.target.value)}
                    className="w-28"
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Salvar Configurações
      </Button>
    </div>
  );
}
