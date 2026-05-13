import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, FolderKanban, LineChart, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/contratos", label: "Proyectos", icon: FileText },
  { to: "/proyectos", label: "Tareas", icon: FolderKanban },
  { to: "/progreso", label: "Progreso", icon: LineChart },
];

export const AppLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate("/auth"); };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="px-6 pt-7 pb-8">
          <BrandMark />
        </div>
        <div className="px-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/50">
            Operación
          </p>
          <nav className="flex flex-col gap-0.5">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  }`
                }
              >
                <Icon className="h-4 w-4" strokeWidth={1.6} />
                <span className="font-medium">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-sm bg-sidebar-accent/50 p-4">
            <div className="brand-bars-light mb-3 h-3 w-12" />
            <p className="text-xs text-sidebar-foreground/70">Sesión activa</p>
            <p className="mt-1 truncate font-display text-sm text-sidebar-primary">
              {profile?.nombre ?? "Usuario"}
            </p>
            <p className="truncate text-[11px] text-sidebar-foreground/60">{profile?.puesto ?? "—"}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="mt-3 h-8 w-full justify-start gap-2 px-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-primary"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="text-xs">Cerrar sesión</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex w-full flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
          <BrandMark />
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-8 px-2 text-sidebar-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <div className="flex md:hidden gap-1 overflow-x-auto border-b border-border bg-sidebar px-2 pb-2">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1.5 text-xs ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70"
                }`
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </NavLink>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
