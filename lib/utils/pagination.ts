/**
 * Pagination Utilities
 * Reusable pagination helpers for API endpoints
 */

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Parse pagination parameters from URL search params
 * @param searchParams - URL search params
 * @param defaultLimit - Default items per page (default: 50)
 * @param maxLimit - Maximum items per page (default: 100)
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultLimit = 50,
  maxLimit = 100
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const requestedLimit = parseInt(searchParams.get('limit') || String(defaultLimit), 10);
  
  // Clamp limit between 1 and maxLimit
  const limit = Math.max(1, Math.min(maxLimit, requestedLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Create a paginated response object
 * @param data - Array of items for current page
 * @param total - Total count of items across all pages
 * @param params - Pagination parameters used for the query
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);

  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}

/**
 * Extract pagination info from Next.js request
 */
export function getPaginationFromRequest(
  request: Request,
  defaultLimit = 50,
  maxLimit = 100
): PaginationParams {
  const url = new URL(request.url);
  return parsePaginationParams(url.searchParams, defaultLimit, maxLimit);
}
