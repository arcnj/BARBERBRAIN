import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, User, Camera, Upload, Pencil, KeyRound, Check, Copy, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { Badge } from "@/components/ui/badge";

interface Barber {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  avatar_url: string | null;
  user_id: string | null;
}

export function BarbersTab() {
  const { user, role } = useAuth();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createLoginDialogOpen, setCreateLoginDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [barberToDelete, setBarberToDelete] = useState<Barber | null>(null);
  const [barberToEdit, setBarberToEdit] = useState<Barber | null>(null);
  const [barberForLogin, setBarberForLogin] = useState<Barber | null>(null);
  const [barberForPasswordReset, setBarberForPasswordReset] = useState<Barber | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [creatingLogin, setCreatingLogin] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newBarberFileRef = useRef<HTMLInputElement>(null);
  const editBarberFileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [newPasswordForReset, setNewPasswordForReset] = useState("");
  const [resetPasswordCredentials, setResetPasswordCredentials] = useState<{ password: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    active: true,
  });

  const [loginFormData, setLoginFormData] = useState({
    email: "",
    password: "",
  });


  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from("barbers")
        .select("*")
        .order("name");

      if (error) throw error;
      setBarbers(data || []);
    } catch (error) {
      console.error("Error fetching barbers:", error);
      toast.error("Erro ao carregar barbeiros");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSubmitting(true);
    try {
      let avatarUrl: string | null = null;

      // Upload avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("barbers")
          .upload(fileName, avatarFile);

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from("barbers")
          .getPublicUrl(fileName);

        avatarUrl = publicUrl.publicUrl;
      }

      const { error } = await supabase.from("barbers").insert({
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        avatar_url: avatarUrl,
      });

      if (error) throw error;

      toast.success("Barbeiro adicionado com sucesso!");
      setDialogOpen(false);
      resetForm();
      fetchBarbers();
    } catch (error) {
      console.error("Error adding barber:", error);
      toast.error("Erro ao adicionar barbeiro");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAvatarUpload = async (barberId: string, file: File) => {
    setUploadingAvatar(barberId);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${barberId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("barbers")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("barbers")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("barbers")
        .update({ avatar_url: publicUrl.publicUrl })
        .eq("id", barberId);

      if (updateError) throw updateError;

      toast.success("Foto atualizada com sucesso!");
      fetchBarbers();
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setUploadingAvatar(null);
    }
  };

  const handleNewBarberFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleEditBarberFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditAvatarFile(file);
      const url = URL.createObjectURL(file);
      setEditPreviewUrl(url);
    }
  };

  const openEditDialog = (barber: Barber) => {
    setBarberToEdit(barber);
    setEditFormData({
      name: barber.name,
      email: barber.email || "",
      phone: barber.phone || "",
      active: barber.active,
    });
    setEditPreviewUrl(barber.avatar_url);
    setEditAvatarFile(null);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barberToEdit || !editFormData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSubmitting(true);
    try {
      let avatarUrl: string | null = barberToEdit.avatar_url;

      // Upload new avatar if selected
      if (editAvatarFile) {
        const fileExt = editAvatarFile.name.split(".").pop();
        const fileName = `${barberToEdit.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("barbers")
          .upload(fileName, editAvatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from("barbers")
          .getPublicUrl(fileName);

        avatarUrl = publicUrl.publicUrl;
      }

      const { error } = await supabase
        .from("barbers")
        .update({
          name: editFormData.name.trim(),
          email: editFormData.email.trim() || null,
          phone: editFormData.phone.trim() || null,
          active: editFormData.active,
          avatar_url: avatarUrl,
        })
        .eq("id", barberToEdit.id);

      if (error) throw error;

      toast.success("Barbeiro atualizado com sucesso!");
      setEditDialogOpen(false);
      setBarberToEdit(null);
      fetchBarbers();
    } catch (error) {
      console.error("Error updating barber:", error);
      toast.error("Erro ao atualizar barbeiro");
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (barber: Barber) => {
    setBarberToDelete(barber);
    setAdminPassword("");
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!barberToDelete || !user?.email) return;

    setVerifyingPassword(true);
    try {
      // Verify admin password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: adminPassword,
      });

      if (signInError) {
        toast.error("Senha incorreta");
        setVerifyingPassword(false);
        return;
      }

      // Password verified, proceed with deletion
      const { error: deleteError } = await supabase
        .from("barbers")
        .delete()
        .eq("id", barberToDelete.id);

      if (deleteError) throw deleteError;

      toast.success("Barbeiro excluído com sucesso!");
      setDeleteDialogOpen(false);
      setBarberToDelete(null);
      setAdminPassword("");
      fetchBarbers();
    } catch (error) {
      console.error("Error deleting barber:", error);
      toast.error("Erro ao excluir barbeiro");
    } finally {
      setVerifyingPassword(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "" });
    setAvatarFile(null);
    setPreviewUrl(null);
  };

  const openCreateLoginDialog = (barber: Barber) => {
    setBarberForLogin(barber);
    setLoginFormData({
      email: barber.email || "",
      password: generatePassword(),
    });
    setGeneratedCredentials(null);
    setCreateLoginDialogOpen(true);
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleCreateLogin = async () => {
    if (!barberForLogin || !loginFormData.email || !loginFormData.password) {
      toast.error("Email e senha são obrigatórios");
      return;
    }

    setCreatingLogin(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-barber-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionData.session.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email: loginFormData.email,
            password: loginFormData.password,
            name: barberForLogin.name,
            phone: barberForLogin.phone,
            barberId: barberForLogin.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar login");
      }

      setGeneratedCredentials({
        email: loginFormData.email,
        password: loginFormData.password,
      });
      
      toast.success("Login criado com sucesso!");
      fetchBarbers();
    } catch (error: any) {
      console.error("Error creating login:", error);
      toast.error(error.message || "Erro ao criar login");
    } finally {
      setCreatingLogin(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const openResetPasswordDialog = (barber: Barber) => {
    setBarberForPasswordReset(barber);
    setNewPasswordForReset(generatePassword());
    setResetPasswordCredentials(null);
    setResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!barberForPasswordReset?.user_id || !newPasswordForReset) {
      toast.error("Senha é obrigatória");
      return;
    }

    setResettingPassword(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-barber-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionData.session.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            userId: barberForPasswordReset.user_id,
            newPassword: newPasswordForReset,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao redefinir senha");
      }

      setResetPasswordCredentials({
        password: newPasswordForReset,
      });
      
      toast.success("Senha redefinida com sucesso!");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Erro ao redefinir senha");
    } finally {
      setResettingPassword(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Barbeiros</h2>
          <p className="text-muted-foreground">
            Gerencie os barbeiros da sua barbearia
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Barbeiro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Barbeiro</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Avatar upload for new barber */}
              <div className="flex flex-col items-center gap-3">
                <Label>Foto do Barbeiro</Label>
                <div 
                  className="relative cursor-pointer group"
                  onClick={() => newBarberFileRef.current?.click()}
                >
                  <Avatar className="h-24 w-24 border-2 border-dashed border-muted-foreground/30 group-hover:border-primary transition-colors">
                    {previewUrl ? (
                      <AvatarImage src={previewUrl} alt="Preview" className="object-cover" />
                    ) : (
                      <AvatarFallback className="bg-muted">
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                </div>
                <input
                  ref={newBarberFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleNewBarberFileChange}
                />
                <p className="text-xs text-muted-foreground">Clique para adicionar foto</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nome do barbeiro"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="(00) 00000-0000"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {barbers.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum barbeiro cadastrado</p>
          <p className="text-sm text-muted-foreground">
            Clique em "Novo Barbeiro" para adicionar
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Foto</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {barbers.map((barber) => (
                <TableRow key={barber.id}>
                  <TableCell>
                    <div className="relative group">
                      <Avatar className="h-12 w-12 cursor-pointer" onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) handleAvatarUpload(barber.id, file);
                        };
                        input.click();
                      }}>
                        {barber.avatar_url ? (
                          <AvatarImage src={barber.avatar_url} alt={barber.name} className="object-cover" />
                        ) : (
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            {barber.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        )}
                        {uploadingAvatar === barber.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                          </div>
                        )}
                      </Avatar>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) handleAvatarUpload(barber.id, file);
                        };
                        input.click();
                      }}>
                        <Camera className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{barber.name}</TableCell>
                  <TableCell>{barber.email || "-"}</TableCell>
                  <TableCell>{barber.phone || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          barber.active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {barber.active ? "Ativo" : "Inativo"}
                      </span>
                      {barber.user_id ? (
                        <Badge variant="outline" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Login
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs text-muted-foreground">
                          Sem login
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <WhatsAppButton 
                        phone={barber.phone} 
                        name={barber.name}
                      />
                      {role === "admin" && !barber.user_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openCreateLoginDialog(barber)}
                          title="Criar login para funcionário"
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      )}
                      {role === "admin" && barber.user_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openResetPasswordDialog(barber)}
                          title="Redefinir senha"
                          className="text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(barber)}
                        className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(barber)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Você está prestes a excluir o barbeiro{" "}
                <strong>{barberToDelete?.name}</strong>.
              </p>
              <p>
                Para confirmar, digite sua senha de administrador:
              </p>
              <Input
                type="password"
                placeholder="Sua senha"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="mt-2"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAdminPassword("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!adminPassword || verifyingPassword}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {verifyingPassword && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Barber Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Barbeiro</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Avatar upload for edit */}
            <div className="flex flex-col items-center gap-3">
              <Label>Foto do Barbeiro</Label>
              <div 
                className="relative cursor-pointer group"
                onClick={() => editBarberFileRef.current?.click()}
              >
                <Avatar className="h-24 w-24 border-2 border-dashed border-muted-foreground/30 group-hover:border-primary transition-colors">
                  {editPreviewUrl ? (
                    <AvatarImage src={editPreviewUrl} alt="Preview" className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-muted">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="h-6 w-6 text-white" />
                </div>
              </div>
              <input
                ref={editBarberFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleEditBarberFileChange}
              />
              <p className="text-xs text-muted-foreground">Clique para alterar a foto</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                placeholder="Nome do barbeiro"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, email: e.target.value })
                }
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={editFormData.phone}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, phone: e.target.value })
                }
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">Status Ativo</Label>
              <Switch
                id="edit-active"
                checked={editFormData.active}
                onCheckedChange={(checked) =>
                  setEditFormData({ ...editFormData, active: checked })
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Login Dialog */}
      <Dialog open={createLoginDialogOpen} onOpenChange={(open) => {
        setCreateLoginDialogOpen(open);
        if (!open) {
          setGeneratedCredentials(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Login para Funcionário</DialogTitle>
          </DialogHeader>
          
          {generatedCredentials ? (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-400 font-medium mb-3">
                  ✓ Login criado com sucesso para {barberForLogin?.name}!
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Anote as credenciais abaixo. A senha não poderá ser recuperada.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-background rounded border">
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-mono text-sm">{generatedCredentials.email}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(generatedCredentials.email)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-background rounded border">
                    <div>
                      <p className="text-xs text-muted-foreground">Senha</p>
                      <p className="font-mono text-sm">{generatedCredentials.password}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(generatedCredentials.password)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button onClick={() => setCreateLoginDialogOpen(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Crie um login para <strong>{barberForLogin?.name}</strong> acessar o sistema.
                O funcionário terá acesso apenas à visualização da agenda.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="login-email">Email *</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginFormData.email}
                  onChange={(e) => setLoginFormData({ ...loginFormData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="login-password">Senha *</Label>
                <div className="flex gap-2">
                  <Input
                    id="login-password"
                    value={loginFormData.password}
                    onChange={(e) => setLoginFormData({ ...loginFormData, password: e.target.value })}
                    placeholder="Senha do funcionário"
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setLoginFormData({ ...loginFormData, password: generatePassword() })}
                  >
                    Gerar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  A senha deve ter pelo menos 6 caracteres
                </p>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateLoginDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateLogin} 
                  disabled={creatingLogin || !loginFormData.email || loginFormData.password.length < 6}
                >
                  {creatingLogin && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Login
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
          </DialogHeader>
          
          {resetPasswordCredentials ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-400 font-medium mb-3">
                  Senha redefinida com sucesso!
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Anote a nova senha e informe ao funcionário <strong>{barberForPasswordReset?.name}</strong>:
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-background/50 p-2 rounded">
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-mono text-sm">{barberForPasswordReset?.email}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(barberForPasswordReset?.email || "")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between bg-background/50 p-2 rounded">
                    <div>
                      <p className="text-xs text-muted-foreground">Nova Senha</p>
                      <p className="font-mono text-sm">{resetPasswordCredentials.password}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(resetPasswordCredentials.password)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button onClick={() => {
                  setResetPasswordDialogOpen(false);
                  setBarberForPasswordReset(null);
                  setResetPasswordCredentials(null);
                }}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Você está prestes a redefinir a senha de <strong>{barberForPasswordReset?.name}</strong>.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-password"
                    value={newPasswordForReset}
                    onChange={(e) => setNewPasswordForReset(e.target.value)}
                    placeholder="Nova senha"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewPasswordForReset(generatePassword())}
                  >
                    Gerar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mínimo de 6 caracteres
                </p>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setResetPasswordDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleResetPassword} 
                  disabled={resettingPassword || newPasswordForReset.length < 6}
                >
                  {resettingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Redefinir Senha
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
