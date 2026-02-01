import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    version: process.env.BUILD_VERSION || 'dev',
    gitCommit: process.env.GIT_COMMIT || 'unknown',
    buildTime: process.env.BUILD_TIME || new Date().toISOString(),
  });
}
