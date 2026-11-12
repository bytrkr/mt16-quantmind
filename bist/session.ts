// BIST Session Hours (09:40 - 18:10) Validator
export function isBistSessionOpen(now: Date = new Date()): { isOpen: boolean; phase: string } {
  const trTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
  const hours = trTime.getHours();
  const minutes = trTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const day = trTime.getDay();
  if (day === 0 || day === 6) {
    return { isOpen: false, phase: "WEEKEND_CLOSED" };
  }

  const openMinutes = 9 * 60 + 40;  // 09:40
  const closeMinutes = 18 * 60 + 10; // 18:10

  if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
    return { isOpen: true, phase: "CONTINUOUS" };
  }

  return { isOpen: false, phase: "SESSION_CLOSED" };
}
