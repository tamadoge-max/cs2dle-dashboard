"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { MousePointerClick, ExternalLink, User, UserX, Calendar, Loader2 } from 'lucide-react';

interface ClickRecord {
  _id: string;
  linkUrl: string;
  sourcePage?: string;
  userId: string;
  isGuest: boolean;
  userEmail?: string;
  userName?: string;
  timestamp: string;
}

interface ADClicksTableProps {
  defaultPeriod?: string;
  pageSize?: number;
}

export const ADClicksTable = ({ defaultPeriod = '30d', pageSize = 20 }: ADClicksTableProps) => {
  const [clicks, setClicks] = useState<ClickRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(defaultPeriod);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalClicks, setTotalClicks] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const periods = [
    { value: '7d', label: '7 Days' },
    { value: '14d', label: '14 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: 'all', label: 'All Time' },
  ];

  const fetchClicks = useCallback(async (period: string, page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      // First get summary to know total clicks (only on initial load or period change)
      if (!append) {
        const summaryResponse = await fetch(`/api/cs2dle/analytics/ad-tracking?period=${period}`);
        const summaryResult = await summaryResponse.json();

        if (summaryResult.success) {
          setTotalClicks(summaryResult.data.summary.totalClicks);
        }
      }

      // Fetch detailed clicks from database
      const response = await fetch(`/api/cs2dle/analytics/ad-tracking/clicks?period=${period}&page=${page}&limit=${pageSize}`);
      const result = await response.json();

      if (result.success) {
        const newClicks = result.data.clicks || [];
        
        if (append) {
          // Append new clicks, avoiding duplicates
          setClicks(prev => {
            const existingIds = new Set(prev.map(click => click._id));
            const uniqueNewClicks = newClicks.filter((click: ClickRecord) => !existingIds.has(click._id));
            return [...prev, ...uniqueNewClicks];
          });
        } else {
          setClicks(newClicks);
        }

        // Check if there are more pages - if we got fewer items than pageSize, we've reached the end
        setHasMore(newClicks.length === pageSize);
        setCurrentPage(page);
      } else {
        setError("Failed to fetch AD click details");
        setHasMore(false);
      }
    } catch (err) {
      setError("An error occurred while fetching AD click details");
      console.error("AD clicks fetch error:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsInitialLoad(false);
    }
  }, [pageSize]);

  // Load more clicks for infinite scroll
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchClicks(selectedPeriod, currentPage + 1, true);
    }
  }, [loadingMore, hasMore, loading, selectedPeriod, currentPage, fetchClicks]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loadingMore &&
          !loading &&
          !isInitialLoad
        ) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, hasMore, loadingMore, loading, isInitialLoad]);

  // Initial load and period changes
  useEffect(() => {
    setClicks([]);
    setCurrentPage(1);
    setHasMore(true);
    setIsInitialLoad(true);
    fetchClicks(selectedPeriod, 1, false);
  }, [selectedPeriod, fetchClicks]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  const formatSourcePage = (sourcePage?: string) => {
    if (!sourcePage) return 'Unknown';
    return sourcePage
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  if (loading && clicks.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>AD Click Details</CardTitle>
          <CardDescription>Loading click details...</CardDescription>
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

  if (error && clicks.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>AD Click Details</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => fetchClicks(selectedPeriod, currentPage)}>Try Again</Button>
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
                AD Click Details
              </div>
            </CardTitle>
            <CardDescription className="mt-1">
              Detailed view of all ad clicks
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
        <div className="flex items-center gap-2 mt-4">
          <Badge variant="outline">
            Total: {totalClicks.toLocaleString()} clicks
          </Badge>
          <Badge variant="outline">
            Showing: {clicks.length.toLocaleString()} clicks
          </Badge>
          {hasMore && (
            <Badge variant="secondary">
              Scroll for more
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {clicks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No AD click data available for the selected period.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Source Page</TableHead>
                    <TableHead>Link URL</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clicks.map((click) => (
                    <TableRow key={click._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(parseISO(click.timestamp), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {click.isGuest ? (
                            <>
                              <UserX className="h-4 w-4 text-orange-500" />
                              <span className="text-sm text-muted-foreground">
                                {click.userId || 'Guest'}
                              </span>
                            </>
                          ) : (
                            <>
                              <User className="h-4 w-4 text-green-500" />
                              <span className="text-sm">
                                {click.userName || click.userEmail || click.userId || 'User'}
                              </span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatSourcePage(click.sourcePage)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 max-w-md">
                          <span className="text-sm truncate">
                            {truncateUrl(click.linkUrl)}
                          </span>
                          <a
                            href={click.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={click.isGuest ? "secondary" : "default"}>
                          {click.isGuest ? "Guest" : "Registered"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="flex justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading more clicks...</p>
                </div>
              </div>
            )}

            {/* End of list indicator */}
            {!hasMore && clicks.length > 0 && (
              <div className="flex justify-center py-6">
                <p className="text-sm text-muted-foreground">
                  You've reached the end of the list
                </p>
              </div>
            )}

            {/* Intersection observer target */}
            <div ref={loadMoreRef} className="h-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

