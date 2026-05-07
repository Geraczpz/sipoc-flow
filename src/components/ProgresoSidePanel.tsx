import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useContratos, useProyectos, useProgreso, useProfiles, useContratosProyectos,
  type Progreso,
} from "@/hooks/useData";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, ShieldAlert, MessageSquare, History } from "lucide-react";

export const ProgresoSidePanel = () => {
  const { data: progreso = [] } = useProgreso();
  const { data: proyectos = [] } = useProyectos();
  const { data: contratos = [] } = useContratos();
  const { data: profiles = [] } = useProfiles();
  const { data: cp = [] } = useContratosProyectos();

  const [selected, setSelected] = useState<Progreso | null>(null);

  const projectToContract = useMemo(() => {
    const m = new Map<string, string>();
    for (const link of cp) if (!m.has(link.proyecto_id)) m.set(link.proyecto_id, link.contrato_id);
    return m;
  }, [cp]);

  const sorted = useMemo(
    () =>
      [...progreso].sort(
        (a, b) => new Date(b.fecha_registro).getTime() - new Date(a.fecha_registro).getTime()
      ),
    [progreso]
  );

  const proj = selected ? proyectos.find((p) => p.id === selected.proyecto_id) : null;
  const contractId = selected ? projectToContract.get(selected.proyecto_id) : null;
  const contract = contractId ? contratos.find((c) => c.id === contractId) : null;
  const author = selected ? profiles.find((u) => u.id === selected.registrado_por_usuario_id) : null;

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <History className="h-4 w-4" />
            Historial de progreso
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle className="display text-xl">Historial de progreso</SheetTitle>
            <p className="eyebrow flex items-center gap-2">
              Todos los registros
              <Badge variant="secondary" className="rounded-sm font-mono text-[10px]">
                {sorted.length}
              </Badge>
            </p>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="divide-y divide-border">
              {sorted.length === 0 && (
                <p className="p-6 text-sm text-muted-foreground">Sin registros aún.</p>
              )}
              {sorted.map((log) => {
                const p = proyectos.find((x) => x.id === log.proyecto_id);
                const cId = projectToContract.get(log.proyecto_id);
                const c = cId ? contratos.find((x) => x.id === cId) : null;
                const a = profiles.find((u) => u.id === log.registrado_por_usuario_id);
                return (
                  <button
                    key={log.id}
                    onClick={() => setSelected(log)}
                    className="block w-full px-6 py-4 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {c?.titulo ?? "Sin contrato"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {p?.titulo ?? "—"}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                          {a?.nombre ?? "—"} · {format(new Date(log.fecha_registro), "d MMM yyyy", { locale: es })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-display text-base tabular-nums">
                          {log.porcentaje_progreso}%
                        </span>
                        {log.riesgo && (
                          <Badge variant="outline" className="gap-1 border-destructive/40 bg-destructive/10 text-[10px] text-destructive">
                            <ShieldAlert className="h-3 w-3" /> Riesgo
                          </Badge>
                        )}
                      </div>
                    </div>
                    {log.explicacion_progreso && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-foreground/80">
                        <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                        <p className="line-clamp-2">{log.explicacion_progreso}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <p className="eyebrow">{contract?.titulo ?? "Sin contrato"}</p>
                <DialogTitle className="display text-xl">{proj?.titulo ?? "—"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    {author?.nombre ?? "—"} · {format(new Date(selected.fecha_registro), "d MMMM yyyy", { locale: es })}
                  </div>
                  <div className="flex items-center gap-2">
                    {selected.riesgo && (
                      <Badge variant="outline" className="gap-1 border-destructive/40 bg-destructive/10 text-destructive">
                        <ShieldAlert className="h-3 w-3" /> Riesgo
                      </Badge>
                    )}
                    <span className="font-display text-2xl tabular-nums">
                      {selected.porcentaje_progreso}%
                    </span>
                  </div>
                </div>
                <Progress value={selected.porcentaje_progreso} className="h-1" />

                {selected.explicacion_progreso && (
                  <div>
                    <p className="eyebrow">Explicación</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                      {selected.explicacion_progreso}
                    </p>
                  </div>
                )}

                {selected.bloqueadores && (
                  <div>
                    <p className="eyebrow">Bloqueadores</p>
                    <div className="mt-2 flex items-start gap-2 rounded-sm bg-destructive/5 p-3 text-sm text-destructive">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p className="whitespace-pre-wrap">{selected.bloqueadores}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
