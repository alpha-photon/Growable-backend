import ProgressReport from '../models/ProgressReport.model.js';
import BehaviorLog from '../models/BehaviorLog.model.js';
import TherapyGoal from '../models/TherapyGoal.model.js';
import SessionNote from '../models/SessionNote.model.js';
import MedicationReminder from '../models/MedicationReminder.model.js';
import DailyRoutine from '../models/DailyRoutine.model.js';
import Appointment from '../models/Appointment.model.js';
import * as childService from './child.service.js';

export const generateProgressReport = async (childId, reportData, userId, userRole) => {
  await childService.checkChildAccess(childId, userId, userRole);

  const { reportType, periodStart, periodEnd } = reportData;

  // Get all relevant data for the period
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);

  // Behavior Analysis
  const behaviorLogs = await BehaviorLog.find({
    childId,
    occurredAt: { $gte: startDate, $lte: endDate },
  });

  const behaviorAnalysis = {
    totalLogs: behaviorLogs.length,
    positiveCount: behaviorLogs.filter(b => b.behaviorType === 'positive').length,
    negativeCount: behaviorLogs.filter(b => b.behaviorType === 'negative').length,
    neutralCount: behaviorLogs.filter(b => b.behaviorType === 'neutral').length,
    trends: [],
    triggers: [],
  };

  // Calculate trends by category
  const categoryMap = {};
  behaviorLogs.forEach(log => {
    if (!categoryMap[log.behaviorCategory]) {
      categoryMap[log.behaviorCategory] = { positive: 0, negative: 0, neutral: 0 };
    }
    categoryMap[log.behaviorCategory][log.behaviorType]++;
  });

  behaviorAnalysis.trends = Object.entries(categoryMap).map(([category, counts]) => {
    const total = counts.positive + counts.negative + counts.neutral;
    const trend = counts.positive > counts.negative ? 'improving' : counts.negative > counts.positive ? 'declining' : 'stable';
    return {
      category,
      trend,
      frequency: total,
    };
  });

  // Goals Progress
  const goals = await TherapyGoal.find({
    childId,
    createdAt: { $lte: endDate },
  });

  const goalsProgress = goals.map(goal => ({
    goalId: goal._id,
    goalTitle: goal.goalTitle,
    progressPercentage: goal.progressPercentage,
    status: goal.status,
    milestones: goal.milestones || [],
  }));

  // Therapy Sessions
  const appointments = await Appointment.find({
    childId,
    scheduledDate: { $gte: startDate, $lte: endDate },
  });

  const sessionNotes = await SessionNote.find({
    childId,
    sessionDate: { $gte: startDate, $lte: endDate },
  });

  const therapySessions = {
    total: appointments.length,
    completed: appointments.filter(a => a.status === 'completed').length,
    missed: appointments.filter(a => a.status === 'cancelled' || a.status === 'no-show').length,
    attendanceRate: appointments.length > 0 
      ? (appointments.filter(a => a.status === 'completed').length / appointments.length) * 100 
      : 0,
    averageProgress: sessionNotes.length > 0
      ? sessionNotes.reduce((sum, note) => sum + (note.progressPercentage || 0), 0) / sessionNotes.length
      : 0,
    sessionsByType: [],
  };

  // Medication Compliance
  const medications = await MedicationReminder.find({
    childId,
    isActive: true,
    startDate: { $lte: endDate },
  });

  let totalDoses = 0;
  let takenDoses = 0;
  medications.forEach(med => {
    const periodLogs = med.logs.filter(log => 
      log.scheduledTime >= startDate && log.scheduledTime <= endDate
    );
    totalDoses += periodLogs.length;
    takenDoses += periodLogs.filter(log => log.status === 'taken').length;
  });

  const medicationCompliance = {
    totalDoses,
    taken: takenDoses,
    missed: totalDoses - takenDoses,
    complianceRate: totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0,
    medications: medications.map(med => {
      const periodLogs = med.logs.filter(log => 
        log.scheduledTime >= startDate && log.scheduledTime <= endDate
      );
      const taken = periodLogs.filter(log => log.status === 'taken').length;
      return {
        name: med.medicationName,
        complianceRate: periodLogs.length > 0 ? (taken / periodLogs.length) * 100 : 0,
      };
    }),
  };

  // Routine Adherence
  const routines = await DailyRoutine.find({
    childId,
    isActive: true,
  });

  const routineAdherence = {
    routinesFollowed: 0,
    totalRoutines: routines.length,
    adherenceRate: 0,
    mostCompletedActivities: [],
  };

  // Calculate overall progress score
  const progressScore = calculateOverallProgress(
    goalsProgress,
    behaviorAnalysis,
    therapySessions,
    medicationCompliance
  );

  const progressReport = await ProgressReport.create({
    childId,
    reportType,
    periodStart: startDate,
    periodEnd: endDate,
    overallProgress: {
      score: progressScore,
      trend: determineTrend(behaviorAnalysis, goalsProgress),
      summary: generateSummary(behaviorAnalysis, goalsProgress, therapySessions),
    },
    goalsProgress,
    behaviorAnalysis,
    therapySessions,
    medicationCompliance,
    routineAdherence,
    chartsData: {
      progressOverTime: generateProgressOverTime(goals, startDate, endDate),
      behaviorTrends: generateBehaviorTrends(behaviorLogs, startDate, endDate),
      goalProgress: generateGoalProgress(goals, startDate, endDate),
    },
    generatedBy: userId,
  });

  return await ProgressReport.findById(progressReport._id)
    .populate('generatedBy', 'name email');
};

