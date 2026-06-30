import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { email, password, role, managerName } = await req.json();

    // 🔴 Admin client with Service Role Key (Yeh RLS bypass karke user banata hai)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Ye wahi secret key hai
    );

    // 1. Authentication system mein naya user banayein
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Bina email verification ke account active ho jayega
    });

    if (authError) throw authError;

    // 2. User_Roles table mein uski permission save karein
    const { error: dbError } = await supabaseAdmin.from('User_Roles').insert([
      { email: email, role: role, manager_name: managerName }
    ]);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, message: "User account created successfully!" });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}