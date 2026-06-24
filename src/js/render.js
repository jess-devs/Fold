import { severityMeta, escapeHtml } from "./utils.js";
import { openModal, setContradictions } from "./modal.js";

let _output;

export function initRender(outputEl) {
  _output = outputEl;
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
      </div>`;
}
