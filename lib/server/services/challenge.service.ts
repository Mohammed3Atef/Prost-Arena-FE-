import '@/lib/models';
import type { Types } from 'mongoose';
import { Challenge, type IChallenge } from '@/lib/db/models/challenge';
import { Question } from '@/lib/db/models/question';
import { User } from '@/lib/db/models/user';
import { getConfig } from '@/lib/db/models/challengeConfig';
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

  let challenge: any = await Challenge.findOne({ type: 'daily', date: today, category })
    .populate('questions').lean();

  if (challenge) {
    challenge.questions = (challenge.questions || []).filter(Boolean);
  }

  if (challenge && challenge.questions.length === 0) {
    await Challenge.findByIdAndDelete(challenge._id);
    challenge = null;
  }

  if (!challenge) {
    const questions: any[] = await Question.aggregate([
      { $match: { ...ADMIN_QUESTIONS_FILTER, category } },
      { $sample: { size: 10 } },
      { $project: { text: 1, options: 1, difficulty: 1, explanation: 1, correctIndex: 1 } },
    ]);

    if (questions.length < 5) {
      const existingIds = questions.map((q) => q._id);
      const extra: any[] = await Question.aggregate([
        { $match: { ...ADMIN_QUESTIONS_FILTER, category: 'general', _id: { $nin: existingIds } } },
        { $sample: { size: 10 - questions.length } },
        { $project: { text: 1, options: 1, difficulty: 1, explanation: 1, correctIndex: 1 } },
      ]);
      questions.push(...extra);
    }

    if (questions.length === 0) {
      throw operationalError('No questions available yet. Add questions from the admin dashboard first.', 404);
    }

    const doc = await Challenge.create({
      type: 'daily',
      category,
      date: today,
      questions: questions.map((q) => q._id),
      status: 'active',
      expiresAt: new Date(new Date().setHours(23, 59, 59, 999)),
      reward: { xp: 100, points: 50, discountPct: 10 },
    });

    challenge = await Challenge.findById(doc._id).populate('questions').lean();
  }

  return challenge;
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

  return { score, total, allCorrect, xpAwarded, pointsAwarded, discountPct, answers: gradedAnswers };
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
