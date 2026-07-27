/**
 * Converts a time string in format "HH:MM:SS" to ISO 8601 duration format
 * @param time - Time string in format "HH:MM:SS" or a number in seconds
 * @returns Duration in ISO 8601 format (e.g., "PT1H30M15S")
 */
export const convertToISO8601Duration = (time: string | number | undefined): string => {
  if (!time) return "PT0S";

  let hours: number;
  let minutes: number;
  let seconds: number;

  if (typeof time === 'number') {
    // Convert from seconds to hours/minutes/seconds
    hours = Math.floor(time / 3600);
    minutes = Math.floor((time % 3600) / 60);
    seconds = time % 60;
  } else {
    // Parse a colon-separated string ("H:M:S", "M:S", or just "S").
    // split(":").reverse() aligns from the least-significant unit (seconds)
    // first, so it works regardless of how many segments are present -
    // reversing ["H","M","S"] gives ["S","M","H"], so position 0 is
    // seconds, position 1 is minutes, position 2 is hours. (Previously this
    // destructured position 0/2 into `hours`/`seconds` directly - i.e. as
    // if the array were still in H,M,S order after being reversed - which
    // swapped hours and seconds for any 3-part input and mis-parsed
    // shorter inputs. Fixed here; see convertToISO8601Duration.test.ts for
    // the regression cases.)
    const [s = "0", m = "0", h = "0"] = time.split(":").reverse();
    hours = parseInt(h, 10) || 0;
    minutes = parseInt(m, 10) || 0;
    seconds = parseInt(s, 10) || 0;
  }

  if (!hours && !minutes && !seconds) return "PT0S";

  let result = "PT";
  if (hours) result += `${hours}H`;
  if (minutes) result += `${minutes}M`;
  if (seconds) result += `${seconds}S`;
  return result;
};
