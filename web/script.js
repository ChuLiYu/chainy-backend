const form = document.getElementById("link-form");
const resultEl = document.getElementById("result");
const apiField = document.getElementById("apiEndpoint");
const targetField = document.getElementById("target");
const codeField = document.getElementById("customCode");
const ownerField = document.getElementById("owner");

const storageKey = "chainy.apiEndpoint";
const storedEndpoint = localStorage.getItem(storageKey);
if (storedEndpoint) {
  apiField.value = storedEndpoint;
}

const saveEndpoint = (value) => {
  try {
    localStorage.setItem(storageKey, value);
  } catch (error) {
    console.warn("Unable to persist API endpoint", error);
  }
};

const hideResult = () => {
  resultEl.classList.add("hidden");
  resultEl.innerHTML = "";
};

const showResult = ({ shortUrl, payload }) => {
  resultEl.innerHTML = `
    <div>
      <strong>Short Link</strong>
      <p><a href="${shortUrl}" target="_blank" rel="noopener">${shortUrl}</a></p>
    </div>
    <div>
      <strong>Target</strong>
      <p>${payload.target}</p>
    </div>
    <button id="copyBtn" type="button">Copy URL</button>
  `;
  resultEl.classList.remove("hidden");

  const copyBtn = document.getElementById("copyBtn");
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(shortUrl).then(() => {
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy URL"), 1500);
    });
  });
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideResult();

  const apiBase = apiField.value.trim().replace(/\/$/, "");
  const target = targetField.value.trim();
  const customCode = codeField.value.trim();
  const owner = ownerField.value.trim();

  if (!apiBase) {
    alert("Please provide the API endpoint");
    return;
  }

  saveEndpoint(apiBase);

  const payload = {
    target,
    ...(customCode ? { code: customCode } : {}),
    ...(owner ? { owner } : {}),
  };

  try {
    const response = await fetch(`${apiBase}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const reason = errorBody.message || response.statusText;
      throw new Error(reason);
    }

    const data = await response.json();
    const shortUrl = `${apiBase}/${data.code}`;
    showResult({ shortUrl, payload: data });
    form.reset();
    apiField.value = apiBase;
  } catch (error) {
    alert(`Failed to create short link: ${error.message}`);
  }
});
