import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface WeeklyTicketSummary {
  ticketsByGameType: {
    EmojiPuzzle: number;
    GuessSkin: number;
    GuessPrice: number;
    HigherLower: number;
    Wordle: number;
  };
  totalTicketsEarned: number;
}

interface UserWithTickets {
  _id: string;
  email: string;
  name?: string;
  username?: string;
  image?: string;
  steamId?: string;
  weeklyTicket: WeeklyTicketSummary;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekStartDate = searchParams.get('weekStartDate');
    const weekEndDate = searchParams.get('weekEndDate');

    if (!weekStartDate || !weekEndDate) {
      return NextResponse.json(
        { error: 'weekStartDate and weekEndDate are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Find all weekly tickets for the specified week
    const weeklyTickets = await db.collection('weeklyTickets')
      .find({
        weekStartDate,
        weekEndDate,
      })
      .toArray();

    if (weeklyTickets.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No users with tickets found for this week'
      });
    }

    // Get user details for each ticket holder
    const userIds: ObjectId[] = [];
    for (const ticket of weeklyTickets) {
      try {
        userIds.push(new ObjectId(ticket.userId));
      } catch (error) {
        console.error('Invalid ObjectId:', ticket.userId);
      }
    }

    const users = await db.collection('users')
      .find({ _id: { $in: userIds } })
      .toArray();

    // Combine user data with ticket data (only essential fields)
    const usersWithTickets: UserWithTickets[] = weeklyTickets.map((ticket: any) => {
      const user = users.find((u: any) => u._id.toString() === ticket.userId.toString());
      return {
        _id: user?._id?.toString() || ticket.userId.toString(),
        email: user?.email || 'Unknown',
        name: user?.name,
        username: user?.username,
        image: user?.image,
        steamId: user?.steamId,
        weeklyTicket: {
          ticketsByGameType: ticket.ticketsByGameType,
          totalTicketsEarned: ticket.totalTicketsEarned
        }
      };
    });

    // Sort by total tickets earned (descending)
    usersWithTickets.sort((a, b) => b.weeklyTicket.totalTicketsEarned - a.weeklyTicket.totalTicketsEarned);

    return NextResponse.json({
      success: true,
      data: usersWithTickets,
      totalUsers: usersWithTickets.length,
      totalTickets: usersWithTickets.reduce((sum, user) => sum + user.weeklyTicket.totalTicketsEarned, 0)
    });

  } catch (error) {
    console.error('Error fetching users with weekly tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users with weekly tickets' },
      { status: 500 }
    );
  }
}
