'use client'

import * as React from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, X, RotateCcw } from 'lucide-react'
import { format, isSameDay, startOfDay } from 'date-fns'
import { cn } from '@/lib/utils'

interface MultiDateRangePickerProps {
  selectedDates: Date[]
  onDatesChange: (dates: Date[]) => void
  placeholder?: string
  className?: string
  maxDates?: number
  disabled?: boolean
}

export function MultiDateRangePicker({
  selectedDates,
  onDatesChange,
  placeholder = "Select dates",
  className,
  maxDates,
  disabled = false
}: MultiDateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [tempDates, setTempDates] = React.useState<Date[]>(selectedDates)
  const [isSelecting, setIsSelecting] = React.useState(false)
  const [selectionStart, setSelectionStart] = React.useState<Date | null>(null)

  // Update temp dates when selectedDates prop changes
  React.useEffect(() => {
    setTempDates(selectedDates)
  }, [selectedDates])

  // Reset selection state when popover closes
  React.useEffect(() => {
    if (!isOpen) {
      setIsSelecting(false)
      setSelectionStart(null)
    }
  }, [isOpen])

  const generateDateRange = React.useCallback((start: Date, end: Date): Date[] => {
    const dates: Date[] = []
    const current = new Date(Math.min(start.getTime(), end.getTime()))
    const endDate = new Date(Math.max(start.getTime(), end.getTime()))
    
    while (current <= endDate) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return dates
  }, [])

  const handleDateClick = React.useCallback((date: Date) => {
    if (disabled) return

    const normalizedDate = startOfDay(date)
    
    if (!isSelecting) {
      // Start new selection
      setIsSelecting(true)
      setSelectionStart(normalizedDate)
      setTempDates([normalizedDate])
    } else {
      // Complete selection
      if (selectionStart) {
        const datesInRange = generateDateRange(selectionStart, normalizedDate)
        
        // Check max dates limit
        if (maxDates && datesInRange.length > maxDates) {
          return // Don't allow selection if it exceeds max dates
        }
        
        setTempDates(datesInRange)
      }
      setIsSelecting(false)
      setSelectionStart(null)
    }
  }, [isSelecting, selectionStart, generateDateRange, maxDates, disabled])

  const handleApply = React.useCallback(() => {
    onDatesChange(tempDates)
    setIsOpen(false)
  }, [tempDates, onDatesChange])

  const handleClear = React.useCallback(() => {
    setTempDates([])
    onDatesChange([])
    setIsSelecting(false)
    setSelectionStart(null)
  }, [onDatesChange])

  const handleCancel = React.useCallback(() => {
    setTempDates(selectedDates)
    setIsOpen(false)
  }, [selectedDates])

  const handleReset = React.useCallback(() => {
    setTempDates([])
    setIsSelecting(false)
    setSelectionStart(null)
  }, [])

  const formatSelectedDates = React.useCallback(() => {
    if (selectedDates.length === 0) return placeholder
    
    if (selectedDates.length === 1) {
      return format(selectedDates[0], 'MMM dd, yyyy')
    }
    
    // Sort dates to ensure proper range display
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())
    const first = sortedDates[0]
    const last = sortedDates[sortedDates.length - 1]
    
    // Check if dates are consecutive
    const isConsecutive = sortedDates.every((date, index) => {
      if (index === 0) return true
      const prevDate = new Date(sortedDates[index - 1])
      prevDate.setDate(prevDate.getDate() + 1)
      return isSameDay(date, prevDate)
    })
    
    if (isConsecutive && sortedDates.length > 1) {
      return `${format(first, 'MMM dd')} - ${format(last, 'MMM dd, yyyy')}`
    }
    
    return `${selectedDates.length} date${selectedDates.length !== 1 ? 's' : ''} selected`
  }, [selectedDates, placeholder])

  const isDateSelected = React.useCallback((date: Date) => {
    const result = tempDates.some(d => isSameDay(d, date))
    return result
  }, [tempDates])

  const isDateInRange = React.useCallback((date: Date) => {
    if (tempDates.length < 2) return false
    
    const sortedDates = [...tempDates].sort((a, b) => a.getTime() - b.getTime())
    const start = sortedDates[0]
    const end = sortedDates[sortedDates.length - 1]
    
    return date >= start && date <= end
  }, [tempDates])

  // Keyboard navigation support
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return

      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          handleCancel()
          break
        case 'Enter':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            handleApply()
          }
          break
        case 'Backspace':
        case 'Delete':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            handleReset()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleCancel, handleApply, handleReset])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal transition-all duration-200",
            !selectedDates.length && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          aria-label={selectedDates.length > 0 ? 
            `Selected ${selectedDates.length} date${selectedDates.length !== 1 ? 's' : ''}. Click to change selection.` : 
            "Select date range"
          }
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">{formatSelectedDates()}</span>
          {selectedDates.length > 0 && !disabled && (
            <X 
              className="ml-auto h-4 w-4 hover:bg-muted rounded-sm p-0.5 transition-colors duration-150" 
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              aria-label="Clear selection"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 shadow-lg border-0" 
        align="start"
        sideOffset={4}
      >
        <div className="p-4 space-y-4">
          {/* Instructions */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            {isSelecting ? (
              <span className="text-primary font-medium block">
                Click another date to complete the range
              </span>
            ) : (
              <span className="block">Click a date to start selecting a range</span>
            )}
            <div className="text-xs opacity-75">
              <span>Press </span>
              <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Esc</kbd>
              <span> to cancel, </span>
              <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl+Enter</kbd>
              <span> to apply</span>
            </div>
          </div>

          {/* Calendar */}
          <div className="relative">
            <Calendar
              mode="single"
              selected={tempDates[0]}
              onSelect={(date) => date && handleDateClick(date)}
              modifiers={{
                selected: (date) => isDateSelected(date),
                range: (date) => isDateInRange(date),
              }}
              modifiersClassNames={{
                selected: "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold",
                range: "bg-primary/20 text-primary-foreground hover:bg-primary/30",
              }}
              className="rounded-md border-0"
              disabled={(date) => {
                if (disabled) return true
                if (maxDates && tempDates.length >= maxDates && !isDateSelected(date)) {
                  return true
                }
                return false
              }}
            />
          </div>
          
          {/* Status and Actions */}
          <div className="space-y-3">
            {/* Status */}
            <div className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                {tempDates.length > 0 ? (
                  <span>
                    {tempDates.length} date{tempDates.length !== 1 ? 's' : ''} selected
                    {maxDates && (
                      <span className="text-xs ml-1">
                        (max {maxDates})
                      </span>
                    )}
                  </span>
                ) : (
                  <span>No dates selected</span>
                )}
              </div>
              {tempDates.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleApply}
                className="flex-1"
                disabled={tempDates.length === 0}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}