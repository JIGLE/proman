# Deploying Proman on TrueNAS SCALE

This guide describes how to deploy Proman as a **Custom App** on TrueNAS SCALE. This is the recommended way to ensure persistence and correct configuration.

## Prerequisites
- A TrueNAS SCALE server with Apps service configured.
- A dataset created for Proman's data (e.g., `/mnt/tank/apps/proman/data`).

## Step 1: Create a Custom App
1. Go to **Apps** -> **Discover Apps** -> **Custom App**.
2. **Application Name**: `proman`

## Step 2: Container Configuration
1. **Image Repository**: `ghcr.io/jigle/proman`
2. **Image Tag**: `latest` (or a specific version like `0.2.0`)
3. **Container Port**: `3000`

## Step 3: Environment Variables
Add the following mandatory variables:
- `NEXTAUTH_URL`: `http://<YOUR_TRUENAS_IP>` (e.g., `http://192.168.1.100:30080`)
- `NEXTAUTH_SECRET`: Generate a long random string (e.g., `openssl rand -base64 32`)
- `DATABASE_URL`: `file:/data/proman.sqlite`
- `NODE_ENV`: `production`

## Step 4: Networking
1. Add a **Port Forwarding** entry:
   - **Container Port**: `3000`
   - **Node Port**: Choose an available port (Default: `30080`)

## Step 5: Storage (Host Path)
1. Add a **Host Path Volume**:
   - **Host Path**: `/mnt/your-pool/apps/proman/data` (Your created dataset)
   - **Mount Path**: `/data`
   - **Read Only**: Unchecked

## Step 6: Initialization
After the app starts for the first time, it will automatically initialize the database schema. If you encounter errors like "Missing tables", you can manually trigger an initialization:
1. Open the **Shell** for the Proman pod in TrueNAS UI.
2. Run: `npx prisma db push && npx prisma generate`

---
**Note on Security**: If you use an Ingress/Reverse Proxy, ensure `NEXTAUTH_URL` matches your external domain name.
