import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandMark";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ready, setReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // 1) Errors returned in the hash (e.g. expired link)
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const hashError = hashParams.get("error_description") || hashParams.get("error");
      if (hashError) {
        setErrorMsg(decodeURIComponent(hashError.replace(/\+/g, " ")));
        return;
      }

      // 2) PKCE / OTP style: ?code=... or ?token_hash=...&type=recovery
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = (searchParams.get("type") as any) || "recovery";

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          setErrorMsg(error.message);
          return;
        }
        setReady(true);
        return;
      }

      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
        if (cancelled) return;
        if (error) {
          setErrorMsg(error.message);
          return;
        }
        setReady(true);
        return;
      }

      // 3) Implicit flow: tokens already parsed by supabase-js into a session
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) setReady(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    init();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Mínimo 6 caracteres");
    if (password !== confirm) return toast.error("Las contraseñas no coinciden");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Contraseña actualizada");
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <BrandMark />
        <p className="eyebrow mt-8">Recuperación</p>
        <h1 className="display mt-2 text-3xl">Nueva contraseña</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {errorMsg
            ? errorMsg
            : ready
            ? "Define tu nueva contraseña."
            : "Validando enlace…"}
        </p>

        {ready && !errorMsg && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="confirm">Confirmar contraseña</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} className="mt-1.5" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : "Actualizar contraseña"}
            </Button>
          </form>
        )}

        {errorMsg && (
          <Button className="mt-6 w-full" variant="outline" onClick={() => navigate("/auth")}>
            Volver e intentar de nuevo
          </Button>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
