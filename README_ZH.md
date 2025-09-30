# Chainy – AWS/Terraform 短網址腳手架

Chainy 是一個協助你同時練習 AWS 與 Terraform 的伺服器無後端短網址服務腳手架。它整合 HTTP API、Lambda、DynamoDB，並採用 Lambda 直接寫入 S3 的輕量事件管線，讓你能專注在功能迭代與雲端實戰。

> Looking for the English version? 請查看 [README.md](README.md)。

## 系統架構示意圖

- [Architecture Overview (English)](docs/architecture.md)
- [中文架構說明](docs/architecture_ZH.md)

```mermaid
flowchart LR
  subgraph Client
    User[Browser / Mobile]
  end

  subgraph AWS
    APIGW[API Gateway HTTP API]
    RedirectLambda[Lambda: redirect]
    CRUDLambda[Lambda: link CRUD]
    DynamoDB[(DynamoDB: chainy_links)]
    EventsBucket[(S3: chainy-events-<env>)]
    CloudWatch[CloudWatch Logs]
  end

  User -->|HTTP GET /{code}| APIGW
  User -->|HTTP POST/PUT/GET/DELETE /links| APIGW

  APIGW -->|Invoke| RedirectLambda
  APIGW -->|Invoke| CRUDLambda

  RedirectLambda -->|Get/Update| DynamoDB
  CRUDLambda -->|Put/Get/Update/Delete| DynamoDB

  RedirectLambda -->|Async JSONL PutObject| EventsBucket
  CRUDLambda -->|Async JSONL PutObject| EventsBucket

  RedirectLambda --> CloudWatch
  CRUDLambda --> CloudWatch

  subgraph Analytics
    Athena[Athena / Glue]
    QuickSight[QuickSight / BI]
  end

  EventsBucket --> Athena
  Athena --> QuickSight

```

## 專案結構

```
backend.tf              # Terraform 遠端狀態設定（請改成你自己的 S3/DynamoDB 資訊）
main.tf                 # Root module 負責串接所有子模組
tfvars/                 # 建議放環境專屬的變數檔（可自行建立）
modules/
  api/                  # API Gateway HTTP API、路由與 Lambda 權限
  db/                   # DynamoDB 短網址資料表
  events/               # 僅含 S3 事件儲存 bucket（含版本化與生命周期）
  lambda/               # Redirect 與 CRUD Lambda 及其 IAM 設定
handlers/               # Lambda TypeScript 原始碼
lib/                    # 共享的 DynamoDB 工具
scripts/                # esbuild 打包腳本
dist/                   # `npm run package` 產出的 Lambda Bundle
README.md               # 英文說明文件
README_ZH.md            # 本文件
web/                    # 提供建立短網址的極簡前端
variables.tf            # Root module 需要的輸入變數
outputs.tf              # Terraform 輸出的重點資訊
package.json, tsconfig.json
```

## 事前準備

- Terraform 1.9 以上
- 已設定憑證的 AWS CLI（需有佈署資源的權限）
- Node.js 20 以上

## （一次性）使用 bootstrap 建立遠端狀態資源

在主專案之前，先到 `bootstrap/` 目錄執行 Terraform，建立 S3 bucket 與 DynamoDB table：

```bash
cd bootstrap
terraform init
terraform apply \
  -var="state_bucket_name=你專案專用且唯一的 bucket 名稱" \
  -var="lock_table_name=chainy-terraform-locks"
```

輸出會顯示 bucket 與 table 名稱，把這些值寫回根目錄的 `backend.tf`（或在 `terraform init` 時用 `-backend-config` 指定）。

### 遠端狀態初始化（一次性）

1. 建立專用的 S3 Bucket（例如 `chainy-terraform-state`）。
2. 建立 DynamoDB Table（例如 `chainy-terraform-locks`），Primary key 為 `LockID` (String)。
3. 將 `backend.tf` 裡的 bucket、key、region、dynamodb_table 改成你自己的設定。

## Lambda 打包流程

Terraform 會讀取 `dist/redirect` 與 `dist/create` 底下的檔案，因此在 `terraform plan/apply` 前務必先打包：

```bash
npm install            # 安裝 TypeScript、esbuild 與 AWS SDK
npm run package        # 將 handlers 打包輸出到 dist/redirect 與 dist/create
```

只要修改 TypeScript 原始碼，就需要重新執行 `npm run package` 以更新部署內容。

### 參數設定

建議建立 `terraform.tfvars`（或 `dev.tfvars` 等）設定基本變數：

```hcl
environment = "dev"
region      = "ap-northeast-1"

lambda_additional_environment = {
  CHAINY_HASH_SALT    = "請改成隨機鹽值"
  CHAINY_IP_HASH_SALT = "請改成隨機鹽值"
}
```

- `environment` 會影響資源命名與輸出；`region` 預設 `ap-northeast-1`，可依專案需求調整。
- `lambda_additional_environment` 會注入 Lambda 用於雜湊/遮罩（owner、user-agent、IP 等）。建議使用 `openssl rand -hex 32` 產生獨特鹽值，並依不同環境分別設定。
- 若不想留在檔案，可改用 `terraform apply -var="..."`、環境變數或 CI/CD Secret 注入。

## 極簡前端介面

`/web` 目錄內提供純 HTML/CSS/JS 版的短網址產生器，可離線預覽：

```bash
cd web
python -m http.server 4173
```

