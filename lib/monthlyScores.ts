import { Db, ObjectId } from "mongodb";
import { getCurrentAmsterdamTimeISO } from "./time";

interface MonthlyScoresSummary {
  _id?: ObjectId;
  userId: ObjectId;
  month: string;          // Format: "YYYY-MM" (e.g., "2024-01")
  totalScoresEarned: number;
  scoresByGameType: {
    EmojiPuzzle: number;
    GuessSkin: number;
    GuessPrice: number;
    HigherLower: number;
    Wordle: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get the current month in YYYY-MM format based on Amsterdam timezone
 */
export function getCurrentMonth(): string {
  const now = getCurrentAmsterdamTimeISO();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Check if a given date falls within the current month
 */
export function isWithinCurrentMonth(date: string): boolean {
  const currentMonth = getCurrentMonth();
  const dateMonth = date.substring(0, 7); // Extract YYYY-MM from date
  return dateMonth === currentMonth;
}

/**
 * Add a score to the monthly scores collection
 */
export async function addMonthlyScore(
  db: Db,
  userId: ObjectId,
  gameType: string,
  scoresEarned: number = 0
): Promise<void> {
  if (scoresEarned <= 0) {
    return; // Don't track zero or negative scores
  }

  const currentMonth = getCurrentMonth();
  const now = getCurrentAmsterdamTimeISO();
  
  // Update or create monthly summary
  await db.collection<MonthlyScoresSummary>("monthlyScores").updateOne(
    {
      userId,
      month: currentMonth,
    },
    {
      $inc: {
        totalScoresEarned: scoresEarned,
      },
      $setOnInsert: {
        userId,
        month: currentMonth,
        scoresByGameType: {
          EmojiPuzzle: 0,
          GuessSkin: 0,
          GuessPrice: 0,
          HigherLower: 0,
          Wordle: 0,
        },
        createdAt: now,
      },
      $set: {
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  // Increment the specific game type scores after ensuring the document exists
  await db.collection<MonthlyScoresSummary>("monthlyScores").updateOne(
    {
      userId,
      month: currentMonth,
    },
    {
      $inc: {
        [`scoresByGameType.${gameType}`]: scoresEarned,
      },
    }
  );
}

/**
 * Get user's monthly score summary for the current month
 */
export async function getMonthlyScoreSummary(
  db: Db,
  userId: ObjectId
): Promise<MonthlyScoresSummary | null> {
  const currentMonth = getCurrentMonth();
  
  return await db.collection<MonthlyScoresSummary>("monthlyScores").findOne({
    userId,
    month: currentMonth,
  });
}

/**
 * Get user's total scores earned for the current month
 */
export async function getCurrentMonthScores(
  db: Db,
  userId: ObjectId
): Promise<number> {
  const summary = await getMonthlyScoreSummary(db, userId);
  return summary?.totalScoresEarned || 0;
}

/**
 * Get all users' monthly score summaries for a specific month
 */
export async function getMonthlyScoreLeaderboard(
  db: Db,
  month: string,
  limit: number = 100
): Promise<MonthlyScoresSummary[]> {
  return await db.collection<MonthlyScoresSummary>("monthlyScores")
    .find({
      month,
    })
    .sort({ totalScoresEarned: -1 })
    .limit(limit)
    .toArray();
}
