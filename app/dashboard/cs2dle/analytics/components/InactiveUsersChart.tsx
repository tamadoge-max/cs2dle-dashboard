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
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { UserX, TrendingDown, Calendar, Users } from 'lucide-react';

interface DailyInactive {
  date: string;
  count: number;
}

interface InactiveUsersData {
  period: string;
  dailyInactive: DailyInactive[];
  summary: {
    totalInactive: number;
    averagePerDay: number;
    peakDay?: {
      date: string;
      count: number;
    };
    periodStart: string;
    periodEnd: string;
    inactivityThreshold: number;
  };
}

interface InactiveUsersChartProps {
  defaultPeriod?: string;
  inactivityDays?: number;
}

const chartConfig = {
  count: {
    label: "Inactive Users",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig;

export const InactiveUsersChart = ({ 
  defaultPeriod = '7d',
  inactivityDays = 30 
}: InactiveUsersChartProps) => {
  const [data, setData] = useState<InactiveUsersData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(defaultPeriod);
  const [selectedInactivityDays, setSelectedInactivityDays] = useState<number>(inactivityDays);

  const periods = [
    { value: '7d', label: '7 Days' },
    { value: '14d', label: '14 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: 'all', label: 'All Time' },
  ];

  const inactivityThresholds = [
    { value: 7, label: '7 Days' },
    { value: 14, label: '14 Days' },
    { value: 30, label: '30 Days' },
    { value: 60, label: '60 Days' },
    { value: 90, label: '90 Days' },
  ];

  const fetchInactiveUsersData = async (period: string, days: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/cs2dle/analytics/inactive-users?period=${period}&inactivityDays=${days}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError("Failed to fetch inactive users data");
      }
    } catch (err) {
      setError("An error occurred while fetching inactive users data");
      console.error("Inactive users data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInactiveUsersData(selectedPeriod, selectedInactivityDays);
  }, [selectedPeriod, selectedInactivityDays]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  const handleInactivityDaysChange = (days: string) => {
    setSelectedInactivityDays(parseInt(days));
  };

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Inactive Users</CardTitle>
          <CardDescription>Loading inactive users data...</CardDescription>
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
          <CardTitle>Inactive Users</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => fetchInactiveUsersData(selectedPeriod, selectedInactivityDays)}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Format data for the chart
  const chartData = data.dailyInactive.map(item => ({
    date: format(parseISO(item.date), 'MMM dd'),
    fullDate: format(parseISO(item.date), 'MMM dd, yyyy'),
    count: item.count,
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>
                <div className="flex items-end gap-2">
                  <UserX size={30} className="text-destructive" />
                  Inactive Users
                </div>
              </CardTitle>
              <CardDescription className="mt-1">
                Track total inactive users over time ({selectedInactivityDays}+ days)
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Inactivity Threshold
              </label>
              <Select value={selectedInactivityDays.toString()} onValueChange={handleInactivityDaysChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Inactivity" />
                </SelectTrigger>
                <SelectContent>
                  {inactivityThresholds.map((threshold) => (
                    <SelectItem key={threshold.value} value={threshold.value.toString()}>
                      Inactive {threshold.label}+
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Time Period
              </label>
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-full">
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
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
            <Users className="h-3 w-3 mr-1" />
            Current: {data.summary.totalInactive.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
            <TrendingDown className="h-3 w-3 mr-1" />
            Average: {data.summary.averagePerDay.toFixed(0)}
          </Badge>
          {data.summary.peakDay && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800">
              <Calendar className="h-3 w-3 mr-1" />
              Peak: {format(parseISO(data.summary.peakDay.date), 'MMM dd')} ({data.summary.peakDay.count} users)
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
            <defs>
              <linearGradient id="inactiveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
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
              allowDecimals={false}
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
              dataKey="count"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              fill="url(#inactiveGradient)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

