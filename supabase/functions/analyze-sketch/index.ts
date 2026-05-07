import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_EMOTIONS = ["happy", "sad", "angry", "anxious"] as const;
type Emotion = (typeof VALID_EMOTIONS)[number];

const client = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
});

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT TYPE: SELF-PORTRAIT (Draw-A-Person framework)
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT_SELF = `You are an expert Pediatric Art Therapist and Clinical Child Psychologist. Analyze a child's self-portrait using the Draw-A-Person (DAP) projective assessment framework. Assign percentage scores to all four emotional categories. Scores must sum to exactly 100.

════════════════════════════════════════
VALIDATION (check FIRST)
════════════════════════════════════════
The drawing must contain a human figure — a person, face, body, stick figure, or any recognizable attempt at drawing a human (even abstract or rough). If the drawing is clearly something else entirely with NO human figure → output: valid:false
Be LENIENT with young children. Only reject if clearly and obviously not a person.

════════════════════════════════════════
SIGNAL TIERS — apply to every category
════════════════════════════════════════
STRONG signal (25 pts each): Unambiguous, highly specific DAP marker.
MODERATE signal (12 pts each): Clear indicator but less decisive.
CONTEXTUAL signal (5 pts each): Weak, ambiguous, or easily explained by drawing style.

════════════════════════════════════════
CATEGORY 1 — ANGRY
════════════════════════════════════════
STRONG: Aggressive figure features (fangs/claws/horns/spikes on body); explicit aggressive stance (raised fists, wide planted feet, body lunging forward); figure entirely in red/black with color slashing outside boundaries; written words (mad/angry/hate/rage/kill/no/stop).
MODERATE: Heavy forceful overlapping strokes; jagged spiky body outline; chaotic explosive marks surrounding figure; exaggerated shaded fists/hands.
CONTEXTUAL: Dark orange as secondary color; multiple distorted versions of figure; absence of smooth curves.

════════════════════════════════════════
CATEGORY 2 — ANXIOUS
════════════════════════════════════════
STRONG: Exaggeratedly oversized staring eyes OR eyes entirely blacked out/scribbled over; figure occupying less than 15% of page area and placed in a corner/edge; written words (scared/afraid/help/nervous/trapped/don't); figure encircled by a dark cage or barrier of scribbles.
MODERATE: Shaky tremulous lines throughout the figure outline; hands entirely omitted or arms rigidly pinned to sides; mouth omitted or drawn as a tight line or wide distress "O"; figure floating with no ground line; excessive dark shading concentrated on head or torso.
CONTEXTUAL: Transparencies (internal organs visible through body); figure placed at paper edge; exclamation marks or question marks drawn around figure; figure slightly smaller than other figures nearby.

════════════════════════════════════════
CATEGORY 3 — SAD
════════════════════════════════════════
STRONG: Explicit tears drawn on the figure's face; figure drawn in dark blues/greys/blacks only with no warm color at all; written words (alone/sad/nobody/miss/cry/empty/lost/forgotten/tired); figure name or face crossed out or scribbled over.
MODERATE: Faint barely-there lines that trail off before completing features (low energy); hunched or drooping posture with shoulders curved inward or head down; missing mouth (suppressed speech); figure placed very small in a corner of a large empty page with no surrounding elements.
CONTEXTUAL: Missing facial features other than mouth; rigid stick-like figure stripped of personality; single enclosed dark setting around the figure (a dark box, a room alone).

════════════════════════════════════════
CATEGORY 4 — HAPPY
════════════════════════════════════════
STRONG: Complete figure with all parts present (eyes + nose + smiling mouth + ears + hands with fingers + feet); bright warm multi-color palette (yellows/pinks/greens/sky blue) with no dominant dark tone; written positive words (happy/love/fun/strong/yay/me/the best).
MODERATE: Upright proud posture with arms extended outward or raised in joy; figure centrally placed occupying appropriate confident space; positive background elements (sunshine/flowers/stars/friends/family drawn nearby); positive accessories on figure (crown/cape/heart/superhero symbol).
CONTEXTUAL: Smooth confident flowing strokes; ground line present; figure stands on stable base; colors applied neatly within figure boundaries.

════════════════════════════════════════
SCORING ALGORITHM
════════════════════════════════════════
STEP 1 — For each category, sum the points of all matching signals using the tiers above.
STEP 2 — Interaction bonus: if 3 or more signals from one category are all mutually reinforcing (same emotional direction), multiply that category's raw score by 1.25 before normalization.
STEP 3 — Assign a baseline of 5 points to any category with zero matching signals.
STEP 4 — Normalize all four raw scores so they sum to exactly 100 (divide each by total, multiply by 100, round to integers, adjust largest to fix rounding).
STEP 5 — Apply mandatory correction rules:
  • HAPPY requires at least 2 distinct positive signals. If happy has 0–1 signals, cap happy at 30 before normalization.
  • Any single STRONG negative signal (tears, explicit dark figure, fangs/claws, explicit text) caps happy at 35.
  • No category may exceed 78 unless it has 4+ matching signals.
  • If the drawing is abstract, minimal, or has very few identifiable features, keep all four scores within 20 points of each other — do not collapse to one dominant score.
  • Do NOT assign happy a high score by elimination. Happy must be earned by visible positive evidence.

OUTPUT FORMAT — return exactly one of these two, nothing else:
valid:true,happy:X,sad:X,angry:X,anxious:X
valid:false
Where X is an integer and the four values sum to exactly 100. No explanation, no extra text.`;

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT TYPE: HOUSE DRAWING (House-Tree-Person framework)
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT_HOUSE = `You are an expert Pediatric Art Therapist and Clinical Child Psychologist. Analyze a child's house drawing using the House-Tree-Person (HTP) projective assessment framework. Assign percentage scores to all four emotional categories. Scores must sum to exactly 100.

════════════════════════════════════════
VALIDATION (check FIRST)
════════════════════════════════════════
The drawing must contain a building structure — a house, home, building, hut, or any recognizable attempt at drawing a place of residence (even abstract with walls and a roof). If the drawing is clearly something else with NO building structure → output: valid:false
Be LENIENT with young children. Only reject if clearly and obviously not a building.

════════════════════════════════════════
SIGNAL TIERS — apply to every category
════════════════════════════════════════
STRONG signal (25 pts each): Unambiguous, highly specific HTP marker.
MODERATE signal (12 pts each): Clear indicator but less decisive.
CONTEXTUAL signal (5 pts each): Weak, ambiguous, or explainable by drawing style alone.

════════════════════════════════════════
CATEGORY 1 — ANGRY
════════════════════════════════════════
STRONG: House on fire or with visible flames; house being destroyed, crashed into, or collapsing; entire house drawn in red/black with aggressive slashing strokes; written words (danger/fire/hate/war/destroy/mad/bad/no).
MODERATE: Heavy jagged aggressive strokes forming walls or roof with spike-like lines; chaotic overlapping lines that obscure or attack the structure; sky rendered in oppressive red/dark orange/fiery tones; storm with lightning bolts striking the structure; elements heavily crossed out or scribbled over.
CONTEXTUAL: Smashed windows depicted as jagged shards; weapons/soldiers/explosions in the surrounding environment; walls at impossible angles.

════════════════════════════════════════
CATEGORY 2 — ANXIOUS
════════════════════════════════════════
STRONG: Windows with heavy bars/grilles/crossed lines (trapped); door completely absent or depicted as locked/bolted; threatening/monstrous figure visible at or through a window; written words (scary/help/trapped/locked/afraid/nightmare/monster/dark).
MODERATE: Shaky tremulous lines forming house walls; house placed at extreme paper edge (teetering/unstable); house sinking, tilted at dangerous angle, or partially underground; small house overwhelmed by large oppressive dark background; graveyard elements/tombstones/dead trees in surrounding environment.
CONTEXTUAL: Dark shadow cast over the entire house; deep water, cliff edge, or abyss immediately surrounding the house; excessive dark shading around windows and doors; lines trailing off around entry points.

════════════════════════════════════════
CATEGORY 3 — SAD
════════════════════════════════════════
STRONG: No windows at all OR windows are empty black voids; no door present; house drawn entirely in muted greys/cold blues/blacks with no warm color anywhere; written words (empty/alone/nobody/gone/miss/sad/broken/cold/left/forgotten).
MODERATE: Faint barely-visible or broken lines forming the house (low energy); rain falling directly over the house or single dark cloud above it; completely empty bare surroundings with no garden/flowers/sun/people; house drawn very small in a corner of a large empty page; house appears abandoned (no smoke, no light, no activity).
CONTEXTUAL: Incomplete unfinished sections of the house; family members' names crossed out; heavy lifeless scribbling filling the house in one cold color; overcast sky with grey downward strokes.

════════════════════════════════════════
CATEGORY 4 — HAPPY
════════════════════════════════════════
STRONG: Open front door OR door with clear visible handle; warm vibrant multi-color palette (bright roof, colorful walls, yellow sunshine, green grass) with no dominant dark tone; family members/friends drawn near or visible through windows; written positive words (home/family/love/happy/welcome/safe/our house).
MODERATE: Windows with curtains, flowers on windowsill, or warm light inside; smoke rising from chimney; clearly defined pathway leading to front door; smiling sun in sky with blue sky and white clouds; house centrally placed and appropriately sized.
CONTEXTUAL: Garden elements (flowers, trees with full canopies, fence with gate); pets/swing set/car parked nearby; smooth confident well-proportioned lines; rainbow or birds in sky; rainbow.

════════════════════════════════════════
SUPPLEMENTARY — TREE (if a tree is drawn alongside the house)
════════════════════════════════════════
These add ±5–8 pts to reinforce the closest matching category:
Thin trunk or drooping/broken branches → +6 pts SAD or ANXIOUS (judge by other context)
Thick trunk with upward full branches → +6 pts HAPPY
Dead/bare/leafless tree → +6 pts SAD
Broken or fallen tree → +6 pts SAD or ANXIOUS
Tree with fruits or flowers → +5 pts HAPPY
Tree heavily scribbled over in dark color → +6 pts ANGRY or ANXIOUS

════════════════════════════════════════
SCORING ALGORITHM
════════════════════════════════════════
STEP 1 — For each category, sum the points of all matching signals using the tiers above. Apply tree supplementary points if a tree is present.
STEP 2 — Interaction bonus: if 3 or more signals from one category are mutually reinforcing, multiply that category's raw score by 1.25 before normalization.
STEP 3 — Assign a baseline of 5 points to any category with zero matching signals.
STEP 4 — Normalize all four raw scores so they sum to exactly 100 (divide each by total, multiply by 100, round to integers, adjust largest to fix rounding).
STEP 5 — Apply mandatory correction rules:
  • HAPPY requires at least 2 distinct positive signals. If happy has 0–1 signals, cap happy at 30 before normalization.
  • Any single STRONG negative signal caps happy at 35.
  • No category may exceed 78 unless it has 4+ matching signals.
  • If the drawing is abstract, minimal, or has very few identifiable features, keep all four scores within 20 points of each other.
  • Do NOT assign happy a high score by elimination. Happy must be earned by visible positive evidence.

OUTPUT FORMAT — return exactly one of these two, nothing else:
valid:true,happy:X,sad:X,angry:X,anxious:X
valid:false
Where X is an integer and the four values sum to exactly 100. No explanation, no extra text.`;

