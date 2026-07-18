// POST /.netlify/functions/ai-proxy
// Body: { messages: [{role, content}, ...], groundedDishes?: [...] }
//
// Generic chat proxy used by Member 3's Ask tab. Keeps GROQ_API_KEY
// server-side. groundedDishes (from Member 2's RAG retrieval) gets
// injected as a system message so answers stay grounded in real data.

const SYSTEM_PROMPT = `You are DietPal's nutrition assistant. You only answer
questions about food, nutrition, and cooking — specifically Lebanese and
Levantine cuisine. If asked about anything else, politely redirect the user
back to food/nutrition topics. When a dish is provided as grounded context,
use its real ingredients, macros, and recipe steps rather than inventing
details from memory.`;

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { messages, groundedDishes } = JSON.parse(event.body || "{}");

    if (!Array.isArray(messages) || messages.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "messages array is required" }) };
    }

    const groundingMessage = groundedDishes?.length
      ? [{
          role: "system",
          content: `Relevant dish data from the knowledge base:\n${JSON.stringify(groundedDishes)}`,
        }]
      : [];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...groundingMessage,
          ...messages,
        ],
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: response.status, body: JSON.stringify({ error: errText }) };
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "";

    return {
      statusCode: 200,
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
