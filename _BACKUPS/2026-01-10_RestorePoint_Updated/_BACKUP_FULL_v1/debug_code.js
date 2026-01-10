
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

async function checkCode(code) {
    console.log(`Checking for code: ${code}...`);

    // 1. Check with Anon Client (what the app uses effectively, though usually auth'd)
    const { data: anonData, error: anonError } = await supabase
        .from('inventory_assignments')
        .select('id, code, status')
        .eq('code', code)
        .single();

    if (anonError) {
        console.log('Anon Client Error:', anonError.message);
    } else {
        console.log('Anon Client Found:', anonData);
    }

    // 2. Check with Admin Client (Bypasses RLS)
    if (supabaseAdmin) {
        const { data: adminData, error: adminError } = await supabaseAdmin
            .from('inventory_assignments')
            .select('id, code, status')
            .eq('code', code)
            .single();

        if (adminError) {
            console.log('Admin Client Error:', adminError.message);
        } else {
            console.log('Admin Client Found (RLS Bypass):', adminData);
        }
    } else {
        console.log("No Service Role Key available to check RLS bypass.");
    }
}

checkCode('CMB-144045');
