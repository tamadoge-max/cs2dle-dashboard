"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { Calendar, BarChart3, TrendingUp } from 'lucide-react';

interface DailyPlayCount {
  date: string;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
}

interface DailyStatsData {
  userId: string;
  userName: string;
  period: string;
  dailyPlayCount: DailyPlayCount[];
  summary: {
    totalGames: number;
    totalWins: number;
    averageWinRate: number;
    maxGamesInDay: number;
    mostActiveDay?: string;
    periodStart: string;
    periodEnd: string;
  };
}

interface DailyPlayCountChartProps {
  userId: string;
  chartType?: 'line' | 'bar' | 'pie' | 'radar' | 'polarArea';
}

export const DailyPlayCountChart = ({ userId, chartType = 'polarArea' }: DailyPlayCountChartProps) => {
  const [data, setData] = useState<DailyStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d');

  const periods = [
    { value: '7d', label: '7 Days', icon: <Calendar className="h-4 w-4" /> },
    { value: '14d', label: '14 Days', icon: <TrendingUp className="h-4 w-4" /> },
    { value: '30d', label: '1 Month', icon: <BarChart3 className="h-4 w-4" /> },
    { value: 'all', label: 'All Time', icon: <Calendar className="h-4 w-4" /> },
  ];

  const fetchDailyStats = async (period: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/cs2dle/users/${userId}/daily-stats?period=${period}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError("Failed to fetch daily stats");
      }
    } catch (err) {
      setError("An error occurred while fetching daily stats");
      console.error("Daily stats fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchDailyStats(selectedPeriod);
    }
  }, [userId, selectedPeriod]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Play Count</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Play Count</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => fetchDailyStats(selectedPeriod)}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Format data for the chart
  const chartData = data.dailyPlayCount.map(item => ({
    ...item,
    formattedDate: format(parseISO(item.date), 'MMM dd'),
    fullDate: format(parseISO(item.date), 'MMM dd, yyyy')
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{data.fullDate}</p>
          <div className="space-y-1 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Games Played: <span className="font-semibold text-gray-900 dark:text-gray-100">{data.gamesPlayed}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Games Won: <span className="font-semibold text-gray-900 dark:text-gray-100">{data.gamesWon}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Win Rate: <span className="font-semibold text-gray-900 dark:text-gray-100">{data.winRate.toFixed(1)}%</span>
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (data.dailyPlayCount.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Play Count</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No game data available for the selected period.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPeriodLabel = (period: string) => {
    const periodMap: { [key: string]: string } = {
      '7d': 'Last 7 Days',
      '14d': 'Last 14 Days', 
      '30d': 'Last 30 Days',
      'all': 'All Time'
    };
    return periodMap[period] || 'Last 30 Days';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Daily Play Count ({getPeriodLabel(selectedPeriod)})</CardTitle>
          <div className="flex gap-2">
            {periods.map((period) => (
              <Button
                key={period.value}
                variant={selectedPeriod === period.value ? "default" : "outline"}
                size="sm"
                onClick={() => handlePeriodChange(period.value)}
                className="flex items-center gap-1"
              >
                {period.icon}
                {period.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
            Total Games: {data.summary.totalGames}
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
            Total Wins: {data.summary.totalWins}
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
            Avg Win Rate: {data.summary.averageWinRate.toFixed(1)}%
          </Badge>
          {data.summary.mostActiveDay && (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
              Most Active: {format(parseISO(data.summary.mostActiveDay), 'MMM dd')} ({data.summary.maxGamesInDay} games)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="formattedDate" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="gamesPlayed" fill="#3b82f6" name="Games Played" />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="formattedDate" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="gamesPlayed" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="gamesWon" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
