"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(data?.error ?? "No pudimos crear la cuenta");
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Cuenta creada, pero falló el inicio de sesión. Probá desde login.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Algo salió mal. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <p className="font-mono text-xs uppercase tracking-widest text-mist">
        Bitácora
      </p>
      <h1 className="mt-2 font-display text-2xl font-medium tracking-tight">
        Creá tu cuenta
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="text-mist">Nombre</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </label>

        <label className="block text-sm">
          <span className="text-mist">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </label>

        <label className="block text-sm">
          <span className="text-mist">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
          />
          <span className="mt-1 block text-xs text-mist">Mínimo 8 caracteres</span>
        </label>

        {error && (
          <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creando…" : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-4 text-sm text-mist">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}
