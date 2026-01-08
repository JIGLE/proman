import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { createErrorResponse, createSuccessResponse } from '@/lib/error-handling';
import { getPrismaClient } from '@/lib/database';
import { z } from 'zod';
import type { PrismaClient, Prisma } from '@prisma/client';

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  status: z.enum(['sent', 'delivered', 'failed', 'bounced']).optional(),
  templateId: z.string().optional(),
  recipientEmail: z.string().optional(),
});

// GET /api/email/logs - Get email logs with pagination and filtering
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const prisma: PrismaClient = getPrismaClient();

  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    const where: Prisma.EmailLogWhereInput = {
      userId: authResult.userId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.templateId) {
      where.templateId = query.templateId;
    }

    if (query.recipientEmail) {
      where.to = query.recipientEmail;
    }

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          templateId: true,
          to: true,
          subject: true,
          status: true,
          error: true,
          sentAt: true,
          createdAt: true,
        },
      }),
      prisma.emailLog.count({ where }),
    ]);

    return createSuccessResponse({
      logs,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(new Error('Invalid query parameters'), 400, request);
    }
    return createErrorResponse(error as Error, 500, request);
  }
}