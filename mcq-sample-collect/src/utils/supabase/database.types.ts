export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      announcements: {
        Row: {
          announcement_type: string | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          message: string | null
          start_date: string | null
        }
        Insert: {
          announcement_type?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          message?: string | null
          start_date?: string | null
        }
        Update: {
          announcement_type?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          message?: string | null
          start_date?: string | null
        }
        Relationships: []
      }
      clinical_settings: {
        Row: {
          created_at: string
          id: string
          setting: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting: string
        }
        Update: {
          created_at?: string
          id?: string
          setting?: string
        }
        Relationships: []
      }
      developer_tickets: {
        Row: {
          description: string
          id: string
          status: string | null
          submitted_at: string | null
          submitted_by: string | null
          title: string
          type: string | null
        }
        Insert: {
          description: string
          id?: string
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          title: string
          type?: string | null
        }
        Update: {
          description?: string
          id?: string
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "developer_tickets_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      epa_kf_descriptions: {
        Row: {
          epa_descriptions: Json | null
          id: number
          kf_descriptions: Json | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          epa_descriptions?: Json | null
          id?: number
          kf_descriptions?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          epa_descriptions?: Json | null
          id?: number
          kf_descriptions?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      form_requests: {
        Row: {
          active_status: boolean
          clinical_settings: string | null
          completed_by: string
          created_at: string
          goals: string | null
          id: string
          notes: string | null
          student_id: string
        }
        Insert: {
          active_status?: boolean
          clinical_settings?: string | null
          completed_by?: string
          created_at?: string
          goals?: string | null
          id?: string
          notes?: string | null
          student_id?: string
        }
        Update: {
          active_status?: boolean
          clinical_settings?: string | null
          completed_by?: string
          created_at?: string
          goals?: string | null
          id?: string
          notes?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_requests_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      form_responses: {
        Row: {
          created_id: string
          professionalism: string | null
          request_id: string
          response: Json | null
          response_id: string
        }
        Insert: {
          created_id?: string
          professionalism?: string | null
          request_id: string
          response?: Json | null
          response_id?: string
        }
        Update: {
          created_id?: string
          professionalism?: string | null
          request_id?: string
          response?: Json | null
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "form_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      form_results: {
        Row: {
          created_at: string
          id: string
          response_id: string
          results: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          response_id?: string
          results?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          response_id?: string
          results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "form_results_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "form_responses"
            referencedColumns: ["response_id"]
          },
        ]
      }
      mcqs_options: {
        Row: {
          data: Json | null
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          data?: Json | null
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          data?: Json | null
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string
          permission: string
        }
        Insert: {
          created_at?: string
          permission: string
        }
        Update: {
          created_at?: string
          permission?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          display_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          account_status?: string
          display_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          account_status?: string
          display_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission: string
          role: string
        }
        Insert: {
          permission: string
          role: string
        }
        Update: {
          permission?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_fkey"
            columns: ["permission"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["permission"]
          },
          {
            foreignKeyName: "role_permissions_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          role: string
        }
        Insert: {
          created_at?: string
          role: string
        }
        Update: {
          created_at?: string
          role?: string
        }
        Relationships: []
      }
      student_reports: {
        Row: {
          created_at: string | null
          id: string
          kf_avg_data: Json | null
          llm_feedback: Json | null
          report_data: Json
          time_window: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          kf_avg_data?: Json | null
          llm_feedback?: Json | null
          report_data: Json
          time_window: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kf_avg_data?: Json | null
          llm_feedback?: Json | null
          report_data?: Json
          time_window?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          role: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          role?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authorize: {
        Args: { requested_permission: string }
        Returns: boolean
      }
      average_turnaround_days: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      collect_epa_settings: {
        Args: { student_id_input: string; cutoff: string }
        Returns: Json
      }
      custom_access_token_hook: {
        Args: { event: Json }
        Returns: Json
      }
      extract_comments: {
        Args: { student_id_input: string; cutoff: string }
        Returns: Json
      }
      extract_latest_dates: {
        Args: { student_id_input: string; cutoff: string }
        Returns: Json
      }
      extract_settings: {
        Args: { student_id_input: string; cutoff: string }
        Returns: Json
      }
      fetch_role_permissions: {
        Args: { role: string }
        Returns: string[]
      }
      fetch_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          role: string
          email: string
          display_name: string
        }[]
      }
      generate_report: {
        Args: {
          student_id_input: string
          time_range_input: number
          report_title: string
        }
        Returns: undefined
      }
      get_assessment_count: {
        Args: { student_id_input: string; cutoff: string }
        Returns: number
      }
      get_delinquent_raters: {
        Args: Record<PropertyKey, never>
        Returns: {
          rater_id: string
          display_name: string
          email: string
          count: number
        }[]
      }
      get_email_by_user_id: {
        Args: { user_id: string }
        Returns: string
      }
      get_latest_assessment_date: {
        Args: { student_id_input: string; cutoff: string }
        Returns: string
      }
      get_raw_comments: {
        Args: { student_id_input: string; cutoff: string }
        Returns: {
          form_id: string
          response: Json
        }[]
      }
      get_raw_form_results: {
        Args: { student_id_input: string; cutoff: string }
        Returns: {
          form_id: string
          created_at: string
          results: Json
          clinical_settings: string
        }[]
      }
      get_user_role_by_user_id: {
        Args: { id: string }
        Returns: string
      }
      monthly_epa_distribution: {
        Args: Record<PropertyKey, never>
        Returns: {
          epa: string
          month: string
          count: number
        }[]
      }
      monthly_form_submissions: {
        Args: Record<PropertyKey, never>
        Returns: {
          month: string
          count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  trainingdata: {
    Tables: {
      mcq_kf1_1: {
        Row: {
          c1_1_1: boolean | null
          c1_1_2: boolean | null
          c1_1_3: boolean | null
          c1_1_4: boolean | null
          c1_1_5: boolean | null
          c1_1_6: boolean | null
          c1_1_7: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c1_1_1?: boolean | null
          c1_1_2?: boolean | null
          c1_1_3?: boolean | null
          c1_1_4?: boolean | null
          c1_1_5?: boolean | null
          c1_1_6?: boolean | null
          c1_1_7?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c1_1_1?: boolean | null
          c1_1_2?: boolean | null
          c1_1_3?: boolean | null
          c1_1_4?: boolean | null
          c1_1_5?: boolean | null
          c1_1_6?: boolean | null
          c1_1_7?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf1_2: {
        Row: {
          c1_2_1: boolean | null
          c1_2_2: boolean | null
          c1_2_3: boolean | null
          c1_2_4: boolean | null
          c1_2_5: boolean | null
          c1_2_6: boolean | null
          c1_2_7: boolean | null
          c1_2_8: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c1_2_1?: boolean | null
          c1_2_2?: boolean | null
          c1_2_3?: boolean | null
          c1_2_4?: boolean | null
          c1_2_5?: boolean | null
          c1_2_6?: boolean | null
          c1_2_7?: boolean | null
          c1_2_8?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c1_2_1?: boolean | null
          c1_2_2?: boolean | null
          c1_2_3?: boolean | null
          c1_2_4?: boolean | null
          c1_2_5?: boolean | null
          c1_2_6?: boolean | null
          c1_2_7?: boolean | null
          c1_2_8?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf1_3: {
        Row: {
          c1_3_1: boolean | null
          c1_3_2: boolean | null
          c1_3_3: boolean | null
          c1_3_4: boolean | null
          c1_3_5: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c1_3_1?: boolean | null
          c1_3_2?: boolean | null
          c1_3_3?: boolean | null
          c1_3_4?: boolean | null
          c1_3_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c1_3_1?: boolean | null
          c1_3_2?: boolean | null
          c1_3_3?: boolean | null
          c1_3_4?: boolean | null
          c1_3_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf1_4: {
        Row: {
          c1_4_1: boolean | null
          c1_4_2: boolean | null
          c1_4_3: boolean | null
          c1_4_4: boolean | null
          c1_4_5: boolean | null
          c1_4_6: boolean | null
          c1_4_7: boolean | null
          c1_4_8: boolean | null
          c1_4_9: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c1_4_1?: boolean | null
          c1_4_2?: boolean | null
          c1_4_3?: boolean | null
          c1_4_4?: boolean | null
          c1_4_5?: boolean | null
          c1_4_6?: boolean | null
          c1_4_7?: boolean | null
          c1_4_8?: boolean | null
          c1_4_9?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c1_4_1?: boolean | null
          c1_4_2?: boolean | null
          c1_4_3?: boolean | null
          c1_4_4?: boolean | null
          c1_4_5?: boolean | null
          c1_4_6?: boolean | null
          c1_4_7?: boolean | null
          c1_4_8?: boolean | null
          c1_4_9?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf10_1: {
        Row: {
          c10_1_1: boolean | null
          c10_1_2: boolean | null
          c10_1_3: boolean | null
          c10_1_4: boolean | null
          c10_1_5: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c10_1_1?: boolean | null
          c10_1_2?: boolean | null
          c10_1_3?: boolean | null
          c10_1_4?: boolean | null
          c10_1_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c10_1_1?: boolean | null
          c10_1_2?: boolean | null
          c10_1_3?: boolean | null
          c10_1_4?: boolean | null
          c10_1_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf10_2: {
        Row: {
          c10_2_1: boolean | null
          c10_2_2: boolean | null
          c10_2_3: boolean | null
          c10_2_4: boolean | null
          c10_2_5: boolean | null
          c10_2_6: boolean | null
          c10_2_7: boolean | null
          c10_2_8: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c10_2_1?: boolean | null
          c10_2_2?: boolean | null
          c10_2_3?: boolean | null
          c10_2_4?: boolean | null
          c10_2_5?: boolean | null
          c10_2_6?: boolean | null
          c10_2_7?: boolean | null
          c10_2_8?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c10_2_1?: boolean | null
          c10_2_2?: boolean | null
          c10_2_3?: boolean | null
          c10_2_4?: boolean | null
          c10_2_5?: boolean | null
          c10_2_6?: boolean | null
          c10_2_7?: boolean | null
          c10_2_8?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf10_3: {
        Row: {
          c10_3_1: boolean | null
          c10_3_2: boolean | null
          c10_3_3: boolean | null
          c10_3_4: boolean | null
          c10_3_5: boolean | null
          c10_3_6: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c10_3_1?: boolean | null
          c10_3_2?: boolean | null
          c10_3_3?: boolean | null
          c10_3_4?: boolean | null
          c10_3_5?: boolean | null
          c10_3_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c10_3_1?: boolean | null
          c10_3_2?: boolean | null
          c10_3_3?: boolean | null
          c10_3_4?: boolean | null
          c10_3_5?: boolean | null
          c10_3_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf10_4: {
        Row: {
          c10_4_1: boolean | null
          c10_4_2: boolean | null
          c10_4_3: boolean | null
          c10_4_4: boolean | null
          c10_4_5: boolean | null
          c10_4_6: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c10_4_1?: boolean | null
          c10_4_2?: boolean | null
          c10_4_3?: boolean | null
          c10_4_4?: boolean | null
          c10_4_5?: boolean | null
          c10_4_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c10_4_1?: boolean | null
          c10_4_2?: boolean | null
          c10_4_3?: boolean | null
          c10_4_4?: boolean | null
          c10_4_5?: boolean | null
          c10_4_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf11_1: {
        Row: {
          c11_1_1: boolean | null
          c11_1_2: boolean | null
          c11_1_3: boolean | null
          c11_1_4: boolean | null
          c11_1_5: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c11_1_1?: boolean | null
          c11_1_2?: boolean | null
          c11_1_3?: boolean | null
          c11_1_4?: boolean | null
          c11_1_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c11_1_1?: boolean | null
          c11_1_2?: boolean | null
          c11_1_3?: boolean | null
          c11_1_4?: boolean | null
          c11_1_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf11_2: {
        Row: {
          c11_2_1: boolean | null
          c11_2_2: boolean | null
          c11_2_3: boolean | null
          c11_2_4: boolean | null
          c11_2_5: boolean | null
          c11_2_6: boolean | null
          c11_2_7: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c11_2_1?: boolean | null
          c11_2_2?: boolean | null
          c11_2_3?: boolean | null
          c11_2_4?: boolean | null
          c11_2_5?: boolean | null
          c11_2_6?: boolean | null
          c11_2_7?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c11_2_1?: boolean | null
          c11_2_2?: boolean | null
          c11_2_3?: boolean | null
          c11_2_4?: boolean | null
          c11_2_5?: boolean | null
          c11_2_6?: boolean | null
          c11_2_7?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf11_3: {
        Row: {
          c11_3_1: boolean | null
          c11_3_2: boolean | null
          c11_3_3: boolean | null
          c11_3_4: boolean | null
          c11_3_5: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c11_3_1?: boolean | null
          c11_3_2?: boolean | null
          c11_3_3?: boolean | null
          c11_3_4?: boolean | null
          c11_3_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c11_3_1?: boolean | null
          c11_3_2?: boolean | null
          c11_3_3?: boolean | null
          c11_3_4?: boolean | null
          c11_3_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf12_1: {
        Row: {
          c12_1_1: boolean | null
          c12_1_2: boolean | null
          c12_1_3: boolean | null
          c12_1_4: boolean | null
          c12_1_5: boolean | null
          c12_2_6: boolean | null
          c12_2_7: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c12_1_1?: boolean | null
          c12_1_2?: boolean | null
          c12_1_3?: boolean | null
          c12_1_4?: boolean | null
          c12_1_5?: boolean | null
          c12_2_6?: boolean | null
          c12_2_7?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c12_1_1?: boolean | null
          c12_1_2?: boolean | null
          c12_1_3?: boolean | null
          c12_1_4?: boolean | null
          c12_1_5?: boolean | null
          c12_2_6?: boolean | null
          c12_2_7?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf12_2: {
        Row: {
          c12_2_1: boolean | null
          c12_2_2: boolean | null
          c12_2_3: boolean | null
          c12_2_4: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c12_2_1?: boolean | null
          c12_2_2?: boolean | null
          c12_2_3?: boolean | null
          c12_2_4?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c12_2_1?: boolean | null
          c12_2_2?: boolean | null
          c12_2_3?: boolean | null
          c12_2_4?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf12_3: {
        Row: {
          c12_3_1: boolean | null
          c12_3_2: boolean | null
          c12_3_3: boolean | null
          c12_3_4: boolean | null
          c12_3_5: boolean | null
          c12_3_6: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c12_3_1?: boolean | null
          c12_3_2?: boolean | null
          c12_3_3?: boolean | null
          c12_3_4?: boolean | null
          c12_3_5?: boolean | null
          c12_3_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c12_3_1?: boolean | null
          c12_3_2?: boolean | null
          c12_3_3?: boolean | null
          c12_3_4?: boolean | null
          c12_3_5?: boolean | null
          c12_3_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf12_4: {
        Row: {
          c12_4_1: boolean | null
          c12_4_2: boolean | null
          c12_4_3: boolean | null
          c12_4_4: boolean | null
          c12_4_5: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c12_4_1?: boolean | null
          c12_4_2?: boolean | null
          c12_4_3?: boolean | null
          c12_4_4?: boolean | null
          c12_4_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c12_4_1?: boolean | null
          c12_4_2?: boolean | null
          c12_4_3?: boolean | null
          c12_4_4?: boolean | null
          c12_4_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf13_1: {
        Row: {
          c13_1_1: boolean | null
          c13_1_2: boolean | null
          c13_1_3: boolean | null
          c13_1_4: boolean | null
          c13_1_5: boolean | null
          c13_1_6: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c13_1_1?: boolean | null
          c13_1_2?: boolean | null
          c13_1_3?: boolean | null
          c13_1_4?: boolean | null
          c13_1_5?: boolean | null
          c13_1_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c13_1_1?: boolean | null
          c13_1_2?: boolean | null
          c13_1_3?: boolean | null
          c13_1_4?: boolean | null
          c13_1_5?: boolean | null
          c13_1_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf13_2: {
        Row: {
          c13_2_1: boolean | null
          c13_2_2: boolean | null
          c13_2_3: boolean | null
          c13_2_4: boolean | null
          c13_2_5: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c13_2_1?: boolean | null
          c13_2_2?: boolean | null
          c13_2_3?: boolean | null
          c13_2_4?: boolean | null
          c13_2_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c13_2_1?: boolean | null
          c13_2_2?: boolean | null
          c13_2_3?: boolean | null
          c13_2_4?: boolean | null
          c13_2_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf13_3: {
        Row: {
          c13_3_1: boolean | null
          c13_3_2: boolean | null
          c13_3_3: boolean | null
          c13_3_4: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c13_3_1?: boolean | null
          c13_3_2?: boolean | null
          c13_3_3?: boolean | null
          c13_3_4?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c13_3_1?: boolean | null
          c13_3_2?: boolean | null
          c13_3_3?: boolean | null
          c13_3_4?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf13_4: {
        Row: {
          c13_4_1: boolean | null
          c13_4_10: boolean | null
          c13_4_2: boolean | null
          c13_4_3: boolean | null
          c13_4_4: boolean | null
          c13_4_5: boolean | null
          c13_4_6: boolean | null
          c13_4_7: boolean | null
          c13_4_8: boolean | null
          c13_4_9: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c13_4_1?: boolean | null
          c13_4_10?: boolean | null
          c13_4_2?: boolean | null
          c13_4_3?: boolean | null
          c13_4_4?: boolean | null
          c13_4_5?: boolean | null
          c13_4_6?: boolean | null
          c13_4_7?: boolean | null
          c13_4_8?: boolean | null
          c13_4_9?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c13_4_1?: boolean | null
          c13_4_10?: boolean | null
          c13_4_2?: boolean | null
          c13_4_3?: boolean | null
          c13_4_4?: boolean | null
          c13_4_5?: boolean | null
          c13_4_6?: boolean | null
          c13_4_7?: boolean | null
          c13_4_8?: boolean | null
          c13_4_9?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf2_1: {
        Row: {
          c2_1_1: boolean | null
          c2_1_2: boolean | null
          c2_1_3: boolean | null
          c2_1_4: boolean | null
          c2_1_5: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c2_1_1?: boolean | null
          c2_1_2?: boolean | null
          c2_1_3?: boolean | null
          c2_1_4?: boolean | null
          c2_1_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c2_1_1?: boolean | null
          c2_1_2?: boolean | null
          c2_1_3?: boolean | null
          c2_1_4?: boolean | null
          c2_1_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf2_2: {
        Row: {
          c2_2_1: boolean | null
          c2_2_2: boolean | null
          c2_2_3: boolean | null
          c2_2_4: boolean | null
          c2_2_5: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c2_2_1?: boolean | null
          c2_2_2?: boolean | null
          c2_2_3?: boolean | null
          c2_2_4?: boolean | null
          c2_2_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c2_2_1?: boolean | null
          c2_2_2?: boolean | null
          c2_2_3?: boolean | null
          c2_2_4?: boolean | null
          c2_2_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf2_3: {
        Row: {
          c2_3_1: boolean | null
          c2_3_2: boolean | null
          c2_3_3: boolean | null
          c2_3_4: boolean | null
          c2_3_5: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c2_3_1?: boolean | null
          c2_3_2?: boolean | null
          c2_3_3?: boolean | null
          c2_3_4?: boolean | null
          c2_3_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c2_3_1?: boolean | null
          c2_3_2?: boolean | null
          c2_3_3?: boolean | null
          c2_3_4?: boolean | null
          c2_3_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf3_1: {
        Row: {
          c3_1_1: boolean | null
          c3_1_2: boolean | null
          c3_1_3: boolean | null
          c3_1_4: boolean | null
          c3_1_5: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c3_1_1?: boolean | null
          c3_1_2?: boolean | null
          c3_1_3?: boolean | null
          c3_1_4?: boolean | null
          c3_1_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c3_1_1?: boolean | null
          c3_1_2?: boolean | null
          c3_1_3?: boolean | null
          c3_1_4?: boolean | null
          c3_1_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf3_2: {
        Row: {
          c3_2_1: boolean | null
          c3_2_2: boolean | null
          c3_2_3: boolean | null
          c3_2_4: boolean | null
          c3_2_5: boolean | null
          c3_2_6: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c3_2_1?: boolean | null
          c3_2_2?: boolean | null
          c3_2_3?: boolean | null
          c3_2_4?: boolean | null
          c3_2_5?: boolean | null
          c3_2_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c3_2_1?: boolean | null
          c3_2_2?: boolean | null
          c3_2_3?: boolean | null
          c3_2_4?: boolean | null
          c3_2_5?: boolean | null
          c3_2_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf3_3: {
        Row: {
          c3_3_1: boolean | null
          c3_3_2: boolean | null
          c3_3_3: boolean | null
          c3_3_4: boolean | null
          c3_3_5: boolean | null
          c3_3_6: boolean | null
          c3_3_7: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c3_3_1?: boolean | null
          c3_3_2?: boolean | null
          c3_3_3?: boolean | null
          c3_3_4?: boolean | null
          c3_3_5?: boolean | null
          c3_3_6?: boolean | null
          c3_3_7?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c3_3_1?: boolean | null
          c3_3_2?: boolean | null
          c3_3_3?: boolean | null
          c3_3_4?: boolean | null
          c3_3_5?: boolean | null
          c3_3_6?: boolean | null
          c3_3_7?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf4_1: {
        Row: {
          c4_1_1: boolean | null
          c4_1_2: boolean | null
          c4_1_3: boolean | null
          c4_1_4: boolean | null
          c4_1_5: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c4_1_1?: boolean | null
          c4_1_2?: boolean | null
          c4_1_3?: boolean | null
          c4_1_4?: boolean | null
          c4_1_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c4_1_1?: boolean | null
          c4_1_2?: boolean | null
          c4_1_3?: boolean | null
          c4_1_4?: boolean | null
          c4_1_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf4_2: {
        Row: {
          c4_2_1: boolean | null
          c4_2_2: boolean | null
          c4_2_3: boolean | null
          c4_2_4: boolean | null
          c4_2_5: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c4_2_1?: boolean | null
          c4_2_2?: boolean | null
          c4_2_3?: boolean | null
          c4_2_4?: boolean | null
          c4_2_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c4_2_1?: boolean | null
          c4_2_2?: boolean | null
          c4_2_3?: boolean | null
          c4_2_4?: boolean | null
          c4_2_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf4_3: {
        Row: {
          c4_3_1: boolean | null
          c4_3_2: boolean | null
          c4_3_3: boolean | null
          c4_3_4: boolean | null
          c4_3_5: boolean | null
          c4_3_6: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c4_3_1?: boolean | null
          c4_3_2?: boolean | null
          c4_3_3?: boolean | null
          c4_3_4?: boolean | null
          c4_3_5?: boolean | null
          c4_3_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c4_3_1?: boolean | null
          c4_3_2?: boolean | null
          c4_3_3?: boolean | null
          c4_3_4?: boolean | null
          c4_3_5?: boolean | null
          c4_3_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf4_4: {
        Row: {
          c4_4_1: boolean | null
          c4_4_2: boolean | null
          c4_4_3: boolean | null
          c4_4_4: boolean | null
          c4_4_5: boolean | null
          c4_4_6: boolean | null
          c4_4_7: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c4_4_1?: boolean | null
          c4_4_2?: boolean | null
          c4_4_3?: boolean | null
          c4_4_4?: boolean | null
          c4_4_5?: boolean | null
          c4_4_6?: boolean | null
          c4_4_7?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c4_4_1?: boolean | null
          c4_4_2?: boolean | null
          c4_4_3?: boolean | null
          c4_4_4?: boolean | null
          c4_4_5?: boolean | null
          c4_4_6?: boolean | null
          c4_4_7?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf5_1: {
        Row: {
          c5_1_1: boolean | null
          c5_1_2: boolean | null
          c5_1_3: boolean | null
          c5_1_4: boolean | null
          c5_1_5: boolean | null
          c5_1_6: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c5_1_1?: boolean | null
          c5_1_2?: boolean | null
          c5_1_3?: boolean | null
          c5_1_4?: boolean | null
          c5_1_5?: boolean | null
          c5_1_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c5_1_1?: boolean | null
          c5_1_2?: boolean | null
          c5_1_3?: boolean | null
          c5_1_4?: boolean | null
          c5_1_5?: boolean | null
          c5_1_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf5_2: {
        Row: {
          c5_2_1: boolean | null
          c5_2_2: boolean | null
          c5_2_3: boolean | null
          c5_2_4: boolean | null
          c5_2_5: boolean | null
          c5_2_6: boolean | null
          c5_2_7: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c5_2_1?: boolean | null
          c5_2_2?: boolean | null
          c5_2_3?: boolean | null
          c5_2_4?: boolean | null
          c5_2_5?: boolean | null
          c5_2_6?: boolean | null
          c5_2_7?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c5_2_1?: boolean | null
          c5_2_2?: boolean | null
          c5_2_3?: boolean | null
          c5_2_4?: boolean | null
          c5_2_5?: boolean | null
          c5_2_6?: boolean | null
          c5_2_7?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf5_3: {
        Row: {
          c5_3_1: boolean | null
          c5_3_2: boolean | null
          c5_3_3: boolean | null
          c5_3_4: boolean | null
          c5_3_5: boolean | null
          c5_3_6: boolean | null
          c5_3_7: boolean | null
          c5_3_8: boolean | null
          c5_3_9: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c5_3_1?: boolean | null
          c5_3_2?: boolean | null
          c5_3_3?: boolean | null
          c5_3_4?: boolean | null
          c5_3_5?: boolean | null
          c5_3_6?: boolean | null
          c5_3_7?: boolean | null
          c5_3_8?: boolean | null
          c5_3_9?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c5_3_1?: boolean | null
          c5_3_2?: boolean | null
          c5_3_3?: boolean | null
          c5_3_4?: boolean | null
          c5_3_5?: boolean | null
          c5_3_6?: boolean | null
          c5_3_7?: boolean | null
          c5_3_8?: boolean | null
          c5_3_9?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf6_1: {
        Row: {
          c6_1_1: boolean | null
          c6_1_2: boolean | null
          c6_1_3: boolean | null
          c6_1_4: boolean | null
          c6_1_5: boolean | null
          c6_1_6: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c6_1_1?: boolean | null
          c6_1_2?: boolean | null
          c6_1_3?: boolean | null
          c6_1_4?: boolean | null
          c6_1_5?: boolean | null
          c6_1_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c6_1_1?: boolean | null
          c6_1_2?: boolean | null
          c6_1_3?: boolean | null
          c6_1_4?: boolean | null
          c6_1_5?: boolean | null
          c6_1_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf6_2: {
        Row: {
          c6_2_1: boolean | null
          c6_2_2: boolean | null
          c6_2_3: boolean | null
          c6_2_4: boolean | null
          c6_2_5: boolean | null
          c6_2_6: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c6_2_1?: boolean | null
          c6_2_2?: boolean | null
          c6_2_3?: boolean | null
          c6_2_4?: boolean | null
          c6_2_5?: boolean | null
          c6_2_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c6_2_1?: boolean | null
          c6_2_2?: boolean | null
          c6_2_3?: boolean | null
          c6_2_4?: boolean | null
          c6_2_5?: boolean | null
          c6_2_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf6_3: {
        Row: {
          c6_3_1: boolean | null
          c6_3_2: boolean | null
          c6_3_3: boolean | null
          c6_3_4: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c6_3_1?: boolean | null
          c6_3_2?: boolean | null
          c6_3_3?: boolean | null
          c6_3_4?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c6_3_1?: boolean | null
          c6_3_2?: boolean | null
          c6_3_3?: boolean | null
          c6_3_4?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf6_4: {
        Row: {
          c6_4_1: boolean | null
          c6_4_2: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c6_4_1?: boolean | null
          c6_4_2?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c6_4_1?: boolean | null
          c6_4_2?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf7_1: {
        Row: {
          c7_1_1: boolean | null
          c7_1_2: boolean | null
          c7_1_3: boolean | null
          c7_1_4: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c7_1_1?: boolean | null
          c7_1_2?: boolean | null
          c7_1_3?: boolean | null
          c7_1_4?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c7_1_1?: boolean | null
          c7_1_2?: boolean | null
          c7_1_3?: boolean | null
          c7_1_4?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf7_2: {
        Row: {
          c7_2_1: boolean | null
          c7_2_2: boolean | null
          c7_2_3: boolean | null
          c7_2_4: boolean | null
          c7_2_5: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c7_2_1?: boolean | null
          c7_2_2?: boolean | null
          c7_2_3?: boolean | null
          c7_2_4?: boolean | null
          c7_2_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c7_2_1?: boolean | null
          c7_2_2?: boolean | null
          c7_2_3?: boolean | null
          c7_2_4?: boolean | null
          c7_2_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf7_3: {
        Row: {
          c7_3_1: boolean | null
          c7_3_2: boolean | null
          c7_3_3: boolean | null
          c7_3_4: boolean | null
          c7_3_5: boolean | null
          c7_3_6: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c7_3_1?: boolean | null
          c7_3_2?: boolean | null
          c7_3_3?: boolean | null
          c7_3_4?: boolean | null
          c7_3_5?: boolean | null
          c7_3_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c7_3_1?: boolean | null
          c7_3_2?: boolean | null
          c7_3_3?: boolean | null
          c7_3_4?: boolean | null
          c7_3_5?: boolean | null
          c7_3_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf7_4: {
        Row: {
          c7_4_1: boolean | null
          c7_4_2: boolean | null
          c7_4_3: boolean | null
          c7_4_4: boolean | null
          c7_4_5: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c7_4_1?: boolean | null
          c7_4_2?: boolean | null
          c7_4_3?: boolean | null
          c7_4_4?: boolean | null
          c7_4_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c7_4_1?: boolean | null
          c7_4_2?: boolean | null
          c7_4_3?: boolean | null
          c7_4_4?: boolean | null
          c7_4_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf8_1: {
        Row: {
          c8_1_1: boolean | null
          c8_1_2: boolean | null
          c8_1_3: boolean | null
          c8_1_4: boolean | null
          c8_1_5: boolean | null
          c8_1_6: boolean | null
          c8_1_7: boolean | null
          c8_1_8: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c8_1_1?: boolean | null
          c8_1_2?: boolean | null
          c8_1_3?: boolean | null
          c8_1_4?: boolean | null
          c8_1_5?: boolean | null
          c8_1_6?: boolean | null
          c8_1_7?: boolean | null
          c8_1_8?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c8_1_1?: boolean | null
          c8_1_2?: boolean | null
          c8_1_3?: boolean | null
          c8_1_4?: boolean | null
          c8_1_5?: boolean | null
          c8_1_6?: boolean | null
          c8_1_7?: boolean | null
          c8_1_8?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf8_2: {
        Row: {
          c8_2_1: boolean | null
          c8_2_2: boolean | null
          c8_2_3: boolean | null
          c8_2_4: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c8_2_1?: boolean | null
          c8_2_2?: boolean | null
          c8_2_3?: boolean | null
          c8_2_4?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c8_2_1?: boolean | null
          c8_2_2?: boolean | null
          c8_2_3?: boolean | null
          c8_2_4?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf8_3: {
        Row: {
          c8_3_1: boolean | null
          c8_3_2: boolean | null
          c8_3_3: boolean | null
          c8_3_4: boolean | null
          c8_3_5: boolean | null
          c8_3_6: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c8_3_1?: boolean | null
          c8_3_2?: boolean | null
          c8_3_3?: boolean | null
          c8_3_4?: boolean | null
          c8_3_5?: boolean | null
          c8_3_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c8_3_1?: boolean | null
          c8_3_2?: boolean | null
          c8_3_3?: boolean | null
          c8_3_4?: boolean | null
          c8_3_5?: boolean | null
          c8_3_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf8_4: {
        Row: {
          c8_4_1: boolean | null
          c8_4_2: boolean | null
          c8_4_3: boolean | null
          c8_4_4: boolean | null
          c8_4_5: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c8_4_1?: boolean | null
          c8_4_2?: boolean | null
          c8_4_3?: boolean | null
          c8_4_4?: boolean | null
          c8_4_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c8_4_1?: boolean | null
          c8_4_2?: boolean | null
          c8_4_3?: boolean | null
          c8_4_4?: boolean | null
          c8_4_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf8_5: {
        Row: {
          c8_5_1: boolean | null
          c8_5_2: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c8_5_1?: boolean | null
          c8_5_2?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c8_5_1?: boolean | null
          c8_5_2?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf9_1: {
        Row: {
          c9_1_1: boolean | null
          c9_1_2: boolean | null
          c9_1_3: boolean | null
          c9_1_4: boolean | null
          c9_1_5: boolean | null
          c9_1_6: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c9_1_1?: boolean | null
          c9_1_2?: boolean | null
          c9_1_3?: boolean | null
          c9_1_4?: boolean | null
          c9_1_5?: boolean | null
          c9_1_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c9_1_1?: boolean | null
          c9_1_2?: boolean | null
          c9_1_3?: boolean | null
          c9_1_4?: boolean | null
          c9_1_5?: boolean | null
          c9_1_6?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf9_2: {
        Row: {
          c9_2_1: boolean | null
          c9_2_2: boolean | null
          c9_2_3: boolean | null
          c9_2_4: boolean | null
          c9_2_5: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c9_2_1?: boolean | null
          c9_2_2?: boolean | null
          c9_2_3?: boolean | null
          c9_2_4?: boolean | null
          c9_2_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c9_2_1?: boolean | null
          c9_2_2?: boolean | null
          c9_2_3?: boolean | null
          c9_2_4?: boolean | null
          c9_2_5?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_kf9_3: {
        Row: {
          c9_3_1: boolean | null
          c9_3_2: boolean | null
          c9_3_3: boolean | null
          c9_3_4: boolean | null
          c9_3_5: boolean | null
          c9_3_6: boolean | null
          c9_3_7: boolean | null
          c9_3_8: boolean | null
          created_at: string | null
          dev_level: number | null
          id: number
          user_id: string | null
        }
        Insert: {
          c9_3_1?: boolean | null
          c9_3_2?: boolean | null
          c9_3_3?: boolean | null
          c9_3_4?: boolean | null
          c9_3_5?: boolean | null
          c9_3_6?: boolean | null
          c9_3_7?: boolean | null
          c9_3_8?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Update: {
          c9_3_1?: boolean | null
          c9_3_2?: boolean | null
          c9_3_3?: boolean | null
          c9_3_4?: boolean | null
          c9_3_5?: boolean | null
          c9_3_6?: boolean | null
          c9_3_7?: boolean | null
          c9_3_8?: boolean | null
          created_at?: string | null
          dev_level?: number | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      mcq_table_row_counts: {
        Row: {
          last_updated: string | null
          row_count: number
          table_name: string
        }
        Insert: {
          last_updated?: string | null
          row_count: number
          table_name: string
        }
        Update: {
          last_updated?: string | null
          row_count?: number
          table_name?: string
        }
        Relationships: []
      }
      text_responses: {
        Row: {
          created_at: string
          dev_level: number | null
          epa: number | null
          id: number
          text: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dev_level?: number | null
          epa?: number | null
          id?: number
          text?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dev_level?: number | null
          epa?: number | null
          id?: number
          text?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
  trainingdata: {
    Enums: {},
  },
} as const
