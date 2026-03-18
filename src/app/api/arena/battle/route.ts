import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";
import { calculateRatingChange } from "@/lib/game/xpEngine";
import {
  computeCPI,
  computePerfMod,
  computeWinProbability,
  rollOutcome,
  generateOpponentStats,
  XP_BY_RANK,
  TARGET_REPS,
  type BattleExercise,
} from "@/lib/game/battleEngine";

// Copy-don't-import pattern (Phase 3 principle)
function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { exercise, repsSubmitted, opponentName, opponentRank } = body || {};

  if (!exercise || repsSubmitted === undefined || repsSubmitted === null) {
    return NextResponse.json({ error: "Missing required fields: exercise, repsSubmitted" }, { status: 400 });
  }

  // 1. Read player's rank and stats
  const { data: userRow } = await supabase
    .from("users")
    .select("hunter_rank")
    .eq("id", userId)
    .maybeSingle();

  if (!userRow) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: statsRow } = await supabase
    .from("user_stats")
    .select("strength, agility, vitality, intelligence, pvp_rating, pvp_wins, pvp_losses")
    .eq("user_id", userId)
    .maybeSingle();

  if (!statsRow) return NextResponse.json({ error: "User stats not found" }, { status: 404 });

  // 2. Generate opponent stats server-side (for computation only — name comes from client body)
  const opponent = generateOpponentStats(userRow.hunter_rank || "D");
  // Use opponentName from request body: client already showed this name to player during matchmaking.
  // Use opponentRank from request body for XP lookup; opponent.rank is used for stat generation bracket only.
  const resolvedName = (opponentName as string) || opponent.name;
  const resolvedRank = (opponentRank as string) || opponent.rank;

  // 3. Compute battle result
  const castedExercise = exercise as BattleExercise;
  const maxReps = (TARGET_REPS[castedExercise] ?? 50) * 5;
  const safeReps = Math.min(Number(repsSubmitted), maxReps); // cheating protection: cap at 5× target

  const playerCPI = computeCPI(
    { strength: statsRow.strength, agility: statsRow.agility, vitality: statsRow.vitality, intelligence: statsRow.intelligence },
    castedExercise
  );
  const opponentCPI = computeCPI(opponent.stats, castedExercise);
  const perfMod = computePerfMod(safeReps, castedExercise);
  const winProbability = computeWinProbability(playerCPI, opponentCPI, perfMod);
  const outcome = rollOutcome(winProbability, playerCPI, opponentCPI);

  // 4. Compute XP and rating change
  const xpEntry = XP_BY_RANK[resolvedRank] ?? XP_BY_RANK["D"];
  const xpChange = xpEntry[outcome.toLowerCase() as "win" | "draw" | "loss"] ?? 0;

  let ratingChange: number;
  const myRating = statsRow.pvp_rating ?? 1000;
  const oppRating = opponent.baseRating;
  if (outcome === "WIN") {
    ratingChange = calculateRatingChange(myRating, oppRating, true);
  } else if (outcome === "LOSS") {
    ratingChange = calculateRatingChange(myRating, oppRating, false);
  } else {
    // DRAW: standard ELO draw formula
    const expected = 1 / (1 + Math.pow(10, (oppRating - myRating) / 400));
    ratingChange = Math.round(32 * (0.5 - expected));
  }

  // 5. Persist battle record — use resolvedName (from client body) so history matches matchmaking UI
  const { error: insertErr } = await supabase
    .from("arena_battles")
    .insert({
      user_id: userId,
      opponent_name: resolvedName,
      opponent_rank: resolvedRank,
      exercise,
      outcome,
      xp_change: xpChange,
      rating_change: ratingChange,
      reps_submitted: safeReps,
    });

  if (insertErr) {
    console.error("[arena/battle] Insert error:", insertErr);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // 6. Update user_stats: pvp_rating, pvp_wins/losses
  const newRating = Math.max(0, myRating + ratingChange);
  const newWins   = (statsRow.pvp_wins ?? 0)   + (outcome === "WIN"  ? 1 : 0);
  const newLosses = (statsRow.pvp_losses ?? 0)  + (outcome === "LOSS" ? 1 : 0);

  await supabase
    .from("user_stats")
    .update({ pvp_rating: newRating, pvp_wins: newWins, pvp_losses: newLosses })
    .eq("user_id", userId);

  // 7. Chain XP award (non-fatal — rank advance / stat points handled in /api/xp/award)
  if (xpChange > 0) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    await fetch(`${baseUrl}/api/xp/award`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount: xpChange, reason: "arena_battle" }),
    }).catch((err) => console.error("[arena/battle] XP award chain failed:", err));
  }

  return NextResponse.json({
    outcome,
    xpChange,
    ratingChange,
    newRating,
    opponentName: resolvedName,
    opponentRank: resolvedRank,
    winProbability,
  });
}
