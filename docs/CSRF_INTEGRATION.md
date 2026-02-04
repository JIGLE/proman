# CSRF Protection Integration

## Overview

ProMan implements comprehensive CSRF (Cross-Site Request Forgery) protection using the Double Submit Cookie pattern. This document explains the implementation and usage.

## Architecture

### Backend (Server-Side)

1. **CSRF Middleware** (`lib/middleware/csrf.ts`)
   - Generates cryptographically secure CSRF tokens (32-byte hex)
   - Validates tokens using constant-time comparison (prevents timing attacks)
   - Sets both cookie and expects header for verification
   - Cookie Configuration:
     - httpOnly: false (client needs to read it)
     - secure: true (HTTPS only in production)
     - sameSite: 'strict'
     - maxAge: 24 hours

2. **Token Distribution** (`app/api/csrf-token/route.ts`)
   - GET endpoint returns CSRF token as JSON
   - Automatically sets the CSRF cookie
   - Used by frontend to fetch tokens on mount and refresh

3. **Protected Routes**
   - Apply `withCsrfProtection()` wrapper to state-changing routes
   - Validates X-CSRF-Token header matches cookie
   - Returns 403 for invalid/missing tokens

### Frontend (Client-Side)

1. **CSRF Context Provider** (`lib/contexts/csrf-context.tsx`)
   - Makes CSRF token available throughout the app
   - Wraps application in provider hierarchy
   - Provides `useCsrf()` hook for token access

2. **CSRF Token Hook** (`lib/hooks/use-csrf-token.tsx`)
   - Auto-fetches token on component mount
   - Auto-refreshes token every 23 hours (before 24h expiry)
   - Provides manual `refreshToken()` function
   - Tracks loading and error states

3. **Secure API Client** (`lib/utils/api-client.ts`)
   - Type-safe wrapper around fetch API
   - Automatically injects CSRF token for POST/PUT/PATCH/DELETE
   - Supports two call signatures:
     ```typescript
     // Signature 1: Options object
     apiFetch<T>('/api/endpoint', { method: 'POST', csrfToken, body: JSON.stringify(data) })
     
     // Signature 2: Convenient shorthand
     apiFetch<T>('/api/endpoint', csrfToken, 'POST', data)
     ```
   - Includes credentials (cookies) automatically
   - Logs warnings for missing CSRF tokens on state-changing requests

4. **App Context Integration** (`lib/contexts/app-context.tsx`)
   - All CRUD operations updated to use CSRF-protected API client
   - Examples:
     - `addProperty()` → `apiFetch('/api/properties', csrfToken, 'POST', data)`
     - `updateTenant()` → `apiFetch(/api/tenants/${id}, csrfToken, 'PUT', data)`
     - `deleteReceipt()` → `apiFetch(/api/receipts/${id}, csrfToken, 'DELETE')`

## Usage Examples

### Frontend: Using CSRF in Components

```tsx
import { useCsrf } from '@/lib/contexts/csrf-context';
import { apiFetch } from '@/lib/utils/api-client';

function MyComponent() {
  const { token, loading, error, refreshToken } = useCsrf();
  
  const handleSubmit = async (data) => {
    try {
      // Convenient signature
      const result = await apiFetch('/api/myendpoint', token, 'POST', data);
      
      // Or options object signature
      // const result = await apiFetch('/api/myendpoint', {
      //   method: 'POST',
      //   csrfToken: token,
      //   body: JSON.stringify(data)
      // });
      
      console.log('Success:', result);
    } catch (err) {
      console.error('Failed:', err);
    }
  };
  
  if (loading) return <div>Loading CSRF token...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <button onClick={() => handleSubmit({ foo: 'bar' })}>Submit</button>;
}
```

### Backend: Protecting Routes

```typescript
import { withCsrfProtection } from '@/lib/middleware/csrf';

export const POST = withCsrfProtection(async (request: Request) => {
  // Your route logic here
  // CSRF validation is automatic
  
  const body = await request.json();
  // ... process request
  
  return NextResponse.json({ success: true });
});
```

### Testing CSRF Protection

```bash
# Should succeed with valid token
curl -X POST http://localhost:3000/api/properties \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_TOKEN_HERE" \
  -H "Cookie: _csrf=YOUR_TOKEN_HERE" \
  -d '{"name":"Test Property"}'

# Should fail without token (403)
curl -X POST http://localhost:3000/api/properties \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Property"}'
```

## Token Lifecycle

1. **Initial Load**
   - CsrfProvider fetches token from `/api/csrf-token`
   - Token stored in React state
   - Cookie automatically set by browser

2. **Token Usage**
   - Components access token via `useCsrf()` hook
   - API client automatically includes token in X-CSRF-Token header
   - Server validates header matches cookie

3. **Token Refresh**
   - Auto-refresh every 23 hours (before 24h expiry)
   - Manual refresh available via `refreshToken()` function
   - New token overwrites old token seamlessly

4. **Token Expiry**
   - Tokens expire after 24 hours
   - 403 errors trigger token refresh
   - Users re-authenticate if session expired

## Security Considerations

### Strengths

✅ **Double Submit Cookie**: Token in both cookie and header prevents CSRF
✅ **Constant-Time Comparison**: Prevents timing attacks
✅ **Cryptographically Secure**: Uses `crypto.randomBytes()` for token generation
✅ **Automatic Injection**: Developers don't forget to add tokens
✅ **SameSite Strict**: Additional protection against CSRF
✅ **HTTPS Only in Production**: Prevents token interception
✅ **Short Expiry**: Limits window of opportunity for attacks

### Best Practices

1. **Never log CSRF tokens** - Tokens are sensitive credentials
2. **Always use HTTPS in production** - Prevents token interception
3. **Validate origin headers** - Additional defense layer (implemented in global middleware)
4. **Rate limit token generation** - Prevents token flooding attacks (implemented)
5. **Monitor failed CSRF validations** - May indicate attack attempts

## Performance Impact

- **Token Generation**: ~1ms per request (negligible)
- **Token Validation**: <1ms using constant-time comparison
- **Client Auto-Refresh**: Single request every 23 hours
- **No Database Queries**: Stateless validation using cookies

## Troubleshooting

### 403 Forbidden on POST/PUT/DELETE

**Cause**: Missing or invalid CSRF token

**Solution**:
```typescript
// Check if token is available
const { token, loading, error } = useCsrf();
console.log('Token:', token, 'Loading:', loading, 'Error:', error);

// Ensure CsrfProvider wraps your component
// Check components/shared/client-providers.tsx
```

### Token Not Refreshing

**Cause**: Component unmounts before 23-hour interval

**Solution**: Token refresh happens in CsrfProvider (always mounted)

### CORS Issues

**Cause**: Cross-origin requests don't include cookies

**Solution**: Ensure `credentials: 'include'` in fetch options (automatically set by apiFetch)

## Migration Checklist

If updating existing API calls to use CSRF:

- [ ] Replace `fetch()` calls with `apiFetch()`
- [ ] Add `csrfToken` parameter from `useCsrf()` hook
- [ ] Update backend routes with `withCsrfProtection()`
- [ ] Test all CRUD operations
- [ ] Verify 403 on missing token
- [ ] Check token auto-refresh works

## Related Files

### Frontend
- `lib/contexts/csrf-context.tsx` - Context provider
- `lib/hooks/use-csrf-token.tsx` - Token management hook
- `lib/utils/api-client.ts` - Secure API client
- `lib/contexts/app-context.tsx` - Example usage
- `components/shared/client-providers.tsx` - Provider hierarchy

### Backend
- `lib/middleware/csrf.ts` - CSRF middleware
- `app/api/csrf-token/route.ts` - Token distribution endpoint
- `middleware.ts` - Global security headers

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Double Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#security)
