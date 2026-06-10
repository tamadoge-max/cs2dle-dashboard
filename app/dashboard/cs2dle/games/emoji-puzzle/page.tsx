"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import EmojiPicker from "emoji-picker-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Image from "next/image";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Gamepad2,
  AlertCircle,
  CheckCircle,
  Search,
  Loader2,
  Sparkles,
  Edit,
  MagnetIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  DailyEmojiPuzzle,
  EmojiPuzzleAnswer,
} from "@/types/cs2dle/games/emoji-puzzle";

const EmojiPuzzlePage = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [dailyGame, setDailyGame] = useState<DailyEmojiPuzzle | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingSkin, setAddingSkin] = useState(false);
  const [newSkin, setNewSkin] = useState({
    skinId: "",
    emojis: ["", "", "", "", ""],
    hints: {
      english: ["", "", "", "", ""],
      dutch: ["", "", "", "", ""],
      chinese: ["", "", "", "", ""],
      russian: ["", "", "", "", ""],
    },
    skin: {
      id: "",
      name: "",
      description: "",
      image: "",
      weapon: "",
      category: "",
      pattern: "",
      rarity: {
        id: "",
        name: "",
        color: "",
      },
      team: "",
      stattrak: false,
      souvenir: false,
    },
  });

  // Modal states
  const [isAddSkinModalOpen, setIsAddSkinModalOpen] = useState(false);
  const [isEditSkinModalOpen, setIsEditSkinModalOpen] = useState(false);
  const [isSkinSearchModalOpen, setIsSkinSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSkinFromSearch, setSelectedSkinFromSearch] =
    useState<any>(null);
  const [editingAnswer, setEditingAnswer] = useState<EmojiPuzzleAnswer | null>(
    null
  );

  // Emoji generation states
  const [isGeneratingEmojis, setIsGeneratingEmojis] = useState(false);

  // Emoji picker states
  const [emojiPickerOpen, setEmojiPickerOpen] = useState<number | null>(null);

  // Random skin generation states
  const [isGeneratingRandomSkins, setIsGeneratingRandomSkins] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({
    current: 0,
    total: 10,
    currentSkin: "",
    status: "idle" as "idle" | "generating" | "completed" | "error",
  });

  const { toast } = useToast();

  // Emoji input component with picker
  const EmojiInput = ({
    value,
    onChange,
    placeholder,
    index,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    index: number;
  }) => {
    return (
      <div className="relative emoji-picker-container">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setEmojiPickerOpen(index)}
          placeholder={placeholder}
          className="text-center"
        />
        {emojiPickerOpen === index && (
          <div className="absolute top-full left-0 z-50 mt-1 emoji-picker-container">
            <EmojiPicker
              onEmojiClick={(emojiData) => {
                onChange(emojiData.emoji);
                setEmojiPickerOpen(null);
              }}
              width={300}
              height={400}
            />
          </div>
        )}
      </div>
    );
  };

  // Fetch daily games for selected date
  const fetchDailyGames = async (date: Date) => {
    setLoading(true);
    try {
      const dateString = format(date, "yyyy-MM-dd");
      const response = await fetch(
        `/api/cs2dle/games/answers/emoji-puzzle?date=${dateString}`
      );
      const data = await response.json();

      if (response.ok) {
        setDailyGame(data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch daily games",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch daily games",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new skin to daily games
  const addSkin = async () => {
    if (!selectedSkinFromSearch) {
      toast({
        title: "Error",
        description: "Please select a skin first",
        variant: "destructive",
      });
      return;
    }

    if (!newSkin.emojis.some((emoji) => emoji.trim())) {
      toast({
        title: "Error",
        description: "Please add at least one emoji",
        variant: "destructive",
      });
      return;
    }

    setAddingSkin(true);
    try {
      const response = await fetch("/api/cs2dle/games/answers/emoji-puzzle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: format(selectedDate, "yyyy-MM-dd"),
          answer: newSkin,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message,
        });
        setDailyGame(data.game);
        closeAddSkinModal();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add skin",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add skin",
        variant: "destructive",
      });
    } finally {
      setAddingSkin(false);
    }
  };

  // Remove skin from daily games
  const removeSkin = async (skinId: string) => {
    try {
      const dateString = format(selectedDate, "yyyy-MM-dd");
      const response = await fetch(
        `/api/cs2dle/games/answers/emoji-puzzle?date=${dateString}&skinId=${skinId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message,
        });
        setDailyGame(data.game);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to remove skin",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove skin",
        variant: "destructive",
      });
    }
  };

  // Update game status
  const updateStatus = async (status: string) => {
    try {
      const response = await fetch("/api/cs2dle/games/answers/emoji-puzzle", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: format(selectedDate, "yyyy-MM-dd"),
          status,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message,
        });
        setDailyGame(data.game);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update status",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  // Update existing skin answer
  const updateSkin = async () => {
    if (!editingAnswer) {
      toast({
        title: "Error",
        description: "No answer selected for editing",
        variant: "destructive",
      });
      return;
    }

    if (!newSkin.emojis.some((emoji) => emoji.trim())) {
      toast({
        title: "Error",
        description: "Please add at least one emoji",
        variant: "destructive",
      });
      return;
    }

    setAddingSkin(true);
    try {
      const response = await fetch("/api/cs2dle/games/answers/emoji-puzzle", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: format(selectedDate, "yyyy-MM-dd"),
          skinId: editingAnswer.skinId,
          answer: newSkin,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message,
        });
        setDailyGame(data.game);
        closeEditSkinModal();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update skin",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update skin",
        variant: "destructive",
      });
    } finally {
      setAddingSkin(false);
    }
  };

  // Skin search function
  const searchSkins = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);

      const response = await fetch(
        `/api/cs2dle/games/skins/search?q=${encodeURIComponent(query)}&limit=10`
      );

      if (!response.ok) {
        throw new Error("Failed to search skins");
      }

      const data = await response.json();
      setSearchResults(data.skins || []);
    } catch (error) {
      console.error("Error searching skins:", error);
      toast({
        title: "Error",
        description: "Failed to search skins",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchSkins(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Auto-fill form with selected skin
  const handleSkinSelect = (skin: any) => {
    setSelectedSkinFromSearch(skin);
    setNewSkin((prev) => ({
      ...prev,
      skinId: skin.id,
      skin: {
        id: skin.id,
        name: skin.name,
        description: skin.description || "",
        image: skin.image || "",
        weapon: skin.weapon?.name || skin.weapon || "",
        category: skin.category?.name || skin.category || "",
        pattern: skin.pattern?.name || skin.pattern || "",
        rarity: skin.rarity || {
          id: "unknown",
          name: "Unknown",
          color: "#b0c3d9",
        },
        team: skin.team?.name || skin.team || "",
        stattrak: skin.stattrak || false,
        souvenir: skin.souvenir || false,
      },
    }));
    setIsSkinSearchModalOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Reset form
  const resetForm = () => {
    setNewSkin({
      skinId: "",
      emojis: ["", "", "", "", ""],
      hints: {
        english: ["", "", "", "", ""],
        dutch: ["", "", "", "", ""],
        chinese: ["", "", "", "", ""],
        russian: ["", "", "", "", ""],
      },
      skin: {
        id: "",
        name: "",
        description: "",
        image: "",
        weapon: "",
        category: "",
        pattern: "",
        rarity: {
          id: "",
          name: "",
          color: "",
        },
        team: "",
        stattrak: false,
        souvenir: false,
      },
    });
    setSelectedSkinFromSearch(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Generate emojis and hints using AI
  const generateEmojis = async () => {
    if (!selectedSkinFromSearch) {
      toast({
        title: "Error",
        description: "Please select a skin first",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingEmojis(true);
    try {
      const response = await fetch(
        "/api/cs2dle/games/answers/generate-emojis/open-ai",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            skinName: selectedSkinFromSearch.name,
            skinDescription: selectedSkinFromSearch.description || "",
            weapon:
              selectedSkinFromSearch.weapon?.name ||
              selectedSkinFromSearch.weapon ||
              "",
            image: selectedSkinFromSearch.image || "",
            rarity: selectedSkinFromSearch.rarity?.name || "",
            team:
              selectedSkinFromSearch.team?.name ||
              selectedSkinFromSearch.team ||
              "",
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.emojis && data.hints) {
        setNewSkin((prev) => ({
          ...prev,
          emojis: data.emojis,
          hints: data.hints,
        }));
        toast({
          title: "Success",
          description: "Emojis and hints generated successfully!",
        });
      } else {
        throw new Error(data.error || "Failed to generate emojis");
      }
    } catch (error) {
      console.error("Error generating emojis:", error);
      toast({
        title: "Error",
        description: "Failed to generate emojis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingEmojis(false);
    }
  };

  // Close modal and reset form
  const closeAddSkinModal = () => {
    setIsAddSkinModalOpen(false);
    resetForm();
  };

  // Open edit modal with existing answer data
  const openEditSkinModal = (answer: EmojiPuzzleAnswer) => {
    setEditingAnswer(answer);
    setNewSkin({
      skinId: answer.skinId,
      emojis: [...answer.emojis],
      hints: {
        english: [...(answer.hints?.english || [])],
        dutch: [...(answer.hints?.dutch || [])],
        chinese: [...(answer.hints?.chinese || [])],
        russian: [...(answer.hints?.russian || [])],
      },
      skin: { ...answer.skin },
    });
    setSelectedSkinFromSearch(answer.skin);
    setIsEditSkinModalOpen(true);
  };

  // Close edit modal and reset form
  const closeEditSkinModal = () => {
    setIsEditSkinModalOpen(false);
    setEditingAnswer(null);
    resetForm();
  };

  // Load games when date changes
  useEffect(() => {
    fetchDailyGames(selectedDate);
  }, [selectedDate]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerOpen !== null) {
        const target = event.target as Element;
        if (!target.closest(".emoji-picker-container")) {
          setEmojiPickerOpen(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [emojiPickerOpen]);

  const gameCount = dailyGame?.answers?.length || 0;
  const maxGames = 10;
  const canAddMore = gameCount < maxGames;

  const generateRandomSkins = async () => {
    setIsGeneratingRandomSkins(true);
    setIsProgressModalOpen(true);
    setGenerationProgress({
      current: 0,
      total: 10,
      currentSkin: "",
      status: "generating",
    });

    try {
      for (let i = 0; i < 10; i++) {
        // Fetch random skin
        const randomSkinResponse = await fetch(
          "/api/cs2dle/games/skins/random"
        );
        if (!randomSkinResponse.ok) {
          throw new Error("Failed to fetch random skin");
        }

        const randomSkinData = await randomSkinResponse.json();
        const randomSkin = randomSkinData.skin;

        // Update progress
        setGenerationProgress((prev) => ({
          ...prev,
          current: i + 1,
          currentSkin: randomSkin.name,
        }));

        // Generate emojis and hints for the skin
        const emojiResponse = await fetch(
          "/api/cs2dle/games/answers/generate-emojis/open-ai",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              skinName: randomSkin.name,
              skinDescription: randomSkin.description || "",
              weapon: randomSkin.weapon?.name || randomSkin.weapon || "",
              image: randomSkin.image || "",
              rarity: randomSkin.rarity?.name || "",
              team: randomSkin.team?.name || randomSkin.team || "",
            }),
          }
        );

        if (!emojiResponse.ok) {
          throw new Error("Failed to generate emojis");
        }

        const emojiData = await emojiResponse.json();

        // Prepare the answer data
        const answerData = {
          skinId: randomSkin.id,
          emojis: emojiData.emojis,
          hints: emojiData.hints,
          skin: {
            id: randomSkin.id,
            name: randomSkin.name,
            description: randomSkin.description || "",
            image: randomSkin.image || "",
            weapon: randomSkin.weapon?.name || randomSkin.weapon || "",
            category: randomSkin.category?.name || randomSkin.category || "",
            pattern: randomSkin.pattern?.name || randomSkin.pattern || "",
            rarity: randomSkin.rarity || {
              id: "unknown",
              name: "Unknown",
              color: "#b0c3d9",
            },
            team: randomSkin.team?.name || randomSkin.team || "",
            stattrak: randomSkin.stattrak || false,
            souvenir: randomSkin.souvenir || false,
          },
        };

        // Add the skin to the daily games
        const addResponse = await fetch(
          "/api/cs2dle/games/answers/emoji-puzzle",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              date: format(selectedDate, "yyyy-MM-dd"),
              answer: answerData,
            }),
          }
        );

        if (!addResponse.ok) {
          throw new Error("Failed to add skin to daily games");
        }

        const addData = await addResponse.json();
        setDailyGame(addData.game);

        // Small delay to show progress
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Mark as completed
      setGenerationProgress((prev) => ({
        ...prev,
        status: "completed",
      }));

      toast({
        title: "Success",
        description:
          "Successfully generated 10 random skins for the emoji puzzle!",
      });
    } catch (error) {
      console.error("Error generating random skins:", error);
      setGenerationProgress((prev) => ({
        ...prev,
        status: "error",
      }));

      toast({
        title: "Error",
        description: "Failed to generate random skins. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingRandomSkins(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/cs2dle/games">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Games
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mb-8">
        <Image
          src="/images/cs2dle/logo.png"
          alt="CS2DLE Logo"
          width={300}
          height={300}
        />
      </div>

      <div>
        <div className="flex items-center justify-end gap-2">
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setIsDatePickerOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {canAddMore && (
        <div className="flex justify-end gap-4">
          <Button
            className="flex items-center gap-2"
            variant="outline"
            onClick={generateRandomSkins}
            disabled={isGeneratingRandomSkins}
          >
            {isGeneratingRandomSkins ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Skins...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate 10 Skins
              </>
            )}
          </Button>
          <Modal open={isAddSkinModalOpen} onOpenChange={setIsAddSkinModalOpen}>
            <ModalTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Skin ({gameCount}/{maxGames})
              </Button>
            </ModalTrigger>
            <ModalContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <ModalHeader>
                <ModalTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add New Skin to Emoji Puzzle
                </ModalTitle>
                <ModalDescription>
                  Select a skin and add emojis with hints to create a new emoji
                  puzzle game for {format(selectedDate, "PPP")}
                </ModalDescription>
              </ModalHeader>

              <div className="space-y-6">
                {/* Skin Selection */}
                <div className="space-y-2">
                  <Label>Select Skin *</Label>
                  <div className="flex gap-2">
                    <Modal
                      open={isSkinSearchModalOpen}
                      onOpenChange={setIsSkinSearchModalOpen}
                    >
                      <ModalTrigger asChild>
                        <Button variant="outline" className="flex-1">
                          <Search className="h-4 w-4 mr-2" />
                          {selectedSkinFromSearch
                            ? selectedSkinFromSearch.name
                            : "Search for a skin"}
                        </Button>
                      </ModalTrigger>
                      <ModalContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <ModalHeader>
                          <ModalTitle>Search for a Skin</ModalTitle>
                          <ModalDescription>
                            Search and select a skin to automatically fill the
                            form
                          </ModalDescription>
                        </ModalHeader>

                        <div className="space-y-4">
                          {/* Search Input */}
                          <div className="space-y-2">
                            <Label>Search for a skin *</Label>
                            <div className="relative">
                              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Enter skin name (e.g., AK-47 Redline)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 focus:outline-none focus:ring-0 focus-visible:ring-0"
                              />
                              {isSearching && (
                                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* Search Results */}
                          {searchResults.length > 0 && (
                            <div className="space-y-2">
                              <Label>Search Results</Label>
                              <div className="max-h-60 overflow-y-auto space-y-2 border p-2">
                                {searchResults.map((skin) => (
                                  <div
                                    key={skin.id}
                                    className={`p-3 border cursor-pointer transition-colors ${
                                      selectedSkinFromSearch?.id === skin.id
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 hover:border-gray-300"
                                    }`}
                                    onClick={() => handleSkinSelect(skin)}
                                  >
                                    <div className="flex items-center gap-3">
                                      {skin.image && (
                                        <div className="w-20 h-16 relative flex-shrink-0">
                                          <Image
                                            src={skin.image}
                                            alt={skin.name}
                                            fill
                                            className="object-contain"
                                          />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">
                                          {skin.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {skin.weapon?.name || skin.weapon} •{" "}
                                          {skin.category?.name || skin.category}
                                        </p>
                                      </div>
                                      {skin.rarity && (
                                        <Badge
                                          className="text-xs"
                                          style={{
                                            backgroundColor: skin.rarity.color,
                                            color: "white",
                                            textShadow:
                                              "0 1px 2px rgba(0,0,0,0.3)",
                                          }}
                                        >
                                          {skin.rarity.name}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </ModalContent>
                    </Modal>
                    {selectedSkinFromSearch && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedSkinFromSearch(null);
                          setNewSkin((prev) => ({
                            ...prev,
                            skinId: "",
                            skin: {
                              id: "",
                              name: "",
                              description: "",
                              image: "",
                              weapon: "",
                              category: "",
                              pattern: "",
                              rarity: { id: "", name: "", color: "" },
                              team: "",
                              stattrak: false,
                              souvenir: false,
                            },
                          }));
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {/* Selected Skin Preview */}
                {selectedSkinFromSearch && (
                  <div className="p-4 border rounded-lg bg-black/50">
                    <div className="flex items-center gap-3">
                      {selectedSkinFromSearch.image && (
                        <div className="w-20 h-16 relative flex-shrink-0">
                          <Image
                            src={selectedSkinFromSearch.image}
                            alt={selectedSkinFromSearch.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold">
                          {selectedSkinFromSearch.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedSkinFromSearch.weapon?.name ||
                            selectedSkinFromSearch.weapon}{" "}
                          •{" "}
                          {selectedSkinFromSearch.category?.name ||
                            selectedSkinFromSearch.category}
                        </p>
                        {selectedSkinFromSearch.rarity && (
                          <Badge
                            className="mt-1 text-xs"
                            style={{
                              backgroundColor:
                                selectedSkinFromSearch.rarity.color,
                              color: "white",
                              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                            }}
                          >
                            {selectedSkinFromSearch.rarity.name}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Generate Emojis Button */}
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        onClick={generateEmojis}
                        disabled={isGeneratingEmojis}
                        className="w-full"
                        variant="outline"
                      >
                        {isGeneratingEmojis ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating Emojis...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Emojis & Hints with AI
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        AI will generate 5 emojis and English hints based on the
                        skin details
                      </p>
                    </div>
                  </div>
                )}

                {/* Emojis */}
                <div className="space-y-2">
                  <Label>Emojis (5 required)</Label>
                  <div className="flex items-center justify-center gap-3">
                    {newSkin.emojis.map((emoji, index) => (
                      <EmojiInput
                        key={index}
                        value={emoji}
                        onChange={(value) => {
                          const newEmojis = [...newSkin.emojis];
                          newEmojis[index] = value;
                          setNewSkin((prev) => ({
                            ...prev,
                            emojis: newEmojis,
                          }));
                        }}
                        placeholder="⚖️"
                        index={index}
                      />
                    ))}
                  </div>
                </div>

                {/* Hints */}
                <div className="space-y-4">
                  <Label>English Hints (5 required)</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {newSkin.hints.english.map((hint, index) => (
                      <Input
                        key={index}
                        value={hint}
                        onChange={(e) => {
                          const newHints = { ...newSkin.hints };
                          newHints.english[index] = e.target.value;
                          setNewSkin((prev) => ({
                            ...prev,
                            hints: newHints,
                          }));
                        }}
                        placeholder={`English hint ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={closeAddSkinModal}>
                    Cancel
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Reset Form
                  </Button>
                  <Button
                    onClick={addSkin}
                    disabled={addingSkin || !selectedSkinFromSearch}
                  >
                    {addingSkin ? "Adding..." : "Add Skin"}
                  </Button>
                </div>
              </div>
            </ModalContent>
          </Modal>
        </div>
      )}

      {/* Edit Skin Modal */}
      <Modal open={isEditSkinModalOpen} onOpenChange={setIsEditSkinModalOpen}>
        <ModalContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Skin Answer
            </ModalTitle>
            <ModalDescription>
              Edit the emojis and hints for {editingAnswer?.skin.name} on{" "}
              {format(selectedDate, "PPP")}
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-6">
            {/* Selected Skin Preview */}
            {editingAnswer && (
              <div className="p-4 border rounded-lg bg-black/50">
                <div className="flex items-center gap-3">
                  {editingAnswer.skin.image && (
                    <div className="w-20 h-16 relative flex-shrink-0">
                      <Image
                        src={editingAnswer.skin.image}
                        alt={editingAnswer.skin.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{editingAnswer.skin.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {editingAnswer.skin.weapon} •{" "}
                      {editingAnswer.skin.category}
                    </p>
                    {editingAnswer.skin.rarity && (
                      <Badge
                        className="mt-1 text-xs"
                        style={{
                          backgroundColor: editingAnswer.skin.rarity.color,
                          color: "white",
                          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                        }}
                      >
                        {editingAnswer.skin.rarity.name}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Generate Emojis Button */}
                <div className="mt-4 pt-4 border-t">
                  <Button
                    onClick={generateEmojis}
                    disabled={isGeneratingEmojis}
                    className="w-full"
                    variant="outline"
                  >
                    {isGeneratingEmojis ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Emojis...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Regenerate Emojis & Hints with AI
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    AI will regenerate 5 emojis and English hints based on the
                    skin details
                  </p>
                </div>
              </div>
            )}

            {/* Emojis */}
            <div className="space-y-2">
              <Label>Emojis (5 required)</Label>
              <div className="grid grid-cols-1 gap-2">
                {newSkin.emojis.map((emoji, index) => (
                  <EmojiInput
                    key={index}
                    value={emoji}
                    onChange={(value) => {
                      const newEmojis = [...newSkin.emojis];
                      newEmojis[index] = value;
                      setNewSkin((prev) => ({
                        ...prev,
                        emojis: newEmojis,
                      }));
                    }}
                    placeholder="⚖️"
                    index={index}
                  />
                ))}
              </div>
            </div>

            {/* Hints */}
            <div className="space-y-4">
              <Label>English Hints (5 required)</Label>
              <div className="grid grid-cols-1 gap-2">
                {newSkin.hints.english.map((hint, index) => (
                  <Input
                    key={index}
                    value={hint}
                    onChange={(e) => {
                      const newHints = { ...newSkin.hints };
                      newHints.english[index] = e.target.value;
                      setNewSkin((prev) => ({
                        ...prev,
                        hints: newHints,
                      }));
                    }}
                    placeholder={`English hint ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeEditSkinModal}>
                Cancel
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Reset Form
              </Button>
              <Button onClick={updateSkin} disabled={addingSkin}>
                {addingSkin ? "Updating..." : "Update Skin"}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>

      {/* Progress Modal */}
      <Modal open={isProgressModalOpen} onOpenChange={setIsProgressModalOpen}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generating Random Skins
            </ModalTitle>
            <ModalDescription>
              Automatically generating 10 random skins with AI-generated emojis
              and hints
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>
                  {generationProgress.current}/{generationProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (generationProgress.current / generationProgress.total) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Current Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {generationProgress.status === "generating" && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                )}
                {generationProgress.status === "completed" && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                {generationProgress.status === "error" && (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm font-medium">
                  {generationProgress.status === "generating" &&
                    "Processing..."}
                  {generationProgress.status === "completed" && "Completed!"}
                  {generationProgress.status === "error" && "Error occurred"}
                </span>
              </div>

              {generationProgress.currentSkin && (
                <p className="text-sm text-muted-foreground">
                  Current skin:{" "}
                  <span className="font-medium">
                    {generationProgress.currentSkin}
                  </span>
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end">
              {generationProgress.status === "completed" && (
                <Button onClick={() => setIsProgressModalOpen(false)}>
                  Close
                </Button>
              )}
              {generationProgress.status === "error" && (
                <Button onClick={() => setIsProgressModalOpen(false)}>
                  Close
                </Button>
              )}
              {generationProgress.status === "generating" && (
                <Button variant="outline" disabled>
                  Please wait...
                </Button>
              )}
            </div>
          </div>
        </ModalContent>
      </Modal>

      <Card>
        <CardHeader>
          <CardTitle>Current Games ({gameCount})</CardTitle>
          <CardDescription>
            {gameCount === 0
              ? "No games added for this date yet"
              : `Showing ${gameCount} game${
                  gameCount === 1 ? "" : "s"
                } for ${format(selectedDate, "PPP")}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading games...</p>
            </div>
          ) : dailyGame?.answers?.length === 0 ? (
            <div className="text-center py-8">
              <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No games added yet</p>
              <p className="text-sm text-muted-foreground">
                Add your first skin to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {dailyGame?.answers?.map((answer, index) => (
                <Card
                  key={answer.skinId}
                  className="overflow-hidden rounded-none hover:shadow-lg transition-shadow duration-200"
                >
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg font-bold text-white line-clamp-2">
                            {answer.skin.name}
                          </CardTitle>
                        </div>
                        <CardDescription className="text-sm font-medium text-gray-600">
                          {format(selectedDate, "PPP")}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    {/* Skin Image */}
                    <div className="relative aspect-[4/3] overflow-hidden flex items-center justify-center border">
                      {answer.skin.image ? (
                        <Image
                          src={answer.skin.image}
                          alt={answer.skin.name}
                          className="w-full h-full object-contain p-4"
                          width={400}
                          height={300}
                          onError={(e: any) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <div className="text-4xl mb-2">🔫</div>
                            <p className="text-sm">No image available</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Emojis and Hints */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">
                        Emojis & Hints:
                      </div>
                      <div className="space-y-1">
                        {Array.from({ length: 5 }).map((_, emojiIndex) => (
                          <div
                            key={emojiIndex}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="text-lg">
                              {answer.emojis[emojiIndex] || "❓"}
                            </span>
                            <span className="text-gray-600 truncate">
                              {answer.hints?.english?.[emojiIndex] || "No hint"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => openEditSkinModal(answer)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="px-3"
                        onClick={() => removeSkin(answer.skinId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmojiPuzzlePage;
