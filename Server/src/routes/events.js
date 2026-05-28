const express = require("express");
const router = express.Router();

const events = [
  {
    id: 1,
    name: "Premier League: Arsenal vs Chelsea",
    sport: "Football",
    startTime: "2026-02-15T20:00:00Z",
    thumbnail: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=400&fit=crop",
    isLive: true,
    costPerMinute: 0.01,
  },
  {
    id: 2,
    name: "NBA Finals: Lakers vs Celtics",
    sport: "Basketball",
    startTime: "2026-02-16T19:30:00Z",
    thumbnail: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=400&fit=crop",
    isLive: true,
    costPerMinute: 0.01,
  },
  {
    id: 3,
    name: "Super Bowl LX",
    sport: "American Football",
    startTime: "2026-02-18T18:00:00Z",
    thumbnail: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=400&fit=crop",
    isLive: false,
    costPerMinute: 0.02,
  },
  {
    id: 4,
    name: "Wimbledon Finals: Men's Singles",
    sport: "Tennis",
    startTime: "2026-07-12T14:00:00Z",
    thumbnail: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=400&fit=crop",
    isLive: false,
    costPerMinute: 0.01,
  },
  {
    id: 5,
    name: "UFC 310: Championship Bout",
    sport: "MMA",
    startTime: "2026-03-22T22:00:00Z",
    thumbnail: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&h=400&fit=crop",
    isLive: true,
    costPerMinute: 0.015,
  },
  {
    id: 6,
    name: "ICC World Cup Final",
    sport: "Cricket",
    startTime: "2026-11-15T09:30:00Z",
    thumbnail: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&h=400&fit=crop",
    isLive: false,
    costPerMinute: 0.01,
  },
];

router.get("/", (req, res) => {
  res.json(events);
});

router.get("/:id", (req, res) => {
  const event = events.find((e) => e.id === parseInt(req.params.id));
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }
  res.json(event);
});

module.exports = router;
