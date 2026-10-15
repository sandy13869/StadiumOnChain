import { useState } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import { parseUnits } from "viem";
import { CONTRACT_ADDRESSES } from "../wallet";

const ACCESS_CONTROLLER_ABI = [
  {
    name: "buyTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "stableAmount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "sellTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "sprxAmount", type: "uint256" }],
    outputs: [],
  },
] as const;

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export function useExchange() {
  const [loading, setLoading] = useState(false);

  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const confirm = async (hash: `0x${string}`) => {
    if (!publicClient) throw new Error("Network client unavailable");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success")
      throw new Error("Transaction reverted on-chain");
  };

  const approveUSDC = async (amount: string) => {
    setLoading(true);
    try {
      const amountWei = parseUnits(amount, 6);
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.usdc as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.accessController as `0x${string}`, amountWei],
      });
      await confirm(hash);
    } finally {
      setLoading(false);
    }
  };

  const buySPRX = async (usdcAmount: string) => {
    setLoading(true);
    try {
      const amount = parseUnits(usdcAmount, 6);
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.accessController as `0x${string}`,
        abi: ACCESS_CONTROLLER_ABI,
        functionName: "buyTokens",
        args: [amount],
      });
      await confirm(hash);
    } finally {
      setLoading(false);
    }
  };

  const approveSPRX = async (amount: string) => {
    setLoading(true);
    try {
      const amountWei = parseUnits(amount, 18);
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.streamToken as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.accessController as `0x${string}`, amountWei],
      });
      await confirm(hash);
    } finally {
      setLoading(false);
    }
  };

  const sellSPRX = async (sprxAmount: string) => {
    setLoading(true);
    try {
      const amount = parseUnits(sprxAmount, 18);
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.accessController as `0x${string}`,
        abi: ACCESS_CONTROLLER_ABI,
        functionName: "sellTokens",
        args: [amount],
      });
      await confirm(hash);
    } finally {
      setLoading(false);
    }
  };

  return {
    approveUSDC,
    buySPRX,
    approveSPRX,
    sellSPRX,
    loading,
  };
}
