
-- =========================
-- PROFILES (replaces "usuarios", linked to auth.users)
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  correo_electronico TEXT NOT NULL UNIQUE,
  puesto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles visible to authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, correo_electronico, puesto)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'puesto'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- CATALOGS
-- =========================
CREATE TABLE public.sipoc (
  id SERIAL PRIMARY KEY,
  paso TEXT NOT NULL,
  descripcion TEXT,
  orden INT NOT NULL DEFAULT 0
);
ALTER TABLE public.sipoc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sipoc readable" ON public.sipoc FOR SELECT TO authenticated USING (true);

CREATE TABLE public.estatus_contrato (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT
);
ALTER TABLE public.estatus_contrato ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ec readable" ON public.estatus_contrato FOR SELECT TO authenticated USING (true);

CREATE TABLE public.estatus_proyecto (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT
);
ALTER TABLE public.estatus_proyecto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ep readable" ON public.estatus_proyecto FOR SELECT TO authenticated USING (true);

-- =========================
-- CONTRATOS
-- =========================
CREATE TABLE public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  estatus_contrato_id INT REFERENCES public.estatus_contrato(id),
  sipoc_id INT REFERENCES public.sipoc(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contratos read" ON public.contratos FOR SELECT TO authenticated USING (true);
CREATE POLICY "contratos write" ON public.contratos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "contratos update" ON public.contratos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "contratos delete" ON public.contratos FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_contratos_updated BEFORE UPDATE ON public.contratos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- PROYECTOS
-- =========================
CREATE TABLE public.proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  owner_usuario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  fecha_inicio DATE,
  fecha_fin DATE,
  estatus_proyecto_id INT REFERENCES public.estatus_proyecto(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proyectos read" ON public.proyectos FOR SELECT TO authenticated USING (true);
CREATE POLICY "proyectos insert" ON public.proyectos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "proyectos update" ON public.proyectos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "proyectos delete" ON public.proyectos FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_proyectos_updated BEFORE UPDATE ON public.proyectos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- PROGRESO
-- =========================
CREATE TABLE public.progreso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  porcentaje_progreso INT NOT NULL CHECK (porcentaje_progreso BETWEEN 0 AND 100),
  fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  explicacion_progreso TEXT,
  registrado_por_usuario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  bloqueadores TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.progreso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progreso read" ON public.progreso FOR SELECT TO authenticated USING (true);
CREATE POLICY "progreso insert own" ON public.progreso FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = registrado_por_usuario_id);
CREATE POLICY "progreso update own" ON public.progreso FOR UPDATE TO authenticated
  USING (auth.uid() = registrado_por_usuario_id);
CREATE POLICY "progreso delete own" ON public.progreso FOR DELETE TO authenticated
  USING (auth.uid() = registrado_por_usuario_id);
CREATE INDEX idx_progreso_proyecto ON public.progreso(proyecto_id, fecha_registro DESC);

-- =========================
-- CONTRATOS_PROYECTOS
-- =========================
CREATE TABLE public.contratos_proyectos (
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  PRIMARY KEY (contrato_id, proyecto_id)
);
ALTER TABLE public.contratos_proyectos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp read" ON public.contratos_proyectos FOR SELECT TO authenticated USING (true);
CREATE POLICY "cp insert" ON public.contratos_proyectos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cp delete" ON public.contratos_proyectos FOR DELETE TO authenticated USING (true);

-- =========================
-- SEED CATALOGS
-- =========================
INSERT INTO public.sipoc (paso, descripcion, orden) VALUES
  ('Suppliers', 'Identificación de proveedores y entradas', 1),
  ('Inputs', 'Insumos requeridos para el proceso', 2),
  ('Process', 'Ejecución del proceso', 3),
  ('Outputs', 'Entregables del proceso', 4),
  ('Customers', 'Clientes / beneficiarios finales', 5);

INSERT INTO public.estatus_contrato (nombre, descripcion) VALUES
  ('Borrador', 'En definición'),
  ('Activo', 'En ejecución'),
  ('Pausado', 'Detenido temporalmente'),
  ('Cerrado', 'Finalizado');

INSERT INTO public.estatus_proyecto (nombre, descripcion) VALUES
  ('Planeación', 'En diseño y planeación'),
  ('En curso', 'Ejecutándose'),
  ('Bloqueado', 'Con impedimentos'),
  ('Completado', 'Entregado'),
  ('Cancelado', 'No continuará');
