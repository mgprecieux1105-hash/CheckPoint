import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");
const optionalDate = z.union([isoDate, z.literal("")]).optional().transform((v) => (v ? v : null));
const optionalText = (max: number) =>
  z.string().max(max, `${max} caractères maximum`).optional().transform((v) => (v && v.trim() ? v.trim() : null));
const optionalId = z.string().optional().transform((v) => (v ? v : null));
const priority = z.enum(["low", "medium", "high", "urgent"]);

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis").max(200, "200 caractères maximum"),
  description: optionalText(4000),
  notes: optionalText(4000),
  category: optionalText(40),
  priority,
  status: z.enum(["pending", "completed", "missed"]),
  scheduled_date: isoDate,
  due_date: optionalDate,
  project_id: optionalId,
  goal_id: optionalId,
});
export type TaskFormInput = z.input<typeof taskSchema>;
export type TaskFormValues = z.output<typeof taskSchema>;

export const projectSchema = z
  .object({
    name: z.string().trim().min(1, "Le nom est requis").max(80, "80 caractères maximum"),
    description: optionalText(2000),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    icon: z.string().min(1).max(40),
    start_date: optionalDate,
    target_date: optionalDate,
    priority,
    status: z.enum(["active", "paused", "completed", "archived"]),
  })
  .refine((v) => !v.start_date || !v.target_date || v.target_date >= v.start_date, {
    message: "La date cible doit suivre la date de début",
    path: ["target_date"],
  });
export type ProjectFormInput = z.input<typeof projectSchema>;
export type ProjectFormValues = z.output<typeof projectSchema>;

export const goalSchema = z
  .object({
    title: z.string().trim().min(1, "Le titre est requis").max(140, "140 caractères maximum"),
    description: optionalText(2000),
    goal_type: z.enum(["weekly", "monthly", "annual", "custom"]),
    progress_mode: z.enum(["target", "milestones"]),
    unit: optionalText(30),
    target_value: z.coerce.number<string | number>().positive("La cible doit être positive").max(1e9),
    current_value: z.coerce.number<string | number>().min(0, "La valeur ne peut pas être négative").max(1e9),
    start_date: isoDate,
    target_date: isoDate,
    priority,
    status: z.enum(["not_started", "in_progress", "achieved", "abandoned"]),
    project_id: optionalId,
  })
  .refine((v) => v.target_date >= v.start_date, {
    message: "L'échéance doit suivre la date de début",
    path: ["target_date"],
  });
export type GoalFormInput = z.input<typeof goalSchema>;
export type GoalFormValues = z.output<typeof goalSchema>;

export const reflectionSchema = z.object({
  positive_reflection: optionalText(4000),
  missed_accomplishments: optionalText(4000),
  improvement_notes: optionalText(4000),
  mood: z.number().int().min(1).max(5).nullable().optional(),
});

export const credentialsSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide"),
  password: z.string().min(8, "8 caractères minimum"),
});

export const signupSchema = credentialsSchema.extend({
  full_name: z.string().trim().min(1, "Votre nom est requis").max(120),
});

export const emailSchema = z.object({ email: z.string().trim().email("Adresse e-mail invalide") });
export const passwordSchema = z
  .object({ password: z.string().min(8, "8 caractères minimum"), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Les mots de passe ne correspondent pas", path: ["confirm"] });
