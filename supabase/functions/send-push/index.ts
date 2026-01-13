import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  try {
    const { title, body, type = "alert" } = await req.json();

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing title or body" }),
        { status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    /* 1️⃣ Get ALL push tokens */
    const tokensRes = await fetch(
      `${supabaseUrl}/rest/v1/push_tokens`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );

    const rows: { token: string }[] = await tokensRes.json();

    if (!rows.length) {
      return new Response(
        JSON.stringify({ message: "No push tokens found" }),
        { status: 200 }
      );
    }

    /* 2️⃣ Save notification (GLOBAL) */
    await fetch(`${supabaseUrl}/rest/v1/notifications`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        body,
        type,
      }),
    });

    /* 3️⃣ Send push */
    const messages = rows.map((r) => ({
      to: r.token,
      sound: "default",
      title,
      body,
    }));

    const expoRes = await fetch(
      "https://exp.host/--/api/v2/push/send",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      }
    );

    return new Response(
      JSON.stringify({ success: true, sent: messages.length }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
});
