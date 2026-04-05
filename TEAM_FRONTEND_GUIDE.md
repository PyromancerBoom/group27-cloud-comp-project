# Frontend & Content Delivery Integration Guide

Hi Team! I've finalized the production-grade hosting infrastructure for our PWA and Admin Dashboard using **AWS S3** and **Amazon CloudFront**. 

## 🚀 How it works
1. **S3 Buckets**: Private buckets host our static assets.
2. **CloudFront (CDN)**: Acts as the entry point. It provides global edge caching and **Automatic HTTPS (SSL)** using the default CloudFront certificate.
3. **Optimized Caching**: 
   - **/assets/**: Cached for **1 year** (since Vite fingerprints these files).
   - **index.html**: Cached for **0 seconds** (CloudFront will always check S3 for a new version), ensuring immediate updates without manual cache invalidation for most changes.
4. **Security (OAC)**: S3 buckets are strictly private. Access is ONLY allowed through the CloudFront URL.
5. **SPA Support**: Configured to redirect 404s/403s to `index.html` for seamless React Router support.

## 🛠 Deployment Workflow
When you are ready to deploy your code changes:

1. **Set Environment Variables**:
   In `./frontend/` and `./dashboard/`, create or update `.env.production`:
   ```bash
   VITE_API_URL=http://<ALB_DNS_NAME> 
   # (Get this from terraform output alb_dns_name)
   ```

2. **Build your project**:
   ```bash
   npm run build
   ```

3. **Upload to S3**:
   ```bash
   # For the PWA
   aws s3 sync ./frontend/dist s3://<frontend_pwa_bucket_name> --delete

   # For the Dashboard
   aws s3 sync ./dashboard/dist s3://<admin_dashboard_bucket_name> --delete
   ```

4. **Invalidate Cache (Optional)**:
   While I've set `index.html` to TTL 0, if you need an absolute fresh start, run:
   ```bash
   aws cloudfront create-invalidation --distribution-id <dist_id> --paths "/*"
   ```

## 🔗 How to find URLs & Bucket Names
Run `terraform output` after deployment to see the live URLs and the exact bucket names to use in the commands above.
