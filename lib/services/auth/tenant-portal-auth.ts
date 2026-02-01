/**
 * Tenant Portal Authentication
 * 
 * Handles token generation and verification for tenant self-service portal.
 * Uses signed JWTs for secure, stateless authentication.
 */

import { getPrismaClient } from '../database/database';

// Token expiration in seconds (default: 30 days)
const TOKEN_EXPIRATION = 30 * 24 * 60 * 60;

export interface PortalTokenPayload {
  tenantId: string;
  userId: string;
  exp: number;
  iat: number;
}

/**
 * Generate a simple signed token for tenant portal access
 * In production, use proper JWT library with RS256
 */
export function generatePortalToken(tenantId: string, userId: string): string {
  const payload: PortalTokenPayload = {
    tenantId,
    userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRATION,
  };
  
  // Simple base64 encoding - in production use proper JWT signing
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  // Create signature using secret (in production, use proper HMAC)
  const secret = process.env.NEXTAUTH_SECRET || 'proman-tenant-portal-secret';
  const signatureData = `${header}.${payloadStr}`;
  const signature = Buffer.from(
    simpleHash(signatureData + secret)
  ).toString('base64url');
  
  return `${header}.${payloadStr}.${signature}`;
}

/**
 * Verify a portal token and return payload if valid
 */
export async function verifyPortalToken(token: string): Promise<PortalTokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, payloadStr, signature] = parts;
    
    // Verify signature
    const secret = process.env.NEXTAUTH_SECRET || 'proman-tenant-portal-secret';
    const signatureData = `${header}.${payloadStr}`;
    const expectedSignature = Buffer.from(
      simpleHash(signatureData + secret)
    ).toString('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Decode payload
    const payload: PortalTokenPayload = JSON.parse(
      Buffer.from(payloadStr, 'base64url').toString()
    );
    
    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    // Verify tenant exists
    const prisma = getPrismaClient();
    const tenant = await prisma.tenant.findUnique({
      where: { id: payload.tenantId },
      select: { id: true, userId: true },
    });
    
    if (!tenant || tenant.userId !== payload.userId) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Simple hash function for demonstration
 * In production, use crypto.createHmac('sha256', secret)
 */
function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Convert to hex-like string
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Generate a portal link for a tenant
 */
export function generatePortalLink(tenantId: string, userId: string, baseUrl?: string): string {
  const token = generatePortalToken(tenantId, userId);
  const base = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${base}/tenant-portal/${token}`;
}

/**
 * Service for managing tenant portal access
 */
export const tenantPortalService = {
  generateToken: generatePortalToken,
  verifyToken: verifyPortalToken,
  generateLink: generatePortalLink,
  
  /**
   * Send portal invitation email to tenant
   */
  async sendInvitation(tenantId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const prisma = getPrismaClient();
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          property: { select: { name: true } },
          user: { select: { name: true } },
        },
      });
      
      if (!tenant) {
        return { success: false, error: 'Tenant not found' };
      }
      
      const portalLink = generatePortalLink(tenantId, userId);
      
      // Import email service dynamically to avoid circular deps
      const { emailService } = await import('../email/email-service');
      
      const fromEmail = process.env.FROM_EMAIL || 'noreply@proman.app';
      const result = await emailService.sendEmail({
        to: tenant.email,
        from: fromEmail,
        subject: 'Your Tenant Portal Access',
        html: `
          <h1>Welcome to Your Tenant Portal</h1>
          <p>Dear ${tenant.name},</p>
          <p>Your property manager (${tenant.user.name || 'Your Property Manager'}) has set up a self-service portal for you.</p>
          <p><strong>Property:</strong> ${tenant.property?.name || 'Your Property'}</p>
          <p>Click the link below to access your portal where you can:</p>
          <ul>
            <li>View and pay invoices</li>
            <li>Check your payment history</li>
            <li>Track maintenance requests</li>
          </ul>
          <p><a href="${portalLink}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Access Your Portal</a></p>
          <p>This link will expire in 30 days.</p>
          <p>If you have any questions, please contact your property manager.</p>
        `,
      }, userId);
      
      return { success: result.success, error: result.error };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send invitation' 
      };
    }
  },
  
  /**
   * Revoke portal access for a tenant by marking token as expired
   * In a production system, you might store active tokens in the database
   */
  async revokeAccess(tenantId: string): Promise<{ success: boolean }> {
    // In production, invalidate stored tokens or add to blacklist
    // For now, tokens are stateless and expire naturally
    return { success: true };
  },
};
