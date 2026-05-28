import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygonAmoy } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Tokenized SPRX",
  projectId: import.meta.env.VITE_APP_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [polygonAmoy],
  ssr: false,
});

export const CHAIN_ID = 80002;

export const CONTRACT_ADDRESSES = {
  streamToken: import.meta.env.VITE_APP_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000",
  ticketContract: import.meta.env.VITE_APP_TICKET_ADDRESS || "0x0000000000000000000000000000000000000000",
  accessController: import.meta.env.VITE_APP_ACCESS_ADDRESS || "0x0000000000000000000000000000000000000000",
  usdc: import.meta.env.VITE_APP_USDC_ADDRESS || "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
} as const;

export const BACKEND_URL = (import.meta.env.VITE_APP_BACKEND_URL || "").replace(/\/$/, "");
