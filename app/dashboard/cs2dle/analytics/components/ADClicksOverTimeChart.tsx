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
  Line, 
  LineChart, 
  CartesianGrid, 
  XAxis, 
  YAxis,
  Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { MousePointerClick, Calendar, TrendingUp, Eye } from 'lucide-react';

interface DailyClick {
  date: string;
  totalClicks: number;
  totalExposures: number;
  uniqueUsers: number;
  guestClicks: number;
  registeredClicks: number;
  clickThroughRate: number;
}

interface AdTrackingData {
  period: string;
  dailyClicks: DailyClick[];
  summary: {
    totalClicks: number;
    totalExposures: number;
    clickThroughRate: number;
    uniqueUsers: number;
    guestClicks: number;
    registeredClicks: number;
    averageClicksPerDay: number;
    averageExposuresPerDay: number;
    peakDay?: {
      date: string;
      clicks: number;
      exposures?: number;
    };
    periodStart: string;
    periodEnd: string;
  };
}

interface ADClicksOverTimeChartProps {
  defaultPeriod?: string;
}

const chartConfig = {
  totalClicks: {
    label: "Total Clicks",
    color: "hsl(var(--chart-1))",
  },
  totalExposures: {
    label: "Total Exposures",
    color: "hsl(var(--chart-2))",
  },
  guestClicks: {
    label: "Guest Clicks",
    color: "hsl(var(--chart-3))",
  },
  registeredClicks: {
    label: "Registered Clicks",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

export const ADClicksOverTimeChart = ({ defaultPeriod = '30d' }: ADClicksOverTimeChartProps) => {
  const [data, setData] = useState<AdTrackingData | null>(null);
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

  const fetchData = async (period: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/cs2dle/analytics/ad-tracking?period=${period}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError("Failed to fetch AD tracking data");
      }
    } catch (err) {
      setError("An error occurred while fetching AD tracking data");
      console.error("AD tracking data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedPeriod);
  }, [selectedPeriod]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>AD Clicks Over Time</CardTitle>
          <CardDescription>Loading AD tracking data...</CardDescription>
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
          <CardTitle>AD Clicks Over Time</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => fetchData(selectedPeriod)}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Format data for the chart
  const chartData = data.dailyClicks.map(item => ({
    date: format(parseISO(item.date), 'MMM dd'),
    fullDate: format(parseISO(item.date), 'MMM dd, yyyy'),
    totalClicks: item.totalClicks,
    totalExposures: item.totalExposures,
    guestClicks: item.guestClicks,
    registeredClicks: item.registeredClicks,
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

  if (data.dailyClicks.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>AD Clicks Over Time</CardTitle>
          <CardDescription>Track AD click trends over time</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="text-center py-8 text-muted-foreground">
            <p>No AD click data available for the selected period.</p>
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
                <MousePointerClick size={30} className="text-primary" />
                AD Clicks Over Time
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
            <MousePointerClick className="h-3 w-3 mr-1" />
            Total Clicks: {data.summary.totalClicks.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
            <Eye className="h-3 w-3 mr-1" />
            Total Exposures: {data.summary.totalExposures.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
            <TrendingUp className="h-3 w-3 mr-1" />
            CTR: {data.summary.clickThroughRate.toFixed(2)}%
          </Badge>
          {data.summary.peakDay && (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
              <Calendar className="h-3 w-3 mr-1" />
              Peak: {format(parseISO(data.summary.peakDay.date), 'MMM dd')} ({data.summary.peakDay.clicks} clicks)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <LineChart 
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
            <Legend />
            <Line
              type="monotone"
              dataKey="totalExposures"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={false}
              name="Total Exposures"
            />
            <Line
              type="monotone"
              dataKey="totalClicks"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={false}
              name="Total Clicks"
            />
            <Line
              type="monotone"
              dataKey="guestClicks"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              dot={false}
              name="Guest Clicks"
            />
            <Line
              type="monotone"
              dataKey="registeredClicks"
              stroke="hsl(var(--chart-4))"
              strokeWidth={2}
              dot={false}
              name="Registered Clicks"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

