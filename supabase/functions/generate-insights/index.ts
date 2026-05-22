import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

const SYSTEM = `You are a child psychologist assistant helping parents understand their child's emotional wellbeing through drawing analysis.

You will receive:
- "radar": emotion percentages for the last 7 days (happy/sad/angry/anxious, each 0-100)
- "weeks": an array of 4 weekly snapshots (W1 oldest → W4 most recent), each with the same four emotion keys

Your job: produce 2-3 clinical insights a parent can act on.

Output ONLY a JSON array with 2-3 objects, no markdown fences, no extra text:
[
  {
    "icon": "<an Ionicons v5 name string — pick from: happy-outline, sad-outline, flame-outline, alert-circle-outline, trending-up, trending-down, remove, checkmark-circle-outline, bulb-outline, heart-outline, shield-checkmark-outline, people-outline, time-outline>",
    "title": "<short title, max 8 words>",
    "body": "<2-3 sentences of plain English. Mention the actual percentages. Give one concrete suggestion for the parent.>",
    "color": "<hex color — use #16a34a for positive/improving, #dc2626 for concern/declining, #e76f51 for mild concern, #7c3aed for neutral/informational, #f59e0b for dominant emotion insights>"
  }
]

Rules:
- Always start with the dominant emotion insight (highest % in radar)
- If happy changed by more than 8 percentage points across the 4 weeks, add a trend insight (rising = green, falling = red)
- If anxious changed by more than 8 points, add an anxiety insight
- If there is no notable trend, add a general encouragement insight (purple)
- Keep language simple — parents are not clinicians
- Never exceed 3 insights`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { radar, weeks, patientNames } = await req.json();

    if (!radar || !weeks) {
      return new Response(
        JSON.stringify({ error: "radar and weeks are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const namesLine = patientNames?.length
      ? `Children: ${patientNames.join(", ")}.`
      : "";

    const userMsg = `${namesLine}
Last 7 days emotion percentages: happy ${radar.happy}%, sad ${radar.sad}%, angry ${radar.angry}%, anxious ${radar.anxious}%.
4-week trend (W1 = oldest, W4 = most recent):
${weeks.map((w: any) => `${w.label}: happy ${w.happy}%, sad ${w.sad}%, angry ${w.angry}%, anxious ${w.anxious}%`).join("\n")}

Generate 2-3 insights for the parent.`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      temperature: 0.4,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });

    const raw = (response.content[0] as { text: string }).text.trim();
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const insights = JSON.parse(cleaned);

    return new Response(
      JSON.stringify({ insights }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("generate-insights error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
