# ACM DNS 驗證與憑證作業筆記

## 現況快照
- Route 53 的 `luichu.dev` 託管區包含：
  - 指向四組 AWS 權威名稱伺服器的 `NS` 記錄（TTL 172800）。
  - 由 Route 53 管理的 `SOA` 記錄（TTL 900）。
  - CNAME `_90a8099490f459bf481b684c53a66552.chainy.luichu.dev` → `_2a7c6fa1bb77b9f378e63a24383f87af.xlfgrmvvlj.acm-validations.aws.`（TTL 60），供 ACM 驗證使用。
- ACM 公開憑證請求 `arn:aws:acm:us-east-1:<account-id>:certificate/<certificate-id>` 覆蓋 `chainy.luichu.dev`，目前狀態為等待 DNS 驗證。
- 憑證必須建立於 `us-east-1`，因為 CloudFront 僅接受該區的憑證。

## DNS 驗證流程
1. 在 ACM 送出憑證請求並選用 DNS 驗證。
2. ACM 產生唯一的驗證 CNAME，並等待網域控制權證明。
3. 在權威託管區（此案例為 Route 53）建立完全相同的 CNAME 記錄。
4. 等待 DNS 傳播：
   - Route 53 權威名稱伺服器可立即查詢到（`dig @ns-37.awsdns-04.com …`）。
   - 一般遞迴解析器通常 5–15 分鐘可看到更新（`dig …`）。
   - 當記錄可被查詢後，ACM 通常在 5–30 分鐘內完成驗證；極端情況可能更久。
5. ACM 取得記錄後，憑證狀態變為 `ISSUED`，Terraform 隨即可繼續建立 CloudFront 與 Route 53 Alias 記錄。

## 疑難排解檢查清單
- **記錄正確性：** 名稱與值必須與 ACM 提供的內容完全一致，包含結尾的點。
- **傳播檢查：**
  - `dig _<token>.chainy.luichu.dev CNAME +short`
  - `dig @<route53-ns> _<token>.chainy.luichu.dev CNAME +short`
- **重新觸發驗證：** 在 ACM 點擊「Create records in Route 53」即使記錄已存在也無妨，可促使 ACM 重新檢查。
- **Terraform 鎖定：** 若 Terraform 等候過久導致逾時，可使用 `terraform force-unlock <lock-id>` 移除陳舊鎖再重新執行。

## 為何需要驗證 CNAME
DNS 驗證透過修改託管區記錄來證明你擁有該網域。只有網域擁有者能新增 ACM 提供的 CNAME，因此無須透過 Email 驗證；持續保留此記錄即可讓 ACM 自動續期。

## 單一網域與萬用字元憑證
- 目前憑證僅涵蓋 `chainy.luichu.dev`，若只需保護單一子網域，此作法最適合。
- 萬用字元憑證（`*.luichu.dev`）可覆蓋所有第一層子網域，但無法涵蓋根網域 `luichu.dev`；僅適用於需要大量動態子網域的情境。
- 遵循最小權限原則：憑證涵蓋範圍越小，私鑰外洩時的風險越低。

## ACM 私鑰管理方式
- ACM 於 FIPS 140-2 Level 3 規範的 HSM 中產生並保存金鑰對。
- 私鑰永不離開 AWS，無法下載或匯出。
- CloudFront、ALB/NLB、API Gateway、App Runner 等服務透過 ACM API 呼叫 HSM 在 TLS 握手期間執行簽章。
- 此設計兼顧高安全性並支援自動續期，只要 DNS 驗證記錄仍存在即可。

## 在運算工作負載中使用 ACM 憑證
- ACM 憑證無法直接配置於 EC2 上的 Nginx/Apache，因為伺服器需要本地私鑰檔案。
- 推薦架構：
  - **ALB + ACM：** 在 Application Load Balancer 端終止 TLS，再轉發 HTTP 或重新加密流量至 EC2/容器。
  - **CloudFront + ACM：** 在邊緣節點終止 TLS，作為靜態網站或 CDN 前端。
  - **API Gateway + ACM：** 提供受管的 HTTPS API。
- 若必須直接在伺服器終止 TLS，可使用其他憑證來源（如 Let’s Encrypt）或匯入外部憑證與私鑰至 ACM 供受管服務使用。

## 重點整理
- 目前 DNS 與 ACM 的設定皆正確，剩餘時間僅需等待 DNS 傳播與 ACM 掃描。
- 透過 `dig` 監控傳播狀態，並刷新 ACM 介面直到狀態為 `ISSUED`。
- 憑證核發後重新執行 `terraform apply -target=module.web`（或完整 apply）即可建立 CloudFront 與 Alias 設定。
- 保留驗證 CNAME 以確保 ACM 後續自動續期。
