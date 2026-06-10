"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, GamepadIcon, Eye, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface TodayStats {
  newUsersToday: number;
  newUsersYesterday: number;
  userGrowthPercentage: number;
  gamesToday: number;
  gamesYesterday: number;
  gameGrowthPercentage: number;
  visitorsToday: number;
  visitorsYesterday: number;
  visitorGrowthPercentage: number;
  activePlayersToday: number;
  activePlayersYesterday: number;
  playerGrowthPercentage: number;
  averageGamesLast7Days: number;
  averageUsersLast7Days: number;
}

interface MetricCardProps {
  title: string;
  value: number;
  valueFormatted: string;
  yesterday: number;
  growthPercentage: number;
  average?: number;
  icon: React.ElementType;
  iconColor: string;
  iconBgColor: string;
}

const MetricCard = ({ 
  title, 
  value, 
  valueFormatted, 
  yesterday, 
  growthPercentage, 
  average,
  icon: Icon, 
  iconColor,
  iconBgColor
}: MetricCardProps) => {
  const isPositive = growthPercentage > 0;
  const isNegative = growthPercentage < 0;
  const isZero = growthPercentage === 0;

  const difference = value - yesterday;
  const differenceText = difference > 0 ? `+${difference.toLocaleString()}` : difference.toLocaleString();
  
  // Calculate progress percentage relative to average (if available) or yesterday
  const baseValue = average || yesterday || 1;
  const progressPercentage = Math.min((value / (baseValue * 1.5)) * 100, 100);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">
              {title}
            </CardDescription>
            <CardTitle className="text-3xl font-bold mt-2 tracking-tight">
              {valueFormatted}
            </CardTitle>
          </div>
          <div className={`p-3 rounded-xl ${iconBgColor}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-3">
          {/* Growth indicator */}
          <div className="flex items-center gap-2">
            {isPositive && (
              <>
                <div className="flex items-center gap-1 text-green-600 dark:text-green-500">
                  <ArrowUp className="h-4 w-4" />
                  <span className="text-sm font-semibold">{growthPercentage.toFixed(1)}%</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {differenceText} from yesterday
                </span>
              </>
            )}
            {isNegative && (
              <>
                <div className="flex items-center gap-1 text-red-600 dark:text-red-500">
                  <ArrowDown className="h-4 w-4" />
                  <span className="text-sm font-semibold">{Math.abs(growthPercentage).toFixed(1)}%</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {differenceText} from yesterday
                </span>
              </>
            )}
            {isZero && (
              <>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Minus className="h-4 w-4" />
                  <span className="text-sm font-semibold">0.0%</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  No change
                </span>
              </>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <Progress value={progressPercentage} className="h-1.5" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Yesterday: {yesterday.toLocaleString()}</span>
              {average !== undefined && (
                <span>7d avg: {average.toFixed(1)}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function TodayGrowthCards() {
  const [data, setData] = useState<TodayStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/cs2dle/analytics/today');
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error('Error fetching today analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-3 w-20 mb-3" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-xl" />
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-1.5 w-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Calculate overall platform health
  const overallGrowth = (
    data.gameGrowthPercentage + 
    data.userGrowthPercentage + 
    data.visitorGrowthPercentage + 
    data.playerGrowthPercentage
  ) / 4;

  const metrics = [
    {
      title: "Games Played",
      value: data.gamesToday,
      valueFormatted: data.gamesToday.toLocaleString(),
      yesterday: data.gamesYesterday,
      growthPercentage: data.gameGrowthPercentage,
      average: data.averageGamesLast7Days,
      icon: GamepadIcon,
      iconColor: "text-blue-600",
      iconBgColor: "bg-blue-50 dark:bg-blue-950/20"
    },
    {
      title: "New Users",
      value: data.newUsersToday,
      valueFormatted: data.newUsersToday.toLocaleString(),
      yesterday: data.newUsersYesterday,
      growthPercentage: data.userGrowthPercentage,
      average: data.averageUsersLast7Days,
      icon: Users,
      iconColor: "text-green-600",
      iconBgColor: "bg-green-50 dark:bg-green-950/20"
    },
    {
      title: "Visitors",
      value: data.visitorsToday,
      valueFormatted: data.visitorsToday.toLocaleString(),
      yesterday: data.visitorsYesterday,
      growthPercentage: data.visitorGrowthPercentage,
      icon: Eye,
      iconColor: "text-purple-600",
      iconBgColor: "bg-purple-50 dark:bg-purple-950/20"
    },
    {
      title: "Active Players",
      value: data.activePlayersToday,
      valueFormatted: data.activePlayersToday.toLocaleString(),
      yesterday: data.activePlayersYesterday,
      growthPercentage: data.playerGrowthPercentage,
      icon: TrendingUp,
      iconColor: "text-orange-600",
      iconBgColor: "bg-orange-50 dark:bg-orange-950/20"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Daily Performance Overview</h2>
          <p className="text-muted-foreground mt-1">
            Track your platform's growth and engagement metrics
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg border">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{formattedDate}</span>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Platform Health Score</CardTitle>
              <CardDescription>Overall growth compared to yesterday</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                {overallGrowth > 0 && "+"}
                {overallGrowth.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">Average growth</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Separator />

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>
    </div>
  );
}

