import { severityMeta, escapeHtml } from "./utils.js";
import { openModal, setContradictions } from "./modal.js";

let _output;
let _docText = "";
let _highlightEl = null;
let _docEl = null;

export function initRender(outputEl) {
  _output = outputEl;
  _highlightEl = document.getElementById("docHighlight");
  _docEl = document.getElementById("doc");
}

export function setDocText(text) {
  _docText = text;
}

function highlightSegments(text, claim_a, claim_b) {
  const patterns = [claim_a, claim_b].filter(Boolean);
  if (!patterns.length) return escapeHtml(text);
  const escapedPatterns = patterns.map((p) =>
    p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const regex = new RegExp(`(${escapedPatterns.join("|")})`, "gi");
  return text
    .split(regex)
    .map((part, i) =>
      i % 2 === 1 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part),
    )
    .join("");
}

export function showHighlight(claim_a, claim_b) {
  if (!_highlightEl || !_docText) return;
  if (_docEl) _docEl.hidden = true;
  _highlightEl.innerHTML = highlightSegments(_docText, claim_a, claim_b);
  _highlightEl.hidden = false;
}

export function clearHighlight() {
  if (!_highlightEl) return;
  _highlightEl.hidden = true;
  if (_docEl) _docEl.hidden = false;
}

export function renderClean() {
  _output.innerHTML = `
      <div class="results">
        <p class="results-heading">Resultado</p>
        <div class="clean">No se encontraron contradicciones claras. El documento es internamente consistente, al menos dentro de lo que este análisis puede detectar.</div>
      </div>`;
}

export function renderError(msg) {
  _output.innerHTML = `<div class="error-box">El análisis falló: ${escapeHtml(msg)}. Intenta de nuevo.</div>`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(contradictions) {
  const blob = new Blob([JSON.stringify(contradictions, null, 2)], {
    type: "application/json",
  });
  downloadBlob(
    blob,
    `contradicciones-${new Date().toISOString().slice(0, 10)}.json`,
  );
}

function exportCSV(contradictions) {
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ["claim_a", "claim_b", "explanation", "severity"];
  const rows = contradictions.map((c) =>
    [c.claim_a, c.claim_b, c.explanation, c.severity].map(escape).join(","),
  );
  const csv = [header.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(
    blob,
    `contradicciones-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

export function renderResults(contradictions) {
  setContradictions(contradictions);

  if (!contradictions.length) {
    renderClean();
    return;
  }

  const rows = contradictions
    .map((c, i) => {
      const sev = severityMeta[c.severity] || severityMeta.media;
      const num = String(i + 1).padStart(2, "0");
      return `
        <div class="index-row" style="--sev-color:${sev.color}" data-index="${i}" role="button" tabindex="0">
          <span class="index-num">${num}</span>
          <span class="index-claim">"${escapeHtml(c.claim_a)}"</span>
          <span class="index-arrow">abrir →</span>
        </div>`;
    })
    .join("");

  _output.innerHTML = `
      <div class="results">
        <p class="results-heading">${contradictions.length} contradicción${contradictions.length === 1 ? "" : "es"} encontrada${contradictions.length === 1 ? "" : "s"} · clic en una fila para reabrir ese expediente</p>
        <div class="index-list">${rows}</div>
        <div class="export-row">
          <button class="export-btn" type="button" data-format="json">Exportar JSON</button>
          <button class="export-btn" type="button" data-format="csv">Exportar CSV</button>
        </div>
      </div>`;

  _output.querySelectorAll(".index-row").forEach((row) => {
    const openThis = () => openModal(parseInt(row.dataset.index, 10));
    row.addEventListener("click", openThis);
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openThis();
      }
    });
  });

  _output.querySelectorAll(".export-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.format === "json") exportJSON(contradictions);
      else exportCSV(contradictions);
    });
  });

  openModal(0);
}

export function buildCardInner(c, i) {
  const sev = severityMeta[c.severity] || severityMeta.media;
  const num = String(i + 1).padStart(2, "0");
  return `
      <span class="stamp" style="--sev-color:${sev.color}">Contradicción ${num} · ${sev.label}</span>
      <div class="claims">
        <div class="claim">"${escapeHtml(c.claim_a)}"</div>
        <div class="claim">"${escapeHtml(c.claim_b)}"</div>
        <div class="versus">no pueden ser ambas ciertas</div>
      </div>
      <div class="explanation">
        <span class="lbl">Por qué chocan</span>
        ${escapeHtml(c.explanation)}
      </div>
      <button class="copy-btn" type="button">Copiar</button>`;
}
