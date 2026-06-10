"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MousePointerClick, Users, UserCheck, UserX, TrendingUp, Eye } from "lucide-react";

interface AdTrackingSummary {
  totalClicks: number;
  totalExposures: number;
  clickThroughRate: number;
  uniqueUsers: number;
  guestClicks: number;
  registeredClicks: number;
  averageClicksPerDay: number;
  averageExposuresPerDay: number;
}

export function ADTrackingSummaryCards() {
  const [data, setData] = useState<AdTrackingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/cs2dle/analytics/ad-tracking?period=30d');
        const result = await response.json();
        if (result.success) {
          setData(result.data.summary);
        }
      } catch (error) {
        console.error('Error fetching AD tracking summary:', error);
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

  const guestPercentage = data.totalClicks > 0 
    ? ((data.guestClicks / data.totalClicks) * 100).toFixed(1)
    : '0';
  const registeredPercentage = data.totalClicks > 0
    ? ((data.registeredClicks / data.totalClicks) * 100).toFixed(1)
    : '0';

  const cards = [
    {
      title: "Total Exposures",
      value: data.totalExposures.toLocaleString(),
      description: "Ad image views",
      icon: Eye,
      color: "text-blue-600"
    },
    {
      title: "Total Clicks",
      value: data.totalClicks.toLocaleString(),
      description: "All-time ad clicks",
      icon: MousePointerClick,
      color: "text-green-600"
    },
    {
      title: "Click-Through Rate",
      value: `${data.clickThroughRate.toFixed(2)}%`,
      description: "Clicks per exposure",
      icon: TrendingUp,
      color: "text-purple-600"
    },
    {
      title: "Unique Users",
      value: data.uniqueUsers.toLocaleString(),
      description: "Users who clicked ads",
      icon: Users,
      color: "text-indigo-600"
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

