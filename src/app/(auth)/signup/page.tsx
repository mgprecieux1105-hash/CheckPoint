"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import type { z } from "zod";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { getSupabase } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/validation";

type Values = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(signupSchema) });

  const onSubmit = handleSubmit(async ({ email, password, full_name }) => {
    setError(null);
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: { full_name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    if (error) {
      setError(error.message.includes("already registered") ? "Un compte existe déjà avec cet e-mail." : error.message);
      return;
    }
    if (data.session) {
      router.replace("/onboarding");
      router.refresh();
    } else {
      setSentTo(email);
    }
  });

  if (sentTo) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <MailCheck className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Vérifiez vos e-mails</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Un lien de confirmation a été envoyé à <span className="font-medium text-foreground">{sentTo}</span>.
        </p>
        <Button asChild variant="secondary" className="mt-6"><Link href="/login">Retour à la connexion</Link></Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Créer votre compte</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Commencez à mesurer vos progrès en moins d&apos;une minute.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        <Field label="Nom" htmlFor="full_name" error={formState.errors.full_name?.message}>
          <Input id="full_name" autoComplete="name" autoFocus {...register("full_name")} aria-invalid={!!formState.errors.full_name} />
        </Field>
        <Field label="E-mail" htmlFor="email" error={formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!formState.errors.email} />
        </Field>
        <Field label="Mot de passe" htmlFor="password" error={formState.errors.password?.message} hint="8 caractères minimum">
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} aria-invalid={!!formState.errors.password} />
        </Field>
        {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>Créer mon compte</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Déjà inscrit ? <Link href="/login" className="font-medium text-primary hover:underline">Se connecter</Link>
      </p>
    </div>
  );
}
