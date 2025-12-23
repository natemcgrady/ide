import { NextRequest, NextResponse } from 'next/server';
import { executeCode, isValidLanguage } from '@/lib/executor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ExecuteRequest {
  code: string;
  language: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExecuteRequest = await request.json();
    const { code, language } = body;

    // Validate input
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Code is required and must be a string' },
        { status: 400 }
      );
    }

    if (!language || !isValidLanguage(language)) {
      return NextResponse.json(
        { error: 'Invalid language. Supported: javascript, typescript, python, go' },
        { status: 400 }
      );
    }

    // Execute the code
    const result = await executeCode(code, language);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Execution error:', error);
    return NextResponse.json(
      { 
        output: '',
        error: 'Internal server error',
        exitCode: 1,
        executionTime: 0
      },
      { status: 500 }
    );
  }
}

