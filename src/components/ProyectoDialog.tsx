import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  type Proyecto, useEstatusProyecto, useProfiles, useProgreso,
} from "@/hooks/useData";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, ShieldAlert, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  proyecto: Proyecto | null;
};

export const ProyectoDialog = ({ open, onOpenChange, proyecto }: Props) => {
  const isEdit = !!proyecto;
  const qc = useQueryClient();

  const { data: estatus = [] } = useEstatusProyecto();
  const { data: profiles = [] } = useProfiles();
  const { data: progreso = [] } = useProgreso();

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [estatusId, setEstatusId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setTitulo(proyecto?.titulo ?? "");
    setDescripcion(proyecto?.descripcion ?? "");
    setFechaInicio(proyecto?.fecha_inicio ?? "");
    setFechaFin(proyecto?.fecha_fin ?? "");
    setOwnerId(proyecto?.owner_usuario_id ?? "");
    setEstatusId(proyecto?.estatus_proyecto_id ? String(proyecto.estatus_proyecto_id) : "");
  }, [open, proyecto]);

  // History of progress logs for the selected project, newest first
  const history = useMemo(() => {
    if (!proyecto) return [];
    return progreso
      .filter((g) => g.proyecto_id === proyecto.id)
      .slice()
      .sort((a, b) => new Date(b.fecha_registro).getTime() - new Date(a.fecha_registro).getTime());
  }, [progreso, proyecto]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        owner_usuario_id: ownerId || null,
        estatus_proyecto_id: estatusId ? Number(estatusId) : null,
      };
      if (!payload.titulo) throw new Error("El título es requerido");

      if (isEdit && proyecto) {
        const { error } = await supabase.from("proyectos").update(payload).eq("id", proyecto.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("proyectos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyectos"] });
      toast({ title: isEdit ? "Proyecto actualizado" : "Proyecto creado" });
      onOpenChange(false);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-hidden p-0",
          isEdit ? "max-w-5xl" : "max-w-2xl"
        )}
      >
        <div className={cn("grid max-h-[90vh]", isEdit && "md:grid-cols-[1fr_380px]")}>
          {/* LEFT: form */}
          <div className="flex max-h-[90vh] flex-col overflow-hidden">
            <div className="overflow-y-auto px-6 pt-6">
              <DialogHeader>
                <p className="eyebrow">{isEdit ? "Editar proyecto" : "Nuevo sub proyecto"}</p>
                <DialogTitle className="display text-2xl">
                  {isEdit ? proyecto?.titulo : "Crear sub proyecto"}
                </DialogTitle>
                <DialogDescription>
                  Define los datos del sub proyecto y asigna responsable y estatus.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 py-4">
                <div>
                  <Label htmlFor="p-titulo">Título</Label>
                  <Input id="p-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="mt-1.5" />
                </div>

                <div>
                  <Label htmlFor="p-desc">Descripción</Label>
                  <Textarea
                    id="p-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                    className="mt-1.5" rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="p-fi">Fecha inicio</Label>
                    <Input id="p-fi" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="p-ff">Fecha fin</Label>
                    <Input id="p-ff" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="mt-1.5" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Responsable (owner)</Label>
                    <Select value={ownerId} onValueChange={setOwnerId}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        {profiles.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estatus</Label>
                    <Select value={estatusId} onValueChange={setEstatusId}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        {estatus.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-border bg-card px-6 py-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !titulo.trim()}>
                {mutation.isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear sub proyecto"}
              </Button>
            </DialogFooter>
          </div>

          {/* RIGHT: progress history */}
          {isEdit && (
            <aside className="flex max-h-[90vh] flex-col border-l border-border bg-muted/20">
              <div className="border-b border-border px-5 pb-3 pt-6">
                <h3 className="display text-base">Historial de progreso</h3>
                <div className="mt-1.5 flex items-center gap-2">
                  <p className="eyebrow">Todos los registros</p>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {history.length}
                  </Badge>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {history.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Sin registros de progreso para este proyecto.
                  </p>
                )}

                <ol className="relative space-y-5 border-l border-border pl-5">
                  {history.map((log) => {
                    const author = profiles.find((u) => u.id === log.registrado_por_usuario_id);
                    const isRisk = log.riesgo;
                    return (
                      <li key={log.id} className="relative">
                        <span
                          className={cn(
                            "absolute -left-[26px] top-0.5 grid h-4 w-4 place-items-center rounded-full border bg-background",
                            isRisk
                              ? "border-destructive/50 text-destructive"
                              : "border-border text-muted-foreground"
                          )}
                        >
                          {isRisk ? (
                            <ShieldAlert className="h-2.5 w-2.5" />
                          ) : (
                            <FileText className="h-2.5 w-2.5" />
                          )}
                        </span>

                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-sm font-medium">{author?.nombre ?? "—"}</span>
                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {format(new Date(log.fecha_registro), "d MMM yyyy", { locale: es })}
                          </span>
                          <span className="ml-auto font-display text-sm tabular-nums">
                            {log.porcentaje_progreso}%
                          </span>
                        </div>

                        {(log.explicacion_progreso || log.bloqueadores) && (
                          <div className="mt-2 space-y-1.5">
                            {log.explicacion_progreso && (
                              <div className="flex items-start gap-1.5 rounded-sm bg-background p-2 text-xs leading-relaxed">
                                <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                                <span>{log.explicacion_progreso}</span>
                              </div>
                            )}
                            {log.bloqueadores && (
                              <div className="flex items-start gap-1.5 rounded-sm bg-destructive/5 p-2 text-xs leading-relaxed text-destructive">
                                <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
                                <span>{log.bloqueadores}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </aside>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
