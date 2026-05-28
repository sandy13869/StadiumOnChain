require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");

const eventsRouter = require("./routes/events");
const exchangeRouter = require("./routes/exchange");
const ticketRouter = require("./routes/ticket");
const streamRouter = require("./routes/stream");
const { openApiSpec } = require("./docs/openapi");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use("/api/events", eventsRouter);
app.use("/api/exchange", exchangeRouter);
app.use("/api/ticket", ticketRouter);
app.use("/api/stream", streamRouter);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Tokenized SPRX server running on port ${PORT}`);
});
