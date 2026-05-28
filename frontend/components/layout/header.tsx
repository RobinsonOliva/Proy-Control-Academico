"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Menu, Search, LogOut, Bell } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [search, setSearch] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/busqueda?q=${encodeURIComponent(search.trim())}`);
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-4 px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
      >
        <Menu size={20} />
      </button>

      <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">{title}</h1>

      <form onSubmit={handleSearch} className="flex-1 max-w-sm ml-auto sm:ml-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar alumno, curso..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 ml-2">
        <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="h-6 w-px bg-gray-200" />

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Cerrar sesión"
        >
          <LogOut size={16} />
          <span className="hidden sm:block">Salir</span>
        </button>
      </div>
    </header>
  );
}
