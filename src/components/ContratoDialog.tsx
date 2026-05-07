import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  type Contrato, useSipoc, useEstatusContrato, useProyectos,
  useContratosProyectos, useProgreso, useProfiles, getLatestProgress,
} from "@/hooks/useData";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, ShieldAlert, MessageSquare, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickProyectoDialog } from "@/components/QuickProyectoDialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contrato: Contrato | null;
};

export const ContratoDialog = ({ open, onOpenChange, contrato }: Props) => {
  const isEdit = !!contrato;
  const qc = useQueryClient();

  const { data: sipoc = [] } = useSipoc();
  const { data: estatus = [] } = useEstatusContrato();
  const { data: proyectos = [] } = useProyectos();
  const { data: cp = [] } = useContratosProyectos();
  const { data: progreso = [] } = useProgreso();
  const { data: profiles = [] } = useProfiles();

  const [titulo, setTitulo] = useState("");
  const [nombreReal, setNombreReal] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [sipocId, setSipocId] = useState<string>("");
  const [estatusId, setEstatusId] = useState<string>("");
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [quickOpen, setQuickOpen] = useState(false);

  const sortedSipoc = useMemo(() => [...sipoc].sort((a, b) => a.orden - b.orden), [sipoc]);
  const latest = useMemo(() => getLatestProgress(progreso), [progreso]);

  useEffect(() => {
    if (!open) return;
    setTitulo(contrato?.titulo ?? "");
    setNombreReal(contrato?.nombre_real ?? "");
    setDescripcion(contrato?.descripcion ?? "");
    setFechaInicio(contrato?.fecha_inicio ?? "");
    setFechaFin(contrato?.fecha_fin ?? "");
    setSipocId(contrato?.sipoc_id ? String(contrato.sipoc_id) : "");
    setEstatusId(contrato?.estatus_contrato_id ? String(contrato.estatus_contrato_id) : "");
    const linked = contrato
      ? new Set(cp.filter((x) => x.contrato_id === contrato.id).map((x) => x.proyecto_id))
      : new Set<string>();
    setSelectedProjects(linked);
  }, [open, contrato, cp]);

  const linkedProjects = useMemo(
    () => proyectos.filter((p) => selectedProjects.has(p.id)),
    [proyectos, selectedProjects]
  );

  const avgPct = useMemo(() => {
    if (linkedProjects.length === 0) return 0;
    const sum = linkedProjects.reduce(
      (a, p) => a + (latest.get(p.id)?.porcentaje_progreso ?? 0), 0
    );
    return Math.round(sum / linkedProjects.length);
  }, [linkedProjects, latest]);

  // Full history of all progress logs from linked projects, newest first
  const history = useMemo(() => {
    const ids = new Set(linkedProjects.map((p) => p.id));
    return progreso
      .filter((g) => ids.has(g.proyecto_id))
      .slice()
      .sort((a, b) => new Date(b.fecha_registro).getTime() - new Date(a.fecha_registro).getTime());
  }, [progreso, linkedProjects]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        titulo: titulo.trim(),
        nombre_real: nombreReal.trim() || null,
        descripcion: descripcion.trim() || null,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        sipoc_id: sipocId ? Number(sipocId) : null,
        estatus_contrato_id: estatusId ? Number(estatusId) : null,
      };
      if (!payload.titulo) throw new Error("El Code name es requerido");

      let contratoId = contrato?.id;
      if (isEdit && contratoId) {
        const { error } = await supabase.from("contratos").update(payload).eq("id", contratoId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("contratos").insert(payload).select("id").single();
        if (error) throw error;
        contratoId = data.id;
      }

      // Sync project links
      const currentLinks = new Set(
        cp.filter((x) => x.contrato_id === contratoId).map((x) => x.proyecto_id)
      );
      const toAdd = [...selectedProjects].filter((id) => !currentLinks.has(id));
      const toRemove = [...currentLinks].filter((id) => !selectedProjects.has(id));

      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("contratos_proyectos")
          .insert(toAdd.map((proyecto_id) => ({ contrato_id: contratoId!, proyecto_id })));
        if (error) throw error;
      }
      for (const proyecto_id of toRemove) {
        const { error } = await supabase
          .from("contratos_proyectos")
          .delete()
          .eq("contrato_id", contratoId!)
          .eq("proyecto_id", proyecto_id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos"] });
      qc.invalidateQueries({ queryKey: ["contratos_proyectos"] });
      toast({ title: isEdit ? "Contrato actualizado" : "Contrato creado" });
      onOpenChange(false);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleProject = (id: string) => {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-h-[90vh] overflow-hidden p-0",
        isEdit ? "max-w-6xl" : "max-w-3xl"
      )}>
        <div className={cn("grid max-h-[90vh]", isEdit && "md:grid-cols-[1fr_380px]")}>
          {/* LEFT: form */}
          <div className="flex max-h-[90vh] flex-col overflow-hidden">
            <div className="overflow-y-auto px-6 pt-6">
        <DialogHeader>
          <p className="eyebrow">{isEdit ? "Editar contrato" : "Nuevo contrato"}</p>
          <DialogTitle className="display text-2xl">
            {isEdit ? (contrato?.nombre_real || contrato?.titulo) : "Crear contrato"}
          </DialogTitle>
          <DialogDescription>
            Define los datos del contrato y asocia los proyectos que lo componen.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="titulo">Code name</Label>
              <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="nombre-real">Nombre real</Label>
              <Input id="nombre-real" value={nombreReal} onChange={(e) => setNombreReal(e.target.value)} className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              className="mt-1.5" rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="fi">Fecha inicio</Label>
              <Input id="fi" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="ff">Fecha fin</Label>
              <Input id="ff" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="mt-1.5" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Etapa SIPOC</Label>
              <Select value={sipocId} onValueChange={setSipocId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>
                  {sortedSipoc.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.orden}. {s.paso}</SelectItem>
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

          {/* Avance promedio */}
          <div className="rounded-sm border border-border bg-muted/30 p-4">
            <div className="flex items-baseline justify-between">
              <p className="eyebrow">Avance promedio del contrato</p>
              <span className="font-display text-2xl tabular-nums">{avgPct}%</span>
            </div>
            <Progress value={avgPct} className="mt-2 h-1.5" />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Promedio del último % de progreso de {linkedProjects.length} proyecto(s) asociado(s).
            </p>
          </div>

          {/* Proyectos asociados */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label>Proyectos asociados</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedProjects.size} seleccionado(s)</Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => setQuickOpen(true)}
                >
                  <Plus className="h-3 w-3" /> Nuevo proyecto
                </Button>
              </div>
            </div>

            {linkedProjects.length > 0 && (
              <div className="mb-3 overflow-hidden rounded-sm border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-normal">Proyecto</th>
                      <th className="px-3 py-2 text-left font-normal">Owner</th>
                      <th className="px-3 py-2 text-right font-normal">% Progreso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkedProjects.map((p) => {
                      const owner = profiles.find((u) => u.id === p.owner_usuario_id);
                      const pct = latest.get(p.id)?.porcentaje_progreso ?? 0;
                      return (
                        <tr key={p.id} className="border-t border-border">
                          <td className="px-3 py-2 font-medium">{p.titulo}</td>
                          <td className="px-3 py-2 text-muted-foreground">{owner?.nombre ?? "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-sm border border-border p-2">
              {proyectos.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedProjects.has(p.id)}
                    onCheckedChange={() => toggleProject(p.id)}
                  />
                  <span className="flex-1">{p.titulo}</span>
                  <span className="text-muted-foreground">
                    {profiles.find((u) => u.id === p.owner_usuario_id)?.nombre ?? "—"}
                  </span>
                </label>
              ))}
              {proyectos.length === 0 && (
                <p className="p-2 text-xs text-muted-foreground">Sin proyectos disponibles.</p>
              )}
            </div>
          </div>
        </div>
            </div>

            <DialogFooter className="border-t border-border bg-card px-6 py-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !titulo.trim()}>
                {mutation.isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear contrato"}
              </Button>
            </DialogFooter>
          </div>

          {/* RIGHT: progress history (only when editing) */}
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
                    Sin registros aún para los proyectos asociados.
                  </p>
                )}

                <ol className="relative space-y-5 border-l border-border pl-5">
                  {history.map((log) => {
                    const proj = proyectos.find((p) => p.id === log.proyecto_id);
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

                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {proj?.titulo ?? "—"}
                        </p>

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
      <QuickProyectoDialog
        open={quickOpen}
        onOpenChange={setQuickOpen}
        onCreated={(id) => setSelectedProjects((prev) => new Set(prev).add(id))}
      />
    </Dialog>
  );
};
