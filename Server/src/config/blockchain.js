const { ethers } = require("ethers");

const RPC_URL = process.env.RPC_URL || "https://rpc-amoy.polygon.technology";

// `staticNetwork` prevents ethers from eagerly polling the RPC at startup.
// Without it, an unreachable RPC throws an unhandled rejection that crashes the
// whole server before it can serve any requests.
const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
  staticNetwork: true,
});

const TICKET_ABI = [
  "function hasTicketForEvent(address owner, uint256 eventId) view returns (bool)",
  "function getTicketData(uint256 tokenId) view returns (tuple(uint256 eventId, uint8 accessLevel, string seat))",
];

const ACCESS_ABI = [
  "function hasAccess(address user, uint256 eventId) view returns (bool)",
  "function sprxPerStable() view returns (uint256)",
  "function stableCostPerMinute() view returns (uint256)",
  "function feeBps() view returns (uint256)",
  "function accumulatedFees() view returns (uint256)",
];

const TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

const ticketAddress = process.env.TICKET_ADDRESS;
const accessAddress = process.env.ACCESS_ADDRESS;
const tokenAddress = process.env.TOKEN_ADDRESS;

// Only build contracts for real, non-placeholder addresses. This lets the API
// run in a fully local/offline mode (returning defaults) without crashing.
const validAddress = (address) => {
  try {
    return typeof address === "string" && ethers.isAddress(address);
  } catch {
    return false;
  }
};

const ticketContract = validAddress(ticketAddress)
  ? new ethers.Contract(ticketAddress, TICKET_ABI, provider)
  : null;

const accessContract = validAddress(accessAddress)
  ? new ethers.Contract(accessAddress, ACCESS_ABI, provider)
  : null;

const tokenContract = validAddress(tokenAddress)
  ? new ethers.Contract(tokenAddress, TOKEN_ABI, provider)
  : null;

module.exports = {
  provider,
  ticketContract,
  accessContract,
  tokenContract,
};
