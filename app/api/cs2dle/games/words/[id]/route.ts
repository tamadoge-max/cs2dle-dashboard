import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface WordleWord {
  word: string;
  isCS2Related?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
}

// PUT - Update a Wordle word (mainly for CS2 relevance)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { isCS2Related } = await request.json();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid word ID' },
        { status: 400 }
      );
    }

    if (typeof isCS2Related !== 'boolean') {
      return NextResponse.json(
        { error: 'isCS2Related must be a boolean' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    
    // Check if word exists
    const existingWord = await db.collection('wordleWords').findOne({
      _id: new ObjectId(id)
    });

    if (!existingWord) {
      return NextResponse.json(
        { error: 'Word not found' },
        { status: 404 }
      );
    }

    // Update the word
    const result = await db.collection('wordleWords').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isCS2Related,
          updatedAt: new Date(),
          lastModifiedBy: session.user?.email || 'unknown'
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Word not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Word updated successfully',
      word: {
        _id: id,
        word: existingWord.word,
        isCS2Related,
        createdAt: existingWord.createdAt,
        updatedAt: new Date(),
        createdBy: existingWord.createdBy
      }
    });

  } catch (error) {
    console.error('Error updating Wordle word:', error);
    return NextResponse.json(
      { error: 'Failed to update word' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a Wordle word
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid word ID' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    
    // Check if word exists
    const existingWord = await db.collection('wordleWords').findOne({
      _id: new ObjectId(id)
    });

    if (!existingWord) {
      return NextResponse.json(
        { error: 'Word not found' },
        { status: 404 }
      );
    }

    // Check if word is being used in any active answers
    const activeAnswers = await db.collection('gameAnswers').findOne({
      'answers.Wordle.word': existingWord.word,
      status: 'active'
    });

    if (activeAnswers) {
      return NextResponse.json(
        { error: 'Cannot delete word that is being used in an active game answer' },
        { status: 409 }
      );
    }

    // Delete the word
    await db.collection('wordleWords').deleteOne({
      _id: new ObjectId(id)
    });

    return NextResponse.json({
      message: 'Word deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting Wordle word:', error);
    return NextResponse.json(
      { error: 'Failed to delete word' },
      { status: 500 }
    );
  }
}
