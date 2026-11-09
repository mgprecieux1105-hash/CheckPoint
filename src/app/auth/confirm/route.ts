import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Token-hash confirmation links (custom e-mail templates). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/overview";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/overview";

  if (token_hash && type) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(`${origin}${type === "recovery" ? "/reset-password" : next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Lien invalide ou expiré.")}`);
}
