# SanitarywareCRM — Disaster Recovery Plan

This document establishes the official Disaster Recovery (DR) and Business Continuity Plan for the SanitarywareCRM enterprise platform.

---

## 1. Disaster Recovery Objectives

| Metric | Target | Description |
| :--- | :---: | :--- |
| **Recovery Point Objective (RPO)** | **< 15 minutes** | Maximum allowable data loss in the event of an infrastructure catastrophe. |
| **Recovery Time Objective (RTO)** | **< 60 minutes** | Maximum allowable downtime before core CRM services must be restored. |

---

## 2. Disaster Recovery Tiers & Classification

| Component | Criticality | DR Strategy | Recovery Protocol |
| :--- | :---: | :--- | :--- |
| **Relational Database** | **Tier 1 (Critical)** | Automated Multi-AZ replication + Continuous PITR snapshots | Point-in-time snapshot promotion or RDS failover |
| **Uploaded Assets Storage** | **Tier 1 (Critical)** | Persistent Volume Snapshots / AWS S3 Cross-Region Replication | Sync from backup S3 bucket or volume snapshot restore |
| **Backend API Service** | **Tier 2 (High)** | Containerized Docker image on Container Registry | Redeploy container image to new host/cluster |
| **Frontend Static SPA** | **Tier 2 (High)** | Edge CDN distribution (Vercel / Cloudflare / CloudFront) | Instant DNS / CDN redeployment of static `dist/` bundle |

---

## 3. Disaster Scenarios & Recovery Workflows

### Scenario A: Primary Database Failure or Data Corruption
1. **Detection**: Health checks on `/api/health` fail with database connection errors; HikariCP reports connection timeout.
2. **Action**:
   - For Cloud Managed DB: Trigger Multi-AZ automated failover.
   - For Data Corruption: Initiate Point-In-Time Recovery to the timestamp immediately prior to the corrupting event ($T - \Delta t$).
3. **Verification**: Verify table row counts and invariant: $\text{paidAmount} + \text{balanceAmount} = \text{totalAmount}$.
4. **Resumption**: Update `DATABASE_URL` if host changed and restart backend services.

### Scenario B: Cloud Host / Container Cluster Outage
1. **Detection**: Cloud provider reports regional outage or container crashes continuously.
2. **Action**:
   - Pull the immutable release image (`sanitaryware-backend:1.0.0`) from container registry to alternate cluster/host.
   - Inject environment variables (`DATABASE_URL`, `JWT_SECRET`, `CORS_ALLOWED_ORIGIN_PATTERNS`).
   - Launch backend container and verify `/api/health` probe.
3. **Resumption**: Re-point Load Balancer / DNS records to the new container cluster.

### Scenario C: Compromise or Malicious Action
1. **Immediate Lockdown**: Rotate `JWT_SECRET` in environment and restart backend. This instantly revokes all issued access tokens.
2. **Audit Forensics**: Query `audit_logs` table for actor actions and affected records:
   ```sql
   SELECT * FROM audit_logs WHERE created_at >= NOW() - INTERVAL '24 HOURS' ORDER BY created_at DESC;
   ```
3. **Remediation**: Restore clean database state from snapshot if data was tampered with; rotate all service passwords and API credentials.

---

## 4. Implementation Status Classification

| Capability | Status | Notes |
| :--- | :---: | :--- |
| Database Migration Scripts (V1-V7) | **IMPLEMENTED** | Validated via Flyway in CI and runtime |
| Containerized Immutable Builds | **IMPLEMENTED** | Multi-stage Dockerfile with non-root security |
| Stateless JWT Security Architecture | **IMPLEMENTED** | Enables instant multi-node horizontal scaling |
| Automated Database Multi-AZ Replication | **MANUAL CLOUD ACTION REQUIRED** | Must be enabled on production AWS RDS / Cloud SQL |
| S3 Cross-Region Upload Sync | **MANUAL CLOUD ACTION REQUIRED** | Must be configured on cloud object storage bucket |
| DNS Failover Routing | **MANUAL CLOUD ACTION REQUIRED** | Route53 / Cloudflare health check failover policy |
