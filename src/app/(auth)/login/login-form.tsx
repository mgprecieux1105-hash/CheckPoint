"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { getSupabase } from "@/lib/supabase/client";
import { credentialsSchema } from "@/lib/validation";

type Values = z.infer<typeof credentialsSchema>;

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/overview";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(params.get("error"));
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(credentialsSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const { error } = await getSupabase().auth.signInWithPassword(values);
    if (error) {
      setError(error.message === "Invalid login credentials" ? "E-mail ou mot de passe incorrect." : error.message);
      return;
    }
    router.replace(safeNext(params.get("next")));
    router.refresh();
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Bon retour 👋</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Connectez-vous pour retrouver votre progression.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        <Field label="E-mail" htmlFor="email" error={formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" autoFocus {...register("email")} aria-invalid={!!formState.errors.email} />
        </Field>
        <Field label="Mot de passe" htmlFor="password" error={formState.errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} aria-invalid={!!formState.errors.password} />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-[13px] font-medium text-primary hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
        {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
          Se connecter
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">Créer un compte</Link>
      </p>
    </div>
  );
}
