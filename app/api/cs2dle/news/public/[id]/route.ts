import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET single published news by ID (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Try to find by _id first
    let news = await db.collection('news').findOne({ 
      _id: new ObjectId(params.id),
      published: true 
    });

    // If not found, try to find by old numeric id (for backward compatibility)
    if (!news) {
      news = await db.collection('news').findOne({ 
        id: params.id,
        published: true 
      });
    }

    if (!news) {
      return NextResponse.json(
        { success: false, message: 'News not found' },
        { status: 404 }
      );
    }

    // Get related news if specified
    let relatedNews = [];
    if (news.relatedNews && news.relatedNews.length > 0) {
      relatedNews = await db.collection('news')
        .find({
          _id: { $in: news.relatedNews.map((id: string) => new ObjectId(id)) },
          published: true
        })
        .limit(3)
        .toArray();
    } else {
      // Get other recent news as related
      relatedNews = await db.collection('news')
        .find({
          _id: { $ne: news._id },
          published: true
        })
        .sort({ date: -1 })
        .limit(3)
        .toArray();
    }

    return NextResponse.json({ 
      success: true, 
      data: news,
      relatedNews 
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}

