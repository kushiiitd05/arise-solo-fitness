import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { ollamaGenerate } from "@/lib/ai/ollamaClient";
import { aiCache } from "@/lib/ai/sessionCache";

// Copy-don't-import per Phase 3 decision
function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7) || null;
}

interface ExerciseGuide {
  steps: string[];
  mistakes: string[];
  breathing: string[];
  tip: string;
}

const FALLBACK_GUIDE: ExerciseGuide = {
  steps: [
    "Set up in proper starting position.",
    "Execute the movement with controlled form.",
    "Return to starting position with control.",
  ],
  mistakes: [
    "HUNTER WARNING: Rushing reps sacrifices form — quality over quantity.",
    "HUNTER WARNING: Neglecting breathing patterns reduces power output.",
  ],
  breathing: ["Inhale during the lowering phase.", "Exhale during the exertion phase."],
  tip: "A true hunter masters form before chasing reps.",
};

function buildGuidePrompt(exerciseId: string): string {
  // exerciseId is the string key (e.g. "pushup", "diamond_pushup")
  // Use it directly as exercise name context — no lookup needed for prompt
  const name = exerciseId.replace(/_/g, " ");
  return `You are THE SYSTEM, an AI trainer for elite hunters. Generate a JSON exercise guide for "${name}".

Return ONLY valid JSON with this exact shape:
{
  "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "mistakes": ["HUNTER WARNING: ...", "HUNTER WARNING: ..."],
  "breathing": ["Inhale on ...", "Exhale on ..."],
  "tip": "A true hunter..."
}

Rules:
- 3-5 steps describing proper form
- 2-3 mistakes prefixed with "HUNTER WARNING:"
- 2 breathing cues
- 1 closing motivational tip in THE SYSTEM voice
- Generic form guidance only — no personalisation`;
}

function parseGuideJson(raw: string | null): ExerciseGuide {
  if (!raw) return FALLBACK_GUIDE;
  try {
    const parsed = JSON.parse(raw) as ExerciseGuide;
    if (!parsed.steps || !Array.isArray(parsed.steps)) return FALLBACK_GUIDE;
    return parsed;
  } catch {
    return FALLBACK_GUIDE;
  }
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exerciseId = req.nextUrl.searchParams.get("exerciseId");
  if (!exerciseId) return NextResponse.json({ error: "exerciseId required" }, { status: 400 });

  // Layer 1: in-session Map cache
  const cacheKey = `exercise:${exerciseId}`;
  if (aiCache.has(cacheKey)) {
    const cached = aiCache.get(cacheKey);
    return NextResponse.json({ guide: JSON.parse(cached!) });
  }

  // Layer 2: DB cache (shared across all users, permanent)
  const { data: dbRow } = await supabaseServer
    .from("exercise_guides")
    .select("guide_json")
    .eq("exercise_id", exerciseId)
    .maybeSingle();

  if (dbRow) {
    aiCache.set(cacheKey, JSON.stringify(dbRow.guide_json));
    return NextResponse.json({ guide: dbRow.guide_json });
  }

  // Layer 3: Generate via Ollama, save to DB
  const raw = await ollamaGenerate(buildGuidePrompt(exerciseId), { format: "json" });
  const guide = parseGuideJson(raw);

  // Save to DB (best-effort — do not fail if insert errors)
  await supabaseServer
    .from("exercise_guides")
    .insert({ exercise_id: exerciseId, guide_json: guide });

  aiCache.set(cacheKey, JSON.stringify(guide));

  return NextResponse.json({ guide });
}
