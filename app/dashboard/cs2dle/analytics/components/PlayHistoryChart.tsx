"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartConfig 
} from '@/components/ui/chart';
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  XAxis, 
  YAxis 
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Users, TrendingUp, BarChart3, Calendar } from 'lucide-react';

interface DailyActivity {
  date: string;
  totalGames: number;
  activePlayers: number;
  totalWins: number;
  winRate: number;
}

interface ActivityData {
  period: string;
  dailyActivity: DailyActivity[];
  summary: {
    totalGames: number;
    totalActivePlayers: number;
    averageGamesPerDay: number;
    peakDay?: {
      date: string;
      games: number;
    };
    periodStart: string;
    periodEnd: string;
  };
}

interface PlayHistoryChartProps {
  defaultPeriod?: string;
}

const chartConfig = {
  totalGames: {
    label: "Total Games",
    color: "hsl(var(--chart-1))",
  },
  activePlayers: {
    label: "Active Players",
    color: "hsl(var(--chart-2))",
  },
  totalWins: {
    label: "Total Wins",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export const PlayHistoryChart = ({ defaultPeriod = '7d' }: PlayHistoryChartProps) => {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(defaultPeriod);

  const periods = [
    { value: '7d', label: '7 Days' },
    { value: '14d', label: '14 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: 'all', label: 'All Time' },
  ];

  const fetchActivityData = async (period: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/cs2dle/analytics/activity?period=${period}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError("Failed to fetch activity data");
      }
    } catch (err) {
      setError("An error occurred while fetching activity data");
      console.error("Activity data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityData(selectedPeriod);
  }, [selectedPeriod]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Platform Activity</CardTitle>
          <CardDescription>Loading activity data...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Platform Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => fetchActivityData(selectedPeriod)}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Format data for the chart
  const chartData = data.dailyActivity.map(item => ({
    date: format(parseISO(item.date), 'MMM dd'),
    fullDate: format(parseISO(item.date), 'MMM dd, yyyy'),
    totalGames: item.totalGames,
    activePlayers: item.activePlayers,
    totalWins: item.totalWins,
    winRate: item.winRate,
  }));

  const getPeriodLabel = (period: string) => {
    const periodMap: { [key: string]: string } = {
      '7d': 'Last 7 Days',
      '14d': 'Last 14 Days',
      '30d': 'Last 30 Days',
      '90d': 'Last 90 Days',
      'all': 'All Time (Last 365 Days)',
    };
    return periodMap[period] || 'Last 30 Days';
  };

  if (data.dailyActivity.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Platform Activity</CardTitle>
          <CardDescription>Track platform activity over time</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="text-center py-8 text-muted-foreground">
            <p>No activity data available for the selected period.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>
              <div className="flex items-end gap-2">
                <BarChart3 size={30} color="#2FFF00" />
                Daily Game Activity
              </div>
            </CardTitle>
            <CardDescription className="mt-1">
              {getPeriodLabel(selectedPeriod)}
            </CardDescription>
          </div>
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
            <BarChart3 className="h-3 w-3 mr-1" />
            Total Games: {data.summary.totalGames.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
            <Users className="h-3 w-3 mr-1" />
            Active Players: {data.summary.totalActivePlayers.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
            <TrendingUp className="h-3 w-3 mr-1" />
            Avg/Day: {data.summary.averageGamesPerDay.toFixed(1)}
          </Badge>
          {data.summary.peakDay && (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
              <Calendar className="h-3 w-3 mr-1" />
              Peak: {format(parseISO(data.summary.peakDay.date), 'MMM dd')} ({data.summary.peakDay.games} games)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <AreaChart 
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <ChartTooltip
              content={
                <ChartTooltipContent 
                  labelFormatter={(value, payload) => {
                    return payload?.[0]?.payload?.fullDate || value;
                  }}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="totalGames"
              stroke="hsl(var(--chart-1))"
              fill="hsl(var(--chart-1))"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="activePlayers"
              stroke="hsl(var(--chart-2))"
              fill="hsl(var(--chart-2))"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

