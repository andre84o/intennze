import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role for this API since it's public
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Update status to opened if not already completed
    const { error } = await supabase
      .from("questionnaires")
      .update({
        status: "opened",
        opened_at: new Date().toISOString(),
      })
      .eq("public_token", token)
      .neq("status", "completed");

    if (error) {
      console.error("Error marking questionnaire as opened:", error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Questionnaire opened error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
