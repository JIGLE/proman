import type {
  GovernmentVerificationProvider,
  GovernmentVerificationScope,
  GovernmentVerificationStatus,
  Prisma,
} from "@prisma/client";
import { getPrismaClient } from "@/lib/services/database/database";
import type {
  CreateOwnershipVerificationInput,
  OwnershipVerificationFilters,
} from "@/lib/schemas/ownership-verification.schema";

type VerificationRecord = {
  id: string;
  userId: string;
  provider: string;
  scope: string;
  status: string;
  externalReference: string | null;
  verifiedFullName: string | null;
  verifiedTaxId: string | null;
  requestedAt: Date;
  authorizedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;
  propertyClaims: ClaimRecord[];
};

type ClaimRecord = {
  id: string;
  verificationId: string;
  propertyId: string;
  claimType: string;
  status: string;
  ownershipPercentage: number | null;
  sourceReference: string | null;
  matchedAddress: string | null;
  registryData: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function parseMetadata(metadata: string | null): Record<string, unknown> | undefined {
  if (!metadata) return undefined;

  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return { raw: metadata };
  }
}

function serializeClaim(record: ClaimRecord) {
  return {
    id: record.id,
    verificationId: record.verificationId,
    propertyId: record.propertyId,
    claimType: record.claimType,
    status: record.status,
    ownershipPercentage: record.ownershipPercentage ?? undefined,
    sourceReference: record.sourceReference ?? undefined,
    matchedAddress: record.matchedAddress ?? undefined,
    registryData: record.registryData ?? undefined,
    verifiedAt: record.verifiedAt?.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function serializeVerification(record: VerificationRecord) {
  return {
    id: record.id,
    userId: record.userId,
    provider: record.provider,
    scope: record.scope,
    status: record.status,
    externalReference: record.externalReference ?? undefined,
    verifiedFullName: record.verifiedFullName ?? undefined,
    verifiedTaxId: record.verifiedTaxId ?? undefined,
    requestedAt: record.requestedAt.toISOString(),
    authorizedAt: record.authorizedAt?.toISOString(),
    completedAt: record.completedAt?.toISOString(),
    expiresAt: record.expiresAt?.toISOString(),
    errorCode: record.errorCode ?? undefined,
    errorMessage: record.errorMessage ?? undefined,
    metadata: parseMetadata(record.metadata),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    propertyClaims: record.propertyClaims.map(serializeClaim),
  };
}

export async function createOwnershipVerification(
  userId: string,
  input: CreateOwnershipVerificationInput,
) {
  const prisma = getPrismaClient();
  const verification = await prisma.governmentVerification.create({
    data: {
      userId,
      provider: input.provider,
      scope: input.scope,
      externalReference: input.externalReference,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      propertyClaims:
        input.propertyClaims && input.propertyClaims.length > 0
          ? {
              create: input.propertyClaims.map((claim) => ({
                propertyId: claim.propertyId,
                claimType: claim.claimType,
                ownershipPercentage: claim.ownershipPercentage,
                sourceReference: claim.sourceReference,
                matchedAddress: claim.matchedAddress,
              })),
            }
          : undefined,
    },
    include: {
      propertyClaims: true,
    },
  });

  return serializeVerification(verification as VerificationRecord);
}

export async function listOwnershipVerifications(
  userId: string,
  filters: OwnershipVerificationFilters = {},
) {
  const prisma = getPrismaClient();
  const where: Prisma.GovernmentVerificationWhereInput = { userId };

  if (filters.provider) {
    where.provider = filters.provider as GovernmentVerificationProvider;
  }
  if (filters.scope) {
    where.scope = filters.scope as GovernmentVerificationScope;
  }
  if (filters.status) {
    where.status = filters.status as GovernmentVerificationStatus;
  }
  if (filters.propertyId) {
    where.propertyClaims = {
      some: { propertyId: filters.propertyId },
    };
  }

  const verifications = await prisma.governmentVerification.findMany({
    where,
    include: {
      propertyClaims: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return verifications.map((verification) =>
    serializeVerification(verification as VerificationRecord),
  );
}

export async function getOwnershipVerification(userId: string, verificationId: string) {
  const prisma = getPrismaClient();
  const verification = await prisma.governmentVerification.findFirst({
    where: {
      id: verificationId,
      userId,
    },
    include: {
      propertyClaims: true,
    },
  });

  if (!verification) return null;

  return serializeVerification(verification as VerificationRecord);
}
