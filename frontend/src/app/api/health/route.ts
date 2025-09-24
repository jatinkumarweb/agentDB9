import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      status: 'ok',
      service: 'AgentDB9 Frontend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      build: {
        nextjs: process.env.npm_package_dependencies_next || 'unknown',
        react: process.env.npm_package_dependencies_react || 'unknown'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        service: 'AgentDB9 Frontend',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}