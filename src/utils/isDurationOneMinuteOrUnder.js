export const isDurationOneMinuteOrUnder = (durationString) => {
  const regex = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/;
  const match = durationString.match(regex);

  if (match) {
    const [, hours, minutes, seconds] = match.map(Number);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return totalSeconds <= 60;
  }

  return false;
};
