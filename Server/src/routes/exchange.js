const express = require("express");
const router = express.Router();
const { accessContract } = require("../config/blockchain");

router.get("/rate", async (req, res, next) => {
  try {
    if (!accessContract) {
      return res.json({
        sprxPerStable: 100,
        stableCostPerMinute: 10000,
        feeBps: 100,
        source: "default",
      });
    }

    const [sprxPerStable, stableCostPerMinute, feeBps] = await Promise.all([
      accessContract.sprxPerStable(),
      accessContract.stableCostPerMinute(),
      accessContract.feeBps(),
    ]);

    res.json({
      sprxPerStable: sprxPerStable.toString(),
      stableCostPerMinute: stableCostPerMinute.toString(),
      feeBps: feeBps.toString(),
      source: "on-chain",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
