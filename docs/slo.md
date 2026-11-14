# Service Level Objectives (SLOs) & Reliability Targets

**Product:** Dyslexia Assistant  
**Target Platform:** AWS (CloudFront, S3, ECS Fargate, RDS PostgreSQL)  
**Revision Date:** 2026-11-14

---

## 1. Core Principles

Dyslexia Assistant follows a **local-first** paradigm. Because client-side reading, writing, and flashcard practice function without network access, client availability is decoupled from backend uptime. The SLOs below govern the hosted web assets, sync API services, and infrastructure reliability.

---

## 2. Defined Service Level Indicators (SLIs) & Objectives (SLOs)

| Metric | Target (Dev) | Target (Prod) | Measurement Window | Monitoring Source |
|---|---|---|---|---|
| **PWA App Shell Availability** | 99.0% | 99.95% | Calendar Month | CloudFront 2xx/3xx response ratio |
| **API Endpoint Availability** | 99.0% | 99.9% | Calendar Month | CloudWatch ALB 5xx metric vs Total Requests |
| **API Latency (p95)** | < 500 ms | < 250 ms | 5-Minute Rolling | CloudWatch ALB TargetResponseTime |
| **API Latency (p99)** | < 1000 ms | < 500 ms | 5-Minute Rolling | CloudWatch ALB TargetResponseTime |
| **Database Query Latency (p95)** | < 50 ms | < 20 ms | 5-Minute Rolling | CloudWatch RDS Latency metric |
| **Error Budget** | 1% monthly | 0.1% monthly | Monthly (~43.8 minutes downtime max) | CloudWatch Synthetics canary |

---

## 3. Disaster Recovery Objectives

- **Recovery Point Objective (RPO):** $\le 1\text{ hour}$
  - Automated point-in-time PostgreSQL RDS backups with 7-day retention.
  - S3 bucket versioning enabled on static frontend buckets.
- **Recovery Time Objective (RTO):** $\le 30\text{ minutes}$
  - ECS Fargate tasks auto-heal on container failure.
  - Infrastructure codified 100% in Terraform for rapid environment recreation in any AWS region.

---

## 4. Alerting Thresholds & CloudWatch Integration

1. **ALB 5xx Error Spike:**
   - Threshold: $> 5\text{ errors/min}$ over 2 consecutive evaluation periods.
   - Action: High-priority SNS notification to on-call engineer.
2. **ECS High Memory / CPU Utilization:**
   - Threshold: $> 75\%\text{ CPU}$ or $> 80\%\text{ Memory}$ for 5 minutes.
   - Action: Auto-scaling triggers additional task instance; warning alert dispatched.
3. **Database Storage Capacity:**
   - Threshold: $< 15\%\text{ free storage space}$.
   - Action: RDS auto-storage scaling engages; warning logged to CloudWatch.
4. **AWS Budget Alarm:**
   - Soft Alert: $\ge \$25/\text{month}$ (Dev warning).
   - Hard Alert: $\ge \$100/\text{month}$ (Prod escalation).
