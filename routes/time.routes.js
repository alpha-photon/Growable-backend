import express from 'express';

const router = express.Router();

/**
 * @route   GET /api/time
 * @desc    Get server time for client-server sync
 * @access  Public
 */
router.get('/time', (req, res) => {
  res.json({
    serverTime: new Date().toISOString(),
    timestamp: Date.now(),
  });
});

export default router;

