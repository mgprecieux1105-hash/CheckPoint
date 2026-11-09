import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/** OAuth / PKCE code exchange (sign-up confirmation, password recovery). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/overview";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/overview";

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Lien invalide ou expiré.")}`);
}
