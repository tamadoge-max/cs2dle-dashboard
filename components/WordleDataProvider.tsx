'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

interface WordleAnswer {
  _id: string;
  date: string;
  status: string;
  answers: {
    Wordle: {
      word: string;
    };
  };
  createdBy?: string;
  lastModifiedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface WordleWord {
  _id: string;
  word: string;
  isCS2Related?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

interface WordleDataContextType {
  answers: WordleAnswer[];
  words: WordleWord[];
  loading: boolean;
  error: string | null;
  refreshAnswers: () => Promise<void>;
  refreshWords: () => Promise<void>;
  refreshAll: () => Promise<void>;
  updateWordCS2Relevance: (wordId: string, isCS2Related: boolean) => Promise<void>;
}

const WordleDataContext = createContext<WordleDataContextType | undefined>(undefined)

interface WordleDataProviderProps {
  children: ReactNode;
}

export function WordleDataProvider({ children }: WordleDataProviderProps) {
  const [answers, setAnswers] = useState<WordleAnswer[]>([])
  const [words, setWords] = useState<WordleWord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()

  const fetchAnswers = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      const response = await fetch("/api/cs2dle/games/answers?gameType=Wordle")
      if (response.ok) {
        const data = await response.json()
        setAnswers(data.answers || [])
      } else {
        throw new Error('Failed to fetch answers')
      }
    } catch (err) {
      console.error('Error fetching answers:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch answers')
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  const fetchWords = async () => {
    try {
      const response = await fetch("/api/cs2dle/games/words")
      if (response.ok) {
        const data = await response.json()
        setWords(data.words || [])
      } else {
        throw new Error('Failed to fetch words')
      }
    } catch (err) {
      console.error('Error fetching words:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch words')
    }
  }

  const refreshAnswers = async () => {
    await fetchAnswers(false)
  }

  const refreshWords = async () => {
    await fetchWords()
  }

  const refreshAll = async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([fetchAnswers(), fetchWords()])
    } finally {
      setLoading(false)
    }
  }

  const updateWordCS2Relevance = async (wordId: string, isCS2Related: boolean) => {
    try {
      const response = await fetch(`/api/cs2dle/games/words/${wordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isCS2Related }),
      })

      if (!response.ok) {
        throw new Error('Failed to update word CS2 relevance')
      }

      // Refresh words to get updated data
      await fetchWords()
    } catch (err) {
      console.error('Error updating word CS2 relevance:', err)
      setError(err instanceof Error ? err.message : 'Failed to update word CS2 relevance')
    }
  }

  useEffect(() => {
    // Only fetch data when user is authenticated
    if (session?.user) {
      refreshAll()
    } else {
      setLoading(false)
    }
  }, [session])

  const value: WordleDataContextType = {
    answers,
    words,
    loading,
    error,
    refreshAnswers,
    refreshWords,
    refreshAll,
    updateWordCS2Relevance
  }

  return (
    <WordleDataContext.Provider value={value}>
      {children}
    </WordleDataContext.Provider>
  )
}

export function useWordleData() {
  const context = useContext(WordleDataContext)
  if (context === undefined) {
    throw new Error('useWordleData must be used within a WordleDataProvider')
  }
  return context
}
