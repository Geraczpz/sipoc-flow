import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus } from "lucide-react";
import { ContratoDialog } from "@/components/ContratoDialog";
import {
  useContratos, useSipoc, useEstatusContrato, useProyectos,
  useContratosProyectos, useProgreso, getLatestProgress,
  type Contrato,
} from "@/hooks/useData";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDraggable, useDroppable,
  closestCenter,
} from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  Activo: "bg-success/10 text-success border-success/30",
  Borrador: "bg-muted text-muted-foreground border-border",
  Pausado: "bg-warning/10 text-warning border-warning/30",
  Cerrado: "bg-foreground/5 text-foreground/70 border-border",
};

type CardData = {
  contrato: Contrato;
  status: string;
  pct: number;
  projectsCount: number;
};

const ContratoCard = ({ data, dragging }: { data: CardData; dragging?: boolean }) => {
  const { contrato: c, status, pct, projectsCount } = data;
  return (
    <Card className={cn("border-border/80 p-4 transition", dragging && "shadow-lg ring-1 ring-foreground/30")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{c.titulo}</p>
        <Badge variant="outline" className={STATUS_TONE[status] ?? ""}>{status}</Badge>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <p className="eyebrow">Avance</p>
        <span className="font-display text-base tabular-nums">{pct}%</span>
      </div>
      <Progress value={pct} className="mt-1.5 h-1" />
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {c.fecha_inicio ? format(new Date(c.fecha_inicio), "d MMM yy", { locale: es }) : "—"}
          {" → "}
          {c.fecha_fin ? format(new Date(c.fecha_fin), "d MMM yy", { locale: es }) : "—"}
        </span>
        <span>{projectsCount} proy.</span>
      </div>
    </Card>
  );
};

const DraggableCard = ({ data, onOpen }: { data: CardData; onOpen: () => void }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: data.contrato.id,
    data: { sipocId: data.contrato.sipoc_id },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // Only treat as click if not dragging
        if (!isDragging) onOpen();
      }}
      className={cn(
        "cursor-pointer touch-none active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <ContratoCard data={data} />
    </div>
  );
};

const DroppableColumn = ({
  id, children, isOver,
}: { id: number; children: React.ReactNode; isOver: boolean }) => {
  const { setNodeRef } = useDroppable({ id: `col-${id}`, data: { sipocId: id } });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[120px] space-y-3 rounded-sm p-1 -m-1 transition-colors",
        isOver && "bg-accent/30 ring-1 ring-foreground/20"
      )}
    >
      {children}
    </div>
  );
};

const Contratos = () => {
  const { data: contratos = [] } = useContratos();
  const { data: sipoc = [] } = useSipoc();
  const { data: estatus = [] } = useEstatusContrato();
  const { data: cp = [] } = useContratosProyectos();
  const { data: progreso = [] } = useProgreso();
  const qc = useQueryClient();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contrato | null>(null);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (c: Contrato) => { setEditing(c); setDialogOpen(true); };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const latest = useMemo(() => getLatestProgress(progreso), [progreso]);
  const sortedSipoc = useMemo(() => [...sipoc].sort((a, b) => a.orden - b.orden), [sipoc]);

  const mutation = useMutation({
    mutationFn: async ({ id, sipoc_id }: { id: string; sipoc_id: number }) => {
      const { error } = await supabase.from("contratos").update({ sipoc_id }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, sipoc_id }) => {
      await qc.cancelQueries({ queryKey: ["contratos"] });
      const prev = qc.getQueryData<Contrato[]>(["contratos"]);
      qc.setQueryData<Contrato[]>(["contratos"], (old = []) =>
        old.map((c) => (c.id === id ? { ...c, sipoc_id } : c))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["contratos"], ctx.prev);
      toast({ title: "No se pudo mover el contrato", variant: "destructive" });
    },
    onSuccess: () => toast({ title: "Contrato actualizado" }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["contratos"] }),
  });

  const buildCard = (c: Contrato): CardData => {
    const status = estatus.find((e) => e.id === c.estatus_contrato_id)?.nombre ?? "—";
    const projectIds = cp.filter((x) => x.contrato_id === c.id).map((x) => x.proyecto_id);
    const pct = projectIds.length === 0 ? 0 : Math.round(
      projectIds.reduce((a, pid) => a + (latest.get(pid)?.porcentaje_progreso ?? 0), 0) / projectIds.length
    );
    return { contrato: c, status, pct, projectsCount: projectIds.length };
  };

  const activeCard = activeId ? buildCard(contratos.find((c) => c.id === activeId)!) : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    setOverCol(null);
    const overSipoc = e.over?.data.current?.sipocId as number | undefined;
    const fromSipoc = e.active.data.current?.sipocId as number | undefined;
    if (overSipoc && overSipoc !== fromSipoc) {
      mutation.mutate({ id: String(e.active.id), sipoc_id: overSipoc });
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Tablero"
        title="Contratos por etapa SIPOC"
        description="Arrastra los contratos entre columnas para mover su etapa, o haz clic para editar."
        actions={
          <Button onClick={openNew} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Nuevo contrato
          </Button>
        }
      />

      <div className="px-6 py-8 md:px-10">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={(e) => {
            const sid = e.over?.data.current?.sipocId as number | undefined;
            setOverCol(sid ?? null);
          }}
          onDragEnd={handleDragEnd}
          onDragCancel={() => { setActiveId(null); setOverCol(null); }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {sortedSipoc.map((step) => {
              const items = contratos.filter((c) => c.sipoc_id === step.id);
              return (
                <div key={step.id} className="flex flex-col">
                  <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <p className="eyebrow">Paso {step.orden}</p>
                      <h3 className="display mt-1 text-base">{step.paso}</h3>
                    </div>
                    <span className="font-display text-lg tabular-nums text-muted-foreground">{items.length}</span>
                  </div>
                  <DroppableColumn id={step.id} isOver={overCol === step.id}>
                    {items.length === 0 && (
                      <div className="rounded-sm border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                        Sin contratos
                      </div>
                    )}
                    {items.map((c) => (
                      <DraggableCard key={c.id} data={buildCard(c)} onOpen={() => openEdit(c)} />
                    ))}
                  </DroppableColumn>
                </div>
              );
            })}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeCard ? (
              <div className="w-[280px] rotate-1">
                <ContratoCard data={activeCard} dragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <ContratoDialog open={dialogOpen} onOpenChange={setDialogOpen} contrato={editing} />
    </div>
  );
};

export default Contratos;
