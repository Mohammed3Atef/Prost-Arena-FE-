import '@/lib/models';
import type { Types } from 'mongoose';
import { Challenge, type IChallenge } from '@/lib/db/models/challenge';
import { Question } from '@/lib/db/models/question';
import { User } from '@/lib/db/models/user';
import { getConfig } from '@/lib/db/models/challengeConfig';
import { getSiteSettings } from '@/lib/db/models/siteSettings';
import { Reward } from '@/lib/db/models/reward';
import { UserReward } from '@/lib/db/models/userReward';
import { progressMissions } from '@/lib/server/services/order.service';
import { operationalError } from '@/lib/server/error';

const ADMIN_QUESTIONS_FILTER = { isActive: true, createdBy: { $ne: null } };

type Category = IChallenge['category'];

export async function getDailyChallenge(
  category: Category = 'general',
  userId: string | Types.ObjectId | null = null,
) {
  const cfg = await getConfig();

  if (!cfg.isEnabled) throw operationalError('Challenges are currently disabled.', 503);

  if (!cfg.enabledCategories.includes(category)) {
    throw operationalError(`The "${category}" category is not available right now.`, 404);
  }

  const today = new Date().toISOString().slice(0, 10);

  if (userId && cfg.maxAttemptsPerDay > 0) {
    const attemptsToday = await Challenge.countDocuments({
      type: 'daily',
      date: today,
      'participants.user': userId,
    });
    if (attemptsToday >= cfg.maxAttemptsPerDay) {
      throw operationalError(
        `You've reached today's limit of ${cfg.maxAttemptsPerDay} challenge${cfg.maxAttemptsPerDay !== 1 ? 's' : ''}. Come back tomorrow!`,
        429,
      );
    }
  }

  // 1. Find the admin-curated active template for this (type, category). This is
  //    the source of truth — if no active template exists, the customer gets nothing.
  //    Per-day instances must come from the *current* active template, otherwise they
  //    are stale (admin disabled, swapped, or replaced the template) and ignored.
  const template: any = await Challenge.findOne({
    type: 'daily',
    category,
    isActive: true,
    date: null,
  }).populate('questions').lean();

  if (!template) {
    throw operationalError(
      `No "${category}" challenge is available right now. Pick a different category or ask the admin to enable one.`,
      404,
    );
  }

  const templateQuestionIds = (template.questions || [])
    .filter(Boolean)
    .map((q: any) => q._id);

  if (templateQuestionIds.length === 0) {
    throw operationalError(
      `The "${category}" challenge has no questions yet. Ask the admin to add some.`,
      404,
    );
  }

  // 2. Today's instance — only honor it if it was cloned from the *current* active
  //    template. This invalidates stale instances from a previously-active template.
  let challenge: any = await Challenge.findOne({
    type: 'daily',
    date: today,
    category,
    templateId: template._id,
  }).populate('questions').lean();

  if (challenge) {
    challenge.questions = (challenge.questions || []).filter(Boolean);
    if (challenge.questions.length > 0) return challenge;
    // Empty after populate (questions deleted) — purge and rebuild from template.
    await Challenge.findByIdAndDelete(challenge._id);
  }

  // 3. No fresh per-day instance — clone from the active template.
  const settings = await getSiteSettings();
  const reward = template.reward?.xp != null
    ? {
        xp:          template.reward.xp,
        points:      template.reward.points      ?? 0,
        discountPct: template.reward.discountPct ?? 0,
      }
    : {
        xp:          settings.dailyChallengeReward?.xp          ?? 100,
        points:      settings.dailyChallengeReward?.points      ?? 50,
        discountPct: settings.dailyChallengeReward?.discountPct ?? 10,
      };

  const doc = await Challenge.create({
    type: 'daily',
    category,
    date: today,
    questions: templateQuestionIds,
    status: 'active',
    expiresAt: new Date(new Date().setHours(23, 59, 59, 999)),
    timeLimit: template.timeLimit ?? 30,
    reward,
    templateId: template._id,
  });

  return await Challenge.findById(doc._id).populate('questions').lean();
}

