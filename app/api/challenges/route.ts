import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok, created } from '@/lib/server/response';
import { handleError, operationalError } from '@/lib/server/error';
import { requireAuth, requireRole } from '@/lib/server/permissions';
import { Challenge } from '@/lib/db/models/challenge';
import { Question } from '@/lib/db/models/question';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface IncomingQuestion {
  text:         string;
  options:      string[];
  correctIndex: number;
  difficulty?:  'easy' | 'medium' | 'hard';
  explanation?: string;
}

function validateQuestions(qs: unknown): IncomingQuestion[] {
  if (!Array.isArray(qs) || qs.length === 0) {
    throw operationalError('At least one question is required', 400);
  }
  return qs.map((q, i) => {
    if (!q || typeof q !== 'object') throw operationalError(`Question ${i + 1} is invalid`, 400);
    const text = String((q as any).text ?? '').trim();
    const options = Array.isArray((q as any).options) ? (q as any).options.map((o: any) => String(o ?? '').trim()) : [];
    const correctIndex = Number((q as any).correctIndex);
    if (!text) throw operationalError(`Question ${i + 1} text is required`, 400);
    if (options.length < 2 || options.length > 6 || options.some((o: string) => !o)) {
      throw operationalError(`Question ${i + 1} needs 2–6 non-empty options`, 400);
    }
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      throw operationalError(`Question ${i + 1} correctIndex out of range`, 400);
    }
    return {
      text, options, correctIndex,
      difficulty:  (q as any).difficulty,
      explanation: (q as any).explanation,
    };
  });
}

/** GET — admin list of all challenges, newest first, with populated questions. */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    // Only return admin-curated templates (date: null). Per-day customer instances
    // (date: 'YYYY-MM-DD') are not surfaced in the admin list — they're auto-cloned
    // from the active template each day and would just be noise here.
    const items = await Challenge.find({ date: null })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('questions')
      .lean();
    return ok(items);
  } catch (e) {
    return handleError(e);
  }
}

/** POST — create a new challenge. Embedded questions become standalone Question docs linked by _id. */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const body = await req.json();
    const category   = String(body?.category   ?? 'general');
    const type       = String(body?.type       ?? 'daily');
    const timeLimit  = Number(body?.timeLimit  ?? 30);
    const incoming   = validateQuestions(body?.questions);
    const reward = {
      xp:          Number(body?.reward?.xp          ?? 100),
      points:      Number(body?.reward?.points      ?? 50),
      discountPct: Number(body?.reward?.discountPct ?? 10),
      freeItem:    null as null,
    };
    // First challenge for a (type, category) defaults to active so the admin doesn't
    // have to manually flip the toggle for the only choice.
    const explicit = typeof body?.isActive === 'boolean' ? body.isActive : null;
    const existingActive = await Challenge.exists({ type, category, isActive: true });
    const isActive = explicit ?? !existingActive;

    const created$ = await Question.insertMany(
      incoming.map((q) => ({
        ...q,
        category,
        createdBy: user._id,
        isActive:  true,
      })),
    );

    // Mutual exclusivity: only one active challenge per (type, category).
    if (isActive) {
      await Challenge.updateMany({ type, category, isActive: true }, { $set: { isActive: false } });
    }

    const challenge = await Challenge.create({
      type,
      category,
      timeLimit,
      reward,
      isActive,
      questions: created$.map((q) => q._id),
    });

    const populated = await Challenge.findById(challenge._id).populate('questions').lean();
    return created(populated);
  } catch (e) {
    return handleError(e);
  }
}
