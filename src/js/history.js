import { escapeHtml } from "./utils.js";

const HISTORY_KEY = "fold-history";
const MAX_ENTRIES = 10;

let _onSelect = null;
let _listEl = null;

export function saveAnalysis({ text, contradictions }) {
  const history = getHistory();
  history.unshift({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    preview: text.trim().slice(0, 100),
    text,
    contradictions,
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_ENTRIES)));
  _renderHistory();
}

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function deleteEntry(id) {
  const history = getHistory().filter((e) => e.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  _renderHistory();
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  _renderHistory();
}

function formatDate(iso) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("es", { day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
  );
}

function _renderHistory() {
  if (!_listEl) return;
  const history = getHistory();

  if (!history.length) {
    _listEl.innerHTML = `<p class="history-empty">Sin análisis guardados.</p>`;
    return;
  }

  _listEl.innerHTML = history
    .map(
      (entry) => `
    <div class="history-item" data-id="${entry.id}">
      <div class="history-meta">
        <span class="history-date">${formatDate(entry.timestamp)}</span>
        <span class="history-count">${entry.contradictions.length} contradicción${entry.contradictions.length !== 1 ? "es" : ""}</span>
      </div>
      <p class="history-preview">${escapeHtml(entry.preview)}${entry.text.length > 100 ? "…" : ""}</p>
      <div class="history-actions">
        <button class="history-restore" data-id="${entry.id}" type="button">Restaurar</button>
        <button class="history-delete" data-id="${entry.id}" type="button">Eliminar</button>
      </div>
    </div>`,
    )
    .join("");

  _listEl.querySelectorAll(".history-restore").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id, 10);
      const entry = getHistory().find((e) => e.id === id);
      if (entry && _onSelect) _onSelect(entry);
    });
  });

  _listEl.querySelectorAll(".history-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteEntry(parseInt(btn.dataset.id, 10));
    });
  });
}

export function initHistory(onSelect) {
  _onSelect = onSelect;

  const section = document.getElementById("historySection");
  if (!section) return;

  _listEl = section.querySelector(".history-list");

  const clearBtn = section.querySelector(".history-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", clearHistory);
  }

  _renderHistory();
}
