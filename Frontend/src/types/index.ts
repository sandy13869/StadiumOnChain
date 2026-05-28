export interface SportEvent {
  id: number;
  name: string;
  sport: string;
  startTime: string;
  thumbnail: string;
  isLive: boolean;
  costPerMinute: number;
}

export interface Ticket {
  tokenId: number;
  eventId: number;
  accessLevel: number;
  seat: string;
  uri: string;
}

export interface ExchangeRate {
  sprxPerStable: string;
  stableCostPerMinute: string;
  feeBps: string;
  source: string;
}

export interface StreamSession {
  sessionId: string;
  eventId: number;
  wallet: string;
  status: "active" | "ended";
  duration?: number;
}

export interface AccessRecord {
  eventId: number;
  expiresAt: number;
  active: boolean;
}

export interface StatusMessage {
  type: "success" | "error" | "pending";
  message: string;
}
