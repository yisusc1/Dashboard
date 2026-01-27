"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { addDays, format } from "date-fns"
import { es } from "date-fns/locale"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps {
    className?: string
    date?: DateRange
    onDateChange?: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({
    className,
    date,
    onDateChange,
}: DatePickerWithRangeProps) {
    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal bg-white h-12 rounded-xl border-slate-200 hover:bg-slate-50",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "dd MMM", { locale: es })} -{" "}
                                    {format(date.to, "dd MMM, yyyy", { locale: es })}
                                </>
                            ) : (
                                format(date.from, "dd MMM, yyyy", { locale: es })
                            )
                        ) : (
                            <span>Filtrar por fecha...</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={onDateChange}
                        numberOfMonths={2}
                        locale={es}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
