import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { DailyEmojiPuzzle, EmojiPuzzleAnswer } from '@/types/cs2dle/games/emoji-puzzle';

const MAX_GAMES_PER_DAY = 10;

// GET - Retrieve daily emoji puzzle games for a specific date
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection<DailyEmojiPuzzle>('EmojiPuzzlesAnswer');

    const dailyGame = await collection.findOne({ date });

    if (!dailyGame) {
      return NextResponse.json({ 
        date,
        status: 'inactive',
        answers: [],
        gameCount: 0,
        maxGames: MAX_GAMES_PER_DAY
      });
    }

    return NextResponse.json({
      ...dailyGame,
      gameCount: dailyGame.answers.length,
      maxGames: MAX_GAMES_PER_DAY
    });

  } catch (error) {
    console.error('Error fetching daily emoji puzzle:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a new skin to the daily emoji puzzle games
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, answer } = body;

    if (!date || !answer) {
      return NextResponse.json({ 
        error: 'Date and answer are required' 
      }, { status: 400 });
    }

    // Validate answer structure
    if (!answer.skinId || !answer.emojis || !answer.hints || !answer.skin) {
      return NextResponse.json({ 
        error: 'Invalid answer structure. Required: skinId, emojis, hints, skin' 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection<DailyEmojiPuzzle>('EmojiPuzzlesAnswer');

    // Check if daily game already exists
    const existingGame = await collection.findOne({ date });

    if (existingGame) {
      // Check if we've reached the maximum number of games per day
      if (existingGame.answers.length >= MAX_GAMES_PER_DAY) {
        return NextResponse.json({ 
          error: `Maximum ${MAX_GAMES_PER_DAY} games per day reached` 
        }, { status: 400 });
      }

      // Check if skin already exists in today's games
      const skinExists = existingGame.answers.some(
        existingAnswer => existingAnswer.skinId === answer.skinId
      );

      if (skinExists) {
        return NextResponse.json({ 
          error: 'This skin is already added to today\'s games' 
        }, { status: 400 });
      }

      // Add new answer to existing daily game
      const updatedGame = await collection.findOneAndUpdate(
        { date },
        {
          $push: { answers: answer },
          $set: { 
            lastModifiedBy: session.user.email,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      return NextResponse.json({
        success: true,
        message: 'Skin added successfully',
        game: updatedGame,
        gameCount: updatedGame?.answers.length || 0,
        maxGames: MAX_GAMES_PER_DAY
      });

    } else {
      // Create new daily game with first answer
      const newDailyGame: DailyEmojiPuzzle = {
        date,
        status: 'active',
        answers: [answer],
        createdBy: session.user.email,
        lastModifiedBy: session.user.email,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await collection.insertOne(newDailyGame);

      return NextResponse.json({
        success: true,
        message: 'Daily game created with first skin',
        game: { ...newDailyGame, _id: result.insertedId },
        gameCount: 1,
        maxGames: MAX_GAMES_PER_DAY
      });
    }

  } catch (error) {
    console.error('Error adding skin to daily emoji puzzle:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update the status of daily emoji puzzle games
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, status } = body;

    if (!date || !status) {
      return NextResponse.json({ 
        error: 'Date and status are required' 
      }, { status: 400 });
    }

    if (!['active', 'inactive', 'completed'].includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status. Must be: active, inactive, or completed' 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection<DailyEmojiPuzzle>('EmojiPuzzlesAnswer');

    const updatedGame = await collection.findOneAndUpdate(
      { date },
      {
        $set: { 
          status,
          lastModifiedBy: session.user.email,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!updatedGame) {
      return NextResponse.json({ 
        error: 'Daily game not found for the specified date' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Daily game status updated successfully',
      game: updatedGame
    });

  } catch (error) {
    console.error('Error updating daily emoji puzzle status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a specific skin from daily emoji puzzle games
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const skinId = searchParams.get('skinId');

    if (!date || !skinId) {
      return NextResponse.json({ 
        error: 'Date and skinId parameters are required' 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection<DailyEmojiPuzzle>('EmojiPuzzlesAnswer');

    const updatedGame = await collection.findOneAndUpdate(
      { date },
      {
        $pull: { answers: { skinId } },
        $set: { 
          lastModifiedBy: session.user.email,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!updatedGame) {
      return NextResponse.json({ 
        error: 'Daily game not found for the specified date' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Skin removed successfully',
      game: updatedGame,
      gameCount: updatedGame.answers.length,
      maxGames: MAX_GAMES_PER_DAY
    });

  } catch (error) {
    console.error('Error removing skin from daily emoji puzzle:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
