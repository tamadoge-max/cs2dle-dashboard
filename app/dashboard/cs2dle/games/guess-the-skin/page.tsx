"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Search, Eye } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserSummary {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  answerCount: number;
  lastAnswerDate: string;
}

interface UserAnswer {
  date: string;
  skinId: string;
  skinName?: string;
  skinImage?: string;
  weapon?: string;
  rarity?: {
    name: string;
    color: string;
  };
}

interface UserDetailData {
  user: {
    userId: string;
    userName: string | null;
    userEmail: string | null;
    userImage: string | null;
  };
  answers: UserAnswer[];
}

const GuessTheSkin = () => {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetailData | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;

    // Apply search filter (by user name or email)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.userName?.toLowerCase().includes(query) ||
        user.userEmail?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cs2dle/games/answers/guess-skin');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAnswers = async (userId: string) => {
    try {
      setLoadingUserDetails(true);
      const response = await fetch(`/api/cs2dle/games/answers/guess-skin?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user answers');
      }

      const data = await response.json();
      setSelectedUser(data);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching user answers:', error);
    } finally {
      setLoadingUserDetails(false);
    }
  };

  const handleViewUserAnswers = (userId: string) => {
    fetchUserAnswers(userId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/cs2dle/games">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Games
            </Button>
          </Link>
        </div>
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/cs2dle/games">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Games
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-center">
        <Image
          src="/images/cs2dle/logo.png"
          alt="Guess the Skin"
          width={300}
          height={300}
        />
      </div>

      <div className="text-center">
        <p className="text-muted-foreground">
          Click on a user to view their answer history
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Control */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Total Answers</TableHead>
                  <TableHead>Last Answer Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.userId} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.userImage || `https://api.dicebear.com/7.x/initials/svg?seed=${user.userName || user.userEmail}`} />
                            <AvatarFallback>
                              {(user.userName || user.userEmail || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {user.userName || 'Unknown User'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.userEmail}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {user.answerCount} answer{user.answerCount !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.lastAnswerDate ? formatDate(user.lastAnswerDate) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewUserAnswers(user.userId)}
                          disabled={loadingUserDetails}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Answers
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Answers Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedUser && (
                <>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedUser.user.userImage || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedUser.user.userName || selectedUser.user.userEmail}`} />
                    <AvatarFallback>
                      {(selectedUser.user.userName || selectedUser.user.userEmail || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div>{selectedUser.user.userName || 'Unknown User'}</div>
                    <div className="text-sm font-normal text-muted-foreground">
                      {selectedUser.user.userEmail}
                    </div>
                  </div>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Viewing all answers for this user ({selectedUser?.answers.length || 0} total)
            </DialogDescription>
          </DialogHeader>

          {loadingUserDetails ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Skin</TableHead>
                    <TableHead>Weapon</TableHead>
                    <TableHead>Rarity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedUser?.answers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No answers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedUser?.answers.map((answer, index) => (
                      <TableRow key={`${answer.date}-${index}`}>
                        <TableCell className="font-medium">
                          {formatDate(answer.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {answer.skinImage && (
                              <img
                                src={answer.skinImage}
                                alt={answer.skinName || 'Skin'}
                                className="h-12 w-20 object-contain"
                              />
                            )}
                            <div className="font-medium">
                              {answer.skinName || answer.skinId}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {answer.weapon || '-'}
                        </TableCell>
                        <TableCell>
                          {answer.rarity ? (
                            <Badge 
                              style={{ 
                                backgroundColor: answer.rarity.color + '20',
                                color: answer.rarity.color,
                                borderColor: answer.rarity.color
                              }}
                              className="border"
                            >
                              {answer.rarity.name}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuessTheSkin;
