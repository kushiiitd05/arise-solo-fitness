import { GameState } from "../gameReducer";

/**
 * Stage 3: AI Workout Generator Prompts
 * Generates personalized workouts based on user stats, job class, and current Rank.
 */

export async function generateWorkoutOllama(state: GameState) {
  const { user, stats } = state;
  
  const prompt = `
    You are THE SYSTEM from Solo Leveling. Generate a personalized DAILY MISSION for Hunter ${user.username}.
    Current Rank: ${user.title}
    Job Class: ${user.jobClass}
    
    Stats:
    - Strength: ${stats.strength}
    - Vitality: ${stats.vitality}
    - Agility: ${stats.agility}
    - Intelligence: ${stats.intelligence}
    
    The mission must include:
    1. A thematic Title (e.g., "The Giant's Path" for a Tank class).
    2. 4 exercises with specific Rep/Set counts scaled to their Rank.
    3. A "Penalty Zone" failure warning.
    
    Output in JSON format:
    {
      "title": "String",
      "flavorText": "String",
      "exercises": [
        { "name": "String", "sets": Number, "reps": Number, "statType": "String" }
      ],
      "xpReward": Number
    }
  `;

  try {
    // Stage 3 requirement: Integration with local Ollama
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: "phi3:mini",
        prompt: prompt,
        stream: false,
        format: "json"
      }),
    });
    const data = await response.json();
    return JSON.parse(data.response);
  } catch (err) {
    console.error("AI Generation failed, falling back to System defaults.");
    return {
      title: "Daily Strength Quest",
      flavorText: "Complete or face the Penalty Zone.",
      exercises: [
        { name: "Push-ups", sets: 4, reps: 25, statType: "strength" },
        { name: "Squats", sets: 4, reps: 25, statType: "vitality" }
      ],
      xpReward: 1000
    };
  }
}
