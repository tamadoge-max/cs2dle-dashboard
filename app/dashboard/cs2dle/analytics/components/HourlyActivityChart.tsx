"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartConfig 
} from '@/components/ui/chart';
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis 
} from 'recharts';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Users, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HourlyActivity {
  hour: number;
  totalGames: number;
  activePlayers: number;
  totalWins: number;
  winRate: number;
}

interface HourlyData {
  date: string;
  hourlyActivity: HourlyActivity[];
  summary: {
    totalGames: number;
    totalActivePlayers: number;
    peakHour?: {
      hour: number;
      games: number;
    };
  };
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
} satisfies ChartConfig;

export const HourlyActivityChart = () => {
  const [data, setData] = useState<HourlyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const fetchHourlyData = async (date: Date) => {
    try {
      setLoading(true);
      setError(null);

      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await fetch(`/api/cs2dle/analytics/hourly/games/?date=${dateStr}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError("Failed to fetch hourly data");
      }
    } catch (err) {
      setError("An error occurred while fetching hourly data");
      console.error("Hourly data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHourlyData(selectedDate);
  }, [selectedDate]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCalendarOpen(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Hourly Activity</CardTitle>
          <CardDescription>Loading hourly data...</CardDescription>
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
          <CardTitle>Hourly Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => fetchHourlyData(selectedDate)}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Format data for the chart
  const chartData = data.hourlyActivity.map(item => ({
    hour: `${item.hour.toString().padStart(2, '0')}:00`,
    hourNumber: item.hour,
    totalGames: item.totalGames,
    activePlayers: item.activePlayers,
    totalWins: item.totalWins,
    winRate: item.winRate,
  }));

  const hasData = data.summary.totalGames > 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Clock size={24} className="text-primary" />
                Hourly Activity
              </div>
            </CardTitle>
            <CardDescription className="mt-1">
              Games played by hour • Amsterdam Time (CET/CEST)
            </CardDescription>
          </div>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) =>
                  date > new Date() || date < new Date("2020-01-01")
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        {hasData && (
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
              <TrendingUp className="h-3 w-3 mr-1" />
              Total Games: {data.summary.totalGames.toLocaleString()}
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
              <Users className="h-3 w-3 mr-1" />
              Active Players: {data.summary.totalActivePlayers.toLocaleString()}
            </Badge>
            {data.summary.peakHour && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
                <Clock className="h-3 w-3 mr-1" />
                Peak Hour: {data.summary.peakHour.hour.toString().padStart(2, '0')}:00 ({data.summary.peakHour.games} games)
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        {!hasData ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No activity data available for {format(selectedDate, "PPP")}.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <BarChart 
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                interval={1}
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
                      const hourNum = payload?.[0]?.payload?.hourNumber;
                      return `${hourNum?.toString().padStart(2, '0')}:00 - ${(hourNum + 1)?.toString().padStart(2, '0')}:00`;
                    }}
                  />
                }
              />
              <Bar
                dataKey="totalGames"
                fill="hsl(var(--chart-1))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

