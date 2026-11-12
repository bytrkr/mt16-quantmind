// src/services/anomalies/calendarAnomalyService.ts

export interface CalendarAnomalyResult {
  isOpeningSpike: boolean;
  isClosingSpike: boolean;
  isWeekendRisk: boolean;
  calendarZScore: number;
  description: string;
}

export class CalendarAnomalyService {
  public static analyze(timestamp: number = Date.now()): CalendarAnomalyResult {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const dayOfWeek = date.getDay(); // 0: Pazar, 5: Cuma

    const currentMinuteOfDay = hours * 60 + minutes;
    
    // BIST Seans Saatleri: 10:00 - 18:10 (600 - 1090 dk)
    const isOpeningSpike = currentMinuteOfDay >= 600 && currentMinuteOfDay <= 630;
    const isClosingSpike = currentMinuteOfDay >= 1060 && currentMinuteOfDay <= 1090;
    const isWeekendRisk = dayOfWeek === 5 && hours >= 17;

    let calendarZScore = 0.0;
    if (isOpeningSpike || isClosingSpike) calendarZScore += 1.2;
    if (isWeekendRisk) calendarZScore -= 0.8;

    return {
      isOpeningSpike,
      isClosingSpike,
      isWeekendRisk,
      calendarZScore: Number(calendarZScore.toFixed(2)),
      description: isOpeningSpike 
        ? 'Açılış Hacim Şoku' 
        : isClosingSpike 
        ? 'Kapanış Karanlık Oda / Eşleşme Baskısı' 
        : 'Standart Zaman Dilimi',
    };
  }
}
