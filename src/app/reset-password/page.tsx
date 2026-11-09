"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import type { z } from "zod";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { getSupabase } from "@/lib/supabase/client";
import { passwordSchema } from "@/lib/validation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) });

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null);
    const { error } = await getSupabase().auth.updateUser({ password });
    if (error) return setError(error.message);
    toast.success("Mot de passe mis à jour");
    router.replace("/overview");
  });

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <Logo className="mb-10" />
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-7 shadow-card">
        <h1 className="text-xl font-semibold tracking-tight">Nouveau mot de passe</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <Field label="Mot de passe" htmlFor="password" error={formState.errors.password?.message}>
            <Input id="password" type="password" autoComplete="new-password" autoFocus {...register("password")} />
          </Field>
          <Field label="Confirmation" htmlFor="confirm" error={formState.errors.confirm?.message}>
            <Input id="confirm" type="password" autoComplete="new-password" {...register("confirm")} />
          </Field>
          {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" loading={formState.isSubmitting}>Enregistrer</Button>
        </form>
      </div>
    </div>
  );
}
