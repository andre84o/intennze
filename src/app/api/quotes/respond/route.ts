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
    const { token, accept, note } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // First, verify the quote exists and hasn't been responded to
    const { data: quote, error: fetchError } = await supabase
      .from("quotes")
      .select("id, status, customer_id")
      .eq("public_token", token)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    // Check if already responded
    if (quote.status === "accepted" || quote.status === "declined") {
      return NextResponse.json(
        { error: "Quote has already been responded to" },
        { status: 400 }
      );
    }

    // Update the quote
    const newStatus = accept ? "accepted" : "declined";
    const { error: updateError } = await supabase
      .from("quotes")
      .update({
        status: newStatus,
        customer_response_at: new Date().toISOString(),
        customer_response_note: note || null,
      })
      .eq("public_token", token);

    if (updateError) {
      console.error("Error updating quote:", updateError);
      return NextResponse.json(
        { error: "Failed to update quote" },
        { status: 500 }
      );
    }

    // If accepted, update customer status to "customer"
    if (accept && quote.customer_id) {
      await supabase
        .from("customers")
        .update({
          status: "customer",
          has_purchased: true,
        })
        .eq("id", quote.customer_id);
    }

    console.log(`Quote ${quote.id} ${newStatus} by customer`);

    return NextResponse.json({
      success: true,
      status: newStatus,
    });
  } catch (error) {
    console.error("Quote response error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
