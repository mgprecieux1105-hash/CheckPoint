"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Database, Download, FlaskConical, LogOut, Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useDemoWorkspace, useProjects } from "@/lib/data/entities";
import { useCalendarContext, useProfile, useUpdateProfile } from "@/lib/data/profile";
import { collectUserData, download, toCSV } from "@/lib/export";
import { getSupabase } from "@/lib/supabase/client";
import type { Preferences } from "@/lib/types";
import { passwordSchema } from "@/lib/validation";
import { cn, errorMessage } from "@/lib/utils";

function timeZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["Europe/Paris", "UTC"];
  }
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { today } = useCalendarContext();
  const { theme, setTheme } = useTheme();
  const { data: projects = [] } = useProjects();
  const { seed, clear } = useDemoWorkspace();
  const [name, setName] = useState("");
  const [password, setPassword] = useState({ password: "", confirm: "" });
  const [savingPwd, setSavingPwd] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const zones = useMemo(timeZones, []);
  const hasDemo = projects.some((p) => p.is_demo);

  useEffect(() => {
    if (profile) setName(profile.full_name ?? "");
  }, [profile]);

  if (isLoading || !profile) return <div className="space-y-4"><Skeleton className="h-10 w-60" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>;

  const prefs = (profile.preferences ?? {}) as Preferences;
  const notif = prefs.notifications ?? {};

  const save = (patch: Parameters<typeof updateProfile.mutate>[0], msg = "Préférences enregistrées") =>
    updateProfile.mutate(patch, { onSuccess: () => toast.success(msg), onError: (e) => toast.error(errorMessage(e)) });

  const setNotif = (key: keyof NonNullable<Preferences["notifications"]>, value: boolean) =>
    save({ preferences: { ...prefs, notifications: { ...notif, [key]: value } } });

  const exportData = async (format: "json" | "csv") => {
    setExporting(format);
    try {
      const data = await collectUserData();
      const stamp = today;
      if (format === "json") {
        download(`checkpoint-export-${stamp}.json`, JSON.stringify(data, null, 2), "application/json");
      } else {
        download(`checkpoint-taches-${stamp}.csv`, toCSV((data as unknown as { tasks: Record<string, unknown>[] }).tasks), "text/csv;charset=utf-8");
      }
      toast.success("Export prêt");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(null);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSavingPwd(true);
    const { error } = await getSupabase().auth.updateUser({ password: parsed.data.password });
    setSavingPwd(false);
    if (error) return toast.error(error.message);
    setPassword({ password: "", confirm: "" });
    toast.success("Mot de passe modifié");
  };

  const deleteAccount = async () => {
    setDeleting(true);
    const { error } = await getSupabase().rpc("delete_my_account");
    if (error) {
      setDeleting(false);
      toast.error(errorMessage(error));
      return;
    }
    await getSupabase().auth.signOut();
    qc.clear();
    window.location.assign("/login");
  };

  return (
    <div className="animate-slide-up">
      <PageHeader title="Réglages" description="Profil, préférences et gestion de vos données." />
      <div className="mx-auto max-w-3xl space-y-6">
        <Card id="profile">
          <CardHeader title="Profil" description="Ces informations personnalisent votre espace." />
          <CardBody className="space-y-4">
            <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return toast.error("Le nom est requis");
              save({ full_name: name.trim().slice(0, 120) }, "Profil mis à jour");
            }}>
              <Field label="Nom" htmlFor="s-name" className="flex-1">
                <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Button type="submit" variant="secondary" disabled={name.trim() === (profile.full_name ?? "")}>Enregistrer</Button>
            </form>
            <Field label="E-mail" htmlFor="s-email" hint="L'adresse de connexion ne peut pas être modifiée ici.">
              <Input id="s-email" value={profile.email ?? ""} readOnly disabled />
            </Field>
          </CardBody>
        </Card>

        <Card id="preferences">
          <CardHeader title="Préférences" />
          <CardBody className="space-y-5">
            <div>
              <p className="mb-2 text-[13px] font-medium text-subtle-foreground">Thème</p>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Thème">
                {([
                  { v: "light", l: "Clair", i: Sun },
                  { v: "dark", l: "Sombre", i: Moon },
                  { v: "system", l: "Système", i: Monitor },
                ] as const).map((t) => (
                  <button key={t.v} type="button" role="radio" aria-checked={(theme ?? profile.theme) === t.v}
                    onClick={() => { setTheme(t.v); save({ theme: t.v }); }}
                    className={cn("flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition",
                      (theme ?? profile.theme) === t.v ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface-hover")}>
                    <t.i className="size-4" /> {t.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Premier jour de la semaine" htmlFor="s-week">
                <NativeSelect id="s-week" value={profile.week_starts_on} onChange={(e) => save({ week_starts_on: Number(e.target.value) })}>
                  <option value={1}>Lundi</option>
                  <option value={0}>Dimanche</option>
                  <option value={6}>Samedi</option>
                </NativeSelect>
              </Field>
              <Field label="Fuseau horaire" htmlFor="s-tz" hint={`Aujourd'hui : ${today}`}>
                <NativeSelect id="s-tz" value={profile.timezone} onChange={(e) => save({ timezone: e.target.value })}>
                  {!zones.includes(profile.timezone) && <option value={profile.timezone}>{profile.timezone}</option>}
                  {zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
                </NativeSelect>
              </Field>
            </div>
            <div className="space-y-3 border-t border-border pt-5">
              <p className="text-[13px] font-medium text-subtle-foreground">Notifications</p>
              {([
                { k: "deadlines", l: "Échéances proches", d: "Objectifs à moins de 3 jours et tâches dues demain." },
                { k: "goal_achieved", l: "Objectifs atteints", d: "Une notification à chaque objectif atteint." },
                { k: "daily_reminder", l: "Rappel de réflexion", d: "Un rappel dans l'application pour clôturer votre journée." },
              ] as const).map((n) => (
                <label key={n.k} className="flex items-start justify-between gap-4">
                  <span>
                    <span className="block text-sm font-medium">{n.l}</span>
                    <span className="block text-xs text-muted-foreground">{n.d}</span>
                  </span>
                  <Switch checked={notif[n.k] ?? true} onCheckedChange={(v) => setNotif(n.k, v)} aria-label={n.l} />
                </label>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card id="data">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Database className="size-4 text-primary" /> Données</span>}
            description="Vos données vous appartiennent. Exportez-les à tout moment." />
          <CardBody className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" loading={exporting === "json"} onClick={() => exportData("json")}><Download /> Export complet (JSON)</Button>
              <Button variant="secondary" loading={exporting === "csv"} onClick={() => exportData("csv")}><Download /> Tâches (CSV)</Button>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted/50 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-medium"><FlaskConical className="size-4 text-accent" /> Espace de démonstration</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Ajoute 3 projets, 5 objectifs et 2 mois d&apos;historique fictifs, marqués « Démo ». Vos données réelles ne sont jamais modifiées.
              </p>
              <div className="mt-3 flex gap-2">
                {hasDemo ? (
                  <Button variant="secondary" loading={clear.isPending} onClick={() => clear.mutate(undefined, {
                    onSuccess: () => toast.success("Données de démo retirées"), onError: (e) => toast.error(errorMessage(e)),
                  })}>Retirer les données de démo</Button>
                ) : (
                  <Button variant="secondary" loading={seed.isPending} onClick={() => seed.mutate(today, {
                    onSuccess: () => toast.success("Espace de démo ajouté"), onError: (e) => toast.error(errorMessage(e)),
                  })}>Charger la démo</Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card id="account">
          <CardHeader title="Compte" />
          <CardBody className="space-y-5">
            <form onSubmit={changePassword} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label="Nouveau mot de passe" htmlFor="s-pwd">
                <Input id="s-pwd" type="password" autoComplete="new-password" value={password.password} onChange={(e) => setPassword((p) => ({ ...p, password: e.target.value }))} />
              </Field>
              <Field label="Confirmation" htmlFor="s-pwd2">
                <Input id="s-pwd2" type="password" autoComplete="new-password" value={password.confirm} onChange={(e) => setPassword((p) => ({ ...p, confirm: e.target.value }))} />
              </Field>
              <Button type="submit" variant="secondary" loading={savingPwd} disabled={!password.password}>Modifier</Button>
            </form>
            <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="secondary" onClick={async () => { await getSupabase().auth.signOut(); qc.clear(); window.location.assign("/login"); }}>
                <LogOut /> Se déconnecter
              </Button>
              <Button variant="danger-ghost" onClick={() => setConfirmDelete(true)}><Trash2 /> Supprimer mon compte</Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={(o) => { setConfirmDelete(o); if (!o) setDeleteText(""); }}
        title="Supprimer définitivement votre compte ?"
        confirmLabel="Supprimer mon compte"
        loading={deleting}
        description={
          <span className="block space-y-3">
            <span className="block">Tous vos projets, objectifs, tâches et réflexions seront supprimés. Cette action est irréversible. Pensez à exporter vos données avant.</span>
            <span className="block">Tapez <strong className="text-foreground">SUPPRIMER</strong> pour confirmer.</span>
            <Input aria-label="Confirmation" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} />
          </span>
        }
        onConfirm={async () => {
          if (deleteText !== "SUPPRIMER") {
            toast.error("Tapez SUPPRIMER pour confirmer");
            return;
          }
          await deleteAccount();
        }}
      />
    </div>
  );
}
