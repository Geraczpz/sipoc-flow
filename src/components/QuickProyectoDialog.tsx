import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useProfiles } from "@/hooks/useData";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (proyectoId: string) => void;
};

export const QuickProyectoDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const qc = useQueryClient();
  const { data: profiles = [] } = useProfiles();

  const [titulo, setTitulo] = useState("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => {
    if (open) {
      setTitulo("");
      setOwnerId("");
      setFechaFin("");
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const t = titulo.trim();
      if (!t) throw new Error("El título es requerido");
      if (t.length > 200) throw new Error("Título demasiado largo (máx 200)");
      const payload = {
        titulo: t,
        owner_usuario_id: ownerId || null,
        fecha_fin: fechaFin || null,
      };
      const { data, error } = await supabase.from("proyectos").insert(payload).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["proyectos"] });
      toast({ title: "Proyecto creado y asociado" });
      onCreated(id);
      onOpenChange(false);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <p className="eyebrow">Creación rápida</p>
          <DialogTitle className="display text-xl">Nuevo proyecto</DialogTitle>
          <DialogDescription>
            Se asociará automáticamente al contrato actual.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div>
            <Label htmlFor="qp-titulo">Título</Label>
            <Input
              id="qp-titulo"
              value={titulo}
              maxLength={200}
              onChange={(e) => setTitulo(e.target.value)}
              className="mt-1.5"
              autoFocus
            />
          </div>

          <div>
            <Label>Owner</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecciona owner" /></SelectTrigger>
              <SelectContent>
                {profiles.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="qp-ff">Fecha límite</Label>
            <Input
              id="qp-ff" type="date" value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)} className="mt-1.5"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !titulo.trim()}>
            {mutation.isPending ? "Creando..." : "Crear y asociar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
