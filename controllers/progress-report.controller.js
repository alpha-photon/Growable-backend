import * as progressReportService from '../services/progress-report.service.js';

export const generateProgressReport = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const report = await progressReportService.generateProgressReport(
      childId,
      req.body,
      req.user._id,
      req.user.role
    );
    res.status(201).json({
      success: true,
      data: report,
      message: 'Progress report generated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getProgressReports = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const reports = await progressReportService.getProgressReports(
      childId,
      req.user._id,
      req.user.role
    );
    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

export const getProgressReportById = async (req, res, next) => {
  try {
    const { childId, reportId } = req.params;
    const report = await progressReportService.getProgressReportById(
      reportId,
      childId,
      req.user._id,
      req.user.role
    );
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

