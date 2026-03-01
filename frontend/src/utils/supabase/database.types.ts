export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      epa_kf_descriptions: {
        Row: {
          epa_descriptions: Json | null;
          id: number;
          kf_descriptions: Json | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          epa_descriptions?: Json | null;
          id?: number;
          kf_descriptions?: Json | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          epa_descriptions?: Json | null;
          id?: number;
          kf_descriptions?: Json | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      mcqs_options: {
        Row: {
          data: Json | null;
          id: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          data?: Json | null;
          id?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          data?: Json | null;
          id?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          id: string;
          theme: string | null;
          created_at: string | null;
          updated_at: string | null;
          ai_model: string | null;
          ai_usage_count: number | null;
          ai_usage_date: string | null;
        };
        Insert: {
          id: string;
          theme?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          ai_model?: string | null;
          ai_usage_count?: number | null;
          ai_usage_date?: string | null;
        };
        Update: {
          id?: string;
          theme?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          ai_model?: string | null;
          ai_usage_count?: number | null;
          ai_usage_date?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          display_name: string | null;
          id: string;
          updated_at: string | null;
          ai_model: string | null;
          ai_usage_count: number | null;
          ai_usage_date: string | null;
        };
        Insert: {
          display_name?: string | null;
          id: string;
          updated_at?: string | null;
          ai_model?: string | null;
          ai_usage_count?: number | null;
          ai_usage_date?: string | null;
        };
        Update: {
          display_name?: string | null;
          id?: string;
          updated_at?: string | null;
          ai_model?: string | null;
          ai_usage_count?: number | null;
          ai_usage_date?: string | null;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          id: number;
          permission: Database['public']['Enums']['user_permission'];
          role: Database['public']['Enums']['user_role'];
        };
        Insert: {
          id?: number;
          permission: Database['public']['Enums']['user_permission'];
          role: Database['public']['Enums']['user_role'];
        };
        Update: {
          id?: number;
          permission?: Database['public']['Enums']['user_permission'];
          role?: Database['public']['Enums']['user_role'];
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          assigned_at: string;
          id: number;
          role: Database['public']['Enums']['user_role'];
          user_id: string;
        };
        Insert: {
          assigned_at?: string;
          id?: number;
          role: Database['public']['Enums']['user_role'];
          user_id: string;
        };
        Update: {
          assigned_at?: string;
          id?: number;
          role?: Database['public']['Enums']['user_role'];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      authorize: {
        Args: {
          requested_permission: Database['public']['Enums']['user_permission'];
        };
        Returns: boolean;
      };
      custom_access_token_hook: {
        Args: {
          event: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      user_permission: 'mcqs_options.insert' | 'mcqs_options.select' | 'mcqs_options.update' | 'mcqs_options.delete';
      user_role: 'ccc_admin';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  trainingdata: {
    Tables: {
      mcq_kf1_1: {
        Row: {
          c1_1_1: boolean | null;
          c1_1_2: boolean | null;
          c1_1_3: boolean | null;
          c1_1_4: boolean | null;
          c1_1_5: boolean | null;
          c1_1_6: boolean | null;
          c1_1_7: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c1_1_1?: boolean | null;
          c1_1_2?: boolean | null;
          c1_1_3?: boolean | null;
          c1_1_4?: boolean | null;
          c1_1_5?: boolean | null;
          c1_1_6?: boolean | null;
          c1_1_7?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c1_1_1?: boolean | null;
          c1_1_2?: boolean | null;
          c1_1_3?: boolean | null;
          c1_1_4?: boolean | null;
          c1_1_5?: boolean | null;
          c1_1_6?: boolean | null;
          c1_1_7?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf1_2: {
        Row: {
          c1_2_1: boolean | null;
          c1_2_2: boolean | null;
          c1_2_3: boolean | null;
          c1_2_4: boolean | null;
          c1_2_5: boolean | null;
          c1_2_6: boolean | null;
          c1_2_7: boolean | null;
          c1_2_8: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c1_2_1?: boolean | null;
          c1_2_2?: boolean | null;
          c1_2_3?: boolean | null;
          c1_2_4?: boolean | null;
          c1_2_5?: boolean | null;
          c1_2_6?: boolean | null;
          c1_2_7?: boolean | null;
          c1_2_8?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c1_2_1?: boolean | null;
          c1_2_2?: boolean | null;
          c1_2_3?: boolean | null;
          c1_2_4?: boolean | null;
          c1_2_5?: boolean | null;
          c1_2_6?: boolean | null;
          c1_2_7?: boolean | null;
          c1_2_8?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf1_3: {
        Row: {
          c1_3_1: boolean | null;
          c1_3_2: boolean | null;
          c1_3_3: boolean | null;
          c1_3_4: boolean | null;
          c1_3_5: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c1_3_1?: boolean | null;
          c1_3_2?: boolean | null;
          c1_3_3?: boolean | null;
          c1_3_4?: boolean | null;
          c1_3_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c1_3_1?: boolean | null;
          c1_3_2?: boolean | null;
          c1_3_3?: boolean | null;
          c1_3_4?: boolean | null;
          c1_3_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf1_4: {
        Row: {
          c1_4_1: boolean | null;
          c1_4_2: boolean | null;
          c1_4_3: boolean | null;
          c1_4_4: boolean | null;
          c1_4_5: boolean | null;
          c1_4_6: boolean | null;
          c1_4_7: boolean | null;
          c1_4_8: boolean | null;
          c1_4_9: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c1_4_1?: boolean | null;
          c1_4_2?: boolean | null;
          c1_4_3?: boolean | null;
          c1_4_4?: boolean | null;
          c1_4_5?: boolean | null;
          c1_4_6?: boolean | null;
          c1_4_7?: boolean | null;
          c1_4_8?: boolean | null;
          c1_4_9?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c1_4_1?: boolean | null;
          c1_4_2?: boolean | null;
          c1_4_3?: boolean | null;
          c1_4_4?: boolean | null;
          c1_4_5?: boolean | null;
          c1_4_6?: boolean | null;
          c1_4_7?: boolean | null;
          c1_4_8?: boolean | null;
          c1_4_9?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf10_1: {
        Row: {
          c10_1_1: boolean | null;
          c10_1_2: boolean | null;
          c10_1_3: boolean | null;
          c10_1_4: boolean | null;
          c10_1_5: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c10_1_1?: boolean | null;
          c10_1_2?: boolean | null;
          c10_1_3?: boolean | null;
          c10_1_4?: boolean | null;
          c10_1_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c10_1_1?: boolean | null;
          c10_1_2?: boolean | null;
          c10_1_3?: boolean | null;
          c10_1_4?: boolean | null;
          c10_1_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf10_2: {
        Row: {
          c10_2_1: boolean | null;
          c10_2_2: boolean | null;
          c10_2_3: boolean | null;
          c10_2_4: boolean | null;
          c10_2_5: boolean | null;
          c10_2_6: boolean | null;
          c10_2_7: boolean | null;
          c10_2_8: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c10_2_1?: boolean | null;
          c10_2_2?: boolean | null;
          c10_2_3?: boolean | null;
          c10_2_4?: boolean | null;
          c10_2_5?: boolean | null;
          c10_2_6?: boolean | null;
          c10_2_7?: boolean | null;
          c10_2_8?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c10_2_1?: boolean | null;
          c10_2_2?: boolean | null;
          c10_2_3?: boolean | null;
          c10_2_4?: boolean | null;
          c10_2_5?: boolean | null;
          c10_2_6?: boolean | null;
          c10_2_7?: boolean | null;
          c10_2_8?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf10_3: {
        Row: {
          c10_3_1: boolean | null;
          c10_3_2: boolean | null;
          c10_3_3: boolean | null;
          c10_3_4: boolean | null;
          c10_3_5: boolean | null;
          c10_3_6: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c10_3_1?: boolean | null;
          c10_3_2?: boolean | null;
          c10_3_3?: boolean | null;
          c10_3_4?: boolean | null;
          c10_3_5?: boolean | null;
          c10_3_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c10_3_1?: boolean | null;
          c10_3_2?: boolean | null;
          c10_3_3?: boolean | null;
          c10_3_4?: boolean | null;
          c10_3_5?: boolean | null;
          c10_3_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf10_4: {
        Row: {
          c10_4_1: boolean | null;
          c10_4_2: boolean | null;
          c10_4_3: boolean | null;
          c10_4_4: boolean | null;
          c10_4_5: boolean | null;
          c10_4_6: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c10_4_1?: boolean | null;
          c10_4_2?: boolean | null;
          c10_4_3?: boolean | null;
          c10_4_4?: boolean | null;
          c10_4_5?: boolean | null;
          c10_4_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c10_4_1?: boolean | null;
          c10_4_2?: boolean | null;
          c10_4_3?: boolean | null;
          c10_4_4?: boolean | null;
          c10_4_5?: boolean | null;
          c10_4_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf11_1: {
        Row: {
          c11_1_1: boolean | null;
          c11_1_2: boolean | null;
          c11_1_3: boolean | null;
          c11_1_4: boolean | null;
          c11_1_5: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c11_1_1?: boolean | null;
          c11_1_2?: boolean | null;
          c11_1_3?: boolean | null;
          c11_1_4?: boolean | null;
          c11_1_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c11_1_1?: boolean | null;
          c11_1_2?: boolean | null;
          c11_1_3?: boolean | null;
          c11_1_4?: boolean | null;
          c11_1_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf11_2: {
        Row: {
          c11_2_1: boolean | null;
          c11_2_2: boolean | null;
          c11_2_3: boolean | null;
          c11_2_4: boolean | null;
          c11_2_5: boolean | null;
          c11_2_6: boolean | null;
          c11_2_7: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c11_2_1?: boolean | null;
          c11_2_2?: boolean | null;
          c11_2_3?: boolean | null;
          c11_2_4?: boolean | null;
          c11_2_5?: boolean | null;
          c11_2_6?: boolean | null;
          c11_2_7?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c11_2_1?: boolean | null;
          c11_2_2?: boolean | null;
          c11_2_3?: boolean | null;
          c11_2_4?: boolean | null;
          c11_2_5?: boolean | null;
          c11_2_6?: boolean | null;
          c11_2_7?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf11_3: {
        Row: {
          c11_3_1: boolean | null;
          c11_3_2: boolean | null;
          c11_3_3: boolean | null;
          c11_3_4: boolean | null;
          c11_3_5: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c11_3_1?: boolean | null;
          c11_3_2?: boolean | null;
          c11_3_3?: boolean | null;
          c11_3_4?: boolean | null;
          c11_3_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c11_3_1?: boolean | null;
          c11_3_2?: boolean | null;
          c11_3_3?: boolean | null;
          c11_3_4?: boolean | null;
          c11_3_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf12_1: {
        Row: {
          c12_1_1: boolean | null;
          c12_1_2: boolean | null;
          c12_1_3: boolean | null;
          c12_1_4: boolean | null;
          c12_1_5: boolean | null;
          c12_2_6: boolean | null;
          c12_2_7: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c12_1_1?: boolean | null;
          c12_1_2?: boolean | null;
          c12_1_3?: boolean | null;
          c12_1_4?: boolean | null;
          c12_1_5?: boolean | null;
          c12_2_6?: boolean | null;
          c12_2_7?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c12_1_1?: boolean | null;
          c12_1_2?: boolean | null;
          c12_1_3?: boolean | null;
          c12_1_4?: boolean | null;
          c12_1_5?: boolean | null;
          c12_2_6?: boolean | null;
          c12_2_7?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf12_2: {
        Row: {
          c12_2_1: boolean | null;
          c12_2_2: boolean | null;
          c12_2_3: boolean | null;
          c12_2_4: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c12_2_1?: boolean | null;
          c12_2_2?: boolean | null;
          c12_2_3?: boolean | null;
          c12_2_4?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c12_2_1?: boolean | null;
          c12_2_2?: boolean | null;
          c12_2_3?: boolean | null;
          c12_2_4?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf12_3: {
        Row: {
          c12_3_1: boolean | null;
          c12_3_2: boolean | null;
          c12_3_3: boolean | null;
          c12_3_4: boolean | null;
          c12_3_5: boolean | null;
          c12_3_6: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c12_3_1?: boolean | null;
          c12_3_2?: boolean | null;
          c12_3_3?: boolean | null;
          c12_3_4?: boolean | null;
          c12_3_5?: boolean | null;
          c12_3_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c12_3_1?: boolean | null;
          c12_3_2?: boolean | null;
          c12_3_3?: boolean | null;
          c12_3_4?: boolean | null;
          c12_3_5?: boolean | null;
          c12_3_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf12_4: {
        Row: {
          c12_4_1: boolean | null;
          c12_4_2: boolean | null;
          c12_4_3: boolean | null;
          c12_4_4: boolean | null;
          c12_4_5: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c12_4_1?: boolean | null;
          c12_4_2?: boolean | null;
          c12_4_3?: boolean | null;
          c12_4_4?: boolean | null;
          c12_4_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c12_4_1?: boolean | null;
          c12_4_2?: boolean | null;
          c12_4_3?: boolean | null;
          c12_4_4?: boolean | null;
          c12_4_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf13_1: {
        Row: {
          c13_1_1: boolean | null;
          c13_1_2: boolean | null;
          c13_1_3: boolean | null;
          c13_1_4: boolean | null;
          c13_1_5: boolean | null;
          c13_1_6: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c13_1_1?: boolean | null;
          c13_1_2?: boolean | null;
          c13_1_3?: boolean | null;
          c13_1_4?: boolean | null;
          c13_1_5?: boolean | null;
          c13_1_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c13_1_1?: boolean | null;
          c13_1_2?: boolean | null;
          c13_1_3?: boolean | null;
          c13_1_4?: boolean | null;
          c13_1_5?: boolean | null;
          c13_1_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf13_2: {
        Row: {
          c13_2_1: boolean | null;
          c13_2_2: boolean | null;
          c13_2_3: boolean | null;
          c13_2_4: boolean | null;
          c13_2_5: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c13_2_1?: boolean | null;
          c13_2_2?: boolean | null;
          c13_2_3?: boolean | null;
          c13_2_4?: boolean | null;
          c13_2_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c13_2_1?: boolean | null;
          c13_2_2?: boolean | null;
          c13_2_3?: boolean | null;
          c13_2_4?: boolean | null;
          c13_2_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf13_3: {
        Row: {
          c13_3_1: boolean | null;
          c13_3_2: boolean | null;
          c13_3_3: boolean | null;
          c13_3_4: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c13_3_1?: boolean | null;
          c13_3_2?: boolean | null;
          c13_3_3?: boolean | null;
          c13_3_4?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c13_3_1?: boolean | null;
          c13_3_2?: boolean | null;
          c13_3_3?: boolean | null;
          c13_3_4?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf13_4: {
        Row: {
          c13_4_1: boolean | null;
          c13_4_10: boolean | null;
          c13_4_2: boolean | null;
          c13_4_3: boolean | null;
          c13_4_4: boolean | null;
          c13_4_5: boolean | null;
          c13_4_6: boolean | null;
          c13_4_7: boolean | null;
          c13_4_8: boolean | null;
          c13_4_9: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c13_4_1?: boolean | null;
          c13_4_10?: boolean | null;
          c13_4_2?: boolean | null;
          c13_4_3?: boolean | null;
          c13_4_4?: boolean | null;
          c13_4_5?: boolean | null;
          c13_4_6?: boolean | null;
          c13_4_7?: boolean | null;
          c13_4_8?: boolean | null;
          c13_4_9?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c13_4_1?: boolean | null;
          c13_4_10?: boolean | null;
          c13_4_2?: boolean | null;
          c13_4_3?: boolean | null;
          c13_4_4?: boolean | null;
          c13_4_5?: boolean | null;
          c13_4_6?: boolean | null;
          c13_4_7?: boolean | null;
          c13_4_8?: boolean | null;
          c13_4_9?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf2_1: {
        Row: {
          c2_1_1: boolean | null;
          c2_1_2: boolean | null;
          c2_1_3: boolean | null;
          c2_1_4: boolean | null;
          c2_1_5: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c2_1_1?: boolean | null;
          c2_1_2?: boolean | null;
          c2_1_3?: boolean | null;
          c2_1_4?: boolean | null;
          c2_1_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c2_1_1?: boolean | null;
          c2_1_2?: boolean | null;
          c2_1_3?: boolean | null;
          c2_1_4?: boolean | null;
          c2_1_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf2_2: {
        Row: {
          c2_2_1: boolean | null;
          c2_2_2: boolean | null;
          c2_2_3: boolean | null;
          c2_2_4: boolean | null;
          c2_2_5: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c2_2_1?: boolean | null;
          c2_2_2?: boolean | null;
          c2_2_3?: boolean | null;
          c2_2_4?: boolean | null;
          c2_2_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c2_2_1?: boolean | null;
          c2_2_2?: boolean | null;
          c2_2_3?: boolean | null;
          c2_2_4?: boolean | null;
          c2_2_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf2_3: {
        Row: {
          c2_3_1: boolean | null;
          c2_3_2: boolean | null;
          c2_3_3: boolean | null;
          c2_3_4: boolean | null;
          c2_3_5: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c2_3_1?: boolean | null;
          c2_3_2?: boolean | null;
          c2_3_3?: boolean | null;
          c2_3_4?: boolean | null;
          c2_3_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c2_3_1?: boolean | null;
          c2_3_2?: boolean | null;
          c2_3_3?: boolean | null;
          c2_3_4?: boolean | null;
          c2_3_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf3_1: {
        Row: {
          c3_1_1: boolean | null;
          c3_1_2: boolean | null;
          c3_1_3: boolean | null;
          c3_1_4: boolean | null;
          c3_1_5: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c3_1_1?: boolean | null;
          c3_1_2?: boolean | null;
          c3_1_3?: boolean | null;
          c3_1_4?: boolean | null;
          c3_1_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c3_1_1?: boolean | null;
          c3_1_2?: boolean | null;
          c3_1_3?: boolean | null;
          c3_1_4?: boolean | null;
          c3_1_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf3_2: {
        Row: {
          c3_2_1: boolean | null;
          c3_2_2: boolean | null;
          c3_2_3: boolean | null;
          c3_2_4: boolean | null;
          c3_2_5: boolean | null;
          c3_2_6: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c3_2_1?: boolean | null;
          c3_2_2?: boolean | null;
          c3_2_3?: boolean | null;
          c3_2_4?: boolean | null;
          c3_2_5?: boolean | null;
          c3_2_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c3_2_1?: boolean | null;
          c3_2_2?: boolean | null;
          c3_2_3?: boolean | null;
          c3_2_4?: boolean | null;
          c3_2_5?: boolean | null;
          c3_2_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf3_3: {
        Row: {
          c3_3_1: boolean | null;
          c3_3_2: boolean | null;
          c3_3_3: boolean | null;
          c3_3_4: boolean | null;
          c3_3_5: boolean | null;
          c3_3_6: boolean | null;
          c3_3_7: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c3_3_1?: boolean | null;
          c3_3_2?: boolean | null;
          c3_3_3?: boolean | null;
          c3_3_4?: boolean | null;
          c3_3_5?: boolean | null;
          c3_3_6?: boolean | null;
          c3_3_7?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c3_3_1?: boolean | null;
          c3_3_2?: boolean | null;
          c3_3_3?: boolean | null;
          c3_3_4?: boolean | null;
          c3_3_5?: boolean | null;
          c3_3_6?: boolean | null;
          c3_3_7?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf4_1: {
        Row: {
          c4_1_1: boolean | null;
          c4_1_2: boolean | null;
          c4_1_3: boolean | null;
          c4_1_4: boolean | null;
          c4_1_5: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c4_1_1?: boolean | null;
          c4_1_2?: boolean | null;
          c4_1_3?: boolean | null;
          c4_1_4?: boolean | null;
          c4_1_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c4_1_1?: boolean | null;
          c4_1_2?: boolean | null;
          c4_1_3?: boolean | null;
          c4_1_4?: boolean | null;
          c4_1_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf4_2: {
        Row: {
          c4_2_1: boolean | null;
          c4_2_2: boolean | null;
          c4_2_3: boolean | null;
          c4_2_4: boolean | null;
          c4_2_5: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c4_2_1?: boolean | null;
          c4_2_2?: boolean | null;
          c4_2_3?: boolean | null;
          c4_2_4?: boolean | null;
          c4_2_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c4_2_1?: boolean | null;
          c4_2_2?: boolean | null;
          c4_2_3?: boolean | null;
          c4_2_4?: boolean | null;
          c4_2_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf4_3: {
        Row: {
          c4_3_1: boolean | null;
          c4_3_2: boolean | null;
          c4_3_3: boolean | null;
          c4_3_4: boolean | null;
          c4_3_5: boolean | null;
          c4_3_6: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c4_3_1?: boolean | null;
          c4_3_2?: boolean | null;
          c4_3_3?: boolean | null;
          c4_3_4?: boolean | null;
          c4_3_5?: boolean | null;
          c4_3_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c4_3_1?: boolean | null;
          c4_3_2?: boolean | null;
          c4_3_3?: boolean | null;
          c4_3_4?: boolean | null;
          c4_3_5?: boolean | null;
          c4_3_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf4_4: {
        Row: {
          c4_4_1: boolean | null;
          c4_4_2: boolean | null;
          c4_4_3: boolean | null;
          c4_4_4: boolean | null;
          c4_4_5: boolean | null;
          c4_4_6: boolean | null;
          c4_4_7: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c4_4_1?: boolean | null;
          c4_4_2?: boolean | null;
          c4_4_3?: boolean | null;
          c4_4_4?: boolean | null;
          c4_4_5?: boolean | null;
          c4_4_6?: boolean | null;
          c4_4_7?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c4_4_1?: boolean | null;
          c4_4_2?: boolean | null;
          c4_4_3?: boolean | null;
          c4_4_4?: boolean | null;
          c4_4_5?: boolean | null;
          c4_4_6?: boolean | null;
          c4_4_7?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf5_1: {
        Row: {
          c5_1_1: boolean | null;
          c5_1_2: boolean | null;
          c5_1_3: boolean | null;
          c5_1_4: boolean | null;
          c5_1_5: boolean | null;
          c5_1_6: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c5_1_1?: boolean | null;
          c5_1_2?: boolean | null;
          c5_1_3?: boolean | null;
          c5_1_4?: boolean | null;
          c5_1_5?: boolean | null;
          c5_1_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c5_1_1?: boolean | null;
          c5_1_2?: boolean | null;
          c5_1_3?: boolean | null;
          c5_1_4?: boolean | null;
          c5_1_5?: boolean | null;
          c5_1_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf5_2: {
        Row: {
          c5_2_1: boolean | null;
          c5_2_2: boolean | null;
          c5_2_3: boolean | null;
          c5_2_4: boolean | null;
          c5_2_5: boolean | null;
          c5_2_6: boolean | null;
          c5_2_7: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c5_2_1?: boolean | null;
          c5_2_2?: boolean | null;
          c5_2_3?: boolean | null;
          c5_2_4?: boolean | null;
          c5_2_5?: boolean | null;
          c5_2_6?: boolean | null;
          c5_2_7?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c5_2_1?: boolean | null;
          c5_2_2?: boolean | null;
          c5_2_3?: boolean | null;
          c5_2_4?: boolean | null;
          c5_2_5?: boolean | null;
          c5_2_6?: boolean | null;
          c5_2_7?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf5_3: {
        Row: {
          c5_3_1: boolean | null;
          c5_3_2: boolean | null;
          c5_3_3: boolean | null;
          c5_3_4: boolean | null;
          c5_3_5: boolean | null;
          c5_3_6: boolean | null;
          c5_3_7: boolean | null;
          c5_3_8: boolean | null;
          c5_3_9: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c5_3_1?: boolean | null;
          c5_3_2?: boolean | null;
          c5_3_3?: boolean | null;
          c5_3_4?: boolean | null;
          c5_3_5?: boolean | null;
          c5_3_6?: boolean | null;
          c5_3_7?: boolean | null;
          c5_3_8?: boolean | null;
          c5_3_9?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c5_3_1?: boolean | null;
          c5_3_2?: boolean | null;
          c5_3_3?: boolean | null;
          c5_3_4?: boolean | null;
          c5_3_5?: boolean | null;
          c5_3_6?: boolean | null;
          c5_3_7?: boolean | null;
          c5_3_8?: boolean | null;
          c5_3_9?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf6_1: {
        Row: {
          c6_1_1: boolean | null;
          c6_1_2: boolean | null;
          c6_1_3: boolean | null;
          c6_1_4: boolean | null;
          c6_1_5: boolean | null;
          c6_1_6: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c6_1_1?: boolean | null;
          c6_1_2?: boolean | null;
          c6_1_3?: boolean | null;
          c6_1_4?: boolean | null;
          c6_1_5?: boolean | null;
          c6_1_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c6_1_1?: boolean | null;
          c6_1_2?: boolean | null;
          c6_1_3?: boolean | null;
          c6_1_4?: boolean | null;
          c6_1_5?: boolean | null;
          c6_1_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf6_2: {
        Row: {
          c6_2_1: boolean | null;
          c6_2_2: boolean | null;
          c6_2_3: boolean | null;
          c6_2_4: boolean | null;
          c6_2_5: boolean | null;
          c6_2_6: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c6_2_1?: boolean | null;
          c6_2_2?: boolean | null;
          c6_2_3?: boolean | null;
          c6_2_4?: boolean | null;
          c6_2_5?: boolean | null;
          c6_2_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c6_2_1?: boolean | null;
          c6_2_2?: boolean | null;
          c6_2_3?: boolean | null;
          c6_2_4?: boolean | null;
          c6_2_5?: boolean | null;
          c6_2_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf6_3: {
        Row: {
          c6_3_1: boolean | null;
          c6_3_2: boolean | null;
          c6_3_3: boolean | null;
          c6_3_4: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c6_3_1?: boolean | null;
          c6_3_2?: boolean | null;
          c6_3_3?: boolean | null;
          c6_3_4?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c6_3_1?: boolean | null;
          c6_3_2?: boolean | null;
          c6_3_3?: boolean | null;
          c6_3_4?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf6_4: {
        Row: {
          c6_4_1: boolean | null;
          c6_4_2: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c6_4_1?: boolean | null;
          c6_4_2?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c6_4_1?: boolean | null;
          c6_4_2?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf7_1: {
        Row: {
          c7_1_1: boolean | null;
          c7_1_2: boolean | null;
          c7_1_3: boolean | null;
          c7_1_4: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c7_1_1?: boolean | null;
          c7_1_2?: boolean | null;
          c7_1_3?: boolean | null;
          c7_1_4?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c7_1_1?: boolean | null;
          c7_1_2?: boolean | null;
          c7_1_3?: boolean | null;
          c7_1_4?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf7_2: {
        Row: {
          c7_2_1: boolean | null;
          c7_2_2: boolean | null;
          c7_2_3: boolean | null;
          c7_2_4: boolean | null;
          c7_2_5: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c7_2_1?: boolean | null;
          c7_2_2?: boolean | null;
          c7_2_3?: boolean | null;
          c7_2_4?: boolean | null;
          c7_2_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c7_2_1?: boolean | null;
          c7_2_2?: boolean | null;
          c7_2_3?: boolean | null;
          c7_2_4?: boolean | null;
          c7_2_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf7_3: {
        Row: {
          c7_3_1: boolean | null;
          c7_3_2: boolean | null;
          c7_3_3: boolean | null;
          c7_3_4: boolean | null;
          c7_3_5: boolean | null;
          c7_3_6: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c7_3_1?: boolean | null;
          c7_3_2?: boolean | null;
          c7_3_3?: boolean | null;
          c7_3_4?: boolean | null;
          c7_3_5?: boolean | null;
          c7_3_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c7_3_1?: boolean | null;
          c7_3_2?: boolean | null;
          c7_3_3?: boolean | null;
          c7_3_4?: boolean | null;
          c7_3_5?: boolean | null;
          c7_3_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf7_4: {
        Row: {
          c7_4_1: boolean | null;
          c7_4_2: boolean | null;
          c7_4_3: boolean | null;
          c7_4_4: boolean | null;
          c7_4_5: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c7_4_1?: boolean | null;
          c7_4_2?: boolean | null;
          c7_4_3?: boolean | null;
          c7_4_4?: boolean | null;
          c7_4_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c7_4_1?: boolean | null;
          c7_4_2?: boolean | null;
          c7_4_3?: boolean | null;
          c7_4_4?: boolean | null;
          c7_4_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf8_1: {
        Row: {
          c8_1_1: boolean | null;
          c8_1_2: boolean | null;
          c8_1_3: boolean | null;
          c8_1_4: boolean | null;
          c8_1_5: boolean | null;
          c8_1_6: boolean | null;
          c8_1_7: boolean | null;
          c8_1_8: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c8_1_1?: boolean | null;
          c8_1_2?: boolean | null;
          c8_1_3?: boolean | null;
          c8_1_4?: boolean | null;
          c8_1_5?: boolean | null;
          c8_1_6?: boolean | null;
          c8_1_7?: boolean | null;
          c8_1_8?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c8_1_1?: boolean | null;
          c8_1_2?: boolean | null;
          c8_1_3?: boolean | null;
          c8_1_4?: boolean | null;
          c8_1_5?: boolean | null;
          c8_1_6?: boolean | null;
          c8_1_7?: boolean | null;
          c8_1_8?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf8_2: {
        Row: {
          c8_2_1: boolean | null;
          c8_2_2: boolean | null;
          c8_2_3: boolean | null;
          c8_2_4: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c8_2_1?: boolean | null;
          c8_2_2?: boolean | null;
          c8_2_3?: boolean | null;
          c8_2_4?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c8_2_1?: boolean | null;
          c8_2_2?: boolean | null;
          c8_2_3?: boolean | null;
          c8_2_4?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf8_3: {
        Row: {
          c8_3_1: boolean | null;
          c8_3_2: boolean | null;
          c8_3_3: boolean | null;
          c8_3_4: boolean | null;
          c8_3_5: boolean | null;
          c8_3_6: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c8_3_1?: boolean | null;
          c8_3_2?: boolean | null;
          c8_3_3?: boolean | null;
          c8_3_4?: boolean | null;
          c8_3_5?: boolean | null;
          c8_3_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c8_3_1?: boolean | null;
          c8_3_2?: boolean | null;
          c8_3_3?: boolean | null;
          c8_3_4?: boolean | null;
          c8_3_5?: boolean | null;
          c8_3_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf8_4: {
        Row: {
          c8_4_1: boolean | null;
          c8_4_2: boolean | null;
          c8_4_3: boolean | null;
          c8_4_4: boolean | null;
          c8_4_5: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c8_4_1?: boolean | null;
          c8_4_2?: boolean | null;
          c8_4_3?: boolean | null;
          c8_4_4?: boolean | null;
          c8_4_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c8_4_1?: boolean | null;
          c8_4_2?: boolean | null;
          c8_4_3?: boolean | null;
          c8_4_4?: boolean | null;
          c8_4_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf8_5: {
        Row: {
          c8_5_1: boolean | null;
          c8_5_2: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c8_5_1?: boolean | null;
          c8_5_2?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c8_5_1?: boolean | null;
          c8_5_2?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf9_1: {
        Row: {
          c9_1_1: boolean | null;
          c9_1_2: boolean | null;
          c9_1_3: boolean | null;
          c9_1_4: boolean | null;
          c9_1_5: boolean | null;
          c9_1_6: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c9_1_1?: boolean | null;
          c9_1_2?: boolean | null;
          c9_1_3?: boolean | null;
          c9_1_4?: boolean | null;
          c9_1_5?: boolean | null;
          c9_1_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c9_1_1?: boolean | null;
          c9_1_2?: boolean | null;
          c9_1_3?: boolean | null;
          c9_1_4?: boolean | null;
          c9_1_5?: boolean | null;
          c9_1_6?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf9_2: {
        Row: {
          c9_2_1: boolean | null;
          c9_2_2: boolean | null;
          c9_2_3: boolean | null;
          c9_2_4: boolean | null;
          c9_2_5: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c9_2_1?: boolean | null;
          c9_2_2?: boolean | null;
          c9_2_3?: boolean | null;
          c9_2_4?: boolean | null;
          c9_2_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c9_2_1?: boolean | null;
          c9_2_2?: boolean | null;
          c9_2_3?: boolean | null;
          c9_2_4?: boolean | null;
          c9_2_5?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
      mcq_kf9_3: {
        Row: {
          c9_3_1: boolean | null;
          c9_3_2: boolean | null;
          c9_3_3: boolean | null;
          c9_3_4: boolean | null;
          c9_3_5: boolean | null;
          c9_3_6: boolean | null;
          c9_3_7: boolean | null;
          c9_3_8: boolean | null;
          created_at: string | null;
          dev_level: number | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          c9_3_1?: boolean | null;
          c9_3_2?: boolean | null;
          c9_3_3?: boolean | null;
          c9_3_4?: boolean | null;
          c9_3_5?: boolean | null;
          c9_3_6?: boolean | null;
          c9_3_7?: boolean | null;
          c9_3_8?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Update: {
          c9_3_1?: boolean | null;
          c9_3_2?: boolean | null;
          c9_3_3?: boolean | null;
          c9_3_4?: boolean | null;
          c9_3_5?: boolean | null;
          c9_3_6?: boolean | null;
          c9_3_7?: boolean | null;
          c9_3_8?: boolean | null;
          created_at?: string | null;
          dev_level?: number | null;
          id?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views']) | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
  ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
  ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
  ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
  ? PublicSchema['Enums'][PublicEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes'] | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
  ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
  : never;