/**
 * Central Mongoose model registry.
 *
 * Importing this module guarantees that every Mongoose model used in the
 * project is registered with the connection BEFORE any query runs. This
 * eliminates `MissingSchemaError` on Vercel cold starts when one route
 * imports model A but the route's `.populate()` call needs model B's
 * schema.
 *
 * Every API route handler and every server-side service that issues a
 * Mongoose query MUST `import "@/lib/models"` at the top of the file —
 * before any model is used.
 *
 * The actual model files live under `@/lib/db/models/*` and use the
 * `mongoose.models.X || mongoose.model('X', schema)` idiom so re-imports
 * during dev hot-reload don't throw OverwriteModelError.
 */

// Import each model module for its side effects (schema registration).
// Order doesn't matter — Mongoose registers each on first import.

import '@/lib/db/models/user';
import '@/lib/db/models/menuCategory';
import '@/lib/db/models/menuItem';
import '@/lib/db/models/order';
import '@/lib/db/models/question';
import '@/lib/db/models/challenge';
import '@/lib/db/models/challengeConfig';
import '@/lib/db/models/mission';      // exports Mission + UserMission
import '@/lib/db/models/reward';
import '@/lib/db/models/userReward';
import '@/lib/db/models/spinWheel';    // exports SpinWheelConfig + SpinLog
import '@/lib/db/models/referral';
import '@/lib/db/models/otpCode';

// Re-export the concrete models so callers can do
//   import { User, MenuItem } from '@/lib/models';
// instead of reaching into @/lib/db/models/* directly.
export { User } from '@/lib/db/models/user';
export { MenuCategory } from '@/lib/db/models/menuCategory';
export { MenuItem } from '@/lib/db/models/menuItem';
export { Order } from '@/lib/db/models/order';
export { Question } from '@/lib/db/models/question';
export { Challenge } from '@/lib/db/models/challenge';
export { ChallengeConfig, getConfig } from '@/lib/db/models/challengeConfig';
export { Mission, UserMission } from '@/lib/db/models/mission';
export { Reward } from '@/lib/db/models/reward';
export { UserReward } from '@/lib/db/models/userReward';
export { SpinWheelConfig, SpinLog } from '@/lib/db/models/spinWheel';
export { Referral } from '@/lib/db/models/referral';
export { OtpCode } from '@/lib/db/models/otpCode';
