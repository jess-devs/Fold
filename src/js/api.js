import { parseModelJSON } from "./utils.js";
import { renderError, renderResults } from "./render.js";

const SYSTEM_PROMPT = `Eres un analista forense de documentos. Tu única tarea es leer un texto y encontrar afirmaciones que se contradicen entre sí DENTRO DEL MISMO TEXTO: cifras incompatibles, plazos que se pisan, reglas que se anulan mutuamente, definiciones distintas del mismo término, etc.

Reglas estrictas:
- Solo reporta contradicciones reales y claras. Si tienes dudas razonables de que algo sea una contradicción, no lo incluyas.
- claim_a y claim_b deben ser citas textuales cortas (máximo 25 palabras cada una) tomadas literalmente del documento.
- Máximo 6 contradicciones, las más relevantes primero.
- Responde ÚNICAMENTE con un objeto JSON, sin texto adicional, sin markdown, con esta forma exacta:
{"contradictions":[{"claim_a":"...","claim_b":"...","explanation":"una frase explicando por qué no pueden ser ambas ciertas","severity":"alta|media|baja"}]}
- Si no hay contradicciones, responde {"contradictions":[]}`;

export async function analyze(text, { btn, output }) {
  if (!text) {
    output.innerHTML = `<div class="error-box">Pega un documento antes de analizar.</div>`;
    return;
  }

  let endpoint =
    localStorage.getItem("ai-endpoint") ||
    "https://openrouter.ai/api/v1/chat/completions";
  if (!endpoint.includes("/chat/completions")) {
    endpoint = endpoint.replace(/\/$/, "") + "/chat/completions";
  }
  const apiKey = localStorage.getItem("ai-api-key") ?? "";
  const model =
    localStorage.getItem("ai-model") || "anthropic/claude-sonnet-4-6";

  if (!apiKey) {
    output.innerHTML = `<div class="error-box">Configura tu API key en ⚙ Configuración antes de analizar.</div>`;
    return;
  }

  btn.disabled = true;
  btn.textContent = "Analizando...";
  output.innerHTML = `<p class="status">Comparando cada afirmación contra el resto del documento...</p>`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg =
        data?.error?.message ?? data?.message ?? `estado ${response.status}`;
      throw new Error(`la API respondió con error: ${msg}`);
    }

    const raw =
      data.choices?.[0]?.message?.content?.trim() ||
      data.choices?.[0]?.message?.reasoning_content?.trim();

    if (!raw) {
      const hint = data?.error?.message
        ? `: ${data.error.message}`
        : ". Verifica que el nombre del modelo sea correcto";
      throw new Error(`la respuesta no incluyó texto${hint}`);
    }

    const parsed = parseModelJSON(raw);
    renderResults(
      Array.isArray(parsed.contradictions) ? parsed.contradictions : [],
    );
  } catch (err) {
    renderError(err.message || "error desconocido");
  } finally {
    btn.disabled = false;
    btn.textContent = "Buscar contradicciones";
  }
}
