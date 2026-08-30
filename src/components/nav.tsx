import Link from "next/link";

const links = [
  { href: "/", label: "Resumen" },
  { href: "/entrenamiento", label: "Entrenamiento" },
  { href: "/nutricion", label: "Nutrición" },
  { href: "/progreso", label: "Progreso" },
];

export function Nav() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <span className="font-display text-lg font-medium tracking-tight">
          Bitácora
        </span>
        <nav className="flex gap-6 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-mist transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
