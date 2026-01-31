/**
 * SAF-T PT Download API
 * GET /api/tax/saft-pt/download - Download SAF-T PT XML file directly
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { generateSAFTPT, validateSAFTData, validateNIF } from '@/lib/tax/saft-pt';

export async function GET(request: NextRequest): Promise<Response | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const fiscalYear = parseInt(searchParams.get('fiscalYear') || new Date().getFullYear().toString());
    const startMonth = parseInt(searchParams.get('startMonth') || '1');
    const endMonth = parseInt(searchParams.get('endMonth') || '12');
    const nif = searchParams.get('nif');
    const name = searchParams.get('name');
    const addressDetail = searchParams.get('addressDetail');
    const city = searchParams.get('city');
    const postalCode = searchParams.get('postalCode');
    
    // Validate required fields
    if (!nif || !name || !addressDetail || !city || !postalCode) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required fields: nif, name, addressDetail, city, postalCode' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate NIF
    if (!validateNIF(nif)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid Portuguese NIF' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate postal code format
    if (!/^\d{4}-\d{3}$/.test(postalCode)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid postal code format. Expected: XXXX-XXX' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const options = {
      fiscalYear,
      startMonth,
      endMonth,
      companyInfo: {
        nif,
        name,
        address: {
          addressDetail,
          city,
          postalCode,
          country: 'PT' as const,
        },
      },
    };
    
    // Additional validation
    const validation = validateSAFTData(options);
    
    if (!validation.valid) {
      return new NextResponse(
        JSON.stringify({ error: validation.errors.join('; ') }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate SAF-T XML
    const xml = await generateSAFTPT(userId, options);
    
    // Generate filename
    const filename = `SAF-T_${nif}_${fiscalYear}_${startMonth.toString().padStart(2, '0')}-${endMonth.toString().padStart(2, '0')}.xml`;
    
    // Return as downloadable XML file
    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('SAF-T download error:', error);
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate SAF-T export' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
