import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandMark";

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [puesto, setPuesto] = useState("");

  useEffect(() => { if (user) navigate("/", { replace: true }); }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { nombre, puesto },
          },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Iniciando sesión…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground md:flex">
        <BrandMark />
        <div>
          <p className="eyebrow text-sidebar-foreground/60">Operaciones internas</p>
          <h2 className="display mt-4 text-5xl leading-[1.05] text-sidebar-primary">
            Visibilidad ejecutiva sobre cada contrato y cada proyecto.
          </h2>
          <p className="mt-6 max-w-md text-sm text-sidebar-foreground/70">
            Identifica qué avanza, qué está bloqueado y quién está dejando huella.
          </p>
        </div>
        <div className="brand-bars-light h-12 w-3/4" />
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8"><BrandMark /></div>
          <p className="eyebrow">{mode === "login" ? "Acceder" : "Nueva cuenta"}</p>
          <h1 className="display mt-2 text-3xl">
            {mode === "login" ? "Inicia sesión" : "Crear acceso"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "login" ? "Ingresa con tu correo corporativo." : "Registra tu acceso al panel."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <Label htmlFor="nombre">Nombre completo</Label>
                  <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="puesto">Puesto</Label>
                  <Input id="puesto" value={puesto} onChange={(e) => setPuesto(e.target.value)} className="mt-1.5" />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1.5" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : mode === "login" ? "Entrar" : "Crear cuenta"}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-2">
            {mode === "login" && (
              <button
                type="button"
                onClick={async () => {
                  if (!email) return toast.error("Ingresa tu correo primero");
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) toast.error(error.message);
                  else toast.success("Te enviamos un enlace para restablecer tu contraseña");
                }}
                className="text-xs text-muted-foreground hover:text-foreground text-left"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-xs text-muted-foreground hover:text-foreground text-left"
            >
              {mode === "login" ? "¿No tienes acceso? Crea una cuenta" : "Ya tengo cuenta · Iniciar sesión"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
