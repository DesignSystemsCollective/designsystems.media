export const convertToISO8601Duration = (time) => {
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
