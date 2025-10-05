const form = document.getElementById("link-form");
const resultEl = document.getElementById("result");
const targetField = document.getElementById("target");
const apiDisplay = document.getElementById("apiDisplay");
const changeApiBtn = document.getElementById("changeApi");

const defaultApiBase = "https://your-api-gateway-url.amazonaws.com";
const storageKey = "chainy.apiEndpoint";
const params = new URLSearchParams(window.location.search);
const overrideFromUrl = params.get("api");

const normaliseBase = (value) => value.trim().replace(/\/$/, "");

const getStoredApi = () => {
  try {
    return localStorage.getItem(storageKey);
  } catch (error) {
    console.warn("Unable to read stored API endpoint", error);
    return null;
  }
};

const setStoredApi = (value) => {
  try {
    localStorage.setItem(storageKey, value);
  } catch (error) {
    console.warn("Unable to persist API endpoint", error);
  }
};

let apiBase = normaliseBase(overrideFromUrl ?? getStoredApi() ?? defaultApiBase);

if (overrideFromUrl) {
  setStoredApi(apiBase);
}

const updateApiDisplay = () => {
  if (apiDisplay) {
    apiDisplay.textContent = apiBase;
  }
};

updateApiDisplay();

if (changeApiBtn) {
  changeApiBtn.addEventListener("click", () => {
    const next = prompt("Enter the API endpoint (no trailing slash)", apiBase);
    if (!next) {
      return;
    }

    const cleaned = normaliseBase(next);
    if (!cleaned) {
      alert("API endpoint cannot be empty");
      return;
    }

    apiBase = cleaned;
    setStoredApi(apiBase);
    updateApiDisplay();
  });
}

const hideResult = () => {
  resultEl.classList.add("hidden");
  resultEl.innerHTML = "";
};

const showResult = ({ shortUrl, payload }) => {
  resultEl.innerHTML = `
    <div>
      <strong>短網址</strong>
      <p><a href="${shortUrl}" target="_blank" rel="noopener">${shortUrl}</a></p>
    </div>
    <div>
      <strong>目標網址</strong>
      <p>${payload.target}</p>
    </div>
    <button id="copyBtn" type="button">複製網址</button>
  `;
  resultEl.classList.remove("hidden");

  const copyBtn = document.getElementById("copyBtn");
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(shortUrl).then(() => {
      copyBtn.textContent = "已複製！";
      setTimeout(() => (copyBtn.textContent = "複製網址"), 1500);
    });
  });
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideResult();

  const target = targetField.value.trim();
  const payload = { target };

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
    const shortUrl = (data.short_url ?? "").trim().length > 0 ? data.short_url : `${apiBase}/${data.code}`;
    showResult({ shortUrl, payload: data });
    form.reset();
  } catch (error) {
    alert(`建立短網址失敗：${error.message}`);
  }
});
