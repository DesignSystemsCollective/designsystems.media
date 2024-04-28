export const isDurationUnderOneMinute = (durationString) => {
  // Define a regex pattern to match hh:mm:ss format
  const regex = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/;

  // Use regex to extract hours, minutes, and seconds
  const match = durationString.match(regex);

  // If match is found and duration is less than 1 minute, return true
  if (match) {
    const [, hours, minutes, seconds] = match.map(Number);
    return hours === 0 && minutes === 0 && seconds < 60;
  }

  // Return false if the duration string does not match the expected format
  return false;
};
