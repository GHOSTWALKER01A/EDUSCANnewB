// src/utils/date.ts
import { startOfMonth, endOfMonth, formatISO } from 'date-fns'

export function monthKey(date: Date) {

  return formatISO(startOfMonth(date),
   { representation: 'date' }).slice(0, 7)
}

export function monthStart(date: Date) {
  return startOfMonth(date)
}

export function monthEnd(date: Date) {
  return endOfMonth(date)
}
