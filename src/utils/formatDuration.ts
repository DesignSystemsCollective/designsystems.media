/**
 * Formats a duration string in the format "hh:mm:ss" to a human-readable format
 * @param duration - Duration string in the format "hh:mm:ss"
 * @returns Formatted duration string (e.g., "5m 30s", "1h 15m", etc.)
 */
export function formatDuration(duration: string): string {
  // Check if durationStr is a string
  if (typeof duration !== "string") {
    console.error("Invalid input: not a string");
    return "?";
  }

  // Check if the durationStr matches the expected format "hh:mm:ss"
  const regex = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/;
  const match = duration.match(regex);

  if (match) {
    const [, hours, minutes, seconds] = match.map(Number);

    if (hours === 0 && minutes === 0) {
      return `${seconds}s`;
    } else if (hours === 0 && minutes < 5 && seconds > 9) {
      return `${minutes}m ${seconds}s`;
    } else if (hours === 0 && minutes < 5) {
      return `${minutes}m`;
    } else if (hours === 0) {
      return `${minutes}m`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  }

  console.error("Invalid duration format. Expected format: hh:mm:ss");
  return "?";
}
