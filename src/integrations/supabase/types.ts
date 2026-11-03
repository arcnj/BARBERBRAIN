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
      barber_commission_settings: {
        Row: {
          barber_id: string;
          barbershop_id: string;
          created_at: string;
          id: string;
          product_commission_percent: number;
          service_commission_percent: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          barber_id: string;
          barbershop_id?: string;
          created_at?: string;
          id?: string;
          product_commission_percent?: number;
          service_commission_percent?: number;
          updated_at?: string;
        };
        Update: {
          barber_id?: string;
          barbershop_id?: string;
          created_at?: string;
          id?: string;
          product_commission_percent?: number;
          service_commission_percent?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "barber_commission_settings_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: true;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "barber_commission_settings_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: true;
            referencedRelation: "barbers_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "barber_commission_settings_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      barber_financial_records: {
        Row: {
          amount: number;
          barber_id: string;
          barbershop_id: string;
          created_at: string;
          description: string | null;
          id: string;
          month: number;
          record_type: string;
          reference_id: string | null;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          barber_id: string;
          barbershop_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          month: number;
          record_type: string;
          reference_id?: string | null;
          year: number;
        };
        Update: {
          amount?: number;
          barber_id?: string;
          barbershop_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          month?: number;
          record_type?: string;
          reference_id?: string | null;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "barber_financial_records_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "barber_financial_records_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "barber_financial_records_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      barber_goals: {
        Row: {
          barber_id: string;
          barbershop_id: string;
          completed_at: string | null;
          created_at: string;
          current_value: number;
          goal_type: Database["public"]["Enums"]["goal_type"];
          id: string;
          month: number;
          reward_value: number;
          service_category: string | null;
          service_id: string | null;
          status: Database["public"]["Enums"]["goal_status"];
          target_value: number;
          updated_at: string;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          barber_id: string;
          barbershop_id?: string;
          completed_at?: string | null;
          created_at?: string;
          current_value?: number;
          goal_type: Database["public"]["Enums"]["goal_type"];
          id?: string;
          month: number;
          reward_value: number;
          service_category?: string | null;
          service_id?: string | null;
          status?: Database["public"]["Enums"]["goal_status"];
          target_value: number;
          updated_at?: string;
          year: number;
        };
        Update: {
          barber_id?: string;
          barbershop_id?: string;
          completed_at?: string | null;
          created_at?: string;
          current_value?: number;
          goal_type?: Database["public"]["Enums"]["goal_type"];
          id?: string;
          month?: number;
          reward_value?: number;
          service_category?: string | null;
          service_id?: string | null;
          status?: Database["public"]["Enums"]["goal_status"];
          target_value?: number;
          updated_at?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "barber_goals_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "barber_goals_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "barber_goals_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "barber_goals_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      barbers: {
        Row: {
          active: boolean | null;
          avatar_url: string | null;
          barbershop_id: string;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          phone: string | null;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean | null;
          avatar_url?: string | null;
          barbershop_id?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          phone?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          active?: boolean | null;
          avatar_url?: string | null;
          barbershop_id?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "barbers_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      barbershop_members: {
        Row: {
          barbershop_id: string;
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          barbershop_id: string;
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          barbershop_id?: string;
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "barbershop_members_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      barbershop_settings: {
        Row: {
          address: string | null;
          barbershop_id: string;
          created_at: string;
          friday_close: string | null;
          friday_closed: boolean | null;
          friday_open: string | null;
          id: string;
          logo_url: string | null;
          monday_close: string | null;
          monday_closed: boolean | null;
          monday_open: string | null;
          name: string | null;
          saturday_close: string | null;
          saturday_closed: boolean | null;
          saturday_open: string | null;
          sunday_close: string | null;
          sunday_closed: boolean | null;
          sunday_open: string | null;
          thursday_close: string | null;
          thursday_closed: boolean | null;
          thursday_open: string | null;
          tuesday_close: string | null;
          tuesday_closed: boolean | null;
          tuesday_open: string | null;
          updated_at: string;
          wednesday_close: string | null;
          wednesday_closed: boolean | null;
          wednesday_open: string | null;
          whatsapp_phone: string | null;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          barbershop_id?: string;
          created_at?: string;
          friday_close?: string | null;
          friday_closed?: boolean | null;
          friday_open?: string | null;
          id?: string;
          logo_url?: string | null;
          monday_close?: string | null;
          monday_closed?: boolean | null;
          monday_open?: string | null;
          name?: string | null;
          saturday_close?: string | null;
          saturday_closed?: boolean | null;
          saturday_open?: string | null;
          sunday_close?: string | null;
          sunday_closed?: boolean | null;
          sunday_open?: string | null;
          thursday_close?: string | null;
          thursday_closed?: boolean | null;
          thursday_open?: string | null;
          tuesday_close?: string | null;
          tuesday_closed?: boolean | null;
          tuesday_open?: string | null;
          updated_at?: string;
          wednesday_close?: string | null;
          wednesday_closed?: boolean | null;
          wednesday_open?: string | null;
          whatsapp_phone?: string | null;
        };
        Update: {
          address?: string | null;
          barbershop_id?: string;
          created_at?: string;
          friday_close?: string | null;
          friday_closed?: boolean | null;
          friday_open?: string | null;
          id?: string;
          logo_url?: string | null;
          monday_close?: string | null;
          monday_closed?: boolean | null;
          monday_open?: string | null;
          name?: string | null;
          saturday_close?: string | null;
          saturday_closed?: boolean | null;
          saturday_open?: string | null;
          sunday_close?: string | null;
          sunday_closed?: boolean | null;
          sunday_open?: string | null;
          thursday_close?: string | null;
          thursday_closed?: boolean | null;
          thursday_open?: string | null;
          tuesday_close?: string | null;
          tuesday_closed?: boolean | null;
          tuesday_open?: string | null;
          updated_at?: string;
          wednesday_close?: string | null;
          wednesday_closed?: boolean | null;
          wednesday_open?: string | null;
          whatsapp_phone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "barbershop_settings_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: true;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      barbershops: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      birthday_coupons: {
        Row: {
          barbershop_id: string;
          created_at: string;
          discount_percentage: number | null;
          discount_value: number | null;
          id: string;
          order_id: string | null;
          profile_id: string;
          used: boolean | null;
          used_at: string | null;
          valid_from: string;
          valid_until: string;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          barbershop_id?: string;
          created_at?: string;
          discount_percentage?: number | null;
          discount_value?: number | null;
          id?: string;
          order_id?: string | null;
          profile_id: string;
          used?: boolean | null;
          used_at?: string | null;
          valid_from: string;
          valid_until: string;
          year?: number;
        };
        Update: {
          barbershop_id?: string;
          created_at?: string;
          discount_percentage?: number | null;
          discount_value?: number | null;
          id?: string;
          order_id?: string | null;
          profile_id?: string;
          used?: boolean | null;
          used_at?: string | null;
          valid_from?: string;
          valid_until?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "birthday_coupons_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "birthday_coupons_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "birthday_coupons_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      birthday_settings: {
        Row: {
          auto_create_coupon: boolean | null;
          barbershop_id: string;
          created_at: string;
          days_after: number | null;
          days_before: number | null;
          default_discount_percentage: number | null;
          enabled: boolean | null;
          id: string;
          message_template: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          auto_create_coupon?: boolean | null;
          barbershop_id?: string;
          created_at?: string;
          days_after?: number | null;
          days_before?: number | null;
          default_discount_percentage?: number | null;
          enabled?: boolean | null;
          id?: string;
          message_template?: string | null;
          updated_at?: string;
        };
        Update: {
          auto_create_coupon?: boolean | null;
          barbershop_id?: string;
          created_at?: string;
          days_after?: number | null;
          days_before?: number | null;
          default_discount_percentage?: number | null;
          enabled?: boolean | null;
          id?: string;
          message_template?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "birthday_settings_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: true;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      combo_services: {
        Row: {
          barbershop_id: string;
          combo_id: string;
          created_at: string;
          id: string;
          service_id: string;
        };
        ComputedFields: never;
        Insert: {
          barbershop_id?: string;
          combo_id: string;
          created_at?: string;
          id?: string;
          service_id: string;
        };
        Update: {
          barbershop_id?: string;
          combo_id?: string;
          created_at?: string;
          id?: string;
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "combo_services_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "combo_services_combo_id_fkey";
            columns: ["combo_id"];
            isOneToOne: false;
            referencedRelation: "service_combos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "combo_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      cron_tokens: {
        Row: {
          created_at: string;
          name: string;
          token: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          name: string;
          token?: string;
        };
        Update: {
          created_at?: string;
          name?: string;
          token?: string;
        };
        Relationships: [];
      };
      customer_subscriptions: {
        Row: {
          auto_reminder: boolean;
          barbershop_id: string;
          created_at: string;
          current_period_end: string;
          customer_id: string;
          id: string;
          notes: string | null;
          plan_id: string;
          start_date: string;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          auto_reminder?: boolean;
          barbershop_id?: string;
          created_at?: string;
          current_period_end: string;
          customer_id: string;
          id?: string;
          notes?: string | null;
          plan_id: string;
          start_date?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          auto_reminder?: boolean;
          barbershop_id?: string;
          created_at?: string;
          current_period_end?: string;
          customer_id?: string;
          id?: string;
          notes?: string | null;
          plan_id?: string;
          start_date?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_subscriptions_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "customer_subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      job_locks: {
        Row: {
          job_name: string;
          locked_at: string;
          locked_until: string;
        };
        ComputedFields: never;
        Insert: {
          job_name: string;
          locked_at?: string;
          locked_until: string;
        };
        Update: {
          job_name?: string;
          locked_at?: string;
          locked_until?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          barbershop_id: string;
          created_at: string;
          id: string;
          order_id: string;
          price: number;
          service_id: string;
        };
        ComputedFields: never;
        Insert: {
          barbershop_id?: string;
          created_at?: string;
          id?: string;
          order_id: string;
          price: number;
          service_id: string;
        };
        Update: {
          barbershop_id?: string;
          created_at?: string;
          id?: string;
          order_id?: string;
          price?: number;
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      order_products: {
        Row: {
          barbershop_id: string;
          created_at: string;
          id: string;
          order_id: string;
          price: number;
          product_id: string;
          quantity: number;
        };
        ComputedFields: never;
        Insert: {
          barbershop_id?: string;
          created_at?: string;
          id?: string;
          order_id: string;
          price: number;
          product_id: string;
          quantity?: number;
        };
        Update: {
          barbershop_id?: string;
          created_at?: string;
          id?: string;
          order_id?: string;
          price?: number;
          product_id?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_products_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_products_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_products_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_products_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products_public";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          barber_id: string | null;
          barbershop_id: string;
          created_at: string;
          customer_id: string;
          id: string;
          notes: string | null;
          preferred_barber_id: string | null;
          scheduled_at: string | null;
          status: Database["public"]["Enums"]["order_status"];
          total_price: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          barber_id?: string | null;
          barbershop_id?: string;
          created_at?: string;
          customer_id: string;
          id?: string;
          notes?: string | null;
          preferred_barber_id?: string | null;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          total_price?: number | null;
          updated_at?: string;
        };
        Update: {
          barber_id?: string | null;
          barbershop_id?: string;
          created_at?: string;
          customer_id?: string;
          id?: string;
          notes?: string | null;
          preferred_barber_id?: string | null;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          total_price?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_customer_id_profiles_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "orders_preferred_barber_id_fkey";
            columns: ["preferred_barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_preferred_barber_id_fkey";
            columns: ["preferred_barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers_public";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          active: boolean | null;
          barbershop_id: string;
          category: string | null;
          cost_price: number | null;
          created_at: string;
          description: string | null;
          expiration_date: string | null;
          id: string;
          image_url: string | null;
          min_stock_quantity: number | null;
          name: string;
          price: number;
          stock_quantity: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean | null;
          barbershop_id?: string;
          category?: string | null;
          cost_price?: number | null;
          created_at?: string;
          description?: string | null;
          expiration_date?: string | null;
          id?: string;
          image_url?: string | null;
          min_stock_quantity?: number | null;
          name: string;
          price: number;
          stock_quantity?: number | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean | null;
          barbershop_id?: string;
          category?: string | null;
          cost_price?: number | null;
          created_at?: string;
          description?: string | null;
          expiration_date?: string | null;
          id?: string;
          image_url?: string | null;
          min_stock_quantity?: number | null;
          name?: string;
          price?: number;
          stock_quantity?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          birth_date: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          phone: string | null;
          preferences: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          birth_date?: string | null;
          created_at?: string;
          email?: string | null;
          full_name: string;
          id?: string;
          phone?: string | null;
          preferences?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          birth_date?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          phone?: string | null;
          preferences?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      promotion_items: {
        Row: {
          barbershop_id: string;
          created_at: string;
          discount_percentage: number;
          id: string;
          product_id: string | null;
          promotion_id: string;
          service_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          barbershop_id?: string;
          created_at?: string;
          discount_percentage?: number;
          id?: string;
          product_id?: string | null;
          promotion_id: string;
          service_id?: string | null;
        };
        Update: {
          barbershop_id?: string;
          created_at?: string;
          discount_percentage?: number;
          id?: string;
          product_id?: string | null;
          promotion_id?: string;
          service_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "promotion_items_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotion_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotion_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotion_items_promotion_id_fkey";
            columns: ["promotion_id"];
            isOneToOne: false;
            referencedRelation: "promotions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotion_items_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      promotions: {
        Row: {
          active: boolean | null;
          barber_id: string | null;
          barbershop_id: string;
          created_at: string;
          description: string | null;
          discount_percentage: number | null;
          discount_value: number | null;
          end_date: string | null;
          id: string;
          image_url: string | null;
          start_date: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean | null;
          barber_id?: string | null;
          barbershop_id?: string;
          created_at?: string;
          description?: string | null;
          discount_percentage?: number | null;
          discount_value?: number | null;
          end_date?: string | null;
          id?: string;
          image_url?: string | null;
          start_date?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean | null;
          barber_id?: string | null;
          barbershop_id?: string;
          created_at?: string;
          description?: string | null;
          discount_percentage?: number | null;
          discount_value?: number | null;
          end_date?: string | null;
          id?: string;
          image_url?: string | null;
          start_date?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promotions_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotions_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotions_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      satisfaction_questions: {
        Row: {
          active: boolean | null;
          barbershop_id: string;
          created_at: string;
          id: string;
          is_essential: boolean | null;
          options: Json | null;
          question_order: number;
          question_text: string;
          question_type: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean | null;
          barbershop_id?: string;
          created_at?: string;
          id?: string;
          is_essential?: boolean | null;
          options?: Json | null;
          question_order: number;
          question_text: string;
          question_type: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean | null;
          barbershop_id?: string;
          created_at?: string;
          id?: string;
          is_essential?: boolean | null;
          options?: Json | null;
          question_order?: number;
          question_text?: string;
          question_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "satisfaction_questions_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      satisfaction_responses: {
        Row: {
          barber_id: string | null;
          barbershop_id: string;
          created_at: string;
          customer_id: string;
          id: string;
          order_id: string;
          responses: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          barber_id?: string | null;
          barbershop_id?: string;
          created_at?: string;
          customer_id: string;
          id?: string;
          order_id: string;
          responses: NonNullable<Json>;
        };
        Update: {
          barber_id?: string | null;
          barbershop_id?: string;
          created_at?: string;
          customer_id?: string;
          id?: string;
          order_id?: string;
          responses?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "satisfaction_responses_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "satisfaction_responses_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "satisfaction_responses_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "satisfaction_responses_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      satisfaction_settings: {
        Row: {
          barbershop_id: string;
          created_at: string;
          enabled: boolean | null;
          id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          barbershop_id?: string;
          created_at?: string;
          enabled?: boolean | null;
          id?: string;
          updated_at?: string;
        };
        Update: {
          barbershop_id?: string;
          created_at?: string;
          enabled?: boolean | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "satisfaction_settings_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: true;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      service_combos: {
        Row: {
          active: boolean;
          barbershop_id: string;
          created_at: string;
          current_redemptions: number;
          description: string | null;
          id: string;
          max_redemptions: number | null;
          name: string;
          original_price: number;
          promotional_price: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          barbershop_id?: string;
          created_at?: string;
          current_redemptions?: number;
          description?: string | null;
          id?: string;
          max_redemptions?: number | null;
          name: string;
          original_price?: number;
          promotional_price: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          barbershop_id?: string;
          created_at?: string;
          current_redemptions?: number;
          description?: string | null;
          id?: string;
          max_redemptions?: number | null;
          name?: string;
          original_price?: number;
          promotional_price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_combos_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          active: boolean | null;
          barbershop_id: string;
          categories: string[] | null;
          category: string;
          created_at: string;
          description: string | null;
          duration_minutes: number | null;
          id: string;
          name: string;
          price: number;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean | null;
          barbershop_id?: string;
          categories?: string[] | null;
          category: string;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number | null;
          id?: string;
          name: string;
          price: number;
        };
        Update: {
          active?: boolean | null;
          barbershop_id?: string;
          categories?: string[] | null;
          category?: string;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number | null;
          id?: string;
          name?: string;
          price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "services_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movements: {
        Row: {
          barbershop_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          movement_type: string;
          notes: string | null;
          product_id: string;
          quantity: number;
          unit_cost: number | null;
        };
        ComputedFields: never;
        Insert: {
          barbershop_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          movement_type: string;
          notes?: string | null;
          product_id: string;
          quantity: number;
          unit_cost?: number | null;
        };
        Update: {
          barbershop_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          movement_type?: string;
          notes?: string | null;
          product_id?: string;
          quantity?: number;
          unit_cost?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products_public";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_cycles: {
        Row: {
          barbershop_id: string;
          created_at: string;
          customer_id: string;
          id: string;
          payment_id: string | null;
          period_end: string;
          period_start: string;
          plan_id: string | null;
          status: string;
          subscription_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          barbershop_id?: string;
          created_at?: string;
          customer_id: string;
          id?: string;
          payment_id?: string | null;
          period_end: string;
          period_start: string;
          plan_id?: string | null;
          status?: string;
          subscription_id: string;
          updated_at?: string;
        };
        Update: {
          barbershop_id?: string;
          created_at?: string;
          customer_id?: string;
          id?: string;
          payment_id?: string | null;
          period_end?: string;
          period_start?: string;
          plan_id?: string | null;
          status?: string;
          subscription_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_cycles_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_cycles_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "customer_subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_payments: {
        Row: {
          amount: number;
          barbershop_id: string;
          confirmed_at: string | null;
          confirmed_by: string | null;
          created_at: string;
          cycle_id: string | null;
          expected_amount: number | null;
          id: string;
          method: string | null;
          notes: string | null;
          paid_at: string;
          payment_method: string | null;
          period_end: string | null;
          status: string;
          subscription_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount?: number;
          barbershop_id?: string;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          cycle_id?: string | null;
          expected_amount?: number | null;
          id?: string;
          method?: string | null;
          notes?: string | null;
          paid_at?: string;
          payment_method?: string | null;
          period_end?: string | null;
          status?: string;
          subscription_id: string;
        };
        Update: {
          amount?: number;
          barbershop_id?: string;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          cycle_id?: string | null;
          expected_amount?: number | null;
          id?: string;
          method?: string | null;
          notes?: string | null;
          paid_at?: string;
          payment_method?: string | null;
          period_end?: string | null;
          status?: string;
          subscription_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_payments_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "customer_subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_plan_services: {
        Row: {
          barbershop_id: string;
          created_at: string;
          id: string;
          monthly_limit: number | null;
          plan_id: string;
          service_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          barbershop_id?: string;
          created_at?: string;
          id?: string;
          monthly_limit?: number | null;
          plan_id: string;
          service_id: string;
          updated_at?: string;
        };
        Update: {
          barbershop_id?: string;
          created_at?: string;
          id?: string;
          monthly_limit?: number | null;
          plan_id?: string;
          service_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_plan_services_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_plan_services_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_plan_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_plans: {
        Row: {
          active: boolean;
          barbershop_id: string;
          benefits: string[];
          created_at: string;
          description: string | null;
          id: string;
          monthly_visit_limit: number | null;
          name: string;
          price: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          barbershop_id?: string;
          benefits?: string[];
          created_at?: string;
          description?: string | null;
          id?: string;
          monthly_visit_limit?: number | null;
          name: string;
          price?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          barbershop_id?: string;
          benefits?: string[];
          created_at?: string;
          description?: string | null;
          id?: string;
          monthly_visit_limit?: number | null;
          name?: string;
          price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_plans_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_reminder_settings: {
        Row: {
          barbershop_id: string;
          created_at: string;
          days_before: number;
          enabled: boolean;
          id: string;
          message_template: string;
          paused_at: string | null;
          paused_reason: string | null;
          twilio_template_sid: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          barbershop_id?: string;
          created_at?: string;
          days_before?: number;
          enabled?: boolean;
          id?: string;
          message_template?: string;
          paused_at?: string | null;
          paused_reason?: string | null;
          twilio_template_sid?: string | null;
          updated_at?: string;
        };
        Update: {
          barbershop_id?: string;
          created_at?: string;
          days_before?: number;
          enabled?: boolean;
          id?: string;
          message_template?: string;
          paused_at?: string | null;
          paused_reason?: string | null;
          twilio_template_sid?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_reminder_settings_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: true;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_reminders: {
        Row: {
          barbershop_id: string;
          channel: string;
          created_at: string;
          error: string | null;
          id: string;
          message: string | null;
          period_end: string;
          provider_message_id: string | null;
          sent_at: string | null;
          status: string;
          subscription_id: string;
        };
        ComputedFields: never;
        Insert: {
          barbershop_id?: string;
          channel?: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          message?: string | null;
          period_end: string;
          provider_message_id?: string | null;
          sent_at?: string | null;
          status?: string;
          subscription_id: string;
        };
        Update: {
          barbershop_id?: string;
          channel?: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          message?: string | null;
          period_end?: string;
          provider_message_id?: string | null;
          sent_at?: string | null;
          status?: string;
          subscription_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_reminders_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_reminders_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "customer_subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_requests: {
        Row: {
          barbershop_id: string;
          created_at: string;
          customer_id: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          kind: string;
          payment_id: string | null;
          plan_id: string;
          status: string;
          subscription_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          barbershop_id?: string;
          created_at?: string;
          customer_id: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          kind?: string;
          payment_id?: string | null;
          plan_id: string;
          status?: string;
          subscription_id?: string | null;
          updated_at?: string;
        };
        Update: {
          barbershop_id?: string;
          created_at?: string;
          customer_id?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          kind?: string;
          payment_id?: string | null;
          plan_id?: string;
          status?: string;
          subscription_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_requests_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_requests_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "subscription_payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_requests_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_requests_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "customer_subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_usages: {
        Row: {
          barber_id: string | null;
          barbershop_id: string;
          covered: boolean;
          created_at: string;
          customer_id: string;
          cycle_id: string;
          id: string;
          order_id: string | null;
          reversal_reason: string | null;
          reversed_at: string | null;
          reversed_by: string | null;
          service_id: string | null;
          status: string;
          subscription_id: string;
          used_at: string;
        };
        ComputedFields: never;
        Insert: {
          barber_id?: string | null;
          barbershop_id?: string;
          covered?: boolean;
          created_at?: string;
          customer_id: string;
          cycle_id: string;
          id?: string;
          order_id?: string | null;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          service_id?: string | null;
          status?: string;
          subscription_id: string;
          used_at?: string;
        };
        Update: {
          barber_id?: string | null;
          barbershop_id?: string;
          covered?: boolean;
          created_at?: string;
          customer_id?: string;
          cycle_id?: string;
          id?: string;
          order_id?: string | null;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          service_id?: string | null;
          status?: string;
          subscription_id?: string;
          used_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_usages_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_usages_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_usages_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_usages_cycle_id_fkey";
            columns: ["cycle_id"];
            isOneToOne: false;
            referencedRelation: "subscription_cycles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_usages_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_usages_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_usages_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "customer_subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      barbers_public: {
        Row: {
          active: boolean | null;
          avatar_url: string | null;
          barbershop_id: string;
          id: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean | null;
          avatar_url?: string | null;
          barbershop_id?: string | null;
          id?: string | null;
          name?: string | null;
        };
        Update: {
          active?: boolean | null;
          avatar_url?: string | null;
          barbershop_id?: string | null;
          id?: string | null;
          name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "barbers_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      barbershop_settings_public: {
        Row: {
          address: string | null;
          created_at: string;
          friday_close: string | null;
          friday_closed: boolean | null;
          friday_open: string | null;
          id: string;
          logo_url: string | null;
          monday_close: string | null;
          monday_closed: boolean | null;
          monday_open: string | null;
          name: string | null;
          saturday_close: string | null;
          saturday_closed: boolean | null;
          saturday_open: string | null;
          sunday_close: string | null;
          sunday_closed: boolean | null;
          sunday_open: string | null;
          thursday_close: string | null;
          thursday_closed: boolean | null;
          thursday_open: string | null;
          tuesday_close: string | null;
          tuesday_closed: boolean | null;
          tuesday_open: string | null;
          updated_at: string;
          wednesday_close: string | null;
          wednesday_closed: boolean | null;
          wednesday_open: string | null;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          created_at?: string | null;
          friday_close?: string | null;
          friday_closed?: boolean | null;
          friday_open?: string | null;
          id?: string | null;
          logo_url?: string | null;
          monday_close?: string | null;
          monday_closed?: boolean | null;
          monday_open?: string | null;
          name?: string | null;
          saturday_close?: string | null;
          saturday_closed?: boolean | null;
          saturday_open?: string | null;
          sunday_close?: string | null;
          sunday_closed?: boolean | null;
          sunday_open?: string | null;
          thursday_close?: string | null;
          thursday_closed?: boolean | null;
          thursday_open?: string | null;
          tuesday_close?: string | null;
          tuesday_closed?: boolean | null;
          tuesday_open?: string | null;
          updated_at?: string | null;
          wednesday_close?: string | null;
          wednesday_closed?: boolean | null;
          wednesday_open?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string | null;
          friday_close?: string | null;
          friday_closed?: boolean | null;
          friday_open?: string | null;
          id?: string | null;
          logo_url?: string | null;
          monday_close?: string | null;
          monday_closed?: boolean | null;
          monday_open?: string | null;
          name?: string | null;
          saturday_close?: string | null;
          saturday_closed?: boolean | null;
          saturday_open?: string | null;
          sunday_close?: string | null;
          sunday_closed?: boolean | null;
          sunday_open?: string | null;
          thursday_close?: string | null;
          thursday_closed?: boolean | null;
          thursday_open?: string | null;
          tuesday_close?: string | null;
          tuesday_closed?: boolean | null;
          tuesday_open?: string | null;
          updated_at?: string | null;
          wednesday_close?: string | null;
          wednesday_closed?: boolean | null;
          wednesday_open?: string | null;
        };
        Relationships: [];
      };
      products_public: {
        Row: {
          active: boolean | null;
          category: string | null;
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          name: string;
          price: number;
          stock_quantity: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean | null;
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          image_url?: string | null;
          name?: string | null;
          price?: number | null;
          stock_quantity?: number | null;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          image_url?: string | null;
          name?: string | null;
          price?: number | null;
          stock_quantity?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      approve_subscription_request: {
        Args: {
          p_amount: number;
          p_method: string;
          p_notes?: string;
          p_paid_at: string;
          p_request_id: string;
        };
        Returns: {
          barbershop_id: string;
          created_at: string;
          customer_id: string;
          id: string;
          payment_id: string | null;
          period_end: string;
          period_start: string;
          plan_id: string | null;
          status: string;
          subscription_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "subscription_cycles";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      can_see_user: { Args: { p_user: string }; Returns: boolean };
      confirm_subscription_payment: {
        Args: {
          p_amount: number;
          p_method: string;
          p_notes?: string;
          p_paid_at: string;
          p_subscription_id: string;
        };
        Returns: {
          barbershop_id: string;
          created_at: string;
          customer_id: string;
          id: string;
          payment_id: string | null;
          period_end: string;
          period_start: string;
          plan_id: string | null;
          status: string;
          subscription_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "subscription_cycles";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      current_barbershop_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_barbershop_public: { Args: { p_slug: string }; Returns: Json };
      get_user_role: {
        Args: { _user_id: string };
        Returns: Database["public"]["Enums"]["app_role"];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      has_shop_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"];
          p_shop: string;
        };
        Returns: boolean;
      };
      is_any_shop_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_member: { Args: { p_shop: string }; Returns: boolean };
      is_own_barber: { Args: { p_barber: string }; Returns: boolean };
      is_platform_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_shop_staff: { Args: { p_shop: string }; Returns: boolean };
      join_barbershop: { Args: { p_slug: string }; Returns: string };
      recalculate_barber_goals: {
        Args: { p_barber_id: string; p_month: number; p_year: number };
        Returns: {
          barber_id: string;
          barbershop_id: string;
          completed_at: string | null;
          created_at: string;
          current_value: number;
          goal_type: Database["public"]["Enums"]["goal_type"];
          id: string;
          month: number;
          reward_value: number;
          service_category: string | null;
          service_id: string | null;
          status: Database["public"]["Enums"]["goal_status"];
          target_value: number;
          updated_at: string;
          year: number;
        }[];
        SetofOptions: {
          from: "*";
          to: "barber_goals";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      reject_subscription_request: {
        Args: { p_request_id: string };
        Returns: undefined;
      };
      reverse_subscription_usage: {
        Args: { p_reason?: string; p_usage_id: string };
        Returns: {
          barber_id: string | null;
          barbershop_id: string;
          covered: boolean;
          created_at: string;
          customer_id: string;
          cycle_id: string;
          id: string;
          order_id: string | null;
          reversal_reason: string | null;
          reversed_at: string | null;
          reversed_by: string | null;
          service_id: string | null;
          status: string;
          subscription_id: string;
          used_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "subscription_usages";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      app_role: "admin" | "barber" | "customer";
      goal_status: "active" | "completed" | "expired";
      goal_type: "cuts" | "revenue" | "services" | "product_sales";
      order_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled";
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "barber", "customer"],
      goal_status: ["active", "completed", "expired"],
      goal_type: ["cuts", "revenue", "services", "product_sales"],
      order_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const;
