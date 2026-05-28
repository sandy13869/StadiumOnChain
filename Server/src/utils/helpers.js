const { ethers } = require("ethers");

function isValidAddress(address) {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

function formatUnits(value, decimals = 18) {
  return ethers.formatUnits(value, decimals);
}

function parseUnits(value, decimals = 18) {
  return ethers.parseUnits(value, decimals);
}

module.exports = { isValidAddress, formatUnits, parseUnits };
