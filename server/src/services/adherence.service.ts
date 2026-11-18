import { doseRepo } from '../repositories/dose.repo.js';

export interface AdherenceMetrics {
  dailyRate: number; // Percentage for today
  weeklyRate: number; // Percentage for past 7 days
  monthlyRate: number; // Percentage for past 30 days
  currentStreakDays: number;
  bestStreakDays: number;
  totalScheduled: number;
  totalTaken: number;
  totalMissed: number;
  heatmap: Array<{
    date: string;
    total: number;
    taken: number;
    rate: number;
    level: 0 | 1 | 2 | 3 | 4; // For accessible visual heatmaps
  }>;
  missedDoses: Array<{
    id: string;
    medicationName: string;
    dosage: string;
    scheduledDate: string;
    scheduledTime: string;
    instructions: string;
  }>;
}

export class AdherenceService {
  async calculateMetrics(circleId: string): Promise<AdherenceMetrics> {
    const allDoses = await doseRepo.findByCircleId(circleId);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Group doses by date
    const dosesByDate: Record<string, typeof allDoses> = {};
    for (const d of allDoses) {
      if (!dosesByDate[d.scheduledDate]) {
        dosesByDate[d.scheduledDate] = [];
      }
      dosesByDate[d.scheduledDate].push(d);
    }

    // Today's metrics
    const todayDoses = dosesByDate[todayStr] || [];
    const todayTaken = todayDoses.filter(d => d.status === 'taken').length;
    const dailyRate = todayDoses.length > 0 ? Math.round((todayTaken / todayDoses.length) * 100) : 100;

    // Past 7 days & 30 days metrics
    let weekTotal = 0;
    let weekTaken = 0;
    let monthTotal = 0;
    let monthTaken = 0;

    const heatmap: AdherenceMetrics['heatmap'] = [];
    const missedDoses: AdherenceMetrics['missedDoses'] = [];

    // Compute for past 30 days chronologically
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayDoses = dosesByDate[dateStr] || [];

      const total = dayDoses.length;
      const taken = dayDoses.filter(dose => dose.status === 'taken').length;
      const rate = total > 0 ? Math.round((taken / total) * 100) : 100;

      // Assign heatmap level 0-4
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (total === 0) level = 0;
      else if (rate < 50) level = 1;
      else if (rate < 80) level = 2;
      else if (rate < 100) level = 3;
      else level = 4;

      heatmap.push({ date: dateStr, total, taken, rate, level });

      // Aggregate past 30 days
      monthTotal += total;
      monthTaken += taken;

      // Aggregate past 7 days
      if (i < 7) {
        weekTotal += total;
        weekTaken += taken;
      }

      // Collect missed doses
      for (const dose of dayDoses) {
        if (dose.status === 'skipped' || (dose.status === 'scheduled' && dateStr < todayStr)) {
          missedDoses.push({
            id: dose.id,
            medicationName: dose.medicationName,
            dosage: dose.dosage,
            scheduledDate: dose.scheduledDate,
            scheduledTime: dose.scheduledTime,
            instructions: dose.instructions,
          });
        }
      }
    }

    const weeklyRate = weekTotal > 0 ? Math.round((weekTaken / weekTotal) * 100) : 100;
    const monthlyRate = monthTotal > 0 ? Math.round((monthTaken / monthTotal) * 100) : 100;

    // Calculate streaks
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Sort dates ascending
    const sortedDates = Object.keys(dosesByDate).sort();
    for (const date of sortedDates) {
      const dayDoses = dosesByDate[date];
      const allTaken = dayDoses.length > 0 && dayDoses.every(d => d.status === 'taken');
      if (allTaken) {
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    // Check current streak backwards from yesterday or today
    let checkDate = new Date(now);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const dayDoses = dosesByDate[dateStr];
      if (!dayDoses || dayDoses.length === 0) {
        // If today has no doses yet, check yesterday
        if (dateStr === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
      const allTaken = dayDoses.every(d => d.status === 'taken');
      if (allTaken) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      dailyRate,
      weeklyRate,
      monthlyRate,
      currentStreakDays: currentStreak,
      bestStreakDays: Math.max(bestStreak, currentStreak),
      totalScheduled: monthTotal,
      totalTaken: monthTaken,
      totalMissed: monthTotal - monthTaken,
      heatmap,
      missedDoses: missedDoses.slice(0, 20), // Most recent 20
    };
  }
}

export const adherenceService = new AdherenceService();