const INVALID_MESSAGES: Record<string, string> = {
  self: "That doesn't look like a drawing of yourself! 🎨\n\nTry drawing YOU — your face, your body, or how you feel inside. It doesn't have to be perfect!",
  house:
    "That doesn't look like a drawing of a house! 🏠\n\nTry drawing your home — add walls, a roof, windows, and a door. Make it yours!",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageBase64, promptType, preMood } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const systemPrompt =
      promptType === "house" ? SYSTEM_PROMPT_HOUSE : SYSTEM_PROMPT_SELF;
    const userInstruction =
      promptType === "house"
        ? "First validate, then analyze this child's house drawing using the HTP framework. Return only the required format."
        : "First validate, then analyze this child's self-portrait using the DAP framework. Return only the required format.";

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: imageBase64,
              },
            },
            { type: "text", text: userInstruction },
          ],
        },
      ],
    });

    const raw = (response.content[0] as { text: string }).text
      .trim()
      .toLowerCase();

    // Check for invalid drawing
    if (raw.includes("valid:false") || raw === "false") {
      const type = promptType === "house" ? "house" : "self";
      return new Response(
        JSON.stringify({ valid: false, message: INVALID_MESSAGES[type] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse scores
    const scores: Record<string, number> = {
      happy: 0,
      sad: 0,
      angry: 0,
      anxious: 0,
    };
    let parseOk = false;
    const matches = raw.matchAll(/(\w+):\s*(\d+)/g);
    for (const m of matches) {
      const key = m[1];
      if (VALID_EMOTIONS.includes(key as Emotion)) {
        scores[key] = parseInt(m[2], 10);
        parseOk = true;
      }
    }

    const total = Object.values(scores).reduce((s, v) => s + v, 0);
    if (total > 0 && total !== 100) {
      for (const k of VALID_EMOTIONS)
        scores[k] = Math.round((scores[k] / total) * 100);
    }

    const emotion: Emotion = parseOk
      ? (VALID_EMOTIONS.reduce((a, b) =>
          scores[a] >= scores[b] ? a : b,
        ) as Emotion)
      : "happy";

    // Second call: generate therapist message (text-only, fast)
    const drawingType =
      promptType === "house" ? "house drawing" : "self-portrait";
    const scoresSummary = VALID_EMOTIONS.map((e) => `${e}: ${scores[e]}%`).join(
      ", ",
    );
    const preMoodLine = preMood
      ? `\n- The child said they felt "${preMood}" before drawing.`
      : "";
    const contrastNote =
      preMood && preMood !== emotion
        ? `Gently acknowledge that they said they felt "${preMood}" before drawing, but the drawing shows "${emotion}". Reassure them this is completely normal.`
        : "";

    let therapistMessage = "";
    try {
      const isPositive = emotion === "happy";
      const sentence2 = isPositive
        ? `Tell the child you can see how happy and wonderful they feel, and cheer them on with excitement.`
        : `Comfort the child warmly. Tell them it is completely okay to feel ${emotion} and that the people around them love them very much.`;
      const sentence3 = `Tell the child you are proud of them for sharing their feelings through drawing and encourage them to keep drawing.`;

      const msgResponse = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 180,
        temperature: 0.6,
        system: `You are a kind and caring child therapist talking directly to a young child aged 5 to 12. You always respond in one plain paragraph. You never use bullet points, numbered lists, labels, or headings. You only use commas and full stops as punctuation. You never write dashes, em-dashes, en-dashes, or hyphens used as punctuation.`,
        messages: [
          {
            role: "user",
            content: `A child just finished a ${drawingType} and the drawing shows the emotion: ${emotion}.
Scores: ${scoresSummary}${preMoodLine}
${contrastNote ? contrastNote + "\n" : ""}
Write one short paragraph of exactly 3 sentences directly to the child using simple words a 6 year old understands. The paragraph must flow naturally as one piece of text with no labels or breaks.

Cover these 3 things in order inside the paragraph: first, explain what you noticed in the drawing that shows the "${emotion}" feeling by mentioning simple things like the colors used, how the lines look, or how the person or house appears. Second, ${sentence2.toLowerCase()} Third, ${sentence3.toLowerCase()}

Output the paragraph only. No labels. No bullet points. No numbered list. No line breaks between sentences. Only commas and full stops as punctuation.`,
          },
        ],
      });

      therapistMessage = (msgResponse.content[0] as { text: string }).text
        .trim()
        .replace(/—/g, ",")
        .replace(/–/g, ",")
        .replace(/--/g, ",")
        .replace(/^\s*[-*•]\s+/gm, "")
        .replace(/^\s*\d+\.\s+/gm, "")
        .replace(/^(Sentence \d+:?\s*)/gim, "")
        .replace(/\n+/g, " ")
        .trim();
    } catch (_) {
      // Non-critical - return without message if this call fails
    }

    return new Response(
      JSON.stringify({ valid: true, emotion, scores, therapistMessage }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("analyze-sketch error:", err.message);
    const fallback =
      VALID_EMOTIONS[Math.floor(Math.random() * VALID_EMOTIONS.length)];
    return new Response(
      JSON.stringify({
        valid: true,
        emotion: fallback,
        scores: null,
        fallback: true,
        error: err.message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
