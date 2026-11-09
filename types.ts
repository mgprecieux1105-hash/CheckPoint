import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type Profile = Tables["profiles"]["Row"];
export type Project = Tables["projects"]["Row"];
export type ProjectInsert = Tables["projects"]["Insert"];
export type Goal = Tables["goals"]["Row"];
export type GoalInsert = Tables["goals"]["Insert"];
export type Milestone = Tables["milestones"]["Row"];
export type Task = Tables["tasks"]["Row"];
export type TaskInsert = Tables["tasks"]["Insert"];
export type TaskUpdate = Tables["tasks"]["Update"];
export type Reflection = Tables["daily_reflections"]["Row"];
export type AppNotification = Tables["notifications"]["Row"];

export type Priority = Enums["priority_level"];
export type ProjectStatus = Enums["project_status"];
export type GoalType = Enums["goal_type"];
export type GoalStatus = Enums["goal_status"];
export type TaskStatus = Enums["task_status"];

export interface Preferences {
  notifications?: { goal_achieved?: boolean; deadlines?: boolean; daily_reminder?: boolean };
}

/** Columns needed by metric calculations — kept light so the full history loads fast. */
export type LightTask = Pick<Task, "id" | "status" | "scheduled_date" | "project_id" | "goal_id" | "category">;
