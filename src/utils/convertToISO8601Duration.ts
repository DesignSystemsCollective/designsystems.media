/**
 * Converts a time string in format "HH:MM:SS" to ISO 8601 duration format
 * @param time - Time string in format "HH:MM:SS"
 * @returns Duration in ISO 8601 format (e.g., "PT1H30M15S")
 */
export const convertToISO8601Duration = (time: string): string => {
  const [h = "0", m = "0", s = "0"] = time.split(":").reverse();
  const hours = parseInt(h, 10) || 0;
  const minutes = parseInt(m, 10) || 0;
  const seconds = parseInt(s, 10) || 0;
  let result = "PT";
  if (hours) result += `${hours}H`;
  if (minutes) result += `${minutes}M`;
  if (seconds) result += `${seconds}S`;
  return result;
};
