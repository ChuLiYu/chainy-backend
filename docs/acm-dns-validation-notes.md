# ACM DNS Validation and Certificate Operations Notes

## Current Setup Snapshot
- Hosted zone `luichu.dev` in Route 53 contains:
  - `NS` record pointing to the four AWS authoritative name servers (TTL 172800).
  - `SOA` record managed by Route 53 (TTL 900).
  - CNAME `_90a8099490f459bf481b684c53a66552.chainy.luichu.dev` → `_2a7c6fa1bb77b9f378e63a24383f87af.xlfgrmvvlj.acm-validations.aws.` (TTL 60) for ACM validation.
- ACM public certificate request `arn:aws:acm:us-east-1:<account-id>:certificate/<certificate-id>` covers `chainy.luichu.dev` and is pending DNS validation.
- Certificate must reside in `us-east-1` because CloudFront only accepts certificates from that region.

## DNS Validation Lifecycle
1. Request certificate in ACM (DNS validation).
2. ACM generates a unique validation CNAME and waits for proof of domain control.
3. Create the exact CNAME record in the authoritative hosted zone (Route 53 in this case).
4. Wait for DNS propagation:
   - Immediate at Route 53 authoritative servers (`dig @ns-37.awsdns-04.com …`).
   - 5–15 minutes typical for recursive resolvers (`dig …`).
   - AWS validation routinely completes within 5–30 minutes once records are visible; extreme cases can take longer.
5. ACM detects the record, moves the certificate to `ISSUED`, and Terraform can proceed with CloudFront distribution and alias records.

## Troubleshooting Checklist
- **Record accuracy:** Names and values must match ACM exactly, including trailing dots where applicable.
- **Propagation checks:**
  - `dig _<token>.chainy.luichu.dev CNAME +short`
  - `dig @<route53-ns> _<token>.chainy.luichu.dev CNAME +short`
- **Re-trigger validation:** Clicking “Create records in Route 53” in ACM is safe even if the record exists—it prompts ACM to re-check.
- **Terraform locking:** If Terraform times out while waiting, remove stale locks (`terraform force-unlock <lock-id>`) before rerunning targeted applies.

## Why the DNS Record Matters
DNS validation proves control of the domain. Only the domain owner can modify hosted-zone records, so adding the ACM-provided CNAME demonstrates ownership without relying on email approval. Leaving the record in place enables automatic certificate renewals.

## Single vs. Wildcard Certificates
- Current certificate targets `chainy.luichu.dev`, which is appropriate when only one subdomain requires TLS.
- Wildcard (`*.luichu.dev`) would cover every first-level subdomain but still not the root `luichu.dev`. Reserve wildcard certificates for environments with many dynamic subdomains to avoid over-granting.
- Follow the principle of least privilege: narrower certificates reduce blast radius if a private key is compromised.

## ACM Private Key Handling
- ACM generates the key pair and stores the private key inside FIPS 140-2 Level 3 HSMs.
- Private keys never leave AWS; they cannot be downloaded or exported.
- AWS services (CloudFront, ALB/NLB, API Gateway, App Runner, etc.) call ACM APIs to perform signing operations during TLS handshakes.
- This design enforces strong key protection and supports automatic renewals when DNS validation remains in place.

## Using ACM Certificates with Compute Workloads
- ACM certificates cannot be attached directly to Nginx/Apache on EC2 because those servers require local key files.
- Recommended patterns:
  - **ALB + ACM:** Terminate TLS at an Application Load Balancer and forward cleartext or re-encrypted traffic to EC2/containers.
  - **CloudFront + ACM:** Terminate TLS at the edge for static sites or as a CDN/front door.
  - **API Gateway + ACM:** For managed HTTPS APIs.
- If direct server termination is required, use a separate TLS solution (e.g., Let’s Encrypt) or import an external certificate/privkey pair into ACM for managed services.

## Key Takeaways
- Current DNS and ACM configurations are correct; remaining delay is normal DNS propagation and ACM polling.
- Continue monitoring with `dig` and refresh ACM until the status becomes `ISSUED`.
- Once issued, rerun `terraform apply -target=module.web` (or a full apply) to create CloudFront distribution and Route 53 alias records.
- Maintain the validation CNAME to keep ACM renewals automatic.
