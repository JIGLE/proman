# SendGrid Webhook Configuration Guide

This guide walks through setting up SendGrid email delivery tracking webhooks for ProMan.

## Overview

ProMan's email webhook endpoint (`/api/webhooks/sendgrid`) tracks email delivery events including:
- **Delivered** - Email successfully delivered to recipient
- **Bounce** - Email bounced (hard bounce = invalid address, soft bounce = temporary issue)
- **Open** - Recipient opened the email
- **Click** - Recipient clicked a link in the email
- **Deferred** - Email delivery temporarily delayed
- **Unsubscribe** - Recipient unsubscribed

Each event updates the `EmailLog` database record with:
- SendGrid Message ID
- Event type and timestamp
- Failure reason (if applicable)

## Prerequisites

1. Active SendGrid account (free tier or paid)
2. Verified Sender Identity (domain or single email)
3. ProMan deployed and accessible via HTTPS
4. SendGrid API access

## Step 1: Get SendGrid Webhook Signing Key

### Via SendGrid Web Console

1. Go to [SendGrid Console](https://app.sendgrid.com)
2. Navigate to **Settings** → **Mail Send**
3. Click **Event Webhook** (or Webhooks if you don't see it)
4. Under "Signed Event Webhook Verification", you'll see the public key
5. Copy the **Public Key** (will look like):
   ```
   MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBANK...
   ```

### Via SendGrid API

```bash
curl --request GET \
  --url https://api.sendgrid.com/v3/webhooks/event/settings \
  --header "authorization: Bearer $SENDGRID_API_KEY" \
  --header "content-type: application/json"
```

This returns:
```json
{
  "enabled": true,
  "url": "https://example.com/webhook",
  "group_resubscribe": true,
  "delivered": true,
  "group_unsubscribe": true,
  "spam_report": true,
  "bounce": true,
  "deferred": true,
  "unsubscribe": true,
  "processed": true,
  "open": true,
  "click": true,
  "dropped": true,
  "public_key": "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBANK..."
}
```

## Step 2: Add Webhook Public Key to ProMan

Update your environment variables with the public key:

**In `.env` file:**
```bash
SENDGRID_WEBHOOK_PUBLIC_KEY=MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBANK...
```

**In Kubernetes:**
```bash
kubectl set env deployment/proman \
  SENDGRID_WEBHOOK_PUBLIC_KEY="MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBANK..." \
  -n proman
```

**Restart the application:**
```bash
kubectl rollout restart deployment/proman -n proman
```

## Step 3: Configure Webhook in SendGrid

### Via SendGrid Console

1. Go to **Settings** → **Mail Send** → **Event Webhook**
2. In the **HTTP POST URL** field, enter your webhook endpoint:
   ```
   https://yourdomain.com/api/webhooks/sendgrid
   ```
   
   Or with port (if not using standard HTTPS):
   ```
   https://yourdomain.com:3000/api/webhooks/sendgrid
   ```

3. **Make sure "Signed Event Webhook Verification" is ENABLED** ✓
   - This is critical - ProMan validates all webhooks using RSA-SHA256 signatures

4. Check the event types you want to track:
   - ☑ Delivered
   - ☑ Bounce
   - ☑ Open
   - ☑ Click
   - ☑ Deferred
   - ☑ Dropped
   - ☑ Unsubscribe

5. Click **Save**

### Via SendGrid API

```bash
curl --request PATCH \
  --url https://api.sendgrid.com/v3/webhooks/event/settings \
  --header "authorization: Bearer $SENDGRID_API_KEY" \
  --header "content-type: application/json" \
  --data '{
    "enabled": true,
    "url": "https://yourdomain.com/api/webhooks/sendgrid",
    "group_resubscribe": true,
    "delivered": true,
    "group_unsubscribe": true,
    "spam_report": true,
    "bounce": true,
    "deferred": true,
    "unsubscribe": true,
    "processed": false,
    "open": true,
    "click": true,
    "dropped": true
  }'
```

## Step 4: Test Webhook Delivery

### Option A: SendGrid Console Test

1. Go to **Settings** → **Mail Send** → **Event Webhook**
2. Click the **Test Your URL** button
3. SendGrid sends a sample webhook to your endpoint
4. You should see:
   - ✓ Connection successful
   - ✓ Response status 200

### Option B: Send Test Email and Monitor

1. Verify your sender email in SendGrid
2. Send a test email via the console
3. Monitor the webhook logs in SendGrid
4. Check ProMan logs:

```bash
kubectl logs -f deployment/proman -n proman
```

Look for webhook processing logs:
```
[INFO] SendGrid webhook received: message-id=xxxxx
[INFO] Processing event: delivered
[INFO] Updated EmailLog record
```

### Option C: Manual Webhook Test

```bash
# Get the endpoint
ENDPOINT="https://yourdomain.com/api/webhooks/sendgrid"

# Create test payload
PAYLOAD='[{
  "email": "test@example.com",
  "timestamp": 1609459200,
  "smtp-id": "<14c5d75ce93.ede446395.58.35.77>",
  "event": "delivered",
  "category": "cat_actions",
  "sg_event_id": "sg_event_id_value",
  "sg_message_id": "sg_message_id_value"
}]'

# Send test webhook (this will FAIL signature verification - for testing connection only)
curl -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$ENDPOINT"
```

## Step 5: Monitor Webhook Health

### Check Webhook Status in SendGrid

1. Go to **Settings** → **Mail Send** → **Event Webhook**
2. Scroll down to **Webhook Statistics**
3. You should see:
   - Recent attempts and success rate
   - Failed delivery attempts (retry queue)
   - Latency metrics

### Monitor ProMan Logs

```bash
# Watch real-time webhook processing
kubectl logs -f deployment/proman -n proman | grep -i webhook

# Count successful webhook deliveries
kubectl logs deployment/proman -n proman | grep -i "webhook processed" | wc -l

# Find webhook errors
kubectl logs deployment/proman -n proman | grep -i "webhook error"
```

### Check Database Records

```bash
# Port-forward to the pod
kubectl port-forward svc/proman 3000:3000 -n proman

# Query EmailLog table (you'd need to connect via app UI or custom endpoint)
# This would show recent webhook updates
```

## Troubleshooting

### "Connection Refused" or "Timeout"

**Problem**: SendGrid cannot reach your webhook endpoint

**Solutions**:
1. Verify domain is resolvable:
   ```bash
   nslookup yourdomain.com
   ```

2. Verify endpoint is accessible:
   ```bash
   curl -v https://yourdomain.com/api/webhooks/sendgrid
   ```

3. Check firewall rules - port 443 must be open to SendGrid IP ranges:
   ```
   SendGrid webhook IPs: see https://sendgrid.com/docs/for-developers/parsing-webhook/setting-up-a-parse-webhook/#troubleshooting
   ```

4. Verify TLS certificate is valid:
   ```bash
   openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
   ```

### "Signature Verification Failed"

**Problem**: ProMan rejects webhook with signature mismatch

**Causes & Solutions**:
1. Wrong public key configured
   - Verify in SendGrid console → Settings → Mail Send → Event Webhook → Public Key
   - Compare to `SENDGRID_WEBHOOK_PUBLIC_KEY` env variable

2. Public key changed in SendGrid
   - If you regenerated the key, update ProMan's env variable
   - Restart the application

3. Clock skew between SendGrid and ProMan server
   - Sync server time: `ntpdate -s time.nist.gov` (Linux)
   - Or use NTP daemon for automatic sync

### "No Webhook Events Received"

**Problem**: SendGrid webhook isn't firing

**Solutions**:
1. Verify webhook is enabled in SendGrid console (checkbox checked)
2. Verify webhook URL is correct (check for typos)
3. Check SendGrid's webhook delivery logs:
   - Settings → Mail Send → Event Webhook → scroll to statistics
   - Look for failed attempts

4. Test with a fresh email send:
   ```bash
   # Send via SendGrid API
   curl --request POST \
     --url https://api.sendgrid.com/v3/mail/send \
     --header "Authorization: Bearer $SENDGRID_API_KEY" \
     --header "Content-Type: application/json" \
     --data '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"verified@yourdomain.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test email"}]}'
   ```

5. Monitor SendGrid activity dashboard for sent emails

### "Webhook Processing Errors"

**Problem**: Webhook received but ProMan reports error

Check logs for specific error:
```bash
kubectl logs deployment/proman -n proman | grep -A5 "webhook error"
```

Common errors:
- **Database constraint violation** - Email already marked as delivered (OK, idempotent update)
- **Invalid message ID** - Webhook missing `sg_message_id` field (report to SendGrid)
- **Unknown event type** - SendGrid sent new event type ProMan doesn't recognize yet

## Security Notes

1. **Signature Verification Required**
   - ProMan validates all webhooks using RSA-SHA256
   - Unsigned webhooks are rejected with 401 Unauthorized
   - This prevents spoof attacks

2. **HTTPS Only**
   - Always use HTTPS URL (not HTTP)
   - SendGrid won't deliver webhooks to unencrypted endpoints

3. **Keep Public Key Secret**
   - The public key is used to verify signatures
   - It's NOT the same as your API key (don't confuse them)

4. **Webhook URL Monitoring**
   - Regularly review SendGrid webhook stats
   - High failure rate indicates network/config issues

## Email Status Mapping

ProMan tracks the following email statuses based on webhook events:

| SendGrid Event | ProMan Status | Database Field | Notes |
|---|---|---|---|
| processed | sending | status | Email processed by SendGrid |
| dropped | failed | status | Email was rejected (permanent) |
| deferred | pending | status | Temporary delivery delay |
| bounce | bounced | status | Hard or soft bounce |
| delivered | delivered | status | Email arrived at recipient |
| open | opened | status | Recipient opened email |
| click | clicked | status | Recipient clicked a link |
| unsubscribe | unsubscribed | status | Recipient unsubscribed |
| spam_report | reported | status | Marked as spam |
| group_unsubscribe | unsubscribed | status | Unsubscribed from group |

All events include:
- `lastEventType` - Most recent event type
- `lastEventAt` - Timestamp of most recent event
- `failureReason` - Error message (for bounce, dropped, etc.)

## Webhook Retry Policy

SendGrid retries failed webhook deliveries:
- **Initial attempt**: Immediate
- **Retry 1**: 5 minutes
- **Retry 2**: 30 minutes
- **Retry 3**: 2 hours
- **Retry 4**: 5 hours
- **Retry 5**: 24 hours
- **Final retry**: After 72 hours, webhook is dropped

If your endpoint is down, you can manually request webhook replay from SendGrid console.

## Advanced: Custom Event Processing

To add new event types or customize processing, edit:
- `app/api/webhooks/sendgrid/route.ts`

Example: Add SMS notifications for bounces
```typescript
if (eventType === 'bounce') {
  // Send SMS alert to admin
  await sendSMSAlert(`Email bounced: ${email}`);
}
```

## Support

For issues:
1. Check SendGrid webhook logs (Settings → Mail Send → Event Webhook)
2. Check ProMan logs (`kubectl logs deployment/proman -n proman`)
3. Verify public key matches
4. Test with `curl` to isolate network issues
5. Contact SendGrid support if webhook delivery fails on their end
