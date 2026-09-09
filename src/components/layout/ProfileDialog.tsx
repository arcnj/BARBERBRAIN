import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch profile data based on role
  const { data: profileData, isLoading } = useQuery({
    queryKey: ["profile-dialog", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // For barbers, fetch from barbers table
      if (role === "barber") {
        const { data, error } = await supabase
          .from("barbers")
          .select("id, name, email, phone, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        return data ? { ...data, source: "barber" as const } : null;
      }

      // For admins/others, fetch from profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data ? { 
        ...data, 
        name: data.full_name,
        source: "profile" as const 
      } : null;
    },
    enabled: !!user?.id && open,
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      // Update the appropriate table
      if (role === "barber" && profileData?.source === "barber") {
        const { error: updateError } = await supabase
          .from("barbers")
          .update({ avatar_url: avatarUrl })
          .eq("user_id", user.id);

        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: avatarUrl })
          .eq("user_id", user.id);

        if (updateError) throw updateError;
      }

      return avatarUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Foto de perfil atualizada!");
    },
    onError: (error: any) => {
      console.error("Upload error:", error);
      toast.error("Erro ao atualizar foto de perfil");
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploading(true);
    try {
      await uploadAvatarMutation.mutateAsync(file);
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Meu Perfil</DialogTitle>
          <DialogDescription>
            Visualize e edite suas informações pessoais
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24 border-2 border-primary/20">
                  <AvatarImage src={profileData?.avatar_url || ""} />
                  <AvatarFallback className="text-xl bg-gradient-gold text-primary-foreground">
                    {getInitials(profileData?.name)}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Clique no ícone para alterar a foto
              </p>
            </div>

            {/* Profile Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={profileData?.name || ""}
                  disabled
                  className="bg-muted/50"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={profileData?.email || user?.email || ""}
                  disabled
                  className="bg-muted/50"
                />
              </div>

              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={profileData?.phone || "Não informado"}
                  disabled
                  className="bg-muted/50"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}