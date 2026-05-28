import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
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

  const { writeContract: writeBuy, data: buyHash } = useWriteContract();
  const { writeContract: writeSell, data: sellHash } = useWriteContract();
  const { writeContract: writeApprove, data: approveHash } = useWriteContract();

  const { isLoading: isBuyPending } = useWaitForTransactionReceipt({ hash: buyHash });
  const { isLoading: isSellPending } = useWaitForTransactionReceipt({ hash: sellHash });
  const { isLoading: isApprovePending } = useWaitForTransactionReceipt({ hash: approveHash });

  const approveUSDC = async (amount: string) => {
    setLoading(true);
    try {
      const amountWei = parseUnits(amount, 6);
      await writeApprove({
        address: CONTRACT_ADDRESSES.usdc as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.accessController as `0x${string}`, amountWei],
      });
    } finally {
      setLoading(false);
    }
  };

  const buySPRX = async (usdcAmount: string) => {
    setLoading(true);
    try {
      const amount = parseUnits(usdcAmount, 6);
      await writeBuy({
        address: CONTRACT_ADDRESSES.accessController as `0x${string}`,
        abi: ACCESS_CONTROLLER_ABI,
        functionName: "buyTokens",
        args: [amount],
      });
    } finally {
      setLoading(false);
    }
  };

  const approveSPRX = async (amount: string) => {
    setLoading(true);
    try {
      const amountWei = parseUnits(amount, 18);
      await writeApprove({
        address: CONTRACT_ADDRESSES.streamToken as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.accessController as `0x${string}`, amountWei],
      });
    } finally {
      setLoading(false);
    }
  };

  const sellSPRX = async (sprxAmount: string) => {
    setLoading(true);
    try {
      const amount = parseUnits(sprxAmount, 18);
      await writeSell({
        address: CONTRACT_ADDRESSES.accessController as `0x${string}`,
        abi: ACCESS_CONTROLLER_ABI,
        functionName: "sellTokens",
        args: [amount],
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    approveUSDC,
    buySPRX,
    approveSPRX,
    sellSPRX,
    loading: loading || isBuyPending || isSellPending || isApprovePending,
  };
}
