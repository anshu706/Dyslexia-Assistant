# Operational Runbook: Dyslexia Assistant

**Target System:** AWS Production Environment  
**App Components:** CloudFront / S3 Web App + ECS Fargate Node API + RDS PostgreSQL  
**Author:** DevOps & Security Operations Team

---

## 1. Routine Deployment Procedures

### A. Automatic Deployment (Continuous Delivery)
1. Push conventional commits (`feat:`, `fix:`, `infra:`, `ci:`) to `main`.
2. GitHub Actions workflow `.github/workflows/deploy.yml` triggers automatically:
   - Runs `npm test` and `playwright test` test suites.
   - Builds API Docker image and pushes to Amazon ECR tagged with Git commit SHA.
   - Updates ECS task definition with new image tag.
   - Builds Vite production bundle and syncs to S3 frontend bucket.
   - Creates CloudFront cache invalidation (`/*`).
   - Executes smoke tests against `/api/health` and `/api/ready`.

### B. Manual / Emergency Rollback Procedure
If a production defect is discovered:
```bash
# 1. Revert ECS Task Definition to previous revision
aws ecs update-service \
  --cluster dyslexia-assistant-prod-cluster \
  --service dyslexia-assistant-prod-api \
  --task-definition dyslexia-assistant-prod-api:<PREVIOUS_REVISION> \
  --force-new-deployment

# 2. Invalidate CloudFront edge caches immediately
aws cloudfront create-invalidation \
  --distribution-id <CLOUDFRONT_DIST_ID> \
  --paths "/*"
```

---

## 2. Secret Rotation Runbook

### Database & Session Secret Rotation
All production credentials reside in AWS Secrets Manager (`/dyslexia-assistant/prod/*`).

1. **Rotate Database Password in Secrets Manager:**
   ```bash
   aws secretsmanager update-secret \
     --secret-id /dyslexia-assistant/prod/db-credentials \
     --secret-string '{"username":"da_admin","password":"<NEW_SECURE_PASSWORD>"}'
   ```
2. **Apply Update to RDS PostgreSQL:**
   ```bash
   aws rds modify-db-instance \
     --db-instance-identifier dyslexia-assistant-prod-db \
     --master-user-password "<NEW_SECURE_PASSWORD>" \
     --apply-immediately
   ```
3. **Trigger ECS Rolling Refresh:**
   ```bash
   aws ecs update-service \
     --cluster dyslexia-assistant-prod-cluster \
     --service dyslexia-assistant-prod-api \
     --force-new-deployment
   ```

---

## 3. Database Disaster Recovery & Point-in-Time Restore

If database corruption occurs or data must be recovered:
1. Identify the target timestamp prior to the incident (UTC).
2. Restore to a new DB instance:
   ```bash
   aws rds restore-db-instance-to-point-in-time \
     --source-db-instance-identifier dyslexia-assistant-prod-db \
     --target-db-instance-identifier dyslexia-assistant-prod-db-restored \
     --restore-time 2026-11-14T08:00:00Z \
     --db-subnet-group-name dyslexia-assistant-prod-db-subnet-group
   ```
3. Update the database host endpoint in AWS Secrets Manager and restart the ECS service.

---

## 4. Security Incident & Breach Response

1. **Active Credential Stuffing / Brute Force:**
   - AWS WAFv2 blocks abusive IPs automatically once thresholds are crossed.
   - To manually block an IP block in WAF:
     ```bash
     aws wafv2 update-ip-set --name BlockedIPs --scope CLOUDFRONT ...
     ```
2. **Suspicious Session Revocation:**
   - Terminate all active sessions in PostgreSQL immediately:
     ```sql
     TRUNCATE TABLE sessions;
     ```
   - All users are logged out immediately and forced to re-authenticate with their credentials.

