import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // 🔴 Admin connection with Secret Key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. User ko User_Roles table se delete karna
    const { error: dbError } = await supabaseAdmin.from('User_Roles').delete().eq('email', email);
    if (dbError) throw dbError;

    // 2. User ko Supabase ke Core Auth se permanently delete karna
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (!listError) {
      const targetUser = users.find(u => u.email === email);
      if (targetUser) {
        await supabaseAdmin.auth.admin.deleteUser(targetUser.id);
      }
    }

    return NextResponse.json({ success: true, message: "Employee access permanently revoked!" });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}