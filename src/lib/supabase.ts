import { createClient, SupabaseClient } from '@supabase/supabase-js';

declare global {
    var __supabase: SupabaseClient | undefined;
}

function createSupabaseClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
}

export const supabase = globalThis.__supabase ?? createSupabaseClient();

if (process.env.NODE_ENV !== 'production') {
    globalThis.__supabase = supabase;
}