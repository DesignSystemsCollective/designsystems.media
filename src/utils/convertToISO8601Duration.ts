/**
 * Converts a time string in format "HH:MM:SS" to ISO 8601 duration format
 * @param time - Time string in format "HH:MM:SS" or a number in seconds
 * @returns Duration in ISO 8601 format (e.g., "PT1H30M15S")
 */
export const convertToISO8601Duration = (time: string | number | undefined): string => {
  if (!time) return "PT0S";
  
  // If it's a number, convert from seconds to ISO 8601
  if (typeof time === 'number') {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    
    let result = "PT";
    if (hours) result += `${hours}H`;
    if (minutes) result += `${minutes}M`;
    if (seconds) result += `${seconds}S`;
    return result || "PT0S";
  }
  
  // If it's a string, parse as HH:MM:SS
  const [h = "0", m = "0", s = "0"] = time.split(":").reverse();
  const hours = parseInt(h, 10) || 0;
  const minutes = parseInt(m, 10) || 0;
  const seconds = parseInt(s, 10) || 0;
  let result = "PT";
  if (hours) result += `${hours}H`;
  if (minutes) result += `${minutes}M`;
  if (seconds) result += `${seconds}S`;
  return result || "PT0S";
};
