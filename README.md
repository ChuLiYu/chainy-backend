# Chainy – AWS/Terraform URL Shortener Scaffold

Chainy is a learning scaffold for building a serverless short URL platform on AWS with Terraform. It wires together an HTTP API, Lambda functions, DynamoDB storage, and an asynchronous click-event pipeline (EventBridge → Kinesis Firehose → S3) so you can focus on iterating and deepening your AWS + Terraform skills.

> 🇹🇼 Looking for the Traditional Chinese guide? See [README_ZH.md](README_ZH.md).

## Repository Structure

```
backend.tf              # Remote state definition (edit with your S3/DynamoDB details)
main.tf                 # Root module wiring all submodules
tfvars/                 # (optional) directory for environment-specific tfvars files
modules/
  api/                  # API Gateway HTTP API + routes + Lambda permissions
  db/                   # DynamoDB table definition for short links
  events/               # EventBridge bus, Firehose stream, and S3 analytics bucket
  lambda/               # Redirect + CRUD Lambdas and IAM roles
handlers/               # TypeScript Lambda sources
lib/                    # Shared TypeScript utilities (DynamoDB client)
scripts/                # esbuild bundling script for Lambda packages
dist/                   # Generated Lambda bundles (created by `npm run package`)
README.md               # English documentation
README_ZH.md            # Traditional Chinese documentation
variables.tf            # Root input variables
outputs.tf              # Root outputs
package.json, tsconfig.json
```

## Prerequisites

- Terraform 1.9+
- AWS CLI configured with credentials that can provision the resources
- Node.js 20+

## Bootstrapping remote state resources (one-time)

Before working with the main Terraform stack, create the remote state bucket and lock table with the helper configuration under `bootstrap/`:

```bash
cd bootstrap
terraform init
terraform apply \
  -var="state_bucket_name=your-unique-chainy-state-bucket" \
  -var="lock_table_name=chainy-terraform-locks"
```

Copy the bucket and table names from the outputs, then update `backend.tf` (or pass `-backend-config` flags) in the root stack to reference them.

### One-time remote state setup

1. Create an S3 bucket for Terraform state (e.g. `chainy-terraform-state`).
2. Create a DynamoDB table for state locking (e.g. `chainy-terraform-locks`) with primary key `LockID` (string).
3. Update `backend.tf` with your bucket, key prefix, region, and DynamoDB table.

## Lambda packaging workflow

The Lambda module expects pre-built bundles under `dist/redirect` and `dist/create` before you run `terraform plan` or `terraform apply`. Use the included Node tooling:

```bash
npm install            # install TypeScript + esbuild + AWS SDK
npm run package        # bundles handlers into dist/redirect and dist/create
```

Re-run `npm run package` whenever you change the TypeScript source before deploying.

## Deploying with Terraform

1. Copy `terraform.tfvars.example` → `terraform.tfvars` (create the example file if you prefer) and set values:
   - `environment = "dev"`
   - `region = "ap-northeast-1"` (or your preferred region)
   - Optional overrides: `redirect_build_dir`, `create_build_dir`, `extra_tags`.
2. Initialize:

   ```bash
   terraform init -backend-config="bucket=your-state-bucket" \
                  -backend-config="key=dev/chainy.tfstate" \
                  -backend-config="region=ap-northeast-1" \
                  -backend-config="dynamodb_table=your-lock-table"
   ```

3. Validate the configuration:

   ```bash
   terraform fmt      # optional formatting
   terraform validate
   ```

4. Review the plan:

   ```bash
   terraform plan -var="environment=dev"
   ```

5. Apply when ready:

   ```bash
   terraform apply -var="environment=dev"
   ```

Terraform outputs include the API endpoint, DynamoDB table name, EventBridge bus, and click-event bucket.

## Testing the API

After `terraform apply`, note the `api_endpoint` output (e.g. `https://abc123.execute-api.ap-northeast-1.amazonaws.com`).

1. **Create a short link**

   ```bash
   curl -X POST "$API_ENDPOINT/links" \
     -H "Content-Type: application/json" \
     -d '{"target": "https://example.com/docs", "owner": "alice"}'
   ```

   Response includes the generated `code`.

2. **Resolve a short link**

   ```bash
   curl -I "$API_ENDPOINT/yourCode"
   ```

   Expect a `301` with `Location: https://example.com/docs`.

3. **Inspect or manage a link**

   ```bash
   curl "$API_ENDPOINT/links/yourCode"
   curl -X PUT "$API_ENDPOINT/links/yourCode" \
     -H "Content-Type: application/json" \
     -d '{"target": "https://example.com/updated"}'
   curl -X DELETE "$API_ENDPOINT/links/yourCode"
   ```

## Data flow overview

1. **Link creation**: `POST /links` triggers the create Lambda, which writes metadata to DynamoDB and emits a `link_create` event to EventBridge.
2. **Redirect**: `GET /{code}` invokes the redirect Lambda. It looks up the target in DynamoDB, increments click counters, sends a non-blocking `link_click` event, and returns a `301` response.
3. **Event pipeline**: EventBridge routes `link_click` (and other lifecycle events) to a Kinesis Firehose delivery stream.
4. **Analytics storage**: Firehose batches events into the S3 analytics bucket, partitioned by date.
5. **Insights**: Query the S3 data with Athena or visualize with QuickSight. The Firehose log group helps troubleshoot failures.

## Cleaning up

When you want to tear down the scaffold, run:

```bash
terraform destroy -var="environment=dev"
```

## Future enhancements

1. **CloudFront + Custom Domain** – front the API and redirects with a custom hostname and SSL certificate managed by ACM.
2. **Cognito + OAuth** – secure CRUD APIs with Cognito-hosted auth flows or federated identity providers.
3. **QuickSight Dashboard** – visualize click analytics sourced from the S3/Athena dataset.
4. **Budgets + Alerts** – add AWS Budgets or Cost Anomaly Detection to avoid surprises.
5. **GitHub Actions CI/CD** – configure an OIDC trust to deploy Terraform plans from GitHub securely.

Happy building and good luck studying for AWS SAA + Terraform Associate!
