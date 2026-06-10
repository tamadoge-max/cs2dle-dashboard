import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { News } from '@/types/news';

interface NewsResponse {
  success: boolean;
  data?: News[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  message?: string;
}

// GET all published news (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const featured = searchParams.get('featured') === 'true';
    
    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit));
    const skip = (validPage - 1) * validLimit;

    const client = await clientPromise;
    const db = client.db();

    // Only show published news
    const query: any = { published: true };

    // Get total count
    const totalNews = await db.collection('news').countDocuments(query);

    // Fetch news
    let newsQuery = db
      .collection('news')
      .find(query)
      .sort({ date: -1, createdAt: -1 });

    if (featured) {
      // For featured news, get only the latest one
      newsQuery = newsQuery.limit(1);
    } else {
      newsQuery = newsQuery.skip(skip).limit(validLimit);
    }

    const news = await newsQuery.toArray();

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalNews / validLimit);
    const hasNextPage = validPage < totalPages;
    const hasPrevPage = validPage > 1;

    const response: NewsResponse = {
      success: true,
      data: news as unknown as News[],
      pagination: {
        page: validPage,
        limit: validLimit,
        total: totalNews,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch news' 
      },
      { status: 500 }
    );
  }
}

