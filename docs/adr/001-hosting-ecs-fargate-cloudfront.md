# ADR 001 — Hosting: ECS Fargate + CloudFront

**Status:** Accepted  
**Date:** 2026-11-13  
**Authors:** Engineering Team

---

## Context

The Dyslexia Assistant has two distinct components:
1. A React + vanilla-JS static front-end (SPA + PWA)
2. A Node.js REST API (optional accounts + cloud sync)

The product principle is **local-first**: the front-end must work entirely offline.  
The API is a **supporting service** for registered users only; most visitors never call it.

Deployment choices evaluated:

| Option | Static Site | API | Trade-offs |
|---|---|---|---|
| Vercel + Render | CDN | Serverless | Easy but no IaC control, vendor lock-in |
| S3 + Lambda | S3/CloudFront | Lambda | Cold-starts hurt auth endpoints; complexity |
| **S3 + CloudFront + ECS Fargate** | CloudFront | ECS | Full IaC, predictable latency, cost control |
| EC2 (self-managed) | nginx | Node | High ops burden, no auto-scaling |

## Decision

**Static front-end** → S3 private bucket + CloudFront + Origin Access Control (OAC).  
**API** → ECS Fargate cluster behind an Application Load Balancer (ALB).  
Both protected by **AWS WAFv2** with rate-limiting rules.

### Rationale

- **CloudFront** delivers the PWA shell globally with low latency and enforces security headers via Response Headers Policy (CSP, X-Frame-Options, nosniff, etc.).
- **ECS Fargate** removes all EC2 patch burden. Task containers run as non-root; secrets are injected from AWS Secrets Manager at startup.
- **WAFv2** sits in front of both CloudFront and the ALB, enforcing request-rate limits before traffic reaches the application.
- Terraform modules in `terraform/modules/` codify every resource, enabling reproducible `dev` and `prod` environments.

## Consequences

- **Cost:** Dev ~\$18–25/mo (Fargate minimum); prod ~\$95–120/mo with autoscaling. Budget alerts fire at \$25 and \$100.
- **Ops:** ECS rolling deployments and GitHub Actions rollback handle zero-downtime releases.
- **Offline:** The PWA app shell and all vendor assets are precached by the service worker; the CloudFront origin is irrelevant once the cache is warm.

