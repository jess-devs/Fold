import { parseModelJSON } from "./utils.js";
import { renderError, renderResults } from "./render.js";
import { saveAnalysis } from "./history.js";

const SYSTEM_PROMPT = `Eres un analista forense de documentos. Tu única tarea es leer un texto y encontrar afirmaciones que se contradicen entre sí DENTRO DEL MISMO TEXTO: cifras incompatibles, plazos que se pisan, reglas que se anulan mutuamente, definiciones distintas del mismo término, etc.

Reglas estrictas:
- Solo reporta contradicciones reales y claras. Si tienes dudas razonables de que algo sea una contradicción, no lo incluyas.
- claim_a y claim_b deben ser citas textuales cortas (máximo 25 palabras cada una) tomadas literalmente del documento.
- Máximo 6 contradicciones, las más relevantes primero.
- Responde ÚNICAMENTE con un objeto JSON, sin texto adicional, sin markdown, con esta forma exacta:
{"contradictions":[{"claim_a":"...","claim_b":"...","explanation":"una frase explicando por qué no pueden ser ambas ciertas","severity":"alta|media|baja"}]}
- Si no hay contradicciones, responde {"contradictions":[]}`;

const COMPARISON_PROMPT = `Eres un analista forense de documentos. Tu tarea es comparar dos documentos y encontrar afirmaciones que se contradicen entre sí: un documento afirma algo y el otro lo niega o establece algo incompatible (cifras distintas, plazos que se pisan, reglas contradictorias, definiciones incompatibles del mismo término, etc.).

Reglas estrictas:
- Solo reporta contradicciones reales y claras entre los dos documentos. Si tienes dudas razonables, no lo incluyas.
- claim_a debe ser una cita textual del DOCUMENTO A y claim_b del DOCUMENTO B (máximo 25 palabras cada una).
- Máximo 6 contradicciones, las más relevantes primero.
- Responde ÚNICAMENTE con un objeto JSON, sin texto adicional, sin markdown, con esta forma exacta:
{"contradictions":[{"claim_a":"...","claim_b":"...","explanation":"una frase explicando por qué no pueden ser ambas ciertas","severity":"alta|media|baja"}]}
- Si no hay contradicciones, responde {"contradictions":[]}`;

const CHUNK_LIMIT = 30_000;
const CHUNK_OVERLAP = 500;

let _controller = null;

export function cancelAnalysis() {
  _controller?.abort();
}

function getApiConfig() {
  let endpoint =
    localStorage.getItem("ai-endpoint") ||
    "https://openrouter.ai/api/v1/chat/completions";
  if (!endpoint.includes("/chat/completions")) {
    endpoint = endpoint.replace(/\/$/, "") + "/chat/completions";
  }
  return {
    endpoint,
    apiKey: localStorage.getItem("ai-api-key") ?? "",
    model: localStorage.getItem("ai-model") || "anthropic/claude-sonnet-4-6",
  };
}

async function fetchOnce(systemPrompt, userContent, signal) {
  const { endpoint, apiKey, model } = getApiConfig();
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
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
    signal,
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

  return parseModelJSON(raw);
}

function splitChunks(text) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_LIMIT, text.length);
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

function deduplicateContradictions(all) {
  const seen = new Set();
  return all.filter((c) => {
    const key = c.claim_a.slice(0, 20) + "|" + c.claim_b.slice(0, 20);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function analyze(textA, textB, { btn, output }) {
  if (!textA) {
    output.innerHTML = `<div class="error-box">Pega un documento antes de analizar.</div>`;
    return;
  }

  const { apiKey } = getApiConfig();
  if (!apiKey) {
    output.innerHTML = `<div class="error-box">Configura tu API key en Configuración antes de analizar.</div>`;
    return;
  }

  const isComparison = textB !== null;
  if (isComparison && !textB) {
    output.innerHTML = `<div class="error-box">Pega el segundo documento en el campo Documento B.</div>`;
    return;
  }

  _controller = new AbortController();
  btn.dataset.mode = "cancel";
  btn.textContent = "Cancelar";

  let statusMsg;
  if (isComparison) {
    statusMsg = "Comparando los dos documentos…";
  } else if (textA.length > CHUNK_LIMIT) {
    statusMsg = "Texto largo detectado. Analizando en fragmentos…";
  } else {
    statusMsg = "Comparando cada afirmación contra el resto del documento…";
  }
  output.innerHTML = `<p class="status">${statusMsg}</p>`;

  try {
    let contradictions = [];

    if (isComparison) {
      const userContent = `DOCUMENTO A:\n${textA}\n\n---\n\nDOCUMENTO B:\n${textB}`;
      const parsed = await fetchOnce(COMPARISON_PROMPT, userContent, _controller.signal);
      contradictions = Array.isArray(parsed.contradictions) ? parsed.contradictions : [];
    } else if (textA.length > CHUNK_LIMIT) {
      const chunks = splitChunks(textA);
      const all = [];
      for (let i = 0; i < chunks.length; i++) {
        if (_controller.signal.aborted) break;
        output.innerHTML = `<p class="status">Analizando fragmento ${i + 1} de ${chunks.length}…</p>`;
        const parsed = await fetchOnce(SYSTEM_PROMPT, chunks[i], _controller.signal);
        if (Array.isArray(parsed.contradictions)) {
          all.push(...parsed.contradictions);
        }
      }
      contradictions = deduplicateContradictions(all).slice(0, 6);
    } else {
      const parsed = await fetchOnce(SYSTEM_PROMPT, textA, _controller.signal);
      contradictions = Array.isArray(parsed.contradictions) ? parsed.contradictions : [];
    }

    saveAnalysis({ text: textA, contradictions });
    renderResults(contradictions);
  } catch (err) {
    if (err.name === "AbortError") {
      output.innerHTML = `<p class="status">Análisis cancelado.</p>`;
      return;
    }
    renderError(err.message || "error desconocido");
  } finally {
    btn.dataset.mode = "";
    btn.textContent = "Buscar contradicciones";
    _controller = null;
  }
}
