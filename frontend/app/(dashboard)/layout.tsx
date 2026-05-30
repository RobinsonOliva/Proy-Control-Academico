"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/grados": "Grados",
  "/aulas": "Aulas",
  "/cursos": "Cursos",
  "/alumnos": "Alumnos",
  "/matriculas": "Matrículas",
  "/calificaciones": "Calificaciones",
  "/reportes": "Reportes",
  "/usuarios": "Usuarios",
  "/busqueda": "Búsqueda",
  "/configuracion": "Configuración",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const title = Object.entries(pageTitles).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] ?? "Control Académico";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
