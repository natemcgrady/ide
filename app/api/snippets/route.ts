import { NextRequest, NextResponse } from 'next/server';
import { db, codeSnippets } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// GET - List all snippets
export async function GET() {
  try {
    const snippets = await db
      .select()
      .from(codeSnippets)
      .orderBy(desc(codeSnippets.updatedAt));

    return NextResponse.json(snippets);
  } catch (error) {
    console.error('Failed to fetch snippets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snippets' },
      { status: 500 }
    );
  }
}

// POST - Create a new snippet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, language } = body;

    if (!name || !code || !language) {
      return NextResponse.json(
        { error: 'Name, code, and language are required' },
        { status: 400 }
      );
    }

    const now = new Date();
    const snippet = {
      id: randomUUID(),
      name,
      code,
      language,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(codeSnippets).values(snippet);

    return NextResponse.json(snippet, { status: 201 });
  } catch (error) {
    console.error('Failed to create snippet:', error);
    return NextResponse.json(
      { error: 'Failed to create snippet' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing snippet
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, code, language } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Snippet ID is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (code) updates.code = code;
    if (language) updates.language = language;

    await db
      .update(codeSnippets)
      .set(updates)
      .where(eq(codeSnippets.id, id));

    const updated = await db
      .select()
      .from(codeSnippets)
      .where(eq(codeSnippets.id, id))
      .limit(1);

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Snippet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Failed to update snippet:', error);
    return NextResponse.json(
      { error: 'Failed to update snippet' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a snippet
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Snippet ID is required' },
        { status: 400 }
      );
    }

    await db.delete(codeSnippets).where(eq(codeSnippets.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete snippet:', error);
    return NextResponse.json(
      { error: 'Failed to delete snippet' },
      { status: 500 }
    );
  }
}

