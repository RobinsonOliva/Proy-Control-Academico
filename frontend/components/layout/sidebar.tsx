"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, GraduationCap, School, BookOpen, Users,
  ClipboardList, Award, BarChart3, UserCog, Search, ChevronRight, X, Settings
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Grados", href: "/grados", icon: GraduationCap },
  { label: "Aulas", href: "/aulas", icon: School },
  { label: "Cursos", href: "/cursos", icon: BookOpen },
  { label: "Alumnos", href: "/alumnos", icon: Users },
  { label: "Matrículas", href: "/matriculas", icon: ClipboardList },
  { label: "Calificaciones", href: "/calificaciones", icon: Award },
  { label: "Reportes", href: "/reportes", icon: BarChart3 },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">
                {process.env.NEXT_PUBLIC_SCHOOL_NAME?.slice(0, 14) || "Control"}
              </p>
              <p className="text-xs text-gray-500">Académico</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <div className="px-3 mb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Menú Principal
            </p>
          </div>

          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn("sidebar-link", active && "active")}
              >
                <Icon size={18} className="shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={14} className="text-primary-400" />}
              </Link>
            );
          })}

          <Link
            href="/busqueda"
            onClick={onClose}
            className={cn("sidebar-link", pathname === "/busqueda" && "active")}
          >
            <Search size={18} className="shrink-0" />
            <span className="flex-1">Búsqueda</span>
          </Link>

          {isAdmin && (
            <>
              <div className="px-3 pt-4 pb-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Administración
                </p>
              </div>
              <Link
                href="/usuarios"
                onClick={onClose}
                className={cn("sidebar-link", pathname.startsWith("/usuarios") && "active")}
              >
                <UserCog size={18} className="shrink-0" />
                <span className="flex-1">Usuarios</span>
              </Link>
              <Link
                href="/configuracion"
                onClick={onClose}
                className={cn("sidebar-link", pathname.startsWith("/configuracion") && "active")}
              >
                <Settings size={18} className="shrink-0" />
                <span className="flex-1">Configuración</span>
              </Link>
            </>
          )}
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {session?.user?.name}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {session?.user?.role === "ADMIN" ? "Administrador" :
                  session?.user?.role === "DOCENTE" ? "Docente" : "Visualizador"}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
