const express = require("express");
const router = express.Router();
const { ethers } = require("ethers");
const { ticketContract } = require("../config/blockchain");
const { isValidAddress } = require("../utils/helpers");

router.post("/verify", async (req, res, next) => {
  try {
    const { wallet, eventId } = req.body;

    if (!wallet || !eventId) {
      return res.status(400).json({ message: "wallet and eventId are required" });
    }

    if (!isValidAddress(wallet)) {
      return res.status(400).json({ message: "Invalid wallet address" });
    }

    if (!ticketContract) {
      return res.json({ verified: false, message: "Ticket contract not configured" });
    }

    const hasTicket = await ticketContract.hasTicketForEvent(wallet, eventId);

    res.json({
      verified: hasTicket,
      wallet,
      eventId,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
