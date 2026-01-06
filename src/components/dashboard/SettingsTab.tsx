import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Settings, Store } from "lucide-react";
import { toast } from "sonner";

interface BarbershopSettings {
  id: string;
  name: string | null;
  address: string | null;
  whatsapp_phone: string | null;
}

export function SettingsTab() {
  const [settings, setSettings] = useState<BarbershopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    whatsapp_phone: "",
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
        setSettings(data);
        setFormData({
          name: data.name || "",
          address: data.address || "",
          whatsapp_phone: data.whatsapp_phone || "",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings?.id) {
        // Update existing settings
        const { error } = await supabase
          .from("barbershop_settings")
          .update({
            name: formData.name || null,
            address: formData.address || null,
            whatsapp_phone: formData.whatsapp_phone || null,
          })
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from("barbershop_settings")
          .insert({
            name: formData.name || null,
            address: formData.address || null,
            whatsapp_phone: formData.whatsapp_phone || null,
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

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
