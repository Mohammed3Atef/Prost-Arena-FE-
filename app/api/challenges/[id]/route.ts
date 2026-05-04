import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError, operationalError } from '@/lib/server/error';
import { requireAuth, requireRole } from '@/lib/server/permissions';
import { Challenge, type IChallenge } from '@/lib/db/models/challenge';
import { Question } from '@/lib/db/models/question';

type IChallengeType = IChallenge['type'];
type IChallengeCategory = IChallenge['category'];

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

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

/** GET — single challenge with populated questions. */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;
    const { id } = await params;
    const item = await Challenge.findById(id).populate('questions').lean();
    if (!item) throw operationalError('Challenge not found', 404);
    return ok(item);
  } catch (e) {
    return handleError(e);
  }
}

/** PUT — replace category/type/timeLimit and the question set. */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const { id } = await params;
    const body = await req.json();

    const challenge = await Challenge.findById(id);
    if (!challenge) throw operationalError('Challenge not found', 404);

    if (typeof body?.category  === 'string') challenge.category  = body.category as IChallengeCategory;
    if (typeof body?.type      === 'string') challenge.type      = body.type as IChallengeType;
    if (typeof body?.timeLimit === 'number') challenge.timeLimit = body.timeLimit;

    if (body?.reward && typeof body.reward === 'object') {
      if (typeof body.reward.xp          === 'number') challenge.reward.xp          = body.reward.xp;
      if (typeof body.reward.points      === 'number') challenge.reward.points      = body.reward.points;
      if (typeof body.reward.discountPct === 'number') challenge.reward.discountPct = body.reward.discountPct;
    }

    if (typeof body?.isActive === 'boolean') {
      if (body.isActive) {
        // Deactivate sibling challenges in the same (type, category) so only one is live.
        await Challenge.updateMany(
          { _id: { $ne: challenge._id }, type: challenge.type, category: challenge.category, isActive: true },
          { $set: { isActive: false } },
        );
      }
      challenge.isActive = body.isActive;
    }

    if (Array.isArray(body?.questions)) {
      const category = challenge.category;
      const incoming = validateQuestions(body.questions);

      // Delete previous standalone Question docs that were linked to this challenge.
      // Only safe because we created them as part of this admin flow; if you ever
      // start sharing questions across challenges, remove this delete and just
      // detach instead.
      if (challenge.questions.length > 0) {
        await Question.deleteMany({ _id: { $in: challenge.questions } });
      }

      const created$ = await Question.insertMany(
        incoming.map((q) => ({
          ...q,
          category,
          createdBy: user._id,
          isActive:  true,
        })),
      );
      challenge.questions = created$.map((q) => q._id) as never;
    }

    await challenge.save();
    const populated = await Challenge.findById(challenge._id).populate('questions').lean();
    return ok(populated, 'Challenge updated');
  } catch (e) {
    return handleError(e);
  }
}

/** DELETE — remove the challenge and its standalone questions. */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const { id } = await params;
    const challenge = await Challenge.findById(id);
    if (!challenge) throw operationalError('Challenge not found', 404);
    if (challenge.questions.length > 0) {
      await Question.deleteMany({ _id: { $in: challenge.questions } });
    }
    await challenge.deleteOne();
    return ok({ removed: id }, 'Challenge deleted');
  } catch (e) {
    return handleError(e);
  }
}
