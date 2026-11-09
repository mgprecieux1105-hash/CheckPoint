export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      daily_reflections: {
        Row: {
          created_at: string;
          id: string;
          improvement_notes: string | null;
          is_demo: boolean;
          missed_accomplishments: string | null;
          mood: number | null;
          positive_reflection: string | null;
          reflection_date: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          improvement_notes?: string | null;
          is_demo?: boolean;
          missed_accomplishments?: string | null;
          mood?: number | null;
          positive_reflection?: string | null;
          reflection_date: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          improvement_notes?: string | null;
          is_demo?: boolean;
          missed_accomplishments?: string | null;
          mood?: number | null;
          positive_reflection?: string | null;
          reflection_date?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_reflections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      goals: {
        Row: {
          achieved_at: string | null;
          archived_at: string | null;
          created_at: string;
          current_value: number;
          description: string | null;
          goal_type: Database["public"]["Enums"]["goal_type"];
          id: string;
          is_demo: boolean;
          priority: Database["public"]["Enums"]["priority_level"];
          progress_mode: Database["public"]["Enums"]["goal_progress_mode"];
          project_id: string | null;
          start_date: string;
          status: Database["public"]["Enums"]["goal_status"];
          target_date: string;
          target_value: number;
          title: string;
          unit: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          achieved_at?: string | null;
          archived_at?: string | null;
          created_at?: string;
          current_value?: number;
          description?: string | null;
          goal_type?: Database["public"]["Enums"]["goal_type"];
          id?: string;
          is_demo?: boolean;
          priority?: Database["public"]["Enums"]["priority_level"];
          progress_mode?: Database["public"]["Enums"]["goal_progress_mode"];
          project_id?: string | null;
          start_date?: string;
          status?: Database["public"]["Enums"]["goal_status"];
          target_date: string;
          target_value?: number;
          title: string;
          unit?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          achieved_at?: string | null;
          archived_at?: string | null;
          created_at?: string;
          current_value?: number;
          description?: string | null;
          goal_type?: Database["public"]["Enums"]["goal_type"];
          id?: string;
          is_demo?: boolean;
          priority?: Database["public"]["Enums"]["priority_level"];
          progress_mode?: Database["public"]["Enums"]["goal_progress_mode"];
          project_id?: string | null;
          start_date?: string;
          status?: Database["public"]["Enums"]["goal_status"];
          target_date?: string;
          target_value?: number;
          title?: string;
          unit?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goals_project_fk";
            columns: ["project_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "goals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      milestones: {
        Row: {
          completed_at: string | null;
          created_at: string;
          description: string | null;
          goal_id: string;
          id: string;
          position: number;
          status: Database["public"]["Enums"]["milestone_status"];
          target_date: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          goal_id: string;
          id?: string;
          position?: number;
          status?: Database["public"]["Enums"]["milestone_status"];
          target_date?: string | null;
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          goal_id?: string;
          id?: string;
          position?: number;
          status?: Database["public"]["Enums"]["milestone_status"];
          target_date?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "milestones_goal_fk";
            columns: ["goal_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "milestones_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          dedupe_key: string | null;
          id: string;
          is_read: boolean;
          link: string | null;
          message: string | null;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          dedupe_key?: string | null;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          message?: string | null;
          title: string;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Update: {
          created_at?: string;
          dedupe_key?: string | null;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          message?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          focus_areas: string[];
          full_name: string | null;
          id: string;
          onboarding_completed_at: string | null;
          preferences: NonNullable<Json>;
          theme: string;
          timezone: string;
          updated_at: string;
          week_starts_on: number;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          focus_areas?: string[];
          full_name?: string | null;
          id: string;
          onboarding_completed_at?: string | null;
          preferences?: NonNullable<Json>;
          theme?: string;
          timezone?: string;
          updated_at?: string;
          week_starts_on?: number;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          focus_areas?: string[];
          full_name?: string | null;
          id?: string;
          onboarding_completed_at?: string | null;
          preferences?: NonNullable<Json>;
          theme?: string;
          timezone?: string;
          updated_at?: string;
          week_starts_on?: number;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          archived_at: string | null;
          color: string;
          created_at: string;
          description: string | null;
          icon: string;
          id: string;
          is_demo: boolean;
          name: string;
          priority: Database["public"]["Enums"]["priority_level"];
          start_date: string | null;
          status: Database["public"]["Enums"]["project_status"];
          target_date: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          color?: string;
          created_at?: string;
          description?: string | null;
          icon?: string;
          id?: string;
          is_demo?: boolean;
          name: string;
          priority?: Database["public"]["Enums"]["priority_level"];
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          target_date?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          archived_at?: string | null;
          color?: string;
          created_at?: string;
          description?: string | null;
          icon?: string;
          id?: string;
          is_demo?: boolean;
          name?: string;
          priority?: Database["public"]["Enums"]["priority_level"];
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          target_date?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          category: string | null;
          completed_at: string | null;
          created_at: string;
          description: string | null;
          due_date: string | null;
          goal_id: string | null;
          id: string;
          is_demo: boolean;
          notes: string | null;
          priority: Database["public"]["Enums"]["priority_level"];
          project_id: string | null;
          scheduled_date: string;
          status: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          category?: string | null;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          goal_id?: string | null;
          id?: string;
          is_demo?: boolean;
          notes?: string | null;
          priority?: Database["public"]["Enums"]["priority_level"];
          project_id?: string | null;
          scheduled_date?: string;
          status?: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          category?: string | null;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          goal_id?: string | null;
          id?: string;
          is_demo?: boolean;
          notes?: string | null;
          priority?: Database["public"]["Enums"]["priority_level"];
          project_id?: string | null;
          scheduled_date?: string;
          status?: Database["public"]["Enums"]["task_status"];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_goal_fk";
            columns: ["goal_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "tasks_project_fk";
            columns: ["project_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      clear_demo_workspace: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      delete_my_account: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      generate_due_notifications: {
        Args: { p_today: string };
        Returns: number;
      };
      search_tasks: {
        Args: { p_limit?: number; p_query: string };
        Returns: {
          category: string | null;
          completed_at: string | null;
          created_at: string;
          description: string | null;
          due_date: string | null;
          goal_id: string | null;
          id: string;
          is_demo: boolean;
          notes: string | null;
          priority: Database["public"]["Enums"]["priority_level"];
          project_id: string | null;
          scheduled_date: string;
          status: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at: string;
          user_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "tasks";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      seed_demo_workspace: { Args: { p_today: string }; Returns: undefined };
    };
    Enums: {
      goal_progress_mode: "target" | "milestones";
      goal_status: "not_started" | "in_progress" | "achieved" | "abandoned";
      goal_type: "weekly" | "monthly" | "annual" | "custom";
      milestone_status: "pending" | "completed";
      notification_type: "info" | "success" | "warning" | "reminder";
      priority_level: "low" | "medium" | "high" | "urgent";
      project_status: "active" | "paused" | "completed" | "archived";
      task_status: "pending" | "completed" | "missed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      goal_progress_mode: ["target", "milestones"],
      goal_status: ["not_started", "in_progress", "achieved", "abandoned"],
      goal_type: ["weekly", "monthly", "annual", "custom"],
      milestone_status: ["pending", "completed"],
      notification_type: ["info", "success", "warning", "reminder"],
      priority_level: ["low", "medium", "high", "urgent"],
      project_status: ["active", "paused", "completed", "archived"],
      task_status: ["pending", "completed", "missed"],
    },
  },
} as const;
