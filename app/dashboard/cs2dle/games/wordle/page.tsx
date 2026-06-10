"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlusIcon, Loader2, Search, X, Trash2, Gamepad2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalContent, ModalDescription, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useWordleData } from "@/components/WordleDataProvider";

interface WordleWord {
  _id: string;
  word: string;
  isCS2Related?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

const WordlePage = () => {
  const { words, loading, refreshWords, updateWordCS2Relevance } = useWordleData();
  const [isAddWordModalOpen, setIsAddWordModalOpen] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [isCS2Related, setIsCS2Related] = useState(false);
  const [isAddingWord, setIsAddingWord] = useState(false);

  // Search and filter state
  const [allWordsSearchQuery, setAllWordsSearchQuery] = useState("");
  const [allWordsFiltered, setAllWordsFiltered] = useState<WordleWord[]>([]);
  const [cs2Filter, setCs2Filter] = useState<"all" | "cs2" | "non-cs2">("all");

  // Delete word modal state
  const [isDeleteWordModalOpen, setIsDeleteWordModalOpen] = useState(false);
  const [deletingWord, setDeletingWord] = useState<WordleWord | null>(null);
  const [isDeletingWord, setIsDeletingWord] = useState(false);

  // Loading state for CS2 relevance toggle
  const [togglingWordId, setTogglingWordId] = useState<string | null>(null);

  // Filter all words based on search query and CS2 filter
  useEffect(() => {
    let filtered = words;

    // Apply CS2 filter
    if (cs2Filter === "cs2") {
      filtered = filtered.filter(word => word.isCS2Related === true);
    } else if (cs2Filter === "non-cs2") {
      filtered = filtered.filter(word => word.isCS2Related === false);
    }

    // Apply search filter
    if (allWordsSearchQuery.trim() !== "") {
      filtered = filtered.filter(word =>
        word.word.toLowerCase().includes(allWordsSearchQuery.toLowerCase())
      );
    }

    setAllWordsFiltered(filtered);
  }, [allWordsSearchQuery, words, cs2Filter]);

  const handleAddWord = async () => {
    if (!newWord.trim()) {
      toast({
        title: "Error",
        description: "Please enter a word",
        variant: "destructive",
      });
      return;
    }

    if (newWord.length !== 5) {
      toast({
        title: "Error",
        description: "Word must be exactly 5 letters long",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingWord(true);

      const response = await fetch("/api/cs2dle/games/words", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          word: newWord.trim().toUpperCase(),
          isCS2Related,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add word");
      }

      toast({
        title: "Success",
        description: "Word added successfully",
      });

      // Refresh the words list
      await refreshWords();

      // Reset form
      setIsAddWordModalOpen(false);
      setNewWord("");
      setIsCS2Related(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add word";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAddingWord(false);
    }
  };

  const handleDeleteWord = (word: WordleWord) => {
    setDeletingWord(word);
    setIsDeleteWordModalOpen(true);
  };

  const confirmDeleteWord = async () => {
    if (!deletingWord) return;

    try {
      setIsDeletingWord(true);

      const response = await fetch(`/api/cs2dle/games/words/${deletingWord._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete word");
      }

      toast({
        title: "Success",
        description: "Word deleted successfully",
      });

      // Refresh the words list
      await refreshWords();

      // Reset delete form
      setIsDeleteWordModalOpen(false);
      setDeletingWord(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete word";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeletingWord(false);
    }
  };

  const handleToggleCS2Relevance = async (word: WordleWord) => {
    try {
      setTogglingWordId(word._id);
      await updateWordCS2Relevance(word._id, !word.isCS2Related);
      toast({
        title: "Success",
        description: `Word marked as ${!word.isCS2Related ? 'CS2 related' : 'not CS2 related'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update word CS2 relevance",
        variant: "destructive",
      });
    } finally {
      setTogglingWordId(null);
    }
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
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const cs2RelatedCount = words.filter(word => word.isCS2Related).length;
  const nonCS2Count = words.filter(word => !word.isCS2Related).length;

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

      <div className="text-center">
        <h1 className="text-3xl font-bold">Wordle</h1>
        <p className="text-muted-foreground">
          Manage Wordle words and their CS2 relevance
        </p>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">All Words ({words.length})</h2>
        <div className="flex gap-2">
          <Modal open={isAddWordModalOpen} onOpenChange={setIsAddWordModalOpen}>
            <ModalTrigger asChild>
              <Button variant="outline">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Word
              </Button>
            </ModalTrigger>
          </Modal>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search words..."
            value={allWordsSearchQuery}
            onChange={(e) => setAllWordsSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={cs2Filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setCs2Filter("all")}
          >
            All ({words.length})
          </Button>
          <Button
            variant={cs2Filter === "cs2" ? "default" : "outline"}
            size="sm"
            onClick={() => setCs2Filter("cs2")}
          >
            CS2 Related ({cs2RelatedCount})
          </Button>
          <Button
            variant={cs2Filter === "non-cs2" ? "default" : "outline"}
            size="sm"
            onClick={() => setCs2Filter("non-cs2")}
          >
            Non-CS2 ({nonCS2Count})
          </Button>
        </div>
      </div>

      {/* Words Grid */}
      <div className="border rounded-md">
        <div className="p-3 border-b bg-muted/50">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              {allWordsFiltered.length} word{allWordsFiltered.length !== 1 ? 's' : ''} found
            </span>
            {allWordsSearchQuery && (
              <span className="text-sm text-muted-foreground">
                Showing results for "{allWordsSearchQuery}"
              </span>
            )}
          </div>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10 gap-3">
            {allWordsFiltered.map((word) => (
              <div
                key={word._id}
                className="p-3 border rounded hover:bg-accent hover:text-accent-foreground transition-colors group relative"
                style={{
                  ...(word.isCS2Related && {borderColor: '#FFBA3B'}),
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{word.word}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 cursor-pointer"
                      onClick={() => handleToggleCS2Relevance(word)}
                      disabled={togglingWordId === word._id}
                      title={`Mark as ${word.isCS2Related ? 'not CS2 related' : 'CS2 related'}`}
                    >
                      {togglingWordId === word._id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Gamepad2 className={`h-3 w-3 ${word.isCS2Related ? 'text-green-600' : 'text-gray-400'}`} />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive cursor-pointer"
                      onClick={() => handleDeleteWord(word)}
                      title="Delete word"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Word Modal */}
      <Modal open={isAddWordModalOpen} onOpenChange={setIsAddWordModalOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Add New Word</ModalTitle>
            <ModalDescription>
              Add a new 5-letter word to the Wordle word list.
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newWord">Word</Label>
              <Input
                id="newWord"
                placeholder="Enter 5-letter word (e.g., HELLO)"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value.toUpperCase())}
                maxLength={5}
                className="uppercase"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Word must be exactly 5 letters long.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="cs2-related"
                checked={isCS2Related}
                onCheckedChange={setIsCS2Related}
              />
              <Label htmlFor="cs2-related">CS2 Related</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddWordModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddWord} disabled={isAddingWord || newWord.length !== 5}>
                {isAddingWord && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Word
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>

      {/* Delete Word Confirmation Modal */}
      <Modal open={isDeleteWordModalOpen} onOpenChange={setIsDeleteWordModalOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete Word</ModalTitle>
            <ModalDescription>
              Are you sure you want to delete the word "{deletingWord?.word}"?
              This action cannot be undone.
            </ModalDescription>
          </ModalHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteWordModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteWord} 
              disabled={isDeletingWord}
            >
              {isDeletingWord && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Word
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default WordlePage;