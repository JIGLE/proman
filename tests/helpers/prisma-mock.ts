// Minimal Prisma client mock used in tests to avoid constructing a real PrismaClient.
// It implements only the parts used by the test-suite by default (emailLog operations)
// Tests that need more DB surface can inject a full mock via setPrismaClientForTests.
export function createMinimalPrismaMock() {
  const emailLog = {
    create: async ({ data }: { data: any }) => {
      // Return a minimal record resembling the DB row
      return {
        id: 'mock-email-log',
        to: data.to,
        from: data.from,
        subject: data.subject,
        templateId: data.templateId,
        status: data.status,
        messageId: data.messageId,
        error: data.error,
        sentAt: data.sentAt || new Date(),
        userId: data.userId,
      };
    },
    groupBy: async () => {
      // Default: no stats
      return [];
    },
  };

  // Provide $connect / $disconnect for consumers that call them
  const client: any = {
    emailLog,
    $connect: async () => {},
    $disconnect: async () => {},
  };

  return client as any;
}
