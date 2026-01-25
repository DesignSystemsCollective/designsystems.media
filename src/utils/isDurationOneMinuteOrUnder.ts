/**
 * Checks if a duration string in format "HH:MM:SS" represents a duration of one minute or less
 * @param duration - Duration string in format "HH:MM:SS" or a number
 * @returns true if duration is 60 seconds or less, false otherwise
 */
export const isDurationOneMinuteOrUnder = (duration: string | number | undefined): boolean => {
  if (!duration) return false;
  
  // If it's a number, treat it as seconds
  if (typeof duration === 'number') {
    return duration <= 60;
  }

  // If it's a string, parse it as HH:MM:SS
  const regex = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/;
  const match = duration.match(regex);

  if (match) {
    const [, hours, minutes, seconds] = match.map(Number);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return totalSeconds <= 60;
  }

  return false;
};
