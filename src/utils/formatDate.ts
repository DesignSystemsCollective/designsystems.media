/**
 * Formats a date in a human-readable format
 * If the date is in the current year, shows only month and day (e.g., "Jan 1")
 * If the date is in a different year, includes the year (e.g., "Jan 1, 2024")
 * 
 * @param date - Date object to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date): string => {
  if (!(date instanceof Date)) {
    // Handle cases where 'date' might not be a Date object
    console.error("Invalid date object provided to formatDate:", date);
    return ""; // Or some other default value
  }

  const now = new Date();
  const isCurrentYear = date.getFullYear() === now.getFullYear();

  const options: Intl.DateTimeFormatOptions = {
    month: "short", // e.g., "Jan", "Feb"
    day: "numeric", // e.g., "1", "25"
  };

  if (!isCurrentYear) {
    options.year = "numeric"; // e.g., "2024"
  }

  return date.toLocaleDateString("en-us", options);
};
