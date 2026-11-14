# AWS Cost Controls & Monthly Budget Analysis

**Project:** Dyslexia Assistant  
**Architecture:** CloudFront + S3 (Static Frontend) & ALB + ECS Fargate + RDS PostgreSQL (Backend API)  
**Budget Review Date:** 2026-11-14

---

## 1. Cost Optimization Design Strategy

To respect strict student, educator, and indie developer financial constraints, Dyslexia Assistant is designed for maximum cost efficiency:
1. **Local-First Workload Offloading:** Over 90% of user activity (reading, TTS synthesis, phonetic heuristics, flashcards) executes directly on the client device, keeping API and database queries minimal.
2. **Serverless Static Distribution:** S3 + CloudFront with Origin Access Control (OAC) eliminates the need for dedicated frontend web servers.
3. **Fargate Compute Sizing:** Micro task sizing (0.25 vCPU, 0.5 GB memory) accommodates hundreds of concurrent authenticated users with minimal idle cost.
4. **VPC NAT Architecture:** Single NAT Gateway for non-production environments to avoid dual-AZ NAT idle costs.

---

## 2. Monthly Cost Projections

### A. Development Environment (`dev`)

| AWS Service | Specifications | Estimated Cost / Month | Free Tier Impact |
|---|---|---|---|
| **S3 + CloudFront** | 5 GB storage, 50 GB transfer | ~$0.50 | Fully covered by 1TB free CloudFront tier |
| **ECS Fargate** | 1 task (0.25 vCPU, 0.5 GB RAM) | ~$7.50 | Compute costs billed per second |
| **Application Load Balancer** | 1 ALB (shared / single AZ in dev) | ~$16.00 | ~0.5 LCU/hr usage |
| **RDS PostgreSQL** | `db.t3.micro` single-AZ (20 GB gp3) | ~$14.50 | Free-tier eligible (750 hrs/month for 12 mos) |
| **VPC NAT Gateway** | 1 NAT Gateway (single AZ) | ~$32.00 | Optional: Can use VPC Endpoints to reduce to ~$5 |
| **AWS KMS & Secrets Manager** | 1 CMK + 2 Secrets | ~$1.80 | Negligible |
| **Total Dev (without free tier)** | | **~$72.00 / mo** | |
| **Total Dev (with free tier + VPC endpoints)** | | **~$18.00 – $25.00 / mo** | |

### B. Production Environment (`prod`)

| AWS Service | Specifications | Estimated Cost / Month |
|---|---|---|
| **S3 + CloudFront + OAC** | Multi-region CDN, Response Headers Policy | ~$4.00 |
| **AWS WAFv2** | 1 Web ACL (rate limiting + common rules) | ~$7.00 |
| **ALB (Dual-AZ)** | High Availability Multi-AZ ALB | ~$22.00 |
| **ECS Fargate Tasks** | 2 tasks (0.5 vCPU, 1 GB RAM) with autoscaling | ~$30.00 |
| **RDS PostgreSQL (Multi-AZ)** | `db.t3.small` Multi-AZ, 50 GB gp3 storage | ~$52.00 |
| **NAT Gateways (Dual-AZ)** | 2 NAT Gateways for cross-AZ resilience | ~$64.00 |
| **CloudWatch Alarms & Logs** | 10 alarms, 5 GB ingested logs, 1 dashboard | ~$4.50 |
| **Total Production Estimate** | Fully resilient, autoscaled multi-AZ deployment | **~$183.50 / mo** |

---

## 3. Automated Budgeting & Alerts (`terraform/modules/monitoring/`)

Terraform codifies automated AWS Budget tracking:
- **Dev Soft Threshold:** Alerts at **$25.00** actual spend via Amazon SNS.
- **Prod Threshold:** Alerts at **$100.00** forecasted spend via Amazon SNS.
- **Anomaly Detection:** CloudWatch anomaly alert configured on ALB request counts to guard against DDoS-driven egress spikes.
