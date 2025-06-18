export const formatDate = (date) => {
  if (!(date instanceof Date)) {
    // Handle cases where 'date' might not be a Date object
    console.error("Invalid date object provided to formatDate:", date);
    return ""; // Or some other default value
  }

  const now = new Date();
  const isCurrentYear = date.getFullYear() === now.getFullYear();

  let options = {
    month: "short", // e.g., "Jan", "Feb"
    day: "numeric", // e.g., "1", "25"
  };

  if (!isCurrentYear) {
    options.year = "numeric"; // e.g., "2024"
  }

  return date.toLocaleDateString("en-us", options);
};