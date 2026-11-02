import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";
import { slugify, validateSlug } from "@/shared/lib/slug";
import { useUpdateBarbershopSlug } from "../hooks/useMyBarbershop";
import type { MyBarbershop } from "../api/barbershop.api";

interface EditSlugDialogProps {
  barbershop: MyBarbershop;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSlugDialog({ barbershop, open, onOpenChange }: EditSlugDialogProps) {
  const [slug, setSlug] = useState(barbershop.slug);
  const update = useUpdateBarbershopSlug();
  const error = validateSlug(slug);

  const handleSave = async () => {
    if (error) return;
    try {
      await update.mutateAsync({ barbershopId: barbershop.id, slug });
      toast.success("Link atualizado! O link antigo deixa de funcionar.");
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível alterar o link"));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setSlug(barbershop.slug);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Endereço do link</DialogTitle>
          <DialogDescription>
            É o final do link que seus clientes usam para agendar. Ao mudar, o link antigo para de funcionar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="barbershop-slug">Endereço</Label>
          <div className="flex items-center gap-1 text-sm">
            <span className="shrink-0 text-muted-foreground">{window.location.host}/b/</span>
            <Input
              id="barbershop-slug"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="barbearia-do-ze"
              maxLength={60}
            />
          </div>
          {error && slug !== barbershop.slug && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!!error || slug === barbershop.slug || update.isPending}>
            {update.isPending && <Loader2 className="animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
