import DailyRoutine from '../models/DailyRoutine.model.js';
import * as childService from './child.service.js';

export const createRoutine = async (childId, routineData, userId, userRole) => {
  // Check access
  await childService.checkChildAccess(childId, userId, userRole);

  const routine = await DailyRoutine.create({
    ...routineData,
    childId,
    createdBy: userId,
  });

  return await DailyRoutine.findById(routine._id)
    .populate('createdBy', 'name email')
    .populate('sharedWith.userId', 'name email');
};

export const getRoutines = async (childId, userId, userRole) => {
  await childService.checkChildAccess(childId, userId, userRole);

  return await DailyRoutine.find({ childId, isActive: true })
    .populate('createdBy', 'name email')
    .populate('sharedWith.userId', 'name email')
    .sort({ createdAt: -1 });
};

export const updateRoutine = async (routineId, childId, updateData, userId, userRole) => {
  await childService.checkChildAccess(childId, userId, userRole);

  const routine = await DailyRoutine.findOne({ _id: routineId, childId });
  if (!routine) {
    throw new Error('Routine not found');
  }

  Object.assign(routine, updateData);
  await routine.save();

  return await DailyRoutine.findById(routine._id)
    .populate('createdBy', 'name email')
    .populate('sharedWith.userId', 'name email');
};

export const deleteRoutine = async (routineId, childId, userId, userRole) => {
  await childService.checkChildAccess(childId, userId, userRole);

  const routine = await DailyRoutine.findOne({ _id: routineId, childId });
  if (!routine) {
    throw new Error('Routine not found');
  }

  routine.isActive = false;
  await routine.save();
  
  return { message: 'Routine deleted successfully' };
};

export const markActivityComplete = async (routineId, activityIndex, childId, userId, userRole) => {
  await childService.checkChildAccess(childId, userId, userRole);

  const routine = await DailyRoutine.findOne({ _id: routineId, childId });
  if (!routine || !routine.activities[activityIndex]) {
    throw new Error('Activity not found');
  }

  routine.activities[activityIndex].isCompleted = true;
  await routine.save();

  return routine;
};

