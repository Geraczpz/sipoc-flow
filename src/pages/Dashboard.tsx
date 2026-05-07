import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useContratos, useProyectos, useProgreso, useEstatusProyecto, useEstatusContrato,
  useSipoc, useProfiles, getLatestProgress, isProjectAtRisk,
} from "@/hooks/useData";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from "recharts";
import { AlertTriangle, TrendingUp, Users, Briefcase } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ProgresoSidePanel } from "@/components/ProgresoSidePanel";

const Stat = ({ label, value, sub, icon: Icon, onClick }: { label: string; value: string | number; sub?: string; icon: any; onClick?: () => void }) => (
  <Card
    onClick={onClick}
    className={`border-border/80 p-6 ${onClick ? "cursor-pointer transition-colors hover:bg-accent/40" : ""}`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="eyebrow">{label}</p>
        <p className="display mt-3 text-4xl text-foreground">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </div>
      <div className="rounded-sm bg-secondary p-2">
        <Icon className="h-4 w-4 text-foreground" strokeWidth={1.6} />
      </div>
    </div>
  </Card>
);

type DetailKey = "contratos" | "enCurso" | "sinAvance" | "riesgo";

const Dashboard = () => {
  const { data: contratos = [] } = useContratos();
  const { data: proyectos = [] } = useProyectos();
  const { data: progreso = [] } = useProgreso();
  const { data: estatusProy = [] } = useEstatusProyecto();
  const { data: estatusCont = [] } = useEstatusContrato();
  const { data: sipoc = [] } = useSipoc();
  const { data: profiles = [] } = useProfiles();

  const latest = useMemo(() => getLatestProgress(progreso), [progreso]);

  // Contratos activos: SIPOC en pasos 3, 4 o 5 (por orden)
  const contratosActivosCount = useMemo(() => {
    const activeSipocIds = new Set(sipoc.filter((s) => [3, 4, 5].includes(s.orden)).map((s) => s.id));
    return contratos.filter((c) => c.sipoc_id != null && activeSipocIds.has(c.sipoc_id)).length;
  }, [contratos, sipoc]);

  // Proyectos en curso: estatus Planeación, En curso o Bloqueado
  const proyectosEnCursoCount = useMemo(() => {
    const targets = new Set(["Planeación", "En curso", "Bloqueado"]);
    const ids = new Set(estatusProy.filter((e) => targets.has(e.nombre)).map((e) => e.id));
    return proyectos.filter((p) => p.estatus_proyecto_id != null && ids.has(p.estatus_proyecto_id)).length;
  }, [proyectos, estatusProy]);

  // Proyectos sin avance: sin registro de progreso en los últimos 8 días
  const proyectosSinAvanceCount = useMemo(() => {
    const cutoff = Date.now() - 8 * 24 * 60 * 60 * 1000;
    return proyectos.filter((p) => {
      const lp = latest.get(p.id);
      if (!lp) return true;
      return new Date(lp.fecha_registro).getTime() < cutoff;
    }).length;
  }, [proyectos, latest]);

  // Proyectos en riesgo: con al menos un registro marcado como riesgo
  const proyectosEnRiesgoIds = useMemo(() => {
    const ids = new Set<string>();
    for (const log of progreso) if (log.riesgo) ids.add(log.proyecto_id);
    return ids;
  }, [progreso]);

  const risks = useMemo(
    () =>
      proyectos
        .filter((p) => proyectosEnRiesgoIds.has(p.id))
        .map((p) => {
          const lp = latest.get(p.id);
          const reasons: string[] = ["Marcado en riesgo"];
          if (lp?.bloqueadores) reasons.push("Tiene bloqueadores");
          return { p, reasons };
        }),
    [proyectos, proyectosEnRiesgoIds, latest]
  );

  const [detail, setDetail] = useState<DetailKey | null>(null);

  const sipocById = useMemo(() => new Map(sipoc.map((s) => [s.id, s])), [sipoc]);
  const estatusContById = useMemo(() => new Map(estatusCont.map((e) => [e.id, e])), [estatusCont]);
  const estatusProyById = useMemo(() => new Map(estatusProy.map((e) => [e.id, e])), [estatusProy]);
  const profileById = useMemo(() => new Map(profiles.map((u) => [u.id, u])), [profiles]);

  const detailContratos = useMemo(() => {
    const activeSipocIds = new Set(sipoc.filter((s) => [3, 4, 5].includes(s.orden)).map((s) => s.id));
    return contratos.filter((c) => c.sipoc_id != null && activeSipocIds.has(c.sipoc_id));
  }, [contratos, sipoc]);

  const detailEnCurso = useMemo(() => {
    const targets = new Set(["Planeación", "En curso", "Bloqueado"]);
    const ids = new Set(estatusProy.filter((e) => targets.has(e.nombre)).map((e) => e.id));
    return proyectos.filter((p) => p.estatus_proyecto_id != null && ids.has(p.estatus_proyecto_id));
  }, [proyectos, estatusProy]);

  const detailSinAvance = useMemo(() => {
    const cutoff = Date.now() - 8 * 24 * 60 * 60 * 1000;
    return proyectos
      .map((p) => ({ p, lp: latest.get(p.id) }))
      .filter(({ lp }) => !lp || new Date(lp.fecha_registro).getTime() < cutoff);
  }, [proyectos, latest]);

  const detailMeta: Record<DetailKey, { title: string; description: string }> = {
    contratos: { title: "Contratos activos", description: "Contratos en pasos SIPOC 3, 4 o 5." },
    enCurso: { title: "Proyectos en curso", description: "Proyectos en Planeación, En curso o Bloqueado." },
    sinAvance: { title: "Proyectos sin avance", description: "Sin registro de progreso en los últimos 8 días." },
    riesgo: { title: "Proyectos en riesgo", description: "Proyectos con registros marcados como riesgo." },
  };

  const projectStatusData = useMemo(() => {
    return estatusProy.map((s) => ({
      name: s.nombre,
      value: proyectos.filter((p) => p.estatus_proyecto_id === s.id).length,
    }));
  }, [estatusProy, proyectos]);

  const sipocData = useMemo(
    () =>
      sipoc.sort((a, b) => a.orden - b.orden).map((s) => ({
        name: s.paso,
        value: contratos.filter((c) => c.sipoc_id === s.id).length,
      })),
    [sipoc, contratos]
  );

  const userActivity = useMemo(() => {
    const days30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return profiles.map((u) => {
      const logs = progreso.filter(
        (l) => l.registrado_por_usuario_id === u.id && new Date(l.fecha_registro).getTime() >= days30
      );
      return { user: u, count: logs.length, last: logs[0] };
    }).sort((a, b) => b.count - a.count);
  }, [profiles, progreso]);

  const STATUS_COLORS: Record<string, string> = {
    "Planeación": "hsl(var(--chart-5))",
    "En curso": "hsl(var(--chart-2))",
    "Bloqueado": "hsl(var(--chart-4))",
    "Completado": "hsl(var(--success))",
    "Cancelado": "hsl(var(--muted-foreground))",
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Panel ejecutivo"
        title="Pulso de la operación"
        description="Indicadores clave, distribución de contratos por etapa SIPOC, riesgos vivos y nivel de actividad del equipo."
        actions={<ProgresoSidePanel />}
      />

      <div className="space-y-8 px-6 py-8 md:px-10 md:py-10">
        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Contratos activos" value={contratosActivosCount}
            sub={`de ${contratos.length} totales · SIPOC 3-5`} icon={Briefcase} onClick={() => setDetail("contratos")} />
          <Stat label="Proyectos en curso" value={proyectosEnCursoCount}
            sub={`${proyectos.length} totales`} icon={TrendingUp} onClick={() => setDetail("enCurso")} />
          <Stat label="Proyectos sin avance" value={proyectosSinAvanceCount} sub="Sin registro hace 8+ días" icon={AlertTriangle} onClick={() => setDetail("sinAvance")} />
          <Stat label="Proyectos en riesgo" value={risks.length} sub="Marcados como riesgo" icon={AlertTriangle} onClick={() => setDetail("riesgo")} />
        </div>

        {/* Estatus + Atención */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <p className="eyebrow">Estatus</p>
            <h3 className="display mt-2 text-xl">Proyectos</h3>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectStatusData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 4, fontSize: 12 }}
                  />
                  <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                    {projectStatusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "hsl(var(--muted-foreground))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {projectStatusData.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[s.name] }} />
                    <span className="text-muted-foreground">{s.name}</span>
                  </div>
                  <span className="font-medium tabular-nums">{s.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Atención</p>
                <h3 className="display mt-2 text-xl">Proyectos en riesgo</h3>
              </div>
              <Badge variant="outline" className="gap-1 border-destructive/30 text-destructive">
                <AlertTriangle className="h-3 w-3" /> {risks.length}
              </Badge>
            </div>
            <div className="mt-5 space-y-3">
              {risks.length === 0 && <p className="text-sm text-muted-foreground">Sin alertas activas.</p>}
              {risks.slice(0, 6).map(({ p, reasons }) => {
                const lp = latest.get(p.id);
                return (
                  <div key={p.id} className="border-l-2 border-destructive/70 pl-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{p.titulo}</p>
                      <span className="text-xs tabular-nums text-muted-foreground">{lp?.porcentaje_progreso ?? 0}%</span>
                    </div>
                    <p className="mt-0.5 text-xs text-destructive/90">{reasons.join(" · ")}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Avance (alto) + Equipo / Distribución */}
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <Card className="p-6">
            <p className="eyebrow">Avance</p>
            <h3 className="display mt-2 text-xl">Proyectos · estado actual</h3>
            <div className="mt-5 grid gap-4">
              {proyectos.map((p) => {
                const lp = latest.get(p.id);
                const pct = lp?.porcentaje_progreso ?? 0;
                const status = estatusProy.find((e) => e.id === p.estatus_proyecto_id)?.nombre;
                return (
                  <div key={p.id} className="rounded-sm border border-border/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.titulo}</p>
                        <p className="text-xs text-muted-foreground">{status}</p>
                      </div>
                      <span className="font-display text-lg tabular-nums">{pct}%</span>
                    </div>
                    <Progress value={pct} className="mt-3 h-1" />
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {lp ? `Última actualización ${format(new Date(lp.fecha_registro), "d MMM", { locale: es })}` : "Sin registros"}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow">Equipo</p>
                  <h3 className="display mt-2 text-xl">Actividad de usuarios (30 días)</h3>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-5 space-y-3">
                {userActivity.map(({ user, count, last }) => (
                  <div key={user.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{user.nombre}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.puesto}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg tabular-nums">{count}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {last ? formatDistanceToNow(new Date(last.fecha_registro), { locale: es, addSuffix: true }) : "sin registros"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <p className="eyebrow">Distribución</p>
              <h3 className="display mt-2 text-xl">Contratos por paso SIPOC</h3>
              <div className="mt-6" style={{ height: Math.max(220, sipocData.length * 44) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sipocData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={140} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 4, fontSize: 12 }} />
                    <Bar dataKey="value" fill="hsl(var(--foreground))" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detailMeta[detail].title}</DialogTitle>
                <DialogDescription>{detailMeta[detail].description}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-3">
                <div className="space-y-2">
                  {detail === "contratos" && detailContratos.map((c) => {
                    const sp = c.sipoc_id != null ? sipocById.get(c.sipoc_id) : null;
                    const st = c.estatus_contrato_id != null ? estatusContById.get(c.estatus_contrato_id) : null;
                    return (
                      <div key={c.id} className="rounded-sm border border-border/80 p-3">
                        <p className="text-sm font-medium">{c.titulo}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {sp ? `SIPOC ${sp.orden} · ${sp.paso}` : "Sin paso SIPOC"}{st ? ` · ${st.nombre}` : ""}
                        </p>
                      </div>
                    );
                  })}
                  {detail === "enCurso" && detailEnCurso.map((p) => {
                    const st = p.estatus_proyecto_id != null ? estatusProyById.get(p.estatus_proyecto_id) : null;
                    const lp = latest.get(p.id);
                    const owner = p.owner_usuario_id ? profileById.get(p.owner_usuario_id) : null;
                    return (
                      <div key={p.id} className="rounded-sm border border-border/80 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">{p.titulo}</p>
                          <span className="text-xs tabular-nums text-muted-foreground">{lp?.porcentaje_progreso ?? 0}%</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {st?.nombre ?? "Sin estatus"} · Owner: {owner?.nombre ?? "Sin asignar"}
                        </p>
                      </div>
                    );
                  })}
                  {detail === "sinAvance" && detailSinAvance.map(({ p, lp }) => {
                    const owner = p.owner_usuario_id ? profileById.get(p.owner_usuario_id) : null;
                    return (
                      <div key={p.id} className="rounded-sm border border-border/80 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">{p.titulo}</p>
                          <span className="text-xs text-muted-foreground">Owner: {owner?.nombre ?? "Sin asignar"}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {lp
                            ? `Último registro ${formatDistanceToNow(new Date(lp.fecha_registro), { locale: es, addSuffix: true })} · ${format(new Date(lp.fecha_registro), "d MMM yyyy", { locale: es })}`
                            : "Sin registros de avance"}
                        </p>
                      </div>
                    );
                  })}
                  {detail === "riesgo" && risks.map(({ p, reasons }) => {
                    const lp = latest.get(p.id);
                    const owner = p.owner_usuario_id ? profileById.get(p.owner_usuario_id) : null;
                    return (
                      <div key={p.id} className="rounded-sm border border-destructive/40 bg-destructive/5 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">{p.titulo}</p>
                          <Badge variant="outline" className="border-destructive/40 text-destructive">
                            {lp?.porcentaje_progreso ?? 0}%
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Owner: {owner?.nombre ?? "Sin asignar"}</p>
                        <p className="mt-1 text-xs text-destructive/90">{reasons.join(" · ")}</p>
                      </div>
                    );
                  })}
                  {((detail === "contratos" && detailContratos.length === 0) ||
                    (detail === "enCurso" && detailEnCurso.length === 0) ||
                    (detail === "sinAvance" && detailSinAvance.length === 0) ||
                    (detail === "riesgo" && risks.length === 0)) && (
                    <p className="py-8 text-center text-sm text-muted-foreground">Sin registros.</p>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
