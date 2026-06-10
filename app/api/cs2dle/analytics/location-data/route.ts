import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Fetch all location data (no period filtering)
    const locationData = await db.collection('location_datas').find({}).toArray();

    // Get unique users and their latest location data
    const userLocationMap = new Map();
    
    locationData.forEach(location => {
      const userId = location.userId;
      const timestamp = new Date(location.timestamp.$date || location.timestamp);
      
      // Keep the most recent location for each user
      if (!userLocationMap.has(userId) || userLocationMap.get(userId).timestamp < timestamp) {
        userLocationMap.set(userId, {
          userId,
          country: location.country,
          city: location.city,
          ip: location.ip,
          latitude: location.latitude,
          longitude: location.longitude,
          userAgent: location.userAgent,
          timestamp: timestamp
        });
      }
    });

    // Convert map to array
    const uniqueUserLocations = Array.from(userLocationMap.values());

    // Get user information for registered users
    const registeredUserIds = uniqueUserLocations
      .filter(loc => !loc.userId.startsWith('guest-'))
      .map(loc => new ObjectId(loc.userId));

    let userInfoMap = new Map();
    if (registeredUserIds.length > 0) {
      
      const users = await db.collection('users').find({
        _id: { $in: registeredUserIds }
      }).toArray();

      users.forEach(user => {
        userInfoMap.set(user._id.toString(), {
          name: user.name,
          email: user.email,
          image: user.image
        });
      });
    }

    // Combine location data with user info
    const locationDataWithUsers = uniqueUserLocations.map(location => ({
      ...location,
      isGuest: location.userId.startsWith('guest-'),
      userInfo: userInfoMap.get(location.userId) || null
    }));

    // Aggregate by country
    const countryStats = new Map();
    uniqueUserLocations.forEach(location => {
      const country = location.country || 'Unknown';
      if (!countryStats.has(country)) {
        countryStats.set(country, {
          country,
          users: 0,
          guests: 0,
          registered: 0
        });
      }
      const stats = countryStats.get(country);
      stats.users++;
      if (location.userId.startsWith('guest-')) {
        stats.guests++;
      } else {
        stats.registered++;
      }
    });

    const countriesArray = Array.from(countryStats.values())
      .sort((a, b) => b.users - a.users);

    return NextResponse.json({ 
      locationData: locationDataWithUsers,
      countries: countriesArray,
      totalLocations: uniqueUserLocations.length,
      guestCount: uniqueUserLocations.filter(loc => loc.userId.startsWith('guest-')).length,
      registeredCount: uniqueUserLocations.filter(loc => !loc.userId.startsWith('guest-')).length
    });
  } catch (error) {
    console.error('Location data API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location data' },
      { status: 500 }
    );
  }
}