開啟 `http://localhost:4173` → 填入 API Endpoint（例如 `https://xxxx.execute-api.ap-northeast-1.amazonaws.com`）即可建立短連結。佈署時可直接 `aws s3 sync web/ s3://<你的-web-bucket> --delete` 並做 CloudFront Invalidation，或掛進 GitHub Actions。

## 使用 Terraform 佈署

1. 可自行建立 `terraform.tfvars`（或依照習慣命名）並設定：
   - `environment = "dev"`
   - `region = "ap-northeast-1"`（或你偏好的區域）
   - 其他選項如 `redirect_build_dir`、`create_build_dir`、`extra_tags` 可視需求調整。
2. 初始化：

   ```bash
   terraform init -backend-config="bucket=your-state-bucket" \
                  -backend-config="key=dev/chainy.tfstate" \
                  -backend-config="region=ap-northeast-1" \
                  -backend-config="dynamodb_table=your-lock-table"
   ```

3. 驗證設定：

   ```bash
   terraform fmt        # 可選，整理格式
   terraform validate
   ```

4. 檢視變更：

   ```bash
   terraform plan -var="environment=dev"
   ```

5. 正式佈署：

   ```bash
   terraform apply -var="environment=dev"
   ```

完成後會輸出 API endpoint、DynamoDB 資料表與事件 S3 Bucket 等資訊。

## 測試 API

`terraform apply` 後，記下輸出的 `api_endpoint`（例如 `https://abc123.execute-api.ap-northeast-1.amazonaws.com`）。

1. **建立短網址**

   ```bash
   curl -X POST "$API_ENDPOINT/links" \
     -H "Content-Type: application/json" \
     -d '{"target": "https://example.com/docs", "owner": "alice"}'
   ```

   回應會帶回產生的短碼 `code`。

2. **測試轉址**

   ```bash
   curl -I "$API_ENDPOINT/yourCode"
   ```

   預期回傳 `301` 並在 `Location` header 中顯示原始網址。

3. **查詢 / 更新 / 刪除**

   ```bash
   curl "$API_ENDPOINT/links/yourCode"
   curl -X PUT "$API_ENDPOINT/links/yourCode" \
     -H "Content-Type: application/json" \
     -d '{"target": "https://example.com/updated"}'
   curl -X DELETE "$API_ENDPOINT/links/yourCode"
   ```

## 資料流程說明

1. **建立短碼**：`POST /links` 觸發 create Lambda，寫入 DynamoDB，並同步在事件 bucket 下新增一行 `link_create` JSONL。
2. **短網址轉址**：`GET /{code}` 觸發 redirect Lambda，查詢 DynamoDB、更新點擊計數，並以非阻塞 PutObject 方式寫入 `link_click` 事件後回傳 `301`。
3. **其他事件**：更新與刪除也會寫入事件行，維持資料一致。
4. **資料落地**：S3 依 `{event_type}/dt=YYYY-MM-DD/hour=HH/{code}-{ts}.jsonl` 命名，方便之後用 Glue/Athena 對 JSONL 建外部表。
5. **分析洞察**：直接用 Athena 查詢、導入 Spark/QuickSight，或串接其他 ETL。Lifecycle 會在 `click_events_retention_days`（預設 30 天）後清理舊資料。

### 隱私強化措施

- Lambda 會對 `owner`、`user_agent` 以及來源 IP（若存在）做 SHA-256 雜湊，只留摘要供分類分析，不會儲存原始字串；錢包簽章僅記 `wallet_signature_present` 不落地原文。
- `wallet_address` 只保留前四與最後四碼，中間以 `***` 取代；`referer` / `target` 只保留來源與路徑，會移除 query string。
- 額外蒐集鏈相關資訊（如 `wallet_provider`、`wallet_type`、`chain_id`、`dapp_id`、交易金額/幣別、Token symbol/address）、行銷 UTM、Geo/ASN、語系、裝置/瀏覽器族群、合作夥伴/專案代號等資訊，但所有敏感內容都會先雜湊、遮罩或正規化。
- `tags` / `feature_flags` 只保留前 10 筆以控制成本。若有欄位發生遮罩，事件會加上 `sensitive_redacted = true` 方便後續判斷。

### 成本概覽

- **S3 PUT**：$0.005 / 1,000 次，10k 事件約 $0.05。
- **S3 儲存**：每筆 JSONL 幾 KB，以 30 天保留估計每月僅需幾毛錢。
- **Lambda**：執行時間極短，在預期流量下幾乎不可見。

## CI/CD

- GitHub Actions 工作流程檔案：[`.github/workflows/ci.yml`](.github/workflows/ci.yml)，會自動執行 `npm install`、`npm run typecheck`、`npm run test`，以及 Terraform `fmt`／`validate`（root 與 bootstrap，皆採 `-backend=false`）。
- 若要在雲端自動化佈署 plan/apply，建議設定 GitHub OIDC 與對應的 AWS IAM Role，並於 Repo Secrets 配置必要的憑證。

## 清除資源

若要移除整個環境：

```bash
terraform destroy -var="environment=dev"
```

## 後續擴充方向

1. **CloudFront + 自訂網域**：以 ACM 憑證搭配 CloudFront，提供自訂網域與快取。
2. **Cognito + OAuth**：透過 Cognito 或聯邦帳號保護 CRUD API。
3. **QuickSight Dashboard**：將 S3/Athena 的點擊資料視覺化。
4. **Budgets / 成本警示**：建立 AWS Budgets 或 Cost Anomaly Detection。
5. **GitHub Actions CI/CD**：設定 OIDC 信任關係，於 GitHub 自動化佈署與驗證。

祝你順利學習 AWS SAA 與 Terraform Associate！
