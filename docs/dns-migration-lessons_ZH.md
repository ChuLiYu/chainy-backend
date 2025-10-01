# DNS 遷移經驗筆記（Cloudflare ➝ AWS Route 53）

## 背景
- 網域 `luichu.dev` 透過 Cloudflare Registrar 註冊（新註冊，受 60 天轉移鎖定限制）。
- 目標：讓 `chainy.luichu.dev` 透過 AWS CloudFront 服務，同時保持 ACM DNS 驗證。
- 挑戰：Terraform 早已建立 Route 53 hosted zone，但尚未成為權威 DNS。

## 遭遇的問題
1. **Cloudflare Registrar 鎖定**
   - Cloudflare Registrar 不允許自訂 nameserver。
   - 新註冊網域受 ICANN 60 天轉移鎖，短期無法改用 Route 53。

2. **ACM 驗證記錄外部不可見**
   - Terraform 在 Route 53 建立 `_90a8099490f459bf481b684c53a66552.chainy.luichu.dev` CNAME。
   - 外部解析仍指向 Cloudflare，導致 ACM 看不到驗證記錄，回應 NXDOMAIN。

3. **CloudFront 憑證等待卡住 Terraform**
   - `aws_acm_certificate_validation` 一直等待，因為 DNS 驗證未生效。
   - 多次重跑導致 state lock，需 `terraform force-unlock` 清除。

4. **本地/路由器 DNS 負回應快取**
   - Cloudflare 記錄更新後，本地路由器仍回舊的 NXDOMAIN 快取。
   - `dig` 對 192.168.0.1 持續得到 Authority SOA，需等待或使用公共 DNS。

5. **`curl --resolve` 語法錯誤**
   - 初期使用 `curl --resolve chainy.luichu.dev:443:d2os5luq4ylg4c.cloudfront.net`（提供主機名而非 IP），導致指令失敗。

## 解決方案
1. **暫時沿用 Cloudflare DNS**
   - 接受短期仍由 Cloudflare 作權威 DNS，等 60 天期滿後再考慮轉移。
   - 在 Cloudflare 複製必要紀錄：ACM 驗證 CNAME 與 CloudFront alias。

2. **同步 ACM 驗證記錄到 Cloudflare**
   - 新增 `_90a8099490f459bf481b684c53a66552.chainy` → `_2a7c6fa1bb77b9f378e63a24383f87af.xlfgrmvvlj.acm-validations.aws.`，關閉 Proxy。
   - 若有其他 ACM 驗證（例如 `_1ccf49...`）也需保留。

3. **修正後重跑 Terraform**
   - 在驗證成功後執行 `terraform apply -target=module.web -auto-approve`。
   - Terraform 建立 CloudFront `d2os5luq4ylg4c.cloudfront.net`，以及 Route 53 alias（方便未來遷移）。

4. **DNS 快取排查技巧**
   - 使用公共 DNS 確認傳播：`dig @1.1.1.1 chainy.luichu.dev CNAME`。
   - 清 macOS 快取：`sudo dscacheutil -flushcache`、`sudo killall -HUP mDNSResponder`。
   - 若路由器仍返回舊資料，可暫用 1.1.1.1 / 8.8.8.8 為系統 DNS，或等待快取過期。

5. **正確使用 `curl --resolve`**
   - 在 DNS 尚未更新時測試 HTTPS，可指定 IP：
     ```bash
     curl -I --resolve chainy.luichu.dev:443:3.165.160.22 https://chainy.luichu.dev
     ```
   - 確認 HTTP 回應碼與 CloudFront 標頭 (`x-cache`, `x-amz-cf-id`)。

## 後續建議與最佳作法
- **60 天後再轉移註冊商**：轉到支援自訂 NS（如 Route 53 Domains）再改為 AWS nameserver。
- **Terraform 全面管理 DNS**：當權威 DNS 改到 Route 53 後，可移除 Cloudflare 手動步驟，全部由 IaC 管理。
- **維持 ACM 驗證紀錄**：確保 2 組 CNAME 都存在，以輔助自動續期。
- **記錄整個流程**：保留這份筆記，未來遇到 registrar 鎖定或快取問題時可快速定位。
