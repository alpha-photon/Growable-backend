import * as therapyReminderService from '../services/therapy-reminder.service.js';

export const createTherapyReminder = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const therapy = await therapyReminderService.createTherapyReminder(
      childId,
      req.body,
      req.user._id,
      req.user.role
    );
    res.status(201).json({
      success: true,
      data: therapy,
      message: 'Therapy reminder created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getTherapyReminders = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const therapies = await therapyReminderService.getTherapyReminders(
      childId,
      req.user._id,
      req.user.role
    );
    res.json({
      success: true,
      data: therapies,
    });
  } catch (error) {
    next(error);
  }
};

export const logTherapySession = async (req, res, next) => {
  try {
    const { childId, therapyId } = req.params;
    const therapy = await therapyReminderService.logTherapySession(
      therapyId,
      childId,
      req.body,
      req.user._id,
      req.user.role
    );
    res.json({
      success: true,
      data: therapy,
      message: 'Therapy session logged successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updateTherapyReminder = async (req, res, next) => {
  try {
    const { childId, therapyId } = req.params;
    const therapy = await therapyReminderService.updateTherapyReminder(
      therapyId,
      childId,
      req.body,
      req.user._id,
      req.user.role
    );
    res.json({
      success: true,
      data: therapy,
      message: 'Therapy reminder updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTherapyReminder = async (req, res, next) => {
  try {
    const { childId, therapyId } = req.params;
    await therapyReminderService.deleteTherapyReminder(
      therapyId,
      childId,
      req.user._id,
      req.user.role
    );
    res.json({
      success: true,
      message: 'Therapy reminder deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

