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
        Row: any; // We can type these later if needed
        Insert: any;
        Update: any;
      };
      // ...other tables
    };
    Views: {
      customer_recovery_view: {
        Row: CustomerRecovery;
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
