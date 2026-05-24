import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { eventId } = await req.json();
    if (!eventId) throw new Error("eventId is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch the drawing_schedule event
    const { data: event, error: evErr } = await supabase
      .from("child_events")
      .select("id, title, description, scheduled_at, therapist_id, child_id")
      .eq("id", eventId)
      .eq("event_type", "drawing_schedule")
      .single();

    if (evErr || !event) throw new Error("Drawing schedule event not found");

    // Fetch child + guardian_id
    const { data: patient, error: patErr } = await supabase
      .from("patients")
      .select("id, full_name, guardian_id")
      .eq("id", event.child_id)
      .single();

    if (patErr || !patient) throw new Error("Patient not found");

    // Fetch guardian's push token and therapist name in parallel
    const [{ data: guardian }, { data: therapist }] = await Promise.all([
      supabase
        .from("profiles")
        .select("expo_push_token, full_name")
        .eq("id", patient.guardian_id)
        .single(),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", event.therapist_id)
        .single(),
    ]);

    const token = guardian?.expo_push_token;

    if (!token) {
      console.warn("Guardian has no push token, skipping notification");
      return new Response(
        JSON.stringify({ sent: false, reason: "no_push_token" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const therapistName = therapist?.full_name ?? "Your therapist";
    const childFirstName = patient.full_name.split(" ")[0];

    const scheduledDate = new Date(event.scheduled_at).toLocaleDateString("en-MY", {
      weekday: "long", day: "numeric", month: "long",
    });
    const scheduledTime = new Date(event.scheduled_at).toLocaleTimeString("en-MY", {
      hour: "2-digit", minute: "2-digit",
    });

    // Send via Expo Push API
    const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        to: token,
        title: `Drawing Session for ${childFirstName} 🎨`,
        body: `${therapistName} scheduled a drawing session on ${scheduledDate} at ${scheduledTime}. Tap to accept or reject.`,
        data: {
          screen: "drawing-schedule",
          eventId: event.id,
          childId: patient.id,
          selectedDate: event.scheduled_at.split("T")[0],
        },
        sound: "default",
        priority: "high",
        channelId: "default",
      }),
    });

    if (!pushResponse.ok) {
      const errText = await pushResponse.text();
      throw new Error(`Expo push API error: ${errText}`);
    }

    // Mark event as notified
    await supabase
      .from("child_events")
      .update({ is_notified: true })
      .eq("id", eventId);

    return new Response(
      JSON.stringify({ sent: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[send-push-notification]", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
