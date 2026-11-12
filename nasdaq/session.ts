// US Market Session Hours (16:30 - 23:00 TR time) Validator
export function getNasdaqSessionStatus(now: Date = new Date()): { isOpen: boolean; phase: string } {
  const trTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
  const hours = trTime.getHours();
  const minutes = trTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const day = trTime.getDay();
  if (day === 0 || day === 6) {
    return { isOpen: false, phase: "WEEKEND_CLOSED" };
  }

  const openMinutes = 16 * 60 + 30; // 16:30
  const closeMinutes = 23 * 60;     // 23:00

  if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
    return { isOpen: true, phase: "REGULAR_MARKET" };
  } else if (currentMinutes >= 11 * 60 && currentMinutes < openMinutes) {
    return { isOpen: false, phase: "PRE_MARKET" };
  } else {
    return { isOpen: false, phase: "AFTER_HOURS" };
  }
}