export async function submitDailyAnswers(
  challengeId: string,
  userId: string | Types.ObjectId,
  answers: Array<{ answeredIndex: number }>,
) {
  const raw: any = await Challenge.findById(challengeId).populate('questions').lean();
  if (!raw) throw operationalError('Challenge not found', 404);
  if (raw.type !== 'daily') throw operationalError('Not a daily challenge', 400);

  const challenge = { ...raw, questions: (raw.questions || []).filter(Boolean) };

  const alreadyDone = challenge.participants?.some((p: any) => p.user.toString() === userId.toString());
  if (alreadyDone) throw operationalError('Already submitted', 409);

  if (challenge.questions.length === 0) {
    throw operationalError('This challenge has no valid questions', 400);
  }

  let score = 0;
  const gradedAnswers = challenge.questions.map((q: any, i: number) => {
    const answer = answers[i];
    const isCorrect = answer?.answeredIndex === q.correctIndex;
    if (isCorrect) score++;
    return {
      questionId: String(q._id),
      answeredIndex: answer?.answeredIndex ?? -1,
      isCorrect,
      answeredAt: new Date(),
    };
  });

  const total = challenge.questions.length;
  const allCorrect = total > 0 && score === total;

  let xpAwarded = 0;
  let pointsAwarded = 0;
  let discountPct = 0;
  let discountCoupon: string | null = null;
  let userRewardId: string | null = null;

  if (allCorrect) {
    xpAwarded = challenge.reward.xp;
    pointsAwarded = challenge.reward.points;
    discountPct = challenge.reward.discountPct;

    const user = await User.findById(userId);
    if (user) {
      user.addXp(xpAwarded);
      user.points += pointsAwarded;
      await user.save();
    }

    // Create a real UserReward so the discount actually appears in /rewards
    // and can be applied to the cart by clicking, not just by typing a code.
    if (discountPct > 0) {
      const code = `WIN${challenge.category.slice(0, 3).toUpperCase()}${discountPct}`;
      const rewardName = `${discountPct}% off — ${challenge.category} challenge win`;
      let reward: any = await Reward.findOne({ code });
      if (!reward) {
        reward = await Reward.create({
          name: rewardName,
          description: `Earned by acing the ${challenge.category} daily challenge.`,
          type: 'discount_pct',
          discountPct,
          code,
          isActive: true,
          source: 'challenge_win',
        });
      }
      const ur = await UserReward.create({
        user: userId,
        reward: reward._id,
        source: 'challenge_win',
        // 7-day window matching the spin-wheel pattern.
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      discountCoupon = code;
      userRewardId = String(ur._id);
    }

    await progressMissions(userId, 'challenge_win', 1);
  } else {
    xpAwarded = score * 10;
    const user = await User.findById(userId);
    if (user) {
      user.addXp(xpAwarded);
      await user.save();
    }
  }

  await Challenge.findByIdAndUpdate(challengeId, {
    $push: {
      participants: {
        user: userId,
        score,
        answers: gradedAnswers,
        isReady: true,
        isFinished: true,
        finishedAt: new Date(),
      },
    },
  });

  console.log(`[challenge] daily ${challengeId} submitted by ${userId}: ${score}/${total}`);

  return {
    score, total, allCorrect,
    xpAwarded, pointsAwarded, discountPct,
    discountCoupon, userRewardId,
    answers: gradedAnswers,
  };
}

export async function createPvpChallenge(challengerId: string | Types.ObjectId, category: Category = 'general') {
  const questions: any[] = await Question.aggregate([
    { $match: { ...ADMIN_QUESTIONS_FILTER, category } },
    { $sample: { size: 5 } },
  ]);

  return await Challenge.create({
    type: 'pvp',
    category,
    questions: questions.map((q) => q._id),
    status: 'waiting',
    participants: [{ user: challengerId, isReady: false }],
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    reward: { xp: 150, points: 75, discountPct: 15 },
  });
}

export async function acceptPvpChallenge(challengeId: string, userId: string | Types.ObjectId) {
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) throw operationalError('Challenge not found', 404);
  if (challenge.status !== 'waiting') throw operationalError('Challenge not available', 400);
  if (challenge.participants.some((p) => p.user.toString() === userId.toString())) {
    throw operationalError('Already in this challenge', 409);
  }

  challenge.participants.push({
    user: userId as Types.ObjectId,
    isReady: false,
    isFinished: false,
    score: 0,
    answers: [],
    finishedAt: null,
  });
  challenge.status = 'active';
  challenge.startedAt = new Date();
  await challenge.save();

  return challenge;
}

/**
 * Synchronous PvP answer submission (replaces socket-based realtime).
 * Each call grades one answer and returns the running score plus the opponent's
 * current score (eventually consistent — read at request time, not pushed).
 */
export async function submitPvpAnswer(
  challengeId: string,
  userId: string | Types.ObjectId,
  questionIndex: number,
  answeredIndex: number,
) {
  const challenge: any = await Challenge.findById(challengeId).populate('questions');
  if (!challenge) throw operationalError('Challenge not found', 404);
  if (challenge.type !== 'pvp') throw operationalError('Not a PvP challenge', 400);
  if (challenge.status !== 'active') throw operationalError('Challenge not active', 400);

  const meIndex = challenge.participants.findIndex((p: any) => p.user.toString() === userId.toString());
  if (meIndex === -1) throw operationalError('You are not in this challenge', 403);

  const me = challenge.participants[meIndex];
  if (me.isFinished) throw operationalError('You have already finished', 409);

  const question = challenge.questions[questionIndex];
  if (!question) throw operationalError('Invalid question index', 400);

  const isCorrect = answeredIndex === question.correctIndex;
  if (isCorrect) me.score = (me.score || 0) + 1;

  me.answers = me.answers || [];
  me.answers.push({
    questionId: String(question._id),
    answeredIndex,
    isCorrect,
    answeredAt: new Date(),
  });

  const totalQuestions = challenge.questions.length;
  const isComplete = me.answers.length >= totalQuestions;
  if (isComplete) {
    me.isFinished = true;
    me.finishedAt = new Date();
  }

  // Determine winner if both finished
  const allFinished = challenge.participants.length > 1
    && challenge.participants.every((p: any) => p.isFinished);
  if (allFinished) {
    challenge.status = 'completed';
    challenge.completedAt = new Date();
    const ranked = [...challenge.participants].sort((a, b) => (b.score || 0) - (a.score || 0));
    if (ranked[0].score > (ranked[1]?.score ?? 0)) {
      challenge.winner = ranked[0].user;
      // Award XP to winner
      const winnerUser = await User.findById(ranked[0].user);
      if (winnerUser) {
        winnerUser.addXp(challenge.reward.xp);
        winnerUser.points += challenge.reward.points;
        winnerUser.challengeWins += 1;
        await winnerUser.save();
      }
      await progressMissions(ranked[0].user, 'challenge_win', 1);
    }
  }

  await challenge.save();

  const opponent = challenge.participants.find((_p: any, i: number) => i !== meIndex);
  return {
    correct: isCorrect,
    score: me.score,
    isComplete,
    opponentScore: opponent?.score ?? 0,
    opponentFinished: opponent?.isFinished ?? false,
    challengeStatus: challenge.status,
    winnerId: challenge.winner?.toString() ?? null,
  };
}
