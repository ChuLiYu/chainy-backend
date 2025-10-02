# Google 響應式網站登錄授權最佳實踐

## 🎯 Google 官方建議

根據 Google 官方文檔，響應式網站的 Google 登錄授權有以下最佳實踐：

### 1. **選擇適當的用戶體驗模式**

#### **彈出式窗口 (Popup) - 推薦用於桌面端**

```javascript
// 優點：不重定向頁面，用戶體驗流暢
// 適用：桌面端、平板端
google.accounts.id.initialize({
  client_id: "YOUR_CLIENT_ID",
  callback: handleCredentialResponse,
  ux_mode: "popup", // 彈出式窗口
});
```

#### **重定向 (Redirect) - 推薦用於移動端**

```javascript
// 優點：避免彈出窗口被瀏覽器阻止
// 適用：移動端、某些瀏覽器環境
google.accounts.id.initialize({
  client_id: "YOUR_CLIENT_ID",
  callback: handleCredentialResponse,
  ux_mode: "redirect", // 重定向模式
  redirect_uri: "http://localhost:3000/callback",
});
```

### 2. **響應式設計建議**

#### **檢測設備類型並選擇合適的 UX 模式**

```javascript
function getOptimalUxMode() {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  const isSmallScreen = window.innerWidth < 768;

  // 移動端或小螢幕使用重定向，桌面端使用彈出式
  return isMobile || isSmallScreen ? "redirect" : "popup";
}

// 初始化時使用響應式UX模式
google.accounts.id.initialize({
  client_id: "YOUR_CLIENT_ID",
  callback: handleCredentialResponse,
  ux_mode: getOptimalUxMode(),
  redirect_uri: "http://localhost:3000/callback",
});
```

#### **響應式按鈕樣式**

```css
/* 桌面端 */
.g_id_signin {
  width: 100%;
  max-width: 300px;
}

/* 移動端 */
@media (max-width: 768px) {
  .g_id_signin {
    width: 100%;
    font-size: 14px;
  }
}

/* 小螢幕 */
@media (max-width: 480px) {
  .g_id_signin {
    width: 100%;
    font-size: 12px;
    padding: 8px;
  }
}
```

### 3. **性能優化建議**

#### **提前載入 Google Identity Services**

```html
<!-- 在<head>中提前載入，避免延遲 -->
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

#### **優化載入順序**

```javascript
// 優先載入Google Identity Services
window.addEventListener("DOMContentLoaded", function () {
  // 其他初始化代碼
  initializeGoogleAuth();
});
```

### 4. **安全性考慮**

#### **設置 COOP 標頭**

```javascript
// 確保彈出式窗口正常工作
if (window.location.protocol === "https:") {
  // 設置Cross-Origin-Opener-Policy
  // 這通常在服務器端設置
}
```

#### **服務器端驗證**

```javascript
// 前端發送ID Token到後端驗證
async function handleCredentialResponse(response) {
  const idToken = response.credential;

  // 發送到後端驗證
  const result = await fetch("/api/auth/google", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  if (result.ok) {
    const data = await result.json();
    // 處理登錄成功
    console.log("登錄成功:", data);
  }
}
```

### 5. **完整的響應式實現**

```javascript
class ResponsiveGoogleAuth {
  constructor(clientId) {
    this.clientId = clientId;
    this.isInitialized = false;
  }

  // 檢測設備類型
  getDeviceType() {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    const isTablet =
      /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768;
    const isDesktop = !isMobile && !isTablet;

    return { isMobile, isTablet, isDesktop };
  }

  // 獲取最佳UX模式
  getOptimalUxMode() {
    const { isMobile, isTablet } = this.getDeviceType();
    return isMobile || isTablet ? "redirect" : "popup";
  }

  // 獲取最佳按鈕配置
  getButtonConfig() {
    const { isMobile } = this.getDeviceType();

    return {
      theme: "outline",
      size: isMobile ? "large" : "large",
      text: "signin_with",
      shape: "rectangular",
      width: "100%",
      logo_alignment: "left",
    };
  }

  // 初始化Google Auth
  async initialize() {
    if (this.isInitialized) return;

    const uxMode = this.getOptimalUxMode();

    google.accounts.id.initialize({
      client_id: this.clientId,
      callback: this.handleCredentialResponse.bind(this),
      ux_mode: uxMode,
      redirect_uri:
        uxMode === "redirect" ? "http://localhost:3000/callback" : undefined,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    this.isInitialized = true;
    console.log(`Google Auth initialized with ${uxMode} mode`);
  }

  // 處理認證回應
  async handleCredentialResponse(response) {
    try {
      const idToken = response.credential;
      console.log("Google ID Token received");

      // 發送到後端驗證
      const result = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          googleToken: idToken,
          provider: "google",
          tokenType: "id_token",
        }),
      });

      if (result.ok) {
        const data = await result.json();
        console.log("Authentication successful:", data);

        // 保存JWT token
        localStorage.setItem("authToken", data.jwt);
        localStorage.setItem("user", JSON.stringify(data.user));

        // 觸發登錄成功事件
        window.dispatchEvent(
          new CustomEvent("googleLoginSuccess", {
            detail: data,
          })
        );

        return data;
      } else {
        throw new Error("Authentication failed");
      }
    } catch (error) {
      console.error("Google Auth error:", error);
      throw error;
    }
  }

  // 渲染登錄按鈕
  renderButton(containerId) {
    if (!this.isInitialized) {
      console.error("Google Auth not initialized");
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container ${containerId} not found`);
      return;
    }

    const config = this.getButtonConfig();
    google.accounts.id.renderButton(container, config);
  }

  // 觸發One Tap
  promptOneTap() {
    if (!this.isInitialized) {
      console.error("Google Auth not initialized");
      return;
    }

    google.accounts.id.prompt((notification) => {
      console.log("One Tap notification:", notification);

      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        console.log("One Tap not displayed, falling back to button");
        this.renderButton("google-signin-button");
      }
    });
  }
}

// 使用示例
const googleAuth = new ResponsiveGoogleAuth("YOUR_CLIENT_ID");

// 初始化
googleAuth.initialize().then(() => {
  // 嘗試One Tap，如果失敗則顯示按鈕
  googleAuth.promptOneTap();
});
```

## 🚀 實施建議

### 1. **立即實施**

- 修復當前的 JSX 語法錯誤
- 實現響應式 UX 模式選擇
- 優化按鈕樣式

### 2. **中期優化**

- 實現完整的響應式 Google Auth 類
- 添加設備檢測和 UX 模式自動選擇
- 優化載入性能

### 3. **長期改進**

- 添加更多安全性檢查
- 實現離線支持
- 添加錯誤處理和重試機制

## 📱 移動端特別考慮

1. **避免彈出窗口被阻止**
2. **優化觸控體驗**
3. **考慮網路狀況**
4. **提供備用登錄方式**

這些建議將幫助你創建一個真正響應式的 Google 登錄體驗！

