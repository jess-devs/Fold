import { buildCardInner, showHighlight, clearHighlight } from "./render.js";

const modalOverlay = document.getElementById("modalOverlay");
const modalPaper = document.getElementById("modalPaper");
const modalClose = document.getElementById("modalClose");
const modalContent = document.getElementById("modalContent");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const modalPageLabel = document.getElementById("modalPageLabel");

let _contradictions = [];
let _index = 0;

export function setContradictions(arr) {
  _contradictions = arr;
}

export function getContradictions() {
  return _contradictions;
}

function showPage(index) {
  _index = index;
  const total = _contradictions.length;
  const c = _contradictions[index];
  modalContent.innerHTML = buildCardInner(c, index);
  modalPageLabel.textContent = `Página ${String(index + 1).padStart(2, "0")} de ${String(total).padStart(2, "0")}`;
  prevBtn.disabled = index === 0;
  nextBtn.disabled = index === total - 1;
  const tilt = (index % 2 === 0 ? -1 : 1) * (0.6 + (index % 3) * 0.3);
  modalPaper.style.setProperty("--tilt", `${tilt}deg`);

  const copyBtn = modalContent.querySelector(".copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const text = `"${c.claim_a}" vs "${c.claim_b}"\n\n${c.explanation}`;
      navigator.clipboard
        .writeText(text)
        .then(() => {
          copyBtn.textContent = "Copiado";
          setTimeout(() => {
            copyBtn.textContent = "Copiar";
          }, 2000);
        })
        .catch(() => {});
    });
  }

  showHighlight(c.claim_a, c.claim_b);
}

export function openModal(index) {
  showPage(index);
  modalOverlay.style.display = "flex";
  modalPaper.focus();
  document.addEventListener("keydown", handleModalKeydown);
}

export function closeModal() {
  modalOverlay.style.display = "none";
  document.removeEventListener("keydown", handleModalKeydown);
  clearHighlight();
}

function handleModalKeydown(e) {
  if (e.key === "Escape") closeModal();
  if (e.key === "ArrowLeft" && !prevBtn.disabled) showPage(_index - 1);
  if (e.key === "ArrowRight" && !nextBtn.disabled) showPage(_index + 1);
}

modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
prevBtn.addEventListener("click", () => {
  if (!prevBtn.disabled) showPage(_index - 1);
});
nextBtn.addEventListener("click", () => {
  if (!nextBtn.disabled) showPage(_index + 1);
});
