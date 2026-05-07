import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = { id: string; nombre: string; correo_electronico: string; puesto: string | null };
export type Sipoc = { id: number; paso: string; descripcion: string | null; orden: number };
export type EstatusContrato = { id: number; nombre: string; descripcion: string | null };
export type EstatusProyecto = { id: number; nombre: string; descripcion: string | null };
export type Contrato = {
  id: string; titulo: string; nombre_real: string | null; descripcion: string | null;
  fecha_inicio: string | null; fecha_fin: string | null;
  estatus_contrato_id: number | null; sipoc_id: number | null;
};
export type Proyecto = {
  id: string; titulo: string; descripcion: string | null;
  owner_usuario_id: string | null; fecha_inicio: string | null; fecha_fin: string | null;
  estatus_proyecto_id: number | null;
};
export type Progreso = {
  id: string; proyecto_id: string; porcentaje_progreso: number;
  fecha_registro: string; explicacion_progreso: string | null;
  registrado_por_usuario_id: string | null; bloqueadores: string | null;
  riesgo: boolean;
  created_at: string;
};
export type ContratoProyecto = { contrato_id: string; proyecto_id: string };

const fetcher = <T,>(table: string) => async () => {
  const { data, error } = await supabase.from(table as any).select("*");
  if (error) throw error;
  return (data ?? []) as T[];
};

export const useProfiles = () => useQuery({ queryKey: ["profiles"], queryFn: fetcher<Profile>("profiles") });
export const useSipoc = () => useQuery({ queryKey: ["sipoc"], queryFn: fetcher<Sipoc>("sipoc") });
export const useEstatusContrato = () => useQuery({ queryKey: ["estatus_contrato"], queryFn: fetcher<EstatusContrato>("estatus_contrato") });
export const useEstatusProyecto = () => useQuery({ queryKey: ["estatus_proyecto"], queryFn: fetcher<EstatusProyecto>("estatus_proyecto") });
export const useContratos = () => useQuery({ queryKey: ["contratos"], queryFn: fetcher<Contrato>("contratos") });
export const useProyectos = () => useQuery({ queryKey: ["proyectos"], queryFn: fetcher<Proyecto>("proyectos") });
export const useProgreso = () => useQuery({
  queryKey: ["progreso"],
  queryFn: async () => {
    const { data, error } = await supabase.from("progreso").select("*").order("fecha_registro", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Progreso[];
  },
});
export const useContratosProyectos = () => useQuery({
  queryKey: ["contratos_proyectos"],
  queryFn: fetcher<ContratoProyecto>("contratos_proyectos"),
});

// Helper: latest progress per project
export const getLatestProgress = (logs: Progreso[]) => {
  const map = new Map<string, Progreso>();
  for (const log of logs) {
    const cur = map.get(log.proyecto_id);
    if (!cur || new Date(log.fecha_registro) > new Date(cur.fecha_registro)) map.set(log.proyecto_id, log);
  }
  return map;
};

// Risk: blockers OR no progress in 14d OR overdue (past fecha_fin and progress < 100)
export const isProjectAtRisk = (p: Proyecto, latest?: Progreso): { risk: boolean; reasons: string[] } => {
  const reasons: string[] = [];
  if (latest?.bloqueadores) reasons.push("Tiene bloqueadores activos");
  const now = new Date();
  if (latest) {
    const days = (now.getTime() - new Date(latest.fecha_registro).getTime()) / (1000 * 60 * 60 * 24);
    if (days > 14) reasons.push(`Sin avance hace ${Math.floor(days)} días`);
  } else {
    reasons.push("Sin registros de avance");
  }
  if (p.fecha_fin && new Date(p.fecha_fin) < now && (latest?.porcentaje_progreso ?? 0) < 100) {
    reasons.push("Vencido sin completar");
  }
  return { risk: reasons.length > 0, reasons };
};
