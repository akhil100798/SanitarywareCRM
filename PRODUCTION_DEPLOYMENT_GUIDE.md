# SanitarywareCRM — Production Deployment Guide

This guide provides end-to-end instructions for deploying the SanitarywareCRM platform into a live cloud production environment.

---

## 1. Target Architecture & Recommended Hosting Stack

- **Frontend Static Hosting**: Vercel / Cloudflare Pages / AWS S3 + CloudFront.
- **Backend API Hosting**: Render / AWS ECS Fargate / DigitalOcean App Platform / Docker Host.
- **Database**: AWS RDS (MySQL 8.0+ or PostgreSQL 14+) / Google Cloud SQL.
- **File Upload Storage**: Mounted Persistent Volume or AWS S3 Bucket.

---

## 2. Environment Variables Specification

### Backend Service Environment Variables
```env
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8081
DATABASE_URL=jdbc:mysql://<db-host>:3306/sanitaryware_crm?useSSL=true&serverTimezone=UTC
DATABASE_USERNAME=<db-username>
DATABASE_PASSWORD=<db-password>
JWT_SECRET=<min-32-chars-high-entropy-random-string>
JWT_EXPIRATION_MS=86400000
CORS_ALLOWED_ORIGIN_PATTERNS=https://crm.example.com
FILE_UPLOAD_DIR=/var/lib/sanitaryware-crm/uploads
MAIL_USERNAME=
MAIL_PASSWORD=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=
```

### Frontend Service Environment Variables
```env
VITE_API_BASE_URL=https://api.crm.example.com/api
```

---

## 3. Step-by-Step Deployment Protocol

### Step 1: Provision Managed Database
1. Provision the MySQL 8.0+ or PostgreSQL 14+ managed database on your cloud provider.
2. Ensure database security groups allow inbound TCP traffic on port 3306/5432 only from the backend container IP/security group.
3. Verify TLS encryption is enforced on the database connection.

### Step 2: Deploy Backend Container
1. Build and push container to your Container Registry:
   ```bash
   docker build -t registry.example.com/sanitaryware-backend:1.0.0 ./backend
   docker push registry.example.com/sanitaryware-backend:1.0.0
   ```
2. Deploy container with the production environment variables and mount a persistent volume at `/var/lib/sanitaryware-crm/uploads`.
3. Configure the container health check to poll `http://localhost:8081/api/health` every 30 seconds.
4. Verify startup logs indicate:
   - Profile `prod` active.
   - Flyway applied 7 migrations cleanly.
   - Tomcat initialized on port 8081.

### Step 3: Deploy Frontend SPA
1. Build the production bundle:
   ```bash
   cd frontend
   npm ci
   VITE_API_BASE_URL="https://api.crm.example.com/api" npm run build
   ```
2. Deploy the generated `dist/` directory to Vercel, Cloudflare Pages, or Nginx.
3. Verify client-side SPA routing (`vercel.json` rewrites or Nginx `try_files $uri $uri/ /index.html`).

### Step 4: Configure HTTPS & DNS
1. Map `https://api.crm.example.com` to the Backend load balancer / container.
2. Map `https://crm.example.com` to the Frontend CDN / edge network.
3. Ensure SSL certificates (Let's Encrypt / Cloudflare SSL / AWS ACM) are active and enforce HTTP -> HTTPS redirect.

---

## 4. Post-Deployment Verification & Smoke Test Protocol

1. **API Health Check**:
   ```bash
   curl -i https://api.crm.example.com/api/health
   ```
   Must return `200 OK` with JSON `{"status":"UP"}`.
2. **CORS Verification**:
   ```bash
   curl -i -X OPTIONS https://api.crm.example.com/api/products \
     -H "Origin: https://crm.example.com" \
     -H "Access-Control-Request-Method: GET"
   ```
   Must return `200 OK` with `Access-Control-Allow-Origin: https://crm.example.com`.
3. **End-to-End Workflow Verification**:
   - Log in as Administrator on `https://crm.example.com`.
   - Create a test Product and Customer.
   - Generate a Quotation and convert to Order.
   - Confirm Order (verify stock decrement).
   - Record Payment (verify ledger balance decrement).
   - Download Tax Invoice PDF (verify bytes rendered).
   - Inspect Audit Logs (verify actor and timestamp captured).
