export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface CustomerRecovery {
  customer_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  cart_id: string | null;
  cart_value: number | null;
  products: Json | null;
  recovery_status: string | null;
  call_status: string | null;
  follow_up: string | null;
  notes: string | null;
  abandoned_at: string | null;
  source: string | null;
  provider: string | null;
}

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: any;
        Insert: any;
        Update: any;
      };
      brands: {
        Row: any;
        Insert: any;
        Update: any;
      };
      providers: {
        Row: any;
        Insert: any;
        Update: any;
      };
      integrations: {
        Row: any;
        Insert: any;
        Update: any;
      };
      agents: {
        Row: any;
        Insert: any;
        Update: any;
      };
      user_roles: {
        Row: any;
        Insert: any;
        Update: any;
      };
      agent_brand_assignments: {
        Row: any;
        Insert: any;
        Update: any;
      };
      support_activity_logs: {
        Row: any;
        Insert: any;
        Update: any;
      };
      shopify_acc_table: {
        Row: any;
        Insert: any;
        Update: any;
      };
      shiprocket_acc_table: {
        Row: any;
        Insert: any;
        Update: any;
      };
      abandoned_carts: {
        Row: any;
        Insert: any;
        Update: any;
      };
    };
    Views: {
      customer_recovery_view: {
        Row: CustomerRecovery;
      };
      abandon_cart_master: {
        Row: any;
      };
      agent_recovery_dashboard_view: {
        Row: any;
      };
      agent_follow_up_dashboard_view: {
        Row: any;
      };
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
}
