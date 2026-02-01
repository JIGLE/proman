import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getPrismaClient } from '@/lib/services/database/database'

export const runtime = 'nodejs'

/**
 * SendGrid Webhook Event Handler
 * 
 * Validates SendGrid webhook signature and processes email events
 * (delivery, open, click, bounce, etc.)
 * 
 * Documentation: https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook
 */

type SendGridEvent = {
  email: string
  event: 'processed' | 'dropped' | 'delivered' | 'deferred' | 'bounce' | 'open' | 'click' | 'unsubscribe' | 'group_unsubscribe' | 'group_resubscribe'
  timestamp: number
  'smtp-id'?: string
  'message-id'?: string
  'sg_message_id'?: string
  reason?: string
  status?: string
  response?: string
  [key: string]: unknown
}

/**
 * Verify SendGrid webhook signature
 * Reference: https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security
 */
function verifySendGridSignature(
  payload: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(payload)
    return verifier.verify(publicKey, signature, 'base64')
  } catch (error) {
    console.error('SendGrid signature verification failed:', error instanceof Error ? error.message : String(error))
    return false
  }
}

/**
 * Process SendGrid event and update EmailLog
 */
async function processEvent(event: SendGridEvent): Promise<void> {
  const prisma = getPrismaClient()

  // Map SendGrid event types to internal status
  const eventStatusMap: Record<string, string> = {
    processed: 'sent',
    dropped: 'failed',
    delivered: 'delivered',
    deferred: 'deferred',
    bounce: 'bounced',
    open: 'opened',
    click: 'clicked',
    unsubscribe: 'unsubscribed',
    group_unsubscribe: 'unsubscribed',
    group_resubscribe: 'resubscribed',
  }

  const status = eventStatusMap[event.event] || 'unknown'

  try {
    // Find email log by SendGrid message ID
    const sgMessageId = event['sg_message_id'] || event['message-id'] || ''
    
    if (!sgMessageId) {
      console.debug('[SendGrid webhook] Event missing message ID, skipping update:', event.event)
      return
    }

    // Update or create email log entry
    const emailLog = await prisma.emailLog.upsert({
      where: {
        sendgridMessageId: sgMessageId,
      },
      update: {
        status,
        lastEventAt: new Date(event.timestamp * 1000),
        lastEventType: event.event,
        ...(event.reason && { failureReason: event.reason }),
      },
      create: {
        to: event.email,
        from: 'noreply@proman.local',
        subject: '[Webhook] Email Status Update',
        sendgridMessageId: sgMessageId,
        status,
        lastEventAt: new Date(event.timestamp * 1000),
        lastEventType: event.event,
        ...(event.reason && { failureReason: event.reason }),
      },
    })

    console.debug(`[SendGrid webhook] Processed ${event.event} for ${event.email}`, {
      messageId: sgMessageId,
      logId: emailLog.id,
    })
  } catch (error) {
    console.error(`[SendGrid webhook] Failed to process ${event.event} event:`, error instanceof Error ? error.message : String(error))
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Get request body
    const body = await request.text()

    // Verify SendGrid signature (if public key is configured)
    const sendgridPublicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY
    if (sendgridPublicKey) {
      const signature = request.headers.get('X-Twilio-Email-Event-Webhook-Signature') || ''
      const timestamp = request.headers.get('X-Twilio-Email-Event-Webhook-Timestamp') || ''

      if (!signature || !timestamp) {
        console.warn('[SendGrid webhook] Missing signature or timestamp header')
        return NextResponse.json({ error: 'invalid headers' }, { status: 400 })
      }

      // Reconstruct signed content
      const signedContent = `${timestamp}${body}`

      // Verify signature
      const isValid = verifySendGridSignature(signedContent, signature, sendgridPublicKey)
      if (!isValid) {
        console.warn('[SendGrid webhook] Invalid signature from IP:', request.headers.get('x-forwarded-for'))
        return NextResponse.json({ error: 'invalid signature' }, { status: 403 })
      }
    } else {
      console.debug('[SendGrid webhook] SENDGRID_WEBHOOK_PUBLIC_KEY not configured; skipping signature verification')
    }

    // Parse events (SendGrid sends as JSON array)
    let events: SendGridEvent[] = []
    try {
      const parsed = JSON.parse(body)
      events = Array.isArray(parsed) ? parsed : [parsed]
    } catch (error) {
      console.error('[SendGrid webhook] Failed to parse JSON:', error instanceof Error ? error.message : String(error))
      return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }

    // Process each event
    let processed = 0
    for (const event of events) {
      if (event.email && event.event && event.timestamp) {
        await processEvent(event)
        processed++
      }
    }

    console.debug(`[SendGrid webhook] Processed ${processed}/${events.length} events`)
    return NextResponse.json({ ok: true, processed }, { status: 200 })
  } catch (error) {
    console.error('[SendGrid webhook] Unexpected error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
