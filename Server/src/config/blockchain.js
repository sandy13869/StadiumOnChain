const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "https://rpc-amoy.polygon.technology");

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

const ticketContract = ticketAddress
  ? new ethers.Contract(ticketAddress, TICKET_ABI, provider)
  : null;

const accessContract = accessAddress
  ? new ethers.Contract(accessAddress, ACCESS_ABI, provider)
  : null;

const tokenContract = tokenAddress
  ? new ethers.Contract(tokenAddress, TOKEN_ABI, provider)
  : null;

module.exports = {
  provider,
  ticketContract,
  accessContract,
  tokenContract,
};
