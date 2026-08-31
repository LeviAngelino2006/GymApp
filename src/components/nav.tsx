"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

const links = [
  { href: "/", label: "Resumen" },
  { href: "/entrenamiento", label: "Entrenamiento" },
  { href: "/nutricion", label: "Nutrición" },
  { href: "/progreso", label: "Progreso" },
  { href: "/perfil", label: "Perfil" },
];

export function Nav() {
  const { data: session, status } = useSession();
  const user = session?.user;

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <span className="font-display text-lg font-medium tracking-tight">
          Bitácora
        </span>
        <nav className="flex items-center gap-6 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-mist transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          {status !== "loading" &&
            (user ? (
              <span className="flex items-center gap-3">
                <span className="text-mist">{user.name ?? user.email}</span>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-lg border border-border px-3 py-1 text-ink transition-colors hover:border-accent"
                >
                  Salir
                </button>
              </span>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-accent px-3 py-1 text-surface transition-opacity hover:opacity-90"
              >
                Iniciar sesión
              </Link>
            ))}
        </nav>
      </div>
    </header>
  );
}
