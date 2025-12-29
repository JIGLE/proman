import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    version: process.env.BUILD_VERSION || 'dev',
    gitCommit: process.env.GIT_COMMIT || 'unknown',
    buildTime: process.env.BUILD_TIME || new Date().toISOString(),
  });
}