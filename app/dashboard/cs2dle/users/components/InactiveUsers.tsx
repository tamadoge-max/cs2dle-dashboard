"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Input
} from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  User as UserIcon,
  Mail,
  Calendar,
  Globe,
  Gamepad2,
  Clock,
  AlertTriangle,
  Search,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ProviderIcon } from "@/components/ProviderIcon";
import InactiveUsersExportButton from "./InactiveUsersExportButton";

interface InactiveUser {
  _id: string;
  email: string;
  name?: string;
  username?: string;
  image?: string;
  provider?: string;
  createdAt: string;
  updatedAt: string;
  daysSinceLastUpdate: number;
  gamesPlayed: number;
  bestStreak: number;
  currentStreak: number;
  ticket: number;
  score: number;
}

interface InactiveUsersResponse {
  success: boolean;
  data?: {
    users: InactiveUser[];
    totalCount: number;
    daysThreshold: number;
  };
  message?: string;
}

const InactiveUsers = () => {
  const [data, setData] = useState<InactiveUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [daysThreshold, setDaysThreshold] = useState(7);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchInactiveUsers = async (page: number, days: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/cs2dle/users/inactive?days=${days}&page=${page}&limit=10`);
      const result: InactiveUsersResponse = await response.json();

      if (result.success && result.data) {
        setData(result);
      } else {
        setError("Failed to fetch inactive users");
      }
    } catch (err) {
      setError("An error occurred while fetching inactive users");
      console.error("Inactive users fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInactiveUsers(currentPage, daysThreshold);
  }, [currentPage, daysThreshold]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const getInactivityBadgeColor = (days: number) => {
    if (days >= 30) return "bg-red-500 text-white";
    if (days >= 14) return "bg-orange-500 text-white";
    if (days >= 7) return "bg-yellow-500 text-white";
    return "bg-gray-500 text-white";
  };

  const getInactivityLevel = (days: number) => {
    if (days >= 30) return "Very Inactive";
    if (days >= 14) return "Inactive";
    if (days >= 7) return "Less Active";
    return "Recently Active";
  };


  const filteredUsers = data?.data?.users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
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
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => fetchInactiveUsers(currentPage, daysThreshold)}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <InactiveUsersExportButton daysThreshold={daysThreshold} />
      <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Inactive Users</h2>
          <p className="text-muted-foreground">
            Users who haven't been active for more than {daysThreshold} days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={daysThreshold.toString()} onValueChange={(value) => setDaysThreshold(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 days</SelectItem>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search users by email, name, or username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Inactive</p>
                <p className="text-2xl font-bold">{data?.data?.totalCount || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Very Inactive (30+ days)</p>
                <p className="text-2xl font-bold text-red-500">
                  {filteredUsers.filter(user => user.daysSinceLastUpdate >= 30).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Showing</p>
                <p className="text-2xl font-bold">{filteredUsers.length}</p>
              </div>
              <UserIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Inactive Users List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? "No users found matching your search." : "No inactive users found for the selected period."}
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const userId = user._id;
                const isExpanded = expandedUsers.has(userId);

                return (
                  <Collapsible
                    key={userId}
                    open={isExpanded}
                    onOpenChange={() => toggleUserExpansion(userId)}
                  >
                    <div className="border hover:bg-muted/50 transition-colors">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 cursor-pointer">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={user.image} alt={user.name} />
                              <AvatarFallback>
                                {getInitials(user.name || user.username || "User")}
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
                                <Badge 
                                  className={`text-xs ${getInactivityBadgeColor(user.daysSinceLastUpdate)}`}
                                >
                                  {getInactivityLevel(user.daysSinceLastUpdate)}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mb-1">
                                {user.email}
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span>
                                  Last active{" "}
                                  {formatDistanceToNow(new Date(user.updatedAt), { addSuffix: true })}
                                </span>
                                <span>
                                  • {user.daysSinceLastUpdate} days ago
                                </span>
                                <span>
                                  • Joined{" "}
                                  {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                                </span>
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
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-4 pb-4 border-t bg-muted/30">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                            {/* Basic Information */}
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                Basic Information
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Name:</span>
                                  <span>{user.name || "Not provided"}</span>
                                </div>
                                {user.username && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Username:</span>
                                    <span>@{user.username}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Email:</span>
                                  <span>{user.email}</span>
                                </div>
                              </div>
                            </div>

                            {/* Activity Information */}
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                Activity Information
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Last Active:</span>
                                  <span>{format(new Date(user.updatedAt), "PPP")}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="font-medium">Days Inactive:</span>
                                  <Badge className={getInactivityBadgeColor(user.daysSinceLastUpdate)}>
                                    {user.daysSinceLastUpdate} days
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Joined:</span>
                                  <span>{format(new Date(user.createdAt), "PPP")}</span>
                                </div>
                              </div>
                            </div>

                            {/* Game Statistics */}
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                Game Statistics
                              </h4>
                              <div className="space-y-2">
                                <p>Best Streak: {user.bestStreak}</p>
                                <p>Current Streak: {user.currentStreak}</p>
                                <p>Games Played: {user.gamesPlayed}</p>
                                <p>Tickets: {user.ticket}</p>
                                <p>Score: {user.score}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {data?.data?.totalCount && data.data.totalCount > 10 && (
            <div className="mt-8 space-y-4">
              <div className="text-center text-sm text-muted-foreground">
                Showing {filteredUsers.length} of {data.data.totalCount} inactive users
              </div>
              
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) {
                          setCurrentPage(currentPage - 1);
                        }
                      }}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>

                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(1);
                      }}
                      isActive={currentPage === 1}
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>

                  {currentPage > 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  {currentPage > 1 && currentPage < Math.ceil((data.data.totalCount || 0) / 10) && (
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                        }}
                        isActive={true}
                      >
                        {currentPage}
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  {currentPage < Math.ceil((data.data.totalCount || 0) / 10) - 1 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  {Math.ceil((data.data.totalCount || 0) / 10) > 1 && (
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(Math.ceil((data?.data?.totalCount || 0) / 10));
                        }}
                        isActive={currentPage === Math.ceil((data.data.totalCount || 0) / 10)}
                      >
                        {Math.ceil((data.data.totalCount || 0) / 10)}
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < Math.ceil((data?.data?.totalCount || 0) / 10)) {
                          setCurrentPage(currentPage + 1);
                        }
                      }}
                      className={currentPage >= Math.ceil((data.data.totalCount || 0) / 10) ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
};

export default InactiveUsers;
