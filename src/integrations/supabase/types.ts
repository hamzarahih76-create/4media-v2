export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          rarity: string
          requirement_type: string
          requirement_value: number
          xp_reward: number
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          rarity: string
          requirement_type: string
          requirement_value: number
          xp_reward?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          rarity?: string
          requirement_type?: string
          requirement_value?: number
          xp_reward?: number
        }
        Relationships: []
      }
      client_analytics: {
        Row: {
          client_user_id: string
          created_at: string
          created_by: string | null
          engagement_rate: number | null
          followers_change: number | null
          followers_count: number | null
          id: string
          month: string
          notes: string | null
          top_content_id: string | null
          total_comments: number | null
          total_likes: number | null
          total_views: number | null
          updated_at: string
        }
        Insert: {
          client_user_id: string
          created_at?: string
          created_by?: string | null
          engagement_rate?: number | null
          followers_change?: number | null
          followers_count?: number | null
          id?: string
          month: string
          notes?: string | null
          top_content_id?: string | null
          total_comments?: number | null
          total_likes?: number | null
          total_views?: number | null
          updated_at?: string
        }
        Update: {
          client_user_id?: string
          created_at?: string
          created_by?: string | null
          engagement_rate?: number | null
          followers_change?: number | null
          followers_count?: number | null
          id?: string
          month?: string
          notes?: string | null
          top_content_id?: string | null
          total_comments?: number | null
          total_likes?: number | null
          total_views?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_analytics_top_content_id_fkey"
            columns: ["top_content_id"]
            isOneToOne: false
            referencedRelation: "client_content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      client_content_items: {
        Row: {
          client_user_id: string
          content_type: string
          created_at: string
          created_by: string | null
          description: string | null
          external_link: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          related_design_task_id: string | null
          related_task_id: string | null
          related_video_id: string | null
          sort_order: number | null
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          workflow_step: Database["public"]["Enums"]["workflow_step"]
        }
        Insert: {
          client_user_id: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_link?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          related_design_task_id?: string | null
          related_task_id?: string | null
          related_video_id?: string | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          workflow_step?: Database["public"]["Enums"]["workflow_step"]
        }
        Update: {
          client_user_id?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_link?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          related_design_task_id?: string | null
          related_task_id?: string | null
          related_video_id?: string | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          workflow_step?: Database["public"]["Enums"]["workflow_step"]
        }
        Relationships: [
          {
            foreignKeyName: "client_content_items_related_design_task_id_fkey"
            columns: ["related_design_task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_content_items_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_content_items_related_video_id_fkey"
            columns: ["related_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contracts: {
        Row: {
          client_activity: string | null
          client_address: string | null
          client_cin: string | null
          client_city: string | null
          client_email: string | null
          client_full_name: string | null
          client_ice: string | null
          client_legal_status: string | null
          client_name: string | null
          client_phone: string | null
          client_raison_sociale: string | null
          client_representant_legal: string | null
          client_siege_address: string | null
          client_user_id: string
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          duration_months: number
          id: string
          pack_price: number
          pack_type: string
          signature_data: string | null
          signed_at: string | null
          signing_ip: string | null
          status: string
          terms_accepted: boolean | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_activity?: string | null
          client_address?: string | null
          client_cin?: string | null
          client_city?: string | null
          client_email?: string | null
          client_full_name?: string | null
          client_ice?: string | null
          client_legal_status?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_raison_sociale?: string | null
          client_representant_legal?: string | null
          client_siege_address?: string | null
          client_user_id: string
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          duration_months: number
          id?: string
          pack_price: number
          pack_type: string
          signature_data?: string | null
          signed_at?: string | null
          signing_ip?: string | null
          status?: string
          terms_accepted?: boolean | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          client_activity?: string | null
          client_address?: string | null
          client_cin?: string | null
          client_city?: string | null
          client_email?: string | null
          client_full_name?: string | null
          client_ice?: string | null
          client_legal_status?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_raison_sociale?: string | null
          client_representant_legal?: string | null
          client_siege_address?: string | null
          client_user_id?: string
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          duration_months?: number
          id?: string
          pack_price?: number
          pack_type?: string
          signature_data?: string | null
          signed_at?: string | null
          signing_ip?: string | null
          status?: string
          terms_accepted?: boolean | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      client_feedback: {
        Row: {
          cloudflare_audio_id: string | null
          created_at: string
          decision: string
          delivery_id: string
          feedback_text: string | null
          id: string
          rating: number | null
          review_link_id: string
          reviewed_at: string
          reviewed_by: string | null
          revision_audio_path: string | null
          revision_images: string[] | null
          revision_notes: string | null
          task_id: string
        }
        Insert: {
          cloudflare_audio_id?: string | null
          created_at?: string
          decision: string
          delivery_id: string
          feedback_text?: string | null
          id?: string
          rating?: number | null
          review_link_id: string
          reviewed_at?: string
          reviewed_by?: string | null
          revision_audio_path?: string | null
          revision_images?: string[] | null
          revision_notes?: string | null
          task_id: string
        }
        Update: {
          cloudflare_audio_id?: string | null
          created_at?: string
          decision?: string
          delivery_id?: string
          feedback_text?: string | null
          id?: string
          rating?: number | null
          review_link_id?: string
          reviewed_at?: string
          reviewed_by?: string | null
          revision_audio_path?: string | null
          revision_images?: string[] | null
          revision_notes?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_feedback_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "task_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feedback_review_link_id_fkey"
            columns: ["review_link_id"]
            isOneToOne: false
            referencedRelation: "review_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feedback_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payments: {
        Row: {
          amount: number
          client_user_id: string
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          recorded_by: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          client_user_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          recorded_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_user_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          recorded_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_profiles: {
        Row: {
          accent_color: string | null
          account_status: string
          advance_received: number | null
          avatar_url: string | null
          client_objectives: string | null
          company_name: string
          contact_name: string | null
          contract_duration_months: number | null
          copywriter_id: string | null
          created_at: string
          design_carousels_per_month: number | null
          design_logos_per_month: number | null
          design_miniatures_per_month: number | null
          design_posts_per_month: number | null
          designer_id: string | null
          domain_activity: string | null
          email: string | null
          has_thumbnail_design: boolean | null
          id: string
          industry: string | null
          logo_url: string | null
          monthly_price: number | null
          next_shooting_date: string | null
          notes: string | null
          phone: string | null
          positioning: string | null
          primary_color: string | null
          project_end_date: string | null
          secondary_color: string | null
          shooting_day: string | null
          strategic_description: string | null
          studio_location: string | null
          subscription_type: string | null
          tone_style: string | null
          total_contract: number | null
          updated_at: string
          user_id: string
          videos_per_month: number | null
          visual_identity_notes: string | null
          workflow_status: string
        }
        Insert: {
          accent_color?: string | null
          account_status?: string
          advance_received?: number | null
          avatar_url?: string | null
          client_objectives?: string | null
          company_name: string
          contact_name?: string | null
          contract_duration_months?: number | null
          copywriter_id?: string | null
          created_at?: string
          design_carousels_per_month?: number | null
          design_logos_per_month?: number | null
          design_miniatures_per_month?: number | null
          design_posts_per_month?: number | null
          designer_id?: string | null
          domain_activity?: string | null
          email?: string | null
          has_thumbnail_design?: boolean | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          monthly_price?: number | null
          next_shooting_date?: string | null
          notes?: string | null
          phone?: string | null
          positioning?: string | null
          primary_color?: string | null
          project_end_date?: string | null
          secondary_color?: string | null
          shooting_day?: string | null
          strategic_description?: string | null
          studio_location?: string | null
          subscription_type?: string | null
          tone_style?: string | null
          total_contract?: number | null
          updated_at?: string
          user_id: string
          videos_per_month?: number | null
          visual_identity_notes?: string | null
          workflow_status?: string
        }
        Update: {
          accent_color?: string | null
          account_status?: string
          advance_received?: number | null
          avatar_url?: string | null
          client_objectives?: string | null
          company_name?: string
          contact_name?: string | null
          contract_duration_months?: number | null
          copywriter_id?: string | null
          created_at?: string
          design_carousels_per_month?: number | null
          design_logos_per_month?: number | null
          design_miniatures_per_month?: number | null
          design_posts_per_month?: number | null
          designer_id?: string | null
          domain_activity?: string | null
          email?: string | null
          has_thumbnail_design?: boolean | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          monthly_price?: number | null
          next_shooting_date?: string | null
          notes?: string | null
          phone?: string | null
          positioning?: string | null
          primary_color?: string | null
          project_end_date?: string | null
          secondary_color?: string | null
          shooting_day?: string | null
          strategic_description?: string | null
          studio_location?: string | null
          subscription_type?: string | null
          tone_style?: string | null
          total_contract?: number | null
          updated_at?: string
          user_id?: string
          videos_per_month?: number | null
          visual_identity_notes?: string | null
          workflow_status?: string
        }
        Relationships: []
      }
      client_rushes: {
        Row: {
          client_user_id: string
          created_at: string
          created_by: string | null
          editor_id: string | null
          external_link: string
          id: string
          link_type: string | null
          notes: string | null
          title: string
        }
        Insert: {
          client_user_id: string
          created_at?: string
          created_by?: string | null
          editor_id?: string | null
          external_link: string
          id?: string
          link_type?: string | null
          notes?: string | null
          title: string
        }
        Update: {
          client_user_id?: string
          created_at?: string
          created_by?: string | null
          editor_id?: string | null
          external_link?: string
          id?: string
          link_type?: string | null
          notes?: string | null
          title?: string
        }
        Relationships: []
      }
      community_messages: {
        Row: {
          author_name: string
          author_rank: string | null
          channel: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          author_name: string
          author_rank?: string | null
          channel?: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          author_name?: string
          author_rank?: string | null
          channel?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      design_deliveries: {
        Row: {
          created_at: string
          delivery_type: string
          design_task_id: string
          designer_id: string
          external_link: string | null
          file_path: string | null
          id: string
          link_type: string | null
          notes: string | null
          submitted_at: string
          version_number: number
        }
        Insert: {
          created_at?: string
          delivery_type: string
          design_task_id: string
          designer_id: string
          external_link?: string | null
          file_path?: string | null
          id?: string
          link_type?: string | null
          notes?: string | null
          submitted_at?: string
          version_number?: number
        }
        Update: {
          created_at?: string
          delivery_type?: string
          design_task_id?: string
          designer_id?: string
          external_link?: string | null
          file_path?: string | null
          id?: string
          link_type?: string | null
          notes?: string | null
          submitted_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "design_deliveries_design_task_id_fkey"
            columns: ["design_task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      design_feedback: {
        Row: {
          created_at: string
          decision: string
          delivery_id: string
          design_task_id: string
          feedback_text: string | null
          id: string
          rating: number | null
          review_link_id: string | null
          reviewed_at: string
          reviewed_by: string | null
          revision_audio_path: string | null
          revision_images: string[] | null
          revision_notes: string | null
          validated_by_pm: boolean | null
        }
        Insert: {
          created_at?: string
          decision: string
          delivery_id: string
          design_task_id: string
          feedback_text?: string | null
          id?: string
          rating?: number | null
          review_link_id?: string | null
          reviewed_at?: string
          reviewed_by?: string | null
          revision_audio_path?: string | null
          revision_images?: string[] | null
          revision_notes?: string | null
          validated_by_pm?: boolean | null
        }
        Update: {
          created_at?: string
          decision?: string
          delivery_id?: string
          design_task_id?: string
          feedback_text?: string | null
          id?: string
          rating?: number | null
          review_link_id?: string | null
          reviewed_at?: string
          reviewed_by?: string | null
          revision_audio_path?: string | null
          revision_images?: string[] | null
          revision_notes?: string | null
          validated_by_pm?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "design_feedback_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "design_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_feedback_design_task_id_fkey"
            columns: ["design_task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_feedback_review_link_id_fkey"
            columns: ["review_link_id"]
            isOneToOne: false
            referencedRelation: "design_review_links"
            referencedColumns: ["id"]
          },
        ]
      }
      design_project_review_links: {
        Row: {
          created_at: string
          design_task_id: string
          expires_at: string
          id: string
          is_active: boolean
          last_viewed_at: string | null
          token: string
          views_count: number
        }
        Insert: {
          created_at?: string
          design_task_id: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_viewed_at?: string | null
          token?: string
          views_count?: number
        }
        Update: {
          created_at?: string
          design_task_id?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_viewed_at?: string | null
          token?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "design_project_review_links_design_task_id_fkey"
            columns: ["design_task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      design_review_links: {
        Row: {
          created_at: string
          delivery_id: string
          design_task_id: string
          expires_at: string
          id: string
          is_active: boolean
          last_viewed_at: string | null
          token: string
          views_count: number
        }
        Insert: {
          created_at?: string
          delivery_id: string
          design_task_id: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_viewed_at?: string | null
          token?: string
          views_count?: number
        }
        Update: {
          created_at?: string
          delivery_id?: string
          design_task_id?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_viewed_at?: string | null
          token?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "design_review_links_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "design_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_review_links_design_task_id_fkey"
            columns: ["design_task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      design_tasks: {
        Row: {
          assigned_to: string | null
          client_name: string | null
          client_type: string | null
          client_user_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          design_count: number | null
          designs_completed: number | null
          id: string
          priority: string
          project_id: string | null
          project_name: string | null
          reward_level: string | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_name?: string | null
          client_type?: string | null
          client_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          design_count?: number | null
          designs_completed?: number | null
          id?: string
          priority?: string
          project_id?: string | null
          project_name?: string | null
          reward_level?: string | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_name?: string | null
          client_type?: string | null
          client_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          design_count?: number | null
          designs_completed?: number | null
          id?: string
          priority?: string
          project_id?: string | null
          project_name?: string | null
          reward_level?: string | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      designer_stats: {
        Row: {
          average_rating: number | null
          created_at: string
          id: string
          last_activity_date: string | null
          streak_days: number
          total_designs_delivered: number
          total_late: number
          total_on_time: number
          total_revisions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_rating?: number | null
          created_at?: string
          id?: string
          last_activity_date?: string | null
          streak_days?: number
          total_designs_delivered?: number
          total_late?: number
          total_on_time?: number
          total_revisions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_rating?: number | null
          created_at?: string
          id?: string
          last_activity_date?: string | null
          streak_days?: number
          total_designs_delivered?: number
          total_late?: number
          total_on_time?: number
          total_revisions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      editor_achievements: {
        Row: {
          achievement_id: string
          editor_id: string
          id: string
          unlocked_at: string
        }
        Insert: {
          achievement_id: string
          editor_id: string
          id?: string
          unlocked_at?: string
        }
        Update: {
          achievement_id?: string
          editor_id?: string
          id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "editor_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      editor_stats: {
        Row: {
          average_rating: number | null
          consecutive_late_count: number | null
          created_at: string
          id: string
          last_activity_date: string | null
          last_evaluation_date: string | null
          level: number
          monthly_xp_change: number | null
          rank: Database["public"]["Enums"]["editor_rank"]
          streak_days: number
          total_late: number
          total_on_time: number
          total_production_time_minutes: number
          total_revisions: number
          total_videos_delivered: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          average_rating?: number | null
          consecutive_late_count?: number | null
          created_at?: string
          id?: string
          last_activity_date?: string | null
          last_evaluation_date?: string | null
          level?: number
          monthly_xp_change?: number | null
          rank?: Database["public"]["Enums"]["editor_rank"]
          streak_days?: number
          total_late?: number
          total_on_time?: number
          total_production_time_minutes?: number
          total_revisions?: number
          total_videos_delivered?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          average_rating?: number | null
          consecutive_late_count?: number | null
          created_at?: string
          id?: string
          last_activity_date?: string | null
          last_evaluation_date?: string | null
          level?: number
          monthly_xp_change?: number | null
          rank?: Database["public"]["Enums"]["editor_rank"]
          streak_days?: number
          total_late?: number
          total_on_time?: number
          total_production_time_minutes?: number
          total_revisions?: number
          total_videos_delivered?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      landing_leads: {
        Row: {
          biggest_obstacle: string | null
          business_type: string[] | null
          content_interest: string | null
          country: string | null
          country_code: string | null
          created_at: string
          email: string
          first_name: string
          goals: string | null
          id: string
          instagram_username: string | null
          last_name: string
          monthly_income: string | null
          phone: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          will_notify_reschedule: string | null
        }
        Insert: {
          biggest_obstacle?: string | null
          business_type?: string[] | null
          content_interest?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          email: string
          first_name: string
          goals?: string | null
          id?: string
          instagram_username?: string | null
          last_name: string
          monthly_income?: string | null
          phone?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          will_notify_reschedule?: string | null
        }
        Update: {
          biggest_obstacle?: string | null
          business_type?: string[] | null
          content_interest?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          email?: string
          first_name?: string
          goals?: string | null
          id?: string
          instagram_username?: string | null
          last_name?: string
          monthly_income?: string | null
          phone?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          will_notify_reschedule?: string | null
        }
        Relationships: []
      }
      level_config: {
        Row: {
          created_at: string
          level: number
          perks: string[] | null
          rank: Database["public"]["Enums"]["editor_rank"]
          xp_required: number
        }
        Insert: {
          created_at?: string
          level: number
          perks?: string[] | null
          rank: Database["public"]["Enums"]["editor_rank"]
          xp_required: number
        }
        Update: {
          created_at?: string
          level?: number
          perks?: string[] | null
          rank?: Database["public"]["Enums"]["editor_rank"]
          xp_required?: number
        }
        Relationships: []
      }
      monthly_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          expense_date: string | null
          expense_type: string
          id: string
          label: string
          month: string
          notes: string | null
          recorded_by: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          expense_date?: string | null
          expense_type?: string
          id?: string
          label: string
          month: string
          notes?: string | null
          recorded_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string | null
          expense_type?: string
          id?: string
          label?: string
          month?: string
          notes?: string | null
          recorded_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          email_sent: boolean
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_sent?: boolean
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_sent?: boolean
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      review_links: {
        Row: {
          created_at: string
          delivery_id: string
          expires_at: string
          id: string
          is_active: boolean
          last_viewed_at: string | null
          task_id: string
          token: string
          views_count: number
        }
        Insert: {
          created_at?: string
          delivery_id: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_viewed_at?: string | null
          task_id: string
          token?: string
          views_count?: number
        }
        Update: {
          created_at?: string
          delivery_id?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_viewed_at?: string | null
          task_id?: string
          token?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_links_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "task_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_locations: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      task_deliveries: {
        Row: {
          created_at: string
          delivery_type: string
          editor_id: string
          external_link: string | null
          file_path: string | null
          id: string
          link_type: string | null
          notes: string | null
          submitted_at: string
          task_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          delivery_type: string
          editor_id: string
          external_link?: string | null
          file_path?: string | null
          id?: string
          link_type?: string | null
          notes?: string | null
          submitted_at?: string
          task_id: string
          version_number?: number
        }
        Update: {
          created_at?: string
          delivery_type?: string
          editor_id?: string
          external_link?: string | null
          file_path?: string | null
          id?: string
          link_type?: string | null
          notes?: string | null
          submitted_at?: string
          task_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_deliveries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          client_name: string | null
          client_type: string | null
          client_user_id: string | null
          completed_at: string | null
          copywriter_id: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          editor_instructions: string | null
          id: string
          priority: string
          project_id: string | null
          project_name: string | null
          reward_level: string | null
          source_files_link: string | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
          video_count: number | null
          videos_completed: number | null
        }
        Insert: {
          assigned_to?: string | null
          client_name?: string | null
          client_type?: string | null
          client_user_id?: string | null
          completed_at?: string | null
          copywriter_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          editor_instructions?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          project_name?: string | null
          reward_level?: string | null
          source_files_link?: string | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
          video_count?: number | null
          videos_completed?: number | null
        }
        Update: {
          assigned_to?: string | null
          client_name?: string | null
          client_type?: string | null
          client_user_id?: string | null
          completed_at?: string | null
          copywriter_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          editor_instructions?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          project_name?: string | null
          reward_level?: string | null
          source_files_link?: string | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          video_count?: number | null
          videos_completed?: number | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          activated_at: string | null
          admin_validated_at: string | null
          admin_validated_by: string | null
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string | null
          iban: string | null
          id: string
          id_card_url: string | null
          invited_at: string | null
          invited_by: string | null
          notes: string | null
          payment_method: string | null
          position: string | null
          profile_completed_at: string | null
          rate_per_video: number | null
          role: string | null
          status: string
          updated_at: string
          user_id: string | null
          validation_status: string | null
        }
        Insert: {
          activated_at?: string | null
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name?: string | null
          iban?: string | null
          id?: string
          id_card_url?: string | null
          invited_at?: string | null
          invited_by?: string | null
          notes?: string | null
          payment_method?: string | null
          position?: string | null
          profile_completed_at?: string | null
          rate_per_video?: number | null
          role?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          validation_status?: string | null
        }
        Update: {
          activated_at?: string | null
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string | null
          iban?: string | null
          id?: string
          id_card_url?: string | null
          invited_at?: string | null
          invited_by?: string | null
          notes?: string | null
          payment_method?: string | null
          position?: string | null
          profile_completed_at?: string | null
          rate_per_video?: number | null
          role?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          validation_status?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["permission_type"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission: Database["public"]["Enums"]["permission_type"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["permission_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_conversations: {
        Row: {
          created_at: string
          id: string
          is_answered: boolean
          message: string
          sender_id: string
          sender_name: string | null
          sender_type: string
          task_id: string | null
          video_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_answered?: boolean
          message: string
          sender_id: string
          sender_name?: string | null
          sender_type: string
          task_id?: string | null
          video_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_answered?: boolean
          message?: string
          sender_id?: string
          sender_name?: string | null
          sender_type?: string
          task_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_conversations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_conversations_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_deliveries: {
        Row: {
          cloudflare_stream_id: string | null
          created_at: string
          delivery_type: string
          editor_id: string
          external_link: string | null
          file_path: string | null
          id: string
          link_type: string | null
          notes: string | null
          submitted_at: string
          version_number: number
          video_id: string
        }
        Insert: {
          cloudflare_stream_id?: string | null
          created_at?: string
          delivery_type: string
          editor_id: string
          external_link?: string | null
          file_path?: string | null
          id?: string
          link_type?: string | null
          notes?: string | null
          submitted_at?: string
          version_number?: number
          video_id: string
        }
        Update: {
          cloudflare_stream_id?: string | null
          created_at?: string
          delivery_type?: string
          editor_id?: string
          external_link?: string | null
          file_path?: string | null
          id?: string
          link_type?: string | null
          notes?: string | null
          submitted_at?: string
          version_number?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_deliveries_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_feedback: {
        Row: {
          cloudflare_audio_id: string | null
          created_at: string
          decision: string
          delivery_id: string
          feedback_text: string | null
          id: string
          rating: number | null
          review_link_id: string
          reviewed_at: string
          reviewed_by: string | null
          revision_audio_path: string | null
          revision_images: string[] | null
          revision_notes: string | null
          video_id: string
        }
        Insert: {
          cloudflare_audio_id?: string | null
          created_at?: string
          decision: string
          delivery_id: string
          feedback_text?: string | null
          id?: string
          rating?: number | null
          review_link_id: string
          reviewed_at?: string
          reviewed_by?: string | null
          revision_audio_path?: string | null
          revision_images?: string[] | null
          revision_notes?: string | null
          video_id: string
        }
        Update: {
          cloudflare_audio_id?: string | null
          created_at?: string
          decision?: string
          delivery_id?: string
          feedback_text?: string | null
          id?: string
          rating?: number | null
          review_link_id?: string
          reviewed_at?: string
          reviewed_by?: string | null
          revision_audio_path?: string | null
          revision_images?: string[] | null
          revision_notes?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_feedback_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "video_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_feedback_review_link_id_fkey"
            columns: ["review_link_id"]
            isOneToOne: false
            referencedRelation: "video_review_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_feedback_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_project_review_links: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          last_viewed_at: string | null
          task_id: string
          token: string
          views_count: number
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_viewed_at?: string | null
          task_id: string
          token?: string
          views_count?: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_viewed_at?: string | null
          task_id?: string
          token?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_project_review_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      video_review_links: {
        Row: {
          created_at: string
          delivery_id: string
          expires_at: string
          id: string
          is_active: boolean
          last_viewed_at: string | null
          token: string
          video_id: string
          views_count: number
        }
        Insert: {
          created_at?: string
          delivery_id: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_viewed_at?: string | null
          token?: string
          video_id: string
          views_count?: number
        }
        Update: {
          created_at?: string
          delivery_id?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_viewed_at?: string | null
          token?: string
          video_id?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_review_links_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "video_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_review_links_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          allowed_duration_minutes: number | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          is_validated: boolean | null
          revision_count: number | null
          started_at: string | null
          status: string
          task_id: string
          title: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validation_rating: number | null
        }
        Insert: {
          allowed_duration_minutes?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          is_validated?: boolean | null
          revision_count?: number | null
          started_at?: string | null
          status?: string
          task_id: string
          title: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_rating?: number | null
        }
        Update: {
          allowed_duration_minutes?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          is_validated?: boolean | null
          revision_count?: number | null
          started_at?: string | null
          status?: string
          task_id?: string
          title?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          action_type: Database["public"]["Enums"]["xp_action_type"]
          created_at: string
          editor_id: string
          id: string
          reason: string
          task_id: string | null
          validated_by: string | null
          xp_amount: number
        }
        Insert: {
          action_type: Database["public"]["Enums"]["xp_action_type"]
          created_at?: string
          editor_id: string
          id?: string
          reason: string
          task_id?: string | null
          validated_by?: string | null
          xp_amount: number
        }
        Update: {
          action_type?: Database["public"]["Enums"]["xp_action_type"]
          created_at?: string
          editor_id?: string
          id?: string
          reason?: string
          task_id?: string | null
          validated_by?: string | null
          xp_amount?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_30day_performance: {
        Args: { p_editor_id: string }
        Returns: Json
      }
      calculate_level_from_xp: { Args: { xp_amount: number }; Returns: number }
      calculate_rank_from_level: {
        Args: { level_num: number }
        Returns: Database["public"]["Enums"]["editor_rank"]
      }
      can_editor_view_conversation: {
        Args: { p_task_id: string; p_video_id: string }
        Returns: boolean
      }
      check_and_update_late_videos: { Args: never; Returns: undefined }
      claim_daily_streak_bonus: { Args: { p_editor_id: string }; Returns: Json }
      complete_task_delivery: {
        Args: {
          p_base_xp: number
          p_editor_id: string
          p_is_on_time: boolean
          p_is_urgent: boolean
          p_quality_rating?: number
          p_revision_count?: number
          p_task_id: string
        }
        Returns: Json
      }
      create_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      design_delivery_has_active_review_link: {
        Args: { p_design_task_id: string }
        Returns: boolean
      }
      design_task_has_active_review_link: {
        Args: { task_id: string }
        Returns: boolean
      }
      evaluate_level_stability: { Args: { p_editor_id: string }; Returns: Json }
      get_next_version_number: { Args: { p_task_id: string }; Returns: number }
      get_task_client_user_id: { Args: { p_task_id: string }; Returns: string }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["permission_type"][]
      }
      grant_xp: {
        Args: {
          p_action_type: Database["public"]["Enums"]["xp_action_type"]
          p_editor_id: string
          p_reason: string
          p_task_id: string
          p_xp_amount: number
        }
        Returns: Json
      }
      has_active_review_link: { Args: { p_video_id: string }; Returns: boolean }
      has_assigned_video_in_task: {
        Args: { p_task_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["permission_type"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_pm: { Args: { _user_id: string }; Returns: boolean }
      is_client_of_task: { Args: { p_task_id: string }; Returns: boolean }
      is_copywriter_of_client: {
        Args: { p_client_user_id: string }
        Returns: boolean
      }
      is_copywriter_of_task: { Args: { p_task_id: string }; Returns: boolean }
      send_admin_reply_to_editor:
        | {
            Args: {
              p_client_name?: string
              p_editor_user_id: string
              p_original_question?: string
              p_project_name?: string
              p_reply_message: string
              p_video_title?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_client_name?: string
              p_editor_user_id: string
              p_original_question?: string
              p_project_name?: string
              p_reply_message: string
              p_task_id?: string
              p_video_id?: string
              p_video_title?: string
            }
            Returns: Json
          }
      send_editor_question_to_admins: {
        Args: {
          p_client_name?: string
          p_editor_name?: string
          p_project_name?: string
          p_question: string
          p_task_id?: string
          p_video_id?: string
          p_video_title?: string
        }
        Returns: Json
      }
      send_video_to_client: { Args: { p_video_id: string }; Returns: Json }
      submit_for_review: { Args: { p_delivery_id: string }; Returns: Json }
      submit_video_for_review: {
        Args: { p_delivery_id: string }
        Returns: Json
      }
      task_has_active_review_link: {
        Args: { p_task_id: string }
        Returns: boolean
      }
      task_has_active_review_link_fn: {
        Args: { p_task_id: string }
        Returns: boolean
      }
      task_has_active_video_review_link: {
        Args: { p_task_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "project_manager"
        | "editor"
        | "designer"
        | "client"
        | "copywriter"
      content_status:
        | "draft"
        | "in_progress"
        | "pending_review"
        | "validated"
        | "delivered"
        | "revision_requested"
      editor_rank: "bronze" | "silver" | "gold" | "platinum" | "diamond"
      permission_type:
        | "manage_projects"
        | "manage_team"
        | "manage_clients"
        | "validate_videos"
        | "manage_payments"
        | "access_dashboard"
        | "access_editor"
        | "access_copywriter"
        | "view_clients"
      video_status:
        | "new"
        | "active"
        | "in_progress"
        | "in_review"
        | "revision_requested"
        | "completed"
        | "late"
        | "cancelled"
      workflow_step:
        | "idea"
        | "script"
        | "filmmaking"
        | "editing"
        | "publication"
        | "analysis"
        | "planning"
      xp_action_type:
        | "task_delivered"
        | "on_time_bonus"
        | "late_penalty"
        | "revision_penalty"
        | "quality_bonus"
        | "urgent_bonus"
        | "streak_bonus"
        | "achievement_unlock"
        | "manual_adjustment"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "project_manager",
        "editor",
        "designer",
        "client",
        "copywriter",
      ],
      content_status: [
        "draft",
        "in_progress",
        "pending_review",
        "validated",
        "delivered",
        "revision_requested",
      ],
      editor_rank: ["bronze", "silver", "gold", "platinum", "diamond"],
      permission_type: [
        "manage_projects",
        "manage_team",
        "manage_clients",
        "validate_videos",
        "manage_payments",
        "access_dashboard",
        "access_editor",
        "access_copywriter",
        "view_clients",
      ],
      video_status: [
        "new",
        "active",
        "in_progress",
        "in_review",
        "revision_requested",
        "completed",
        "late",
        "cancelled",
      ],
      workflow_step: [
        "idea",
        "script",
        "filmmaking",
        "editing",
        "publication",
        "analysis",
        "planning",
      ],
      xp_action_type: [
        "task_delivered",
        "on_time_bonus",
        "late_penalty",
        "revision_penalty",
        "quality_bonus",
        "urgent_bonus",
        "streak_bonus",
        "achievement_unlock",
        "manual_adjustment",
      ],
    },
  },
} as const
