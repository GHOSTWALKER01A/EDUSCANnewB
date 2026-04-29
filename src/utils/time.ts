
import { ApiError } from "./ApiError.js";




export function parseTimeToMinutes(timeStr: string): number {
  // Accepts "9:00 AM - 9:45 AM" or "09:00 AM - 09:45 AM"
  const start = timeStr.split(' - ')[0].trim();

  const m = start.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!m) throw new ApiError(400, 'Invalid time format');

  let hours = parseInt(m[1], 10);

  const minutes = parseInt(m[2], 10);

  const period = m[3].toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;

  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function isWithinWindow(classDate: Date, classTime: string, windowMinutesBeforeEnd = 20, durationMinutes = 45): boolean {
  const startDate = new Date(classDate);
  startDate.setHours(0,0,0,0);

  const startMinutes = parseTimeToMinutes(classTime);
  startDate.setMinutes(startMinutes);

  const classEnd = new Date(startDate.getTime() + durationMinutes * 60000);
  
  const windowStart = new Date(classEnd.getTime() - windowMinutesBeforeEnd * 60000);
  const now = new Date();
  
  return now >= windowStart && now <= classEnd;
}