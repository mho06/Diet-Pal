// POST /.netlify/functions/generate-plan
// Body: {
//   profile: { targets: {calories, proteinG, carbsG, fatG}, allergies: [], dislikes: [] },
//   goal: "cut" | "maintain" | "bulk",
//   pantry?: string,             // optional "what's in the kitchen" input
//   groundedDishes: [...]        // from Member 2's RAG retrieval — real dish candidates
// }
//
// Returns: { meals: [{ name, description, calories, proteinG, carbsG, fatG, ingredients, recipeSteps }] }

const COACHING_PROMPTS = {
  cut: "Prioritize high protein and satiety per calorie to protect muscle in a deficit. Favor grilled/roasted preparations over fried, and lean proteins.",
  maintain: "Balance the day for sustainability and variety — this person isn't chasing an extreme, so avoid overly restrictive meals.",
  bulk: "Favor calorie-dense, nutrient-rich meals that are realistic to eat consistently — don't rely on empty calories to hit the target.",
};

function buildPrompt({ profile, goal, pantry, groundedDishes }) {
  return `You are a nutrition coach building a one-day Lebanese meal plan.

Target: ${profile.targets.calories} kcal, ${profile.targets.proteinG}g protein, ${profile.targets.carbsG}g carbs, ${profile.targets.fatG}g fat.
Goal: ${goal}. Coaching approach: ${COACHING_PROMPTS[goal] || COACHING_PROMPTS.maintain}
Allergies (must strictly avoid): ${profile.allergies?.join(", ") || "none"}
Disliked foods (must strictly avoid): ${profile.dislikes?.join(", ") || "none"}
${pantry ? `Ingredients on hand to prioritize: ${pantry}` : ""}

Build the plan ONLY from these real, retrieved dishes — do not invent dishes
that aren't in this list. Combine and portion them to hit the target:
${JSON.stringify(groundedDishes)}

Respond with ONLY valid JSON, no markdown fences, no commentary, in this exact shape:
{
  "meals": [
    {
      "name": string,
      "mealType": "breakfast" | "lunch" | "dinner" | "snack",
      "description": string,
      "calories": number,
      "proteinG": number,
      "carbsG": number,
      "fatG": number,
      "coachNote": string
    }
  ]
}`;
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { profile, goal, pantry, groundedDishes } = JSON.parse(event.body || "{}");

    if (!profile?.targets || !goal) {
      return { statusCode: 400, body: JSON.stringify({ error: "profile.targets and goal are required" }) };
    }
    if (!groundedDishes?.length) {
      return { statusCode: 400, body: JSON.stringify({ error: "groundedDishes is required — retrieve candidates via RAG before calling this function" }) };
    }

    const prompt = buildPrompt({ profile, goal, pantry, groundedDishes });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: response.status, body: JSON.stringify({ error: errText }) };
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return { statusCode: 502, body: JSON.stringify({ error: "Model returned invalid JSON", raw: rawText }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
