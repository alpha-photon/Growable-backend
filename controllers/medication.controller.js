import * as medicationService from '../services/medication.service.js';

export const createMedication = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const medication = await medicationService.createMedication(
      childId,
      req.body,
      req.user._id,
      req.user.role
    );
    res.status(201).json({
      success: true,
      data: medication,
      message: 'Medication reminder created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getMedications = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const medications = await medicationService.getMedications(
      childId,
      req.user._id,
      req.user.role
    );
    res.json({
      success: true,
      data: medications,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMedication = async (req, res, next) => {
  try {
    const { childId, medicationId } = req.params;
    const medication = await medicationService.updateMedication(
      medicationId,
      childId,
      req.body,
      req.user._id,
      req.user.role
    );
    res.json({
      success: true,
      data: medication,
      message: 'Medication updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const logMedicationDose = async (req, res, next) => {
  try {
    const { childId, medicationId } = req.params;
    const medication = await medicationService.logMedicationDose(
      medicationId,
      childId,
      req.body,
      req.user._id,
      req.user.role
    );
    res.json({
      success: true,
      data: medication,
      message: 'Medication dose logged successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMedication = async (req, res, next) => {
  try {
    const { childId, medicationId } = req.params;
    await medicationService.deleteMedication(
      medicationId,
      childId,
      req.user._id,
      req.user.role
    );
    res.json({
      success: true,
      message: 'Medication deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

