const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { accessContract } = require("../config/blockchain");
const { isValidAddress } = require("../utils/helpers");

const sessions = new Map();

router.post("/start", async (req, res, next) => {
  try {
    const { wallet, eventId } = req.body;

    if (!wallet || !eventId) {
      return res.status(400).json({ message: "wallet and eventId are required" });
    }

    if (!isValidAddress(wallet)) {
      return res.status(400).json({ message: "Invalid wallet address" });
    }

    if (accessContract) {
      const hasAccess = await accessContract.hasAccess(wallet, eventId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied. Burn SPRX or pay USDC for access." });
      }
    }

    const sessionId = uuidv4();
    sessions.set(sessionId, {
      wallet,
      eventId,
      startTime: Date.now(),
      active: true,
    });

    res.json({
      sessionId,
      eventId,
      wallet,
      status: "active",
    });
  } catch (error) {
    next(error);
  }
});

router.post("/end", (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ message: "sessionId is required" });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }

  if (!session.active) {
    return res.status(400).json({ message: "Session already ended" });
  }

  session.active = false;
  const duration = Math.floor((Date.now() - session.startTime) / 1000);

  res.json({
    sessionId,
    status: "ended",
    duration,
  });
});

module.exports = router;
