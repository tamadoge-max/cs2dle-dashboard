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
  Bar,
  BarChart,
  ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { UserPlus, TrendingUp, Calendar, Users } from 'lucide-react';

interface DailyRegistration {
  date: string;
  count: number;
}

interface RegistrationData {
  period: string;
  dailyRegistrations: DailyRegistration[];
  summary: {
    totalUsers: number;
    averagePerDay: number;
    peakDay?: {
      date: string;
      count: number;
    };
    periodStart: string;
    periodEnd: string;
  };
}

interface UserRegistrationChartProps {
  defaultPeriod?: string;
}

const chartConfig = {
  count: {
    label: "New Users",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export const UserRegistrationChart = ({ defaultPeriod = '7d' }: UserRegistrationChartProps) => {
  const [data, setData] = useState<RegistrationData | null>(null);
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

  const fetchRegistrationData = async (period: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/cs2dle/analytics/user-registrations?period=${period}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError("Failed to fetch registration data");
      }
    } catch (err) {
      setError("An error occurred while fetching registration data");
      console.error("Registration data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrationData(selectedPeriod);
  }, [selectedPeriod]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>User Registrations</CardTitle>
          <CardDescription>Loading registration data...</CardDescription>
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
          <CardTitle>User Registrations</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => fetchRegistrationData(selectedPeriod)}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Format data for the chart
  const chartData = data.dailyRegistrations.map(item => ({
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

  if (data.dailyRegistrations.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>User Registrations</CardTitle>
          <CardDescription>Track new user registrations over time</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="text-center py-8 text-muted-foreground">
            <p>No registration data available for the selected period.</p>
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
                <UserPlus size={30} className="text-primary" />
                Daily User Registrations
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
            <Users className="h-3 w-3 mr-1" />
            Total Users: {data.summary.totalUsers.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
            <TrendingUp className="h-3 w-3 mr-1" />
            Avg/Day: {data.summary.averagePerDay.toFixed(1)}
          </Badge>
          {data.summary.peakDay && (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
              <Calendar className="h-3 w-3 mr-1" />
              Peak: {format(parseISO(data.summary.peakDay.date), 'MMM dd')} ({data.summary.peakDay.count} users)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <BarChart 
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
            <Bar
              dataKey="count"
              fill="hsl(var(--chart-1))"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

