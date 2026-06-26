function applyTheme(theme) {
  const scheme =
    theme === "light" ? "light" : theme === "dark" ? "dark" : "light dark";
  document.documentElement.style.colorScheme = scheme;
}

export function initSettings() {
  const dialog = document.getElementById("settingsDialog");
  const btn = document.getElementById("settingsBtn");
  const endpointIn = document.getElementById("settingsEndpoint");
  const modelIn = document.getElementById("settingsModel");
  const keyIn = document.getElementById("settingsApiKey");
  const toggleBtn = document.getElementById("toggleKeyBtn");
  const themeInputs = document.querySelectorAll('input[name="settingsTheme"]');

  applyTheme(localStorage.getItem("fold-theme") || "auto");

  btn.addEventListener("click", () => {
    endpointIn.value = localStorage.getItem("ai-endpoint") ?? "";
    modelIn.value = localStorage.getItem("ai-model") ?? "";
    keyIn.value = localStorage.getItem("ai-api-key") ?? "";
    const savedTheme = localStorage.getItem("fold-theme") || "auto";
    themeInputs.forEach((input) => {
      input.checked = input.value === savedTheme;
    });
    dialog.showModal();
  });

  dialog.addEventListener("close", () => {
    if (dialog.returnValue === "save") {
      localStorage.setItem("ai-endpoint", endpointIn.value.trim());
      localStorage.setItem("ai-model", modelIn.value.trim());
      localStorage.setItem("ai-api-key", keyIn.value.trim());
      const selectedTheme =
        [...themeInputs].find((i) => i.checked)?.value || "auto";
      localStorage.setItem("fold-theme", selectedTheme);
      applyTheme(selectedTheme);
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
