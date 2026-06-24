export function initSettings() {
  const dialog = document.getElementById("settingsDialog");
  const btn = document.getElementById("settingsBtn");
  const endpointIn = document.getElementById("settingsEndpoint");
  const modelIn = document.getElementById("settingsModel");
  const keyIn = document.getElementById("settingsApiKey");
  const toggleBtn = document.getElementById("toggleKeyBtn");

  btn.addEventListener("click", () => {
    endpointIn.value = localStorage.getItem("ai-endpoint") ?? "";
    modelIn.value = localStorage.getItem("ai-model") ?? "";
    keyIn.value = localStorage.getItem("ai-api-key") ?? "";
    dialog.showModal();
  });

  dialog.addEventListener("close", () => {
    if (dialog.returnValue === "save") {
      localStorage.setItem("ai-endpoint", endpointIn.value.trim());
      localStorage.setItem("ai-model", modelIn.value.trim());
      localStorage.setItem("ai-api-key", keyIn.value.trim());
    }
  });

  // Fallback light-dismiss para Safari (closedby aún no soportado)
  if (!("closedBy" in HTMLDialogElement.prototype)) {
    dialog.addEventListener("click", (e) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const inside =
        r.top <= e.clientY &&
        e.clientY <= r.top + r.height &&
        r.left <= e.clientX &&
        e.clientX <= r.left + r.width;
      if (!inside) dialog.close();
    });
  }

  toggleBtn.addEventListener("click", () => {
    const show = keyIn.type === "password";
    keyIn.type = show ? "text" : "password";
    toggleBtn.textContent = show ? "Ocultar" : "Mostrar";
    toggleBtn.setAttribute("aria-pressed", String(show));
  });
}
