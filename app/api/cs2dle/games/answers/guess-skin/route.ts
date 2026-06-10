import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface GuessSkinAnswer {
  _id: string;
  userId: string | { $oid: string };
  answers: {
    date: string;
    skinId: string;
  }[];
}

interface UserSummary {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  answerCount: number;
  lastAnswerDate: string;
}

// GET /api/cs2dle/games/answers/guess-skin - Get list of users with answer counts
// GET /api/cs2dle/games/answers/guess-skin?userId=xxx - Get specific user's answers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const specificUserId = searchParams.get('userId');

    const client = await clientPromise;
    const db = client.db();

    // Fetch all GuessSkinAnswer documents
    const guessSkinAnswers = await db.collection('GuessSkinAnswer')
      .find({})
      .toArray() as unknown as GuessSkinAnswer[];

    // Filter for only logged-in users (where userId is ObjectId)
    const loggedInUserAnswers = guessSkinAnswers.filter(answer => {
      if (typeof answer.userId === 'string') {
        return !answer.userId.startsWith('guest-');
      }
      return true;
    });

    // If specific user is requested, return that user's answers with details
    if (specificUserId) {
      const userAnswer = loggedInUserAnswers.find(answer => {
        const userId = answer.userId instanceof ObjectId 
          ? answer.userId.toString()
          : (typeof answer.userId === 'string' ? answer.userId : answer.userId.$oid);
        return userId === specificUserId;
      });

      if (!userAnswer) {
        return NextResponse.json({ answers: [] });
      }

      // Fetch user details
      const user = await db.collection('users')
        .findOne({ _id: new ObjectId(specificUserId) });

      // Get all skin IDs for this user
      const skinIds = userAnswer.answers.map(a => a.skinId);

      // Fetch skin details
      const skins = await db.collection('csgoskins')
        .find({ id: { $in: skinIds } })
        .toArray();

      // Create skin map
      const skinMap = new Map(
        skins.map(skin => [
          skin.id,
          {
            name: skin.name,
            image: skin.image,
            weapon: skin.weapon?.name || skin.weapon,
            rarity: {
              name: skin.rarity?.name || 'Unknown',
              color: skin.rarity?.color || '#000000'
            }
          }
        ])
      );

      // Build detailed answers
      const detailedAnswers = userAnswer.answers.map(answer => {
        const skin = skinMap.get(answer.skinId);
        return {
          date: answer.date,
          skinId: answer.skinId,
          skinName: skin?.name,
          skinImage: skin?.image,
          weapon: skin?.weapon,
          rarity: skin?.rarity
        };
      });

      // Sort by date (most recent first)
      detailedAnswers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return NextResponse.json({ 
        user: {
          userId: specificUserId,
          userName: user?.name || null,
          userEmail: user?.email || null,
          userImage: user?.image || null
        },
        answers: detailedAnswers 
      });
    }

    // Otherwise, return summary of all users
    const userIds: ObjectId[] = [];
    const userAnswerMap = new Map<string, { count: number; lastDate: string }>();

    loggedInUserAnswers.forEach(userAnswer => {
      // Handle both ObjectId and string userId types
      let userIdObj: ObjectId;
      let userIdStr: string;
      
      if (userAnswer.userId instanceof ObjectId) {
        userIdObj = userAnswer.userId;
        userIdStr = userAnswer.userId.toString();
      } else if (typeof userAnswer.userId === 'string') {
        userIdObj = new ObjectId(userAnswer.userId);
        userIdStr = userAnswer.userId;
      } else {
        // Handle {$oid: "..."} format
        userIdObj = new ObjectId(userAnswer.userId.$oid);
        userIdStr = userAnswer.userId.$oid;
      }
      
      userIds.push(userIdObj);
      
      // Get the most recent answer date
      const dates = userAnswer.answers.map(a => a.date).sort().reverse();
      const lastDate = dates[0] || '';
      
      userAnswerMap.set(userIdStr, {
        count: userAnswer.answers.length,
        lastDate
      });
    });
    
    // Fetch user details
    const users = await db.collection('users')
      .find({ _id: { $in: userIds } })
      .toArray();

    // Build user summary
    const userSummaries: UserSummary[] = users.map(user => {
      const userId = user._id.toString();
      const answerData = userAnswerMap.get(userId);
      
      return {
        userId,
        userName: user.name || null,
        userEmail: user.email || null,
        userImage: user.image || null,
        answerCount: answerData?.count || 0,
        lastAnswerDate: answerData?.lastDate || ''
      };
    });

    // Sort by answer count (descending)
    userSummaries.sort((a, b) => b.answerCount - a.answerCount);

    return NextResponse.json({ users: userSummaries });

  } catch (error) {
    console.error('Error fetching guess skin answers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

