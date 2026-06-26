import { initRender, renderResults, setDocText } from "./render.js";
import { analyze, cancelAnalysis } from "./api.js";
import { initSettings } from "./settings.js";
import { initHistory } from "./history.js";

const doc = document.getElementById("doc");
const docB = document.getElementById("docB");
const counter = document.getElementById("counter");
const btn = document.getElementById("analyzeBtn");
const output = document.getElementById("output");
const fileInput = document.getElementById("fileInput");
const fileOpenBtn = document.getElementById("fileOpenBtn");
const compareToggle = document.getElementById("compareToggle");
const compareArea = document.getElementById("compareArea");
const docLabel = document.getElementById("docLabel");

initRender(output);
initSettings();
initHistory((entry) => {
  doc.value = entry.text;
  updateCounter();
  setDocText(entry.text);
  renderResults(entry.contradictions);
});

let compareMode = false;

function updateCounter() {
  const text = doc.value.trim();
  const words = text.length ? text.split(/\s+/).length : 0;
  counter.textContent = `${words} palabras · ${text.length} caracteres`;
}

doc.addEventListener("input", updateCounter);
updateCounter();

function loadFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    doc.value = e.target.result;
    updateCounter();
  };
  reader.readAsText(file, "utf-8");
}

doc.addEventListener("dragover", (e) => {
  if (!e.dataTransfer.types.includes("Files")) return;
  e.preventDefault();
  doc.classList.add("drag-over");
});

doc.addEventListener("dragleave", () => {
  doc.classList.remove("drag-over");
});

doc.addEventListener("drop", (e) => {
  e.preventDefault();
  doc.classList.remove("drag-over");
  loadFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener("change", () => {
  loadFile(fileInput.files[0]);
  fileInput.value = "";
});

fileOpenBtn.addEventListener("click", () => {
  fileInput.click();
});

compareToggle.addEventListener("click", () => {
  compareMode = !compareMode;
  compareToggle.setAttribute("aria-pressed", String(compareMode));
  compareArea.hidden = !compareMode;
  compareToggle.textContent = compareMode ? "Modo simple" : "Comparar docs";
  if (docLabel) {
    docLabel.textContent = compareMode ? "Documento A" : "Documento";
  }
});

btn.addEventListener("click", () => {
  if (btn.dataset.mode === "cancel") {
    cancelAnalysis();
    return;
  }
  const textA = doc.value.trim();
  const textB = compareMode ? docB.value.trim() : null;
  setDocText(textA);
  analyze(textA, textB, { btn, output });
});
