/**
 * Checks if a duration string in format "HH:MM:SS" represents a duration of one minute or less
 * @param durationString - Duration string in format "HH:MM:SS"
 * @returns true if duration is 60 seconds or less, false otherwise
 */
export const isDurationOneMinuteOrUnder = (durationString: string): boolean => {
  const regex = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/;
  const match = durationString.match(regex);

  if (match) {
    const [, hours, minutes, seconds] = match.map(Number);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return totalSeconds <= 60;
  }

  return false;
};