const calculateOverallProgress = (goals, behavior, therapy, medication) => {
  let score = 0;
  let factors = 0;

  // Goals progress (40%)
  if (goals.length > 0) {
    const avgGoalProgress = goals.reduce((sum, g) => sum + g.progressPercentage, 0) / goals.length;
    score += avgGoalProgress * 0.4;
    factors += 0.4;
  }

  // Behavior (30%)
  if (behavior.totalLogs > 0) {
    const positiveRatio = behavior.positiveCount / behavior.totalLogs;
    score += positiveRatio * 100 * 0.3;
    factors += 0.3;
  }

  // Therapy attendance (20%)
  score += therapy.attendanceRate * 0.2;
  factors += 0.2;

  // Medication compliance (10%)
  score += medication.complianceRate * 0.1;
  factors += 0.1;

  return factors > 0 ? Math.round(score / factors) : 0;
};

const determineTrend = (behavior, goals) => {
  const improvingGoals = goals.filter(g => 
    g.status === 'achieved' || g.status === 'in-progress'
  ).length;
  const positiveRatio = behavior.totalLogs > 0 
    ? behavior.positiveCount / behavior.totalLogs 
    : 0.5;

  if (improvingGoals > goals.length * 0.6 && positiveRatio > 0.6) return 'improving';
  if (positiveRatio < 0.4) return 'declining';
  return 'stable';
};

const generateSummary = (behavior, goals, therapy) => {
  const parts = [];
  
  if (goals.length > 0) {
    const achievedGoals = goals.filter(g => g.status === 'achieved').length;
    parts.push(`${achievedGoals} out of ${goals.length} goals achieved`);
  }
  
  if (behavior.totalLogs > 0) {
    const positiveRatio = (behavior.positiveCount / behavior.totalLogs) * 100;
    parts.push(`${positiveRatio.toFixed(0)}% positive behaviors`);
  }
  
  parts.push(`${therapy.attendanceRate.toFixed(0)}% therapy attendance`);

  return parts.join('. ') + '.';
};

const generateProgressOverTime = (goals, startDate, endDate) => {
  const data = [];
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const interval = daysDiff <= 7 ? 1 : daysDiff <= 30 ? 7 : 30; // days

  for (let i = 0; i <= daysDiff; i += interval) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const avgProgress = goals.length > 0
      ? goals.reduce((sum, g) => sum + g.progressPercentage, 0) / goals.length
      : 0;

    data.push({
      date,
      score: avgProgress,
      category: 'overall',
    });
  }

  return data;
};

const generateBehaviorTrends = (logs, startDate, endDate) => {
  const data = [];
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const interval = daysDiff <= 7 ? 1 : daysDiff <= 30 ? 7 : 30;

  for (let i = 0; i <= daysDiff; i += interval) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + interval);

    const dayLogs = logs.filter(log => log.occurredAt >= date && log.occurredAt < nextDate);

    data.push({
      date,
      positive: dayLogs.filter(l => l.behaviorType === 'positive').length,
      negative: dayLogs.filter(l => l.behaviorType === 'negative').length,
      neutral: dayLogs.filter(l => l.behaviorType === 'neutral').length,
    });
  }

  return data;
};

const generateGoalProgress = (goals, startDate, endDate) => {
  const data = [];
  goals.forEach(goal => {
    if (goal.startDate && goal.startDate <= endDate) {
      data.push({
        goalId: goal._id,
        date: goal.startDate,
        progress: goal.progressPercentage,
      });
    }
  });
  return data;
};

export const getProgressReports = async (childId, userId, userRole) => {
  await childService.checkChildAccess(childId, userId, userRole);

  return await ProgressReport.find({ childId })
    .populate('generatedBy', 'name email')
    .sort({ periodStart: -1 });
};

export const getProgressReportById = async (reportId, childId, userId, userRole) => {
  await childService.checkChildAccess(childId, userId, userRole);

  const report = await ProgressReport.findOne({ _id: reportId, childId });
  if (!report) {
    throw new Error('Progress report not found');
  }

  return await ProgressReport.findById(report._id)
    .populate('generatedBy', 'name email');
};

