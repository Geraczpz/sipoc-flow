import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useProyectos, useProgreso, useProfiles } from "@/hooks/useData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, ShieldAlert } from "lucide-react";

const Progreso = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: progreso = [] } = useProgreso();
  const { data: profiles = [] } = useProfiles();

  const [proyectoId, setProyectoId] = useState<string>("");
  const [pct, setPct] = useState<number>(0);
  const [fecha, setFecha] = useState<string>(new Date().toISOString().slice(0, 10));
  const [explicacion, setExplicacion] = useState("");
  const [bloqueadores, setBloqueadores] = useState("");
  const [riesgo, setRiesgo] = useState(false);

  const myProjects = useMemo(
    () => (user ? proyectos.filter((p) => p.owner_usuario_id === user.id) : []),
    [proyectos, user]
  );
  // If user has no assigned projects (e.g., new account), allow logging on any project
  const selectableProjects = myProjects.length > 0 ? myProjects : proyectos;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No autenticado");
      if (!proyectoId) throw new Error("Selecciona un sub proyecto");
      if (riesgo && !bloqueadores.trim()) {
        throw new Error("Si marcas el registro en riesgo, debes describir los bloqueadores.");
      }
      // Ensure profile exists for FK
      await supabase.from("profiles").upsert({
        id: user.id,
        nombre: profile?.nombre ?? user.email?.split("@")[0] ?? "Usuario",
        correo_electronico: user.email!,
        puesto: profile?.puesto ?? null,
      });
      const { error } = await supabase.from("progreso").insert({
        proyecto_id: proyectoId,
        porcentaje_progreso: pct,
        fecha_registro: fecha,
        explicacion_progreso: explicacion || null,
        registrado_por_usuario_id: user.id,
        bloqueadores: bloqueadores || null,
        riesgo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avance registrado");
      qc.invalidateQueries({ queryKey: ["progreso"] });
      setExplicacion(""); setBloqueadores(""); setPct(0); setRiesgo(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al registrar"),
  });

  const recent = progreso.slice(0, 12);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Bitácora"
        title="Registrar avance"
        description="Documenta el porcentaje, lo que se logró y los bloqueadores. Cada registro alimenta el panel ejecutivo."
      />

      <div className="grid gap-8 px-6 py-8 md:grid-cols-5 md:px-10">
        {/* Form */}
        <Card className="p-6 md:col-span-2">
          <h3 className="display text-xl">Nuevo registro</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {myProjects.length > 0
              ? `Tienes ${myProjects.length} proyectos asignados.`
              : "Aún no tienes sub proyectos como owner — puedes registrar en cualquiera."}
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
            className="mt-5 space-y-4"
          >
            <div>
              <Label>Sub Proyecto</Label>
              <Select value={proyectoId} onValueChange={setProyectoId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecciona un sub proyecto" /></SelectTrigger>
                <SelectContent>
                  {selectableProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.titulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <Label htmlFor="pct">Porcentaje de avance</Label>
                <span className="font-display text-lg tabular-nums">{pct}%</span>
              </div>
              <input
                id="pct" type="range" min={0} max={100} step={5}
                value={pct} onChange={(e) => setPct(Number(e.target.value))}
                className="mt-2 w-full accent-foreground"
              />
              <Progress value={pct} className="mt-2 h-1" />
            </div>

            <div>
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="mt-1.5" required />
            </div>

            <div>
              <Label htmlFor="explicacion">Explicación del avance</Label>
              <Textarea id="explicacion" rows={3} value={explicacion} onChange={(e) => setExplicacion(e.target.value)}
                placeholder="Qué se logró desde el último registro" className="mt-1.5" />
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-sm border border-border bg-muted/20 p-3">
              <Checkbox
                checked={riesgo}
                onCheckedChange={(v) => setRiesgo(v === true)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                  Registrar en riesgo
                </span>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Marca este registro como en riesgo. Si lo activas, los bloqueadores son obligatorios.
                </p>
              </div>
            </label>

            <div>
              <Label htmlFor="bloq">
                Bloqueadores {riesgo && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="bloq" rows={2} value={bloqueadores}
                onChange={(e) => setBloqueadores(e.target.value)}
                placeholder={riesgo ? "Describe los bloqueadores (obligatorio)" : "Déjalo vacío si no hay bloqueos"}
                required={riesgo}
                className="mt-1.5"
              />
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending || !proyectoId}>
              {mutation.isPending ? "Guardando…" : "Registrar avance"}
            </Button>
          </form>
        </Card>

        {/* History */}
        <div className="md:col-span-3">
          <h3 className="display text-xl">Bitácora reciente</h3>
          <p className="mt-1 text-xs text-muted-foreground">Últimos registros del equipo.</p>
          <div className="mt-5 space-y-3">
            {recent.map((log) => {
              const proj = proyectos.find((p) => p.id === log.proyecto_id);
              const author = profiles.find((u) => u.id === log.registrado_por_usuario_id);
              return (
                <Card key={log.id} className="border-border/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{proj?.titulo ?? "—"}</p>
                        {log.riesgo && (
                          <Badge variant="outline" className="gap-1 border-destructive/40 bg-destructive/10 text-[10px] text-destructive">
                            <ShieldAlert className="h-3 w-3" /> Riesgo
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {author?.nombre ?? "—"} · {format(new Date(log.fecha_registro), "d MMM yyyy", { locale: es })}
                      </p>
                    </div>
                    <span className="font-display text-lg tabular-nums">{log.porcentaje_progreso}%</span>
                  </div>
                  <Progress value={log.porcentaje_progreso} className="mt-2 h-1" />
                  {log.explicacion_progreso && (
                    <p className="mt-3 text-sm leading-relaxed text-foreground/80">{log.explicacion_progreso}</p>
                  )}
                  {log.bloqueadores && (
                    <div className="mt-2 flex items-start gap-1.5 rounded-sm bg-destructive/5 p-2 text-xs text-destructive">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>{log.bloqueadores}</span>
                    </div>
                  )}
                </Card>
              );
            })}
            {recent.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay registros.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Progreso;
