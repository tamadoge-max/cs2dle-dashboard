"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, GamepadIcon, Eye, TrendingUp } from "lucide-react";

interface AnalyticsSummary {
  totalGames: number;
  totalUsers: number;
  totalVisitors: number;
  totalPlayers: number;
  averageGamesPerDay: number;
  averageUsersPerDay: number;
}

export function OverviewCards() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/cs2dle/analytics/summary');
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error('Error fetching analytics summary:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px] mb-2" />
              <Skeleton className="h-3 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const cards = [
    {
      title: "Total Games Played",
      value: data.totalGames.toLocaleString(),
      description: `${data.averageGamesPerDay.toLocaleString()} avg. per day (30d)`,
      icon: GamepadIcon,
      color: "text-blue-600"
    },
    {
      title: "Total Users",
      value: data.totalUsers.toLocaleString(),
      description: `${data.averageUsersPerDay.toLocaleString()} avg. registrations per day (30d)`,
      icon: Users,
      color: "text-green-600"
    },
    {
      title: "Total Visitors",
      value: data.totalVisitors.toLocaleString(),
      description: "Cumulative unique visitors",
      icon: Eye,
      color: "text-purple-600"
    },
    {
      title: "Active Players",
      value: data.totalPlayers.toLocaleString(),
      description: "Users who have played games",
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

