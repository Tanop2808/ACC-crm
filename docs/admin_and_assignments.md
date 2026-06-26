# Datastraw CRM: Admin Dashboard & Assignment Logic

This document outlines the architecture, features, and strict security logic implemented for the Admin Dashboard and Agent Assignment system in the Datastraw CRM.

## 1. Admin Dashboard (`/admin`)

The Admin Dashboard serves as the central command center for managing the CRM's operations, security, and agent workforce.

### Key Features
*   **Brand Center**: The core interface where Admins can view and manage all client brands integrated into the system.
*   **Agent Assignment Management**: Within each Brand's detail view, Admins can view, assign, and revoke Agent access. This interface directly manipulates the `agent_brand_assignments` table, linking an agent's email to a specific `brand_name`.
*   ## Integration Architecture (Round Robin Distribution)

When a brand is integrated with a provider (like Shopify or Shiprocket), it receives a unique `integration_token`.

1. **Webhook Ingestion (Edge Functions)**:
   Third-party platforms send abandoned cart payloads directly to the CRM's Supabase Edge Functions (`supabase/functions/shopify--acc` or `shiprocket--acc`).
   
2. **Payload Mapping**:
   The Edge Function securely maps the raw JSON payload to the CRM's internal unified schema and inserts it into the respective provider table (e.g. `shopify_acc_table`).

3. **Atomic Round Robin Assignment**:
   Immediately after inserting the cart, the Edge Function triggers a PostgreSQL Stored Procedure (`assign_cart_round_robin`). 
   - This procedure uses a `SELECT ... FOR UPDATE` lock on the `brand_round_robin_state` table to ensure **thread-safety**.
   - It fetches all active agents assigned to the brand and perfectly alternates them in sequence (Agent 1 -> 2 -> 3 -> 1).
   - Even if 100 carts hit the webhook concurrently in the exact same millisecond, the PostgreSQL lock forces them into a strict queue, guaranteeing zero race conditions and perfectly equal distribution.
   - The selected agent is dynamically written back into the provider table and tracked permanently in `cart_assignments`.
*   **Integrations & Webhooks**: Dedicated terminals for configuring external data sources (like Shopify) and mapping incoming webhooks to the correct brands in the CRM.
*   **Performance Leaderboard**: A dynamic dashboard that queries the active `agents` table in real-time, ranking team members and displaying floor averages.

## 2. Authentication & Access Control

The system utilizes a heavily modified Supabase Auth flow to ensure zero-trust security for corporate data.

### Domain Restriction
The login portal strictly enforces a domain check. Only emails ending in `@datastraw.in` are permitted to initiate the login sequence.

### Strict Role Verification
Before any user is granted access to a dashboard, the system executes a stringent database verification:
*   **Admins**: Must have an explicit record in the `user_roles` table defining their role as `admin`.
*   **Agents**: Must have at least one active record in the `agent_brand_assignments` table. **If an agent is not assigned to any brand, they are completely denied entry to the system**, even if they successfully authenticate with Google OAuth.

### Auto-Provisioning Fallback
To streamline onboarding, the login portal features an auto-provisioning system for authorized agents:
1.  An Admin assigns a new email (e.g., `new.agent@datastraw.in`) to a brand.
2.  The new agent goes to the login screen and types their email and a new password.
3.  Because the account doesn't technically exist in Supabase Auth yet, it fails.
4.  The system intercepts the failure, checks the `agent_brand_assignments` table, confirms the Admin authorized them, and **automatically signs them up** with the typed password, seamlessly logging them in.

## 3. Data Siloing & Brand Isolation (RLS)

The most critical feature of the assignment logic is **Data Siloing**. Agents must never see customer data or abandoned carts belonging to a brand they are not assigned to.

This is enforced at the Data Access Layer (Services):

### Agent Recovery Service (`agentRecoveryService.ts`)
When fetching the Abandoned Carts queue:
1.  The service reads the agent's `session_email`.
2.  It queries `agent_brand_assignments` to retrieve an array of `brand_name` strings authorized for that email.
3.  It dynamically injects an `.in('brand_name', assignedBrands)` filter into the Supabase query.
4.  If the agent has zero assignments, the service short-circuits and returns an empty array `[]`, ensuring no data leakage.

### Customer Service (`customerService.ts`)
The exact same rigorous filtering is applied to the `/customers` route. The `customer_recovery_view` is filtered using the `source` column (which aliases the brand name) to guarantee agents only see customers associated with their assigned brands.

---
*Document generated to reflect the current state of the Admin and Agent security architecture.*
