"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Users,
  Trophy,
  Loader2,
  CheckCircle,
  Shuffle,
  Ticket,
} from "lucide-react";
import { WeeklyPrize } from "./ItemsTab";

interface WeeklyTicketSummary {
  ticketsByGameType: {
    EmojiPuzzle: number;
    GuessSkin: number;
    GuessPrice: number;
    HigherLower: number;
    Wordle: number;
  };
  totalTicketsEarned: number;
}

interface UserWithTickets {
  _id: string;
  email: string;
  name?: string;
  username?: string;
  image?: string;
  steamId?: string;
  weeklyTicket: WeeklyTicketSummary;
}

interface SelectWinnersModalProps {
  isOpen: boolean;
  onClose: () => void;
  weeklyPrize: WeeklyPrize | null;
  onSuccess?: () => void;
}

const SelectWinnersModal = ({
  isOpen,
  onClose,
  weeklyPrize,
  onSuccess,
}: SelectWinnersModalProps) => {
  const [users, setUsers] = useState<UserWithTickets[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithTickets | null>(null);
  const [awarding, setAwarding] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const totalTickets = users.reduce(
    (sum, user) => sum + (user.weeklyTicket?.totalTicketsEarned || 0),
    0
  );

  useEffect(() => {
    if (isOpen && weeklyPrize) {
      fetchUsersWithTickets();
      setSelectedUser(null);
    }
  }, [isOpen, weeklyPrize]);

  const fetchUsersWithTickets = async () => {
    if (!weeklyPrize?.weekStartDate || !weeklyPrize?.weekEndDate) {
      setError("Weekly prize date range is required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/cs2dle/rewards/weekly-prize/tickets?weekStartDate=${weeklyPrize.weekStartDate}&weekEndDate=${weeklyPrize.weekEndDate}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch users with tickets');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setUsers(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch users with tickets');
      }
    } catch (err) {
      setError("Error loading users with tickets");
      console.error("Error fetching users with tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRandomSelect = () => {
    if (users.length === 0) return;

    setSelecting(true);
    
    // Add a small delay for visual effect
    setTimeout(() => {
      // Weighted random selection based on ticket count
      const totalTickets = users.reduce((sum, user) => sum + user.weeklyTicket.totalTicketsEarned, 0);
      let random = Math.random() * totalTickets;
      
      let selectedUser: UserWithTickets | null = null;
      for (const user of users) {
        random -= user.weeklyTicket.totalTicketsEarned;
        if (random <= 0) {
          selectedUser = user;
          break;
        }
      }
      
      // Fallback to first user if something goes wrong
      if (!selectedUser) {
        selectedUser = users[0];
      }
      
      setSelectedUser(selectedUser);
      setSelecting(false);
    }, 1000);
  };

  const handleAwardPrize = async () => {
    if (!weeklyPrize || !selectedUser) return;

    setAwarding(true);

    try {
      const response = await fetch('/api/cs2dle/rewards/weekly-prize/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser._id,
          weeklyPrizeId: weeklyPrize._id,
          weekStartDate: weeklyPrize.weekStartDate,
          weekEndDate: weeklyPrize.weekEndDate,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const userName = formatUserDisplayName(selectedUser);
        
        toast({
          title: "Prize Awarded!",
          description: `Successfully awarded prize to ${userName} (${selectedUser.weeklyTicket.totalTicketsEarned} tickets)`,
        });
        
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to award prize. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error awarding prize:', error);
      toast({
        title: "Error",
        description: "An error occurred while awarding the prize.",
        variant: "destructive",
      });
    } finally {
      setAwarding(false);
    }
  };

  const formatUserDisplayName = (user: UserWithTickets) => {
    return user.name || user.username || user.email.split('@')[0] || 'Unknown User';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Select Winner - {weeklyPrize?.name}
          </DialogTitle>
          <DialogDescription>
            Users who earned tickets for this week's prize draw. 
            Click "Select Winner" to randomly choose a winner based on ticket count.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <Skeleton className="h-15 w-15 rounded-full" />
                    <div className="space-y-2 w-full">
                      <Skeleton className="h-4 w-24 mx-auto" />
                      <Skeleton className="h-3 w-32 mx-auto" />
                    </div>
                    <div className="w-full space-y-2">
                      <Skeleton className="h-6 w-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {users.length} Users with Tickets · {totalTickets} Total Tickets
                    {selectedUser &&
                      ` (${formatUserDisplayName(selectedUser)} selected)`}
                  </span>
                </div>
                <Button
                  onClick={handleRandomSelect}
                  disabled={users.length === 0 || selecting}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  size="sm"
                >
                  {selecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Selecting...
                    </>
                  ) : (
                    <>
                      <Shuffle className="h-4 w-4 mr-2" />
                      Select Winner
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((user, index) => (
                  <div
                    key={user._id}
                    className={`relative p-4 border rounded-lg transition-all duration-200 cursor-pointer ${
                      selectedUser?._id === user._id 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800 shadow-lg scale-105' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-md'
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    {/* Rank indicator */}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                      {index < 3 && (
                        <Trophy 
                          className={`h-3 w-3 ${
                            index === 0 ? 'text-yellow-500' : 
                            index === 1 ? 'text-gray-400' : 
                            'text-orange-600'
                          }`} 
                        />
                      )}
                    </div>

                    {/* User avatar and info */}
                    <div className="flex flex-col items-center text-center space-y-3">
                      {user.image ? (
                        <Image
                          src={user.image}
                          alt={formatUserDisplayName(user)}
                          width={60}
                          height={60}
                          className="w-15 h-15 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-15 h-15 bg-gray-200 rounded-full flex items-center justify-center border-2 border-gray-200">
                          <span className="text-lg font-medium text-gray-600">
                            {formatUserDisplayName(user)[0].toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatUserDisplayName(user)}
                        </h3>
                        <p className="text-xs text-gray-500 truncate max-w-full">
                          {user.email}
                        </p>
                        {user.steamId && (
                          <p className="text-xs text-gray-400">
                            Steam: {user.steamId}
                          </p>
                        )}
                      </div>

                      {/* Ticket count */}
                      <div className="w-full space-y-2">
                        <Badge variant="default" className="text-xs bg-blue-500 w-full justify-center">
                          <Ticket className="h-3 w-3 mr-1" />
                          {user.weeklyTicket.totalTicketsEarned} tickets
                        </Badge>
                        
                        {/* Game breakdown */}
                        <div className="text-xs text-gray-500 space-y-1">
                          {Object.entries(user.weeklyTicket.ticketsByGameType)
                            .filter(([_, count]) => count > 0)
                            .map(([game, count]) => (
                              <div key={game} className="flex justify-between">
                                <span>{game}:</span>
                                <span className="font-medium">{count}</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Selection indicator */}
                      {selectedUser?._id === user._id && (
                        <div className="absolute inset-0 border-2 border-green-500 rounded-lg bg-green-50/20 dark:bg-green-950/20">
                          <div className="absolute top-2 left-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {users.length === 0 && (
                <div className="text-center py-8">
                  <Ticket className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No users with tickets</h3>
                  <p className="text-gray-500">No users earned tickets for this week's prize draw.</p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={awarding || selecting}>
            Cancel
          </Button>
          <Button
            onClick={handleAwardPrize}
            disabled={!selectedUser || awarding || selecting || !weeklyPrize}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {awarding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Awarding...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Award Prize
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SelectWinnersModal;
