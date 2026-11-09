"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import type { z } from "zod";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { getSupabase } from "@/lib/supabase/client";
import { emailSchema } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    if (error) setError(error.message);
    else setSent(true);
  });

  return (
    <div>
      <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Connexion
      </Link>
      {sent ? (
        <div>
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-success-soft text-success"><MailCheck className="size-6" /></div>
          <h1 className="text-2xl font-semibold tracking-tight">E-mail envoyé</h1>
          <p className="mt-2 text-sm text-muted-foreground">Si un compte existe pour cette adresse, vous recevrez un lien pour choisir un nouveau mot de passe.</p>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Mot de passe oublié</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Indiquez votre e-mail, nous vous enverrons un lien de réinitialisation.</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
            <Field label="E-mail" htmlFor="email" error={formState.errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" autoFocus {...register("email")} />
            </Field>
            {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
            <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>Envoyer le lien</Button>
          </form>
        </>
      )}
    </div>
  );
}
