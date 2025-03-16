import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL as string;
const anonKey = process.env.SUPABASE_ANON_KEY as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables");
}

// Client for user-level authentication
export const supabase = createClient(supabaseUrl, anonKey);

// Client for admin-level security checks
export const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
