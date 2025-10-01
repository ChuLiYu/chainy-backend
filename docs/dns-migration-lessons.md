# DNS Migration Lessons Learned (Cloudflare ➝ AWS Route 53)

## Context
- Domain `luichu.dev` is registered with Cloudflare Registrar (newly created, 60-day transfer lock).
- Goal: Serve `chainy.luichu.dev` via AWS CloudFront while keeping ACM DNS validation healthy.
- Additional challenge: Terraform-managed Route 53 hosted zone already configured, but not authoritative yet.

## Pitfalls Encountered
1. **Registrar Lock-in (Cloudflare Registrar)**
   - Cloudflare Registrar does not allow custom nameservers.
   - Newly registered domains are subject to ICANN's 60-day transfer lock.
   - Attempting to shift authoritative DNS to Route 53 failed because NS delegation could not change.

2. **ACM Validation Record Visibility**
   - Terraform created `_90a8099490f459bf481b684c53a66552.chainy.luichu.dev` CNAME inside Route 53.
   - External resolvers queried Cloudflare and returned NXDOMAIN because the CNAME was only present in Route 53.

3. **CloudFront Certificate Creation Blocking Terraform**
   - Terraform waited on `aws_acm_certificate_validation` but never progressed because DNS validation was invisible to ACM.
   - State locking issues also surfaced (`terraform force-unlock` required) when re-running targeted applies.

4. **Local Resolver Negative Cache**
   - After Cloudflare records were updated, local router/DNS caches still served the old NXDOMAIN response.
   - `dig` against home router (192.168.0.1) repeatedly returned negative cache results even though public resolvers already saw the new CNAME.

5. **`curl --resolve` Misuse**
   - Initially attempted `curl --resolve chainy.luichu.dev:443:d2os5luq4ylg4c.cloudfront.net` (hostname instead of IP), which failed with "Couldn't parse CURLOPT_RESOLVE".

## Resolutions
1. **Stay on Cloudflare for Authoritative DNS (Short Term)**
   - Accept Cloudflare as the authoritative DNS until the 60-day lock expires and a registrar transfer is possible.
   - Replicate critical records in Cloudflare: ACM validation CNAMEs and the CloudFront-alias CNAME.

2. **Replicate ACM Validation Records at Authoritative DNS**
   - Add `_90a8099490f459bf481b684c53a66552.chainy` → `_2a7c6fa1bb77b9f378e63a24383f87af.xlfgrmvvlj.acm-validations.aws.` in Cloudflare with proxy disabled.
   - Ensure any additional ACM validation records (e.g., `_1ccf49...`) are also present.

3. **Terraform Apply Targeted Module After DNS Fix**
   - Run `terraform apply -target=module.web -auto-approve` once ACM validation succeeded.
   - Terraform created CloudFront distribution `d2os5luq4ylg4c.cloudfront.net` and Route 53 alias records (for eventual delegation).

4. **DNS Cache Management Tips**
   - Use public resolvers to confirm propagation: `dig @1.1.1.1 chainy.luichu.dev CNAME`.
   - Flush macOS cache (`sudo dscacheutil -flushcache`, `sudo killall -HUP mDNSResponder`).
   - If the home router still caches negative answers, temporarily switch macOS DNS settings to public resolvers (1.1.1.1 / 8.8.8.8) until the router cache expires.

5. **Correct `curl --resolve` Syntax**
   - To test HTTPS before DNS updates settle, supply the IP, not the domain name:
     ```bash
     curl -I --resolve chainy.luichu.dev:443:3.165.160.22 https://chainy.luichu.dev
     ```
   - Verify 200/301 responses and CloudFront headers (`x-cache`, `x-amz-cf-id`).

## Next Steps & Best Practices
- **Registrar Transfer (Future)**: After the 60-day lock expires, transfer `luichu.dev` to a registrar that supports custom NS (e.g., Route 53 Domains) and delegate to AWS.
- **Automate DNS in Terraform**: Once authoritative DNS is on Route 53, remove manual Cloudflare steps and let Terraform manage all records.
- **Monitor Certificates**: Keep both ACM validation CNAMEs in place to retain automated renewals.
- **Document DNS Changes**: Maintain synchronized docs (including this note) so future migrations account for registrar constraints and cache effects.
