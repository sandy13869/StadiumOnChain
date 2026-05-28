const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Tokenized SPRX Backend API",
    version: "1.0.0",
    description:
      "API documentation for Tokenized SPRX backend services, including health check, events, exchange rates, ticket verification, and stream session APIs.",
  },
  servers: [
    {
      url: "http://localhost:8000",
      description: "Local development server",
    },
  ],
  tags: [
    { name: "Health", description: "Service health endpoints" },
    { name: "Events", description: "Sports events catalog" },
    { name: "Exchange", description: "SPRX and stablecoin exchange rate data" },
    { name: "Ticket", description: "Ticket verification endpoints" },
    { name: "Stream", description: "Streaming session lifecycle endpoints" },
  ],
  components: {
    schemas: {
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "ok" },
          timestamp: { type: "number", example: 1764139234000 },
        },
        required: ["status", "timestamp"],
      },
      Event: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          name: { type: "string", example: "Premier League: Arsenal vs Chelsea" },
          sport: { type: "string", example: "Football" },
          startTime: { type: "string", format: "date-time", example: "2026-02-15T20:00:00Z" },
          thumbnail: { type: "string", format: "uri", example: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=400&fit=crop" },
          isLive: { type: "boolean", example: true },
          costPerMinute: { type: "number", format: "float", example: 0.01 },
        },
        required: ["id", "name", "sport", "startTime", "thumbnail", "isLive", "costPerMinute"],
      },
      ExchangeRateResponse: {
        type: "object",
        properties: {
          sprxPerStable: { oneOf: [{ type: "integer" }, { type: "string" }], example: "100" },
          stableCostPerMinute: { oneOf: [{ type: "integer" }, { type: "string" }], example: "10000" },
          feeBps: { oneOf: [{ type: "integer" }, { type: "string" }], example: "100" },
          source: { type: "string", enum: ["default", "on-chain"], example: "on-chain" },
        },
        required: ["sprxPerStable", "stableCostPerMinute", "feeBps", "source"],
      },
      VerifyTicketRequest: {
        type: "object",
        properties: {
          wallet: {
            type: "string",
            example: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          },
          eventId: { type: "integer", example: 1 },
        },
        required: ["wallet", "eventId"],
      },
      VerifyTicketResponse: {
        type: "object",
        properties: {
          verified: { type: "boolean", example: true },
          wallet: {
            type: "string",
            example: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          },
          eventId: { type: "integer", example: 1 },
          message: { type: "string", example: "Ticket contract not configured" },
        },
      },
      StreamStartRequest: {
        type: "object",
        properties: {
          wallet: {
            type: "string",
            example: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          },
          eventId: { type: "integer", example: 2 },
        },
        required: ["wallet", "eventId"],
      },
      StreamStartResponse: {
        type: "object",
        properties: {
          sessionId: { type: "string", format: "uuid", example: "e30644a4-88fe-4ec1-a820-e2de302f16b3" },
          eventId: { type: "integer", example: 2 },
          wallet: {
            type: "string",
            example: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          },
          status: { type: "string", example: "active" },
        },
        required: ["sessionId", "eventId", "wallet", "status"],
      },
      StreamEndRequest: {
        type: "object",
        properties: {
          sessionId: { type: "string", format: "uuid", example: "e30644a4-88fe-4ec1-a820-e2de302f16b3" },
        },
        required: ["sessionId"],
      },
      StreamEndResponse: {
        type: "object",
        properties: {
          sessionId: { type: "string", format: "uuid", example: "e30644a4-88fe-4ec1-a820-e2de302f16b3" },
          status: { type: "string", example: "ended" },
          duration: { type: "integer", example: 367 },
        },
        required: ["sessionId", "status", "duration"],
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string", example: "Internal server error" },
        },
        required: ["error"],
      },
      MessageResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "Event not found" },
        },
        required: ["message"],
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Get service health",
        operationId: "getHealth",
        responses: {
          200: {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
    "/api/events": {
      get: {
        tags: ["Events"],
        summary: "List all events",
        operationId: "listEvents",
        responses: {
          200: {
            description: "Array of events",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Event" },
                },
              },
            },
          },
        },
      },
    },
    "/api/events/{id}": {
      get: {
        tags: ["Events"],
        summary: "Get event by ID",
        operationId: "getEventById",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Requested event",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Event" },
              },
            },
          },
          404: {
            description: "Event not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
        },
      },
    },
    "/api/exchange/rate": {
      get: {
        tags: ["Exchange"],
        summary: "Get current exchange and fee rates",
        operationId: "getExchangeRate",
        responses: {
          200: {
            description: "Rate details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ExchangeRateResponse" },
              },
            },
          },
          500: {
            description: "Unexpected server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/ticket/verify": {
      post: {
        tags: ["Ticket"],
        summary: "Verify wallet ticket ownership for an event",
        operationId: "verifyTicket",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VerifyTicketRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Ticket verification outcome",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VerifyTicketResponse" },
              },
            },
          },
          400: {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          500: {
            description: "Unexpected server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/stream/start": {
      post: {
        tags: ["Stream"],
        summary: "Start a stream session",
        operationId: "startStreamSession",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StreamStartRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Session started",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StreamStartResponse" },
              },
            },
          },
          400: {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          403: {
            description: "No access to event stream",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          500: {
            description: "Unexpected server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/stream/end": {
      post: {
        tags: ["Stream"],
        summary: "End a stream session",
        operationId: "endStreamSession",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StreamEndRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Session ended",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StreamEndResponse" },
              },
            },
          },
          400: {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          404: {
            description: "Session not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
        },
      },
    },
  },
};

module.exports = { openApiSpec };