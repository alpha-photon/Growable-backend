import TherapyReminder from '../models/TherapyReminder.model.js';
import * as childService from './child.service.js';

export const createTherapyReminder = async (childId, therapyData, userId, userRole) => {
  await childService.checkChildAccess(childId, userId, userRole);

  // Generate sessions for recurring therapy
  const sessions = [];
  if (therapyData.scheduleType === 'recurring' && therapyData.recurrence) {
    const { frequency, daysOfWeek, time } = therapyData.recurrence;
    const startDate = new Date();
    const daysToGenerate = frequency === 'weekly' ? 52 * 7 : frequency === 'bi-weekly' ? 26 * 14 : 365;

    for (let day = 0; day < daysToGenerate; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + day);
      
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
      
      if (daysOfWeek && daysOfWeek.includes(dayName)) {
        const scheduledDate = new Date(currentDate);
        scheduledDate.setHours(time.hour, time.minute, 0, 0);

        sessions.push({
          scheduledDate,
          status: 'pending',
        });
      }
    }
  } else if (therapyData.scheduleType === 'one-time' && therapyData.scheduledDate) {
    sessions.push({
      scheduledDate: new Date(therapyData.scheduledDate),
      status: 'pending',
    });
  }

  const therapy = await TherapyReminder.create({
    ...therapyData,
    childId,
    createdBy: userId,
    sessions,
  });

  return await TherapyReminder.findById(therapy._id)
    .populate('createdBy', 'name email')
    .populate('therapistId', 'name email');
};

export const getTherapyReminders = async (childId, userId, userRole) => {
  await childService.checkChildAccess(childId, userId, userRole);

  return await TherapyReminder.find({ childId, isActive: true })
    .populate('createdBy', 'name email')
    .populate('therapistId', 'name email')
    .sort({ createdAt: -1 });
};

export const logTherapySession = async (therapyId, childId, sessionData, userId, userRole) => {
  await childService.checkChildAccess(childId, userId, userRole);

  const therapy = await TherapyReminder.findOne({ _id: therapyId, childId });
  if (!therapy) {
    throw new Error('Therapy reminder not found');
  }

  const session = {
    ...sessionData,
    loggedBy: userId,
    loggedAt: new Date(),
  };

  therapy.sessions.push(session);
  await therapy.save();

  return therapy;
};

export const updateTherapyReminder = async (therapyId, childId, updateData, userId, userRole) => {
  await childService.checkChildAccess(childId, userId, userRole);

  const therapy = await TherapyReminder.findOne({ _id: therapyId, childId });
  if (!therapy) {
    throw new Error('Therapy reminder not found');
  }

  Object.assign(therapy, updateData);
  await therapy.save();

  return await TherapyReminder.findById(therapy._id)
    .populate('createdBy', 'name email')
    .populate('therapistId', 'name email');
};

export const deleteTherapyReminder = async (therapyId, childId, userId, userRole) => {
  await childService.checkChildAccess(childId, userId, userRole);

  const therapy = await TherapyReminder.findOne({ _id: therapyId, childId });
  if (!therapy) {
    throw new Error('Therapy reminder not found');
  }

  therapy.isActive = false;
  await therapy.save();
  
  return { message: 'Therapy reminder deleted successfully' };
};

