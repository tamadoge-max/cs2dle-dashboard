"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { MultiDateRangePicker } from "@/components/ui/multi-date-range-picker";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ChevronRight,
  Users,
  BarChart3,
  Clock,
  Search,
  X,
} from "lucide-react";
import { User } from "@/types/user";
import { formatDistanceToNow, format } from "date-fns";
import { ProviderIcon } from "@/components/ProviderIcon";
import Image from "next/image";
import ExportButton from "./components/ExportButton";
import UserStatistics from "./components/UserStatistics";
import InactiveUsers from "./components/InactiveUsers";
import { UserDetailsModal } from "@/components/UserModal/UserDetailsModal";

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface UsersResponse {
  success: boolean;
  data: User[];
  pagination: PaginationInfo;
}

const UsersPage = () => {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [debouncedSelectedDates, setDebouncedSelectedDates] = useState<Date[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchUsers = async (page: number, search: string = "", dates: Date[] = []) => {
    try {
      setLoading(true);
      setError(null);

      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      let dateParams = "";
      
      if (dates.length > 0) {
        const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
        const dateFrom = sortedDates[0].toISOString().split('T')[0];
        const dateTo = sortedDates[sortedDates.length - 1].toISOString().split('T')[0];
        dateParams = `&dateFrom=${dateFrom}&dateTo=${dateTo}`;
      }
      
      const response = await fetch(
        `/api/cs2dle/users/all?page=${page}&limit=10${searchParam}${dateParams}`
      );
      const result: UsersResponse = await response.json();

      if (result.success) {
        setData(result);
      } else {
        setError("Failed to fetch users data");
      }
    } catch (err) {
      setError("An error occurred while fetching data");
      console.error("Users fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounce selected dates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSelectedDates(selectedDates);
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedDates]);

  // Fetch users when page, search query, or dates change
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when searching or filtering
    fetchUsers(1, debouncedSearchQuery, debouncedSelectedDates);
  }, [debouncedSearchQuery, debouncedSelectedDates]);

  useEffect(() => {
    if (debouncedSearchQuery === "" && debouncedSelectedDates.length === 0) {
      fetchUsers(currentPage, debouncedSearchQuery, debouncedSelectedDates);
    }
  }, [currentPage, debouncedSearchQuery, debouncedSelectedDates]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
  };

  const clearDateFilter = () => {
    setSelectedDates([]);
    setDebouncedSelectedDates([]);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchUsers(page, debouncedSearchQuery, debouncedSelectedDates);
  };

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 p-4 border animate-pulse"
                >
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={() => fetchUsers(currentPage, debouncedSearchQuery, debouncedSelectedDates)}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-center gap-4 mb-8">
        <Image
          src="/images/cs2dle/logo.png"
          alt="CS2DLE Logo"
          width={300}
          height={300}
        />
      </div>
      
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="inactive" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Inactive
          </TabsTrigger>
        </TabsList>
        <ExportButton />

        <TabsContent value="users" className="space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-around items-center">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search users by name, username, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={clearSearch}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="w-full sm:w-80">
                  <MultiDateRangePicker
                    key={`date-picker-${selectedDates.length}`}
                    selectedDates={selectedDates}
                    onDatesChange={setSelectedDates}
                    placeholder="Filter by sign-up date"
                    maxDates={30}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
            
            {/* Active filters display */}
            {(debouncedSearchQuery || debouncedSelectedDates.length > 0) && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {debouncedSearchQuery && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: "{debouncedSearchQuery}"
                    <X 
                      className="h-3 w-3 cursor-pointer hover:bg-muted-foreground/20 rounded-sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        clearSearch();
                      }}
                    />
                  </Badge>
                )}
                {debouncedSelectedDates.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Date range: {debouncedSelectedDates.length} date{debouncedSelectedDates.length !== 1 ? 's' : ''}
                    {debouncedSelectedDates.length > 1 && (
                      <span className="text-xs opacity-75">
                        ({format(debouncedSelectedDates[0], 'MMM dd')} - {format(debouncedSelectedDates[debouncedSelectedDates.length - 1], 'MMM dd')})
                      </span>
                    )}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:bg-muted-foreground/20 rounded-sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        clearDateFilter();
                      }}
                    />
                  </Badge>
                )}
              </div>
            )}
          </div>
          <Card className="rounded-none bg-transparent">
            <CardHeader>
              <CardTitle>
                Users
                {debouncedSearchQuery && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    - Search results for "{debouncedSearchQuery}"
                  </span>
                )}
                {debouncedSelectedDates.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    - Filtered by sign-up date
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
          <div className="space-y-4">
            {data?.data.map((user) => {
              const userId = user._id?.toString() || user.email;

              return (
                <div
                  key={userId}
                  className="border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleUserClick(user)}
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.image} alt={user.name} />
                        <AvatarFallback>
                          {getInitials(
                            user.name || user.username || "User"
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-semibold text-lg">
                            {user.name || user.username || "Anonymous"}
                          </div>
                          {user.username &&
                            user.name &&
                            user.username !== user.name && (
                              <Badge variant="outline" className="text-xs">
                                @{user.username}
                              </Badge>
                            )}
                        </div>
                        <div className="text-sm text-muted-foreground mb-1">
                          {user.email}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {user.createdAt && (
                            <span>
                              Joined{" "}
                              {formatDistanceToNow(
                                new Date(user.createdAt),
                                { addSuffix: true }
                              )}
                            </span>
                          )}
                          {user.updatedAt && (
                            <span>
                              • Last seen{" "}
                              {formatDistanceToNow(
                                new Date(user.updatedAt),
                                { addSuffix: true }
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center space-x-2">
                        {user.provider && (
                          <Badge
                            variant="secondary"
                            className="capitalize flex items-center gap-1"
                          >
                            <ProviderIcon
                              provider={user.provider}
                              size={14}
                            />
                            {user.provider}
                          </Badge>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {data?.pagination.totalPages && data.pagination.totalPages > 1 && (
            <div className="mt-8 space-y-4">
              {/* Pagination Info */}
              <div className="text-center text-sm text-muted-foreground">
                Showing page {data.pagination.page} of {data.pagination.totalPages} 
                ({data.pagination.total} total users)
              </div>
              
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (data.pagination.hasPrevPage) {
                          handlePageChange(data.pagination.page - 1);
                        }
                      }}
                      className={
                        !data.pagination.hasPrevPage
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>

                  {/* Generate page numbers with proper range logic */}
                  {(() => {
                    const currentPage = data.pagination.page;
                    const totalPages = data.pagination.totalPages;
                    const pages = [];
                    
                    // Always show first page
                    if (currentPage > 3) {
                      pages.push(1);
                      if (currentPage > 4) {
                        pages.push('ellipsis-start');
                      }
                    }
                    
                    // Show pages around current page
                    const startPage = Math.max(1, currentPage - 2);
                    const endPage = Math.min(totalPages, currentPage + 2);
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(i);
                    }
                    
                    // Always show last page
                    if (currentPage < totalPages - 2) {
                      if (currentPage < totalPages - 3) {
                        pages.push('ellipsis-end');
                      }
                      pages.push(totalPages);
                    }
                    
                    return pages.map((page, index) => {
                      if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                        return (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(page as number);
                            }}
                            isActive={page === currentPage}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    });
                  })()}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (data.pagination.hasNextPage) {
                          handlePageChange(data.pagination.page + 1);
                        }
                      }}
                      className={
                        !data.pagination.hasNextPage
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics">
          <UserStatistics />
        </TabsContent>

        <TabsContent value="inactive">
          <InactiveUsers />
        </TabsContent>
      </Tabs>

      {/* User Details Modal */}
      <UserDetailsModal
        userId={selectedUser?._id?.toString() || null}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
};

export default UsersPage;
