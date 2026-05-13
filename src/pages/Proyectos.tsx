import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  useContratos, useEstatusProyecto, useProyectos, useContratosProyectos,
  useProfiles, useProgreso, getLatestProgress, isProjectAtRisk,
  type Proyecto,
} from "@/hooks/useData";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { LayoutGrid, List, AlertTriangle, Plus, GripVertical } from "lucide-react";
import { ProyectoDialog } from "@/components/ProyectoDialog";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const STATUS_TONE: Record<string, string> = {
  "Planeación": "bg-muted text-foreground/70 border-border",
  "En curso": "bg-accent/15 text-accent-foreground border-accent/40",
  "Bloqueado": "bg-destructive/10 text-destructive border-destructive/30",
  "Completado": "bg-success/10 text-success border-success/30",
  "Cancelado": "bg-foreground/5 text-foreground/60 border-border",
};

const Proyectos = () => {
  const { data: proyectos = [] } = useProyectos();
  const { data: estatus = [] } = useEstatusProyecto();
  const { data: contratos = [] } = useContratos();
  const { data: cp = [] } = useContratosProyectos();
  const { data: profiles = [] } = useProfiles();
  const { data: progreso = [] } = useProgreso();

  const [view, setView] = useState<"list" | "kanban">("list");
  const [contratoFilter, setContratoFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Proyecto | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<number | null>(null);

  const qc = useQueryClient();
  const updateStatus = useMutation({
    mutationFn: async ({ id, estatus_proyecto_id }: { id: string; estatus_proyecto_id: number }) => {
      const { error } = await supabase
        .from("proyectos")
        .update({ estatus_proyecto_id })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, estatus_proyecto_id }) => {
      await qc.cancelQueries({ queryKey: ["proyectos"] });
      const previous = qc.getQueryData<Proyecto[]>(["proyectos"]);
      qc.setQueryData<Proyecto[]>(["proyectos"], (old) =>
        (old ?? []).map((p) => (p.id === id ? { ...p, estatus_proyecto_id } : p))
      );
      return { previous };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(["proyectos"], ctx.previous);
      toast({ title: "Error al mover", description: e.message, variant: "destructive" });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["proyectos"] }),
  });

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: Proyecto) => { setEditing(p); setDialogOpen(true); };

  const latest = useMemo(() => getLatestProgress(progreso), [progreso]);

  const filtered = useMemo(() => {
    return proyectos.filter((p) => {
      if (ownerFilter !== "all" && p.owner_usuario_id !== ownerFilter) return false;
      if (statusFilter !== "all" && String(p.estatus_proyecto_id) !== statusFilter) return false;
      if (contratoFilter !== "all") {
        const inContract = cp.some((x) => x.contrato_id === contratoFilter && x.proyecto_id === p.id);
        if (!inContract) return false;
      }
      return true;
    });
  }, [proyectos, ownerFilter, statusFilter, contratoFilter, cp]);

  // Kanban card (kept for kanban view)
  const renderKanbanCard = (p: Proyecto) => {
    const lp = latest.get(p.id);
    const pct = lp?.porcentaje_progreso ?? 0;
    const status = estatus.find((e) => e.id === p.estatus_proyecto_id)?.nombre ?? "—";
    const owner = profiles.find((u) => u.id === p.owner_usuario_id);
    const risk = isProjectAtRisk(p, lp);

    return (
      <Card
        key={p.id}
        draggable
        onDragStart={(e) => {
          setDraggingId(p.id);
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", p.id);
        }}
        onDragEnd={() => { setDraggingId(null); setDragOverStatus(null); }}
        onClick={() => openEdit(p)}
        className={cn(
          "group cursor-pointer border-border/80 p-4 transition hover:border-foreground/40",
          draggingId === p.id && "opacity-40"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-1.5">
            <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground/50 opacity-0 transition group-hover:opacity-100" />
            <p className="text-sm font-medium leading-snug">{p.titulo}</p>
          </div>
          <Badge variant="outline" className={STATUS_TONE[status] ?? ""}>{status}</Badge>
        </div>
        {risk.risk && (
          <div className="mt-2 flex items-center gap-1 text-[11px] text-destructive">
            <AlertTriangle className="h-3 w-3" /> {risk.reasons[0]}
          </div>
        )}
        <div className="mt-3 flex items-baseline justify-between">
          <p className="eyebrow">Avance</p>
          <span className="font-display text-base tabular-nums">{pct}%</span>
        </div>
        <Progress value={pct} className="mt-1.5 h-1" />
        <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
          <div className="flex justify-between">
            <span>Owner</span><span className="text-foreground">{owner?.nombre ?? "—"}</span>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Portafolio"
        title="Tareas"
        description="Filtra por proyecto, responsable o estatus. Cambia entre vista de lista y tablero según necesites detalle o panorama."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-sm border border-border bg-card p-0.5">
              <Button size="sm" variant={view === "list" ? "default" : "ghost"} onClick={() => setView("list")}
                className="h-7 gap-1.5 px-2 text-xs">
                <List className="h-3.5 w-3.5" /> Lista
              </Button>
              <Button size="sm" variant={view === "kanban" ? "default" : "ghost"} onClick={() => setView("kanban")}
                className="h-7 gap-1.5 px-2 text-xs">
                <LayoutGrid className="h-3.5 w-3.5" /> Kanban
              </Button>
            </div>
            <Button onClick={openNew} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Nuevo sub proyecto
            </Button>
          </div>
        }
      />

      <div className="px-6 py-8 md:px-10">
        {/* Filters */}
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <div>
            <p className="eyebrow mb-1.5">Proyecto</p>
            <Select value={contratoFilter} onValueChange={setContratoFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {contratos.map((c) => <SelectItem key={c.id} value={c.id}>{c.titulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="eyebrow mb-1.5">Responsable</p>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {profiles.map((u) => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="eyebrow mb-1.5">Estatus</p>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {estatus.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {view === "list" ? (
          <Card className="overflow-hidden border-border/80">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[28%]">Tareas</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead className="w-[180px]">Avance</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Pryoecto</TableHead>
                  <TableHead className="text-right">Riesgo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      Sin proyectos con estos filtros.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((p) => {
                  const lp = latest.get(p.id);
                  const pct = lp?.porcentaje_progreso ?? 0;
                  const status = estatus.find((e) => e.id === p.estatus_proyecto_id)?.nombre ?? "—";
                  const owner = profiles.find((u) => u.id === p.owner_usuario_id);
                  const risk = isProjectAtRisk(p, lp);
                  const contractTitles = cp
                    .filter((x) => x.proyecto_id === p.id)
                    .map((x) => contratos.find((c) => c.id === x.contrato_id)?.titulo)
                    .filter(Boolean) as string[];

                  return (
                    <TableRow
                      key={p.id}
                      onClick={() => openEdit(p)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">{p.titulo}</TableCell>
                      <TableCell className="text-muted-foreground">{owner?.nombre ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[11px]", STATUS_TONE[status] ?? "")}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-1 w-24" />
                          <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.fecha_inicio ? format(new Date(p.fecha_inicio), "d MMM yy", { locale: es }) : "—"}
                        {" → "}
                        {p.fecha_fin ? format(new Date(p.fecha_fin), "d MMM yy", { locale: es }) : "—"}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground" title={contractTitles.join(" · ")}>
                        {contractTitles.length > 0 ? contractTitles.join(" · ") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {risk.risk ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-destructive" title={risk.reasons.join(" · ")}>
                            <AlertTriangle className="h-3 w-3" /> {risk.reasons.length}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            {estatus.map((s) => {
              const items = filtered.filter((p) => p.estatus_proyecto_id === s.id);
              const isOver = dragOverStatus === s.id;
              return (
                <div
                  key={s.id}
                  onDragOver={(e) => {
                    if (!draggingId) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverStatus !== s.id) setDragOverStatus(s.id);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    if (dragOverStatus === s.id) setDragOverStatus(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain") || draggingId;
                    setDragOverStatus(null);
                    setDraggingId(null);
                    if (!id) return;
                    const proj = proyectos.find((p) => p.id === id);
                    if (!proj || proj.estatus_proyecto_id === s.id) return;
                    updateStatus.mutate({ id, estatus_proyecto_id: s.id });
                  }}
                  className={cn(
                    "rounded-sm transition",
                    isOver && "bg-accent/10 ring-2 ring-accent/40"
                  )}
                >
                  <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
                    <h3 className="display text-base">{s.nombre}</h3>
                    <span className="font-display text-lg tabular-nums text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="min-h-[80px] space-y-3 p-1">
                    {items.length === 0 && (
                      <div className="rounded-sm border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                        {isOver ? "Soltar aquí" : "Vacío"}
                      </div>
                    )}
                    {items.map(renderKanbanCard)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ProyectoDialog open={dialogOpen} onOpenChange={setDialogOpen} proyecto={editing} />
    </div>
  );
};

export default Proyectos;
