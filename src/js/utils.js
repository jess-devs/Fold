export const severityMeta = {
  alta: { color: "var(--correction)", label: "severidad alta" },
  media: { color: "var(--media)", label: "severidad media" },
  baja: { color: "var(--baja)", label: "severidad baja" },
};

export function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function parseModelJSON(raw) {
  let cleaned = raw
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {}

  const opens = [],
    closes = [];
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === "{") opens.push(i);
    if (cleaned[i] === "}") closes.push(i);
  }
  for (const s of opens) {
    for (let ci = closes.length - 1; ci >= 0; ci--) {
      const e = closes[ci];
      if (e <= s) break;
      try {
        const obj = JSON.parse(cleaned.slice(s, e + 1));
        if ("contradictions" in obj) return obj;
      } catch {}
    }
  }

  throw new Error("La respuesta no contiene un objeto JSON reconocible.");
}
