import * as routineService from '../services/routine.service.js';

export const createRoutine = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const routine = await routineService.createRoutine(
      childId,
      req.body,
      req.user._id,
      req.user.role
    );
    res.status(201).json({
      success: true,
      data: routine,
      message: 'Routine created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getRoutines = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const routines = await routineService.getRoutines(
      childId,
      req.user._id,
      req.user.role
    );
    res.json({
      success: true,
      data: routines,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRoutine = async (req, res, next) => {
  try {
    const { childId, routineId } = req.params;
    const routine = await routineService.updateRoutine(
      routineId,
      childId,
      req.body,
      req.user._id,
      req.user.role
    );
    res.json({
      success: true,
      data: routine,
      message: 'Routine updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRoutine = async (req, res, next) => {
  try {
    const { childId, routineId } = req.params;
    await routineService.deleteRoutine(
      routineId,
      childId,
      req.user._id,
      req.user.role
    );
    res.json({
      success: true,
      message: 'Routine deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const markActivityComplete = async (req, res, next) => {
  try {
    const { childId, routineId } = req.params;
    const { activityIndex } = req.body;
    const routine = await routineService.markActivityComplete(
      routineId,
      activityIndex,
      childId,
      req.user._id,
      req.user.role
    );
    res.json({
      success: true,
      data: routine,
      message: 'Activity marked as complete',
    });
  } catch (error) {
    next(error);
  }
};

