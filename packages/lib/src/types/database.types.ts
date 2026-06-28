/**
 * Database Types — مركز الأحمدي
 * هذا الملف يُولَّد تلقائياً من Supabase CLI:
 *   pnpm supabase gen types typescript --project-id pjrxpgjphumukeoeldzc > database.types.ts
 *
 * لا تعدّل هذا الملف يدوياً — شغّل الأمر أعلاه لتحديثه
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:         string;
          full_name:  string;
          phone:      string | null;
          avatar_url: string | null;
          locale:     string;
          status:     "active" | "suspended" | "pending";
          metadata:   Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      roles: {
        Row: {
          id:           string;
          name:         string;
          display_name: string;
          description:  string | null;
          is_system:    boolean;
          is_active:    boolean;
          created_at:   string;
        };
        Insert: Omit<Database["public"]["Tables"]["roles"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["roles"]["Row"]>;
      };
      products: {
        Row: {
          id:          string;
          sku:         string | null;
          name_ar:     string;
          name_en:     string | null;
          slug:        string;
          description: string | null;
          category_id: string | null;
          brand_id:    string | null;
          type:        "physical" | "service";
          condition:   "new" | "used_certified";
          status:      "draft" | "published" | "archived";
          warranty:    string | null;
          base_price:  number;
          currency:    string;
          attributes:  Json;
          tags:        string[];
          is_featured: boolean;
          created_at:  string;
          updated_at:  string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["products"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
      };
      orders: {
        Row: {
          id:               string;
          order_number:     string;
          customer_id:      string;
          status:           "pending" | "confirmed" | "processing" | "ready_for_delivery" | "out_for_delivery" | "delivered" | "completed" | "cancelled" | "returned" | "refunded";
          payment_status:   "pending" | "paid" | "failed" | "refunded" | "partial_refund";
          subtotal:         number;
          discount_amount:  number;
          shipping_fee:     number;
          total_amount:     number;
          currency:         string;
          coupon_id:        string | null;
          address_snapshot: Json;
          notes:            string | null;
          tracking_token:   string;
          created_at:       string;
          updated_at:       string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["orders"]["Row"],
          "id" | "order_number" | "tracking_token" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
      };
      // بقية الجداول تُضاف بعد تشغيل supabase gen types
    };
    Views: Record<string, never>;
    Functions: {
      has_permission: {
        Args: { _user_id: string; _perm: string };
        Returns: boolean;
      };
      has_role: {
        Args: { _user_id: string; _role: string };
        Returns: boolean;
      };
      get_my_roles: {
        Args: Record<string, never>;
        Returns: Array<{ role_name: string; display_name: string }>;
      };
    };
    Enums: {
      user_status:       "active" | "suspended" | "pending";
      product_status:    "draft" | "published" | "archived";
      product_type:      "physical" | "service";
      product_condition: "new" | "used_certified";
      order_status:      "pending" | "confirmed" | "processing" | "ready_for_delivery" | "out_for_delivery" | "delivered" | "completed" | "cancelled" | "returned" | "refunded";
      payment_status:    "pending" | "paid" | "failed" | "refunded" | "partial_refund";
      driver_status:     "available" | "busy" | "offline";
      shipment_status:   "pending" | "assigned" | "picked_up" | "out_for_delivery" | "delivered" | "returned";
      audit_action:      "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "PERMISSION_CHANGE" | "ORDER_STATUS_CHANGE" | "PAYMENT_ACTION";
      discount_type:     "percentage" | "fixed_amount" | "free_shipping";
      notification_channel: "in_app" | "sms" | "whatsapp" | "email" | "push";
      request_type:      "return" | "warranty_claim" | "exchange";
      request_status:    "pending" | "approved" | "rejected" | "completed";
    };
  };
};

// أنواع مشتقة مفيدة
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
