import { initRender } from "./render.js";
import { analyze } from "./api.js";
import { initSettings } from "./settings.js";

const doc = document.getElementById("doc");
const counter = document.getElementById("counter");
const btn = document.getElementById("analyzeBtn");
const output = document.getElementById("output");

initRender(output);
initSettings();

function updateCounter() {
  const text = doc.value.trim();
  const words = text.length ? text.split(/\s+/).length : 0;
  counter.textContent = `${words} palabras · ${text.length} caracteres`;
}

doc.addEventListener("input", updateCounter);
updateCounter();

btn.addEventListener("click", () => analyze(doc.value.trim(), { btn, output }));
