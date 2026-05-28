import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { CONTRACT_ADDRESSES } from "../wallet";

const ACCESS_CONTROLLER_ABI = [
  {
    name: "burnForAccess",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "eventId", type: "uint256" },
      { name: "accessMinutes", type: "uint256" },
      { name: "burnAmount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "payStableForAccess",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "eventId", type: "uint256" },
      { name: "accessMinutes", type: "uint256" },
    ],
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

export function useAccess() {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);

  const { writeContract: writeBurn, data: burnHash } = useWriteContract();
  const { writeContract: writePay, data: payHash } = useWriteContract();
  const { writeContract: writeApprove, data: approveHash } = useWriteContract();

  const { isLoading: isBurnPending } = useWaitForTransactionReceipt({ hash: burnHash });
  const { isLoading: isPayPending } = useWaitForTransactionReceipt({ hash: payHash });
  const { isLoading: isApprovePending } = useWaitForTransactionReceipt({ hash: approveHash });

  const approveToken = async (tokenAddress: string, spender: string, amount: bigint) => {
    setLoading(true);
    try {
      await writeApprove({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spender as `0x${string}`, amount],
      });
    } finally {
      setLoading(false);
    }
  };

  const burnForAccess = async (eventId: number, minutes: number, sprxAmount: string) => {
    setLoading(true);
    try {
      const burnAmount = parseUnits(sprxAmount, 18);
      await writeBurn({
        address: CONTRACT_ADDRESSES.accessController as `0x${string}`,
        abi: ACCESS_CONTROLLER_ABI,
        functionName: "burnForAccess",
        args: [BigInt(eventId), BigInt(minutes), burnAmount],
      });
    } finally {
      setLoading(false);
    }
  };

  const payStableForAccess = async (eventId: number, minutes: number) => {
    setLoading(true);
    try {
      await writePay({
        address: CONTRACT_ADDRESSES.accessController as `0x${string}`,
        abi: ACCESS_CONTROLLER_ABI,
        functionName: "payStableForAccess",
        args: [BigInt(eventId), BigInt(minutes)],
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    approveToken,
    burnForAccess,
    payStableForAccess,
    loading: loading || isBurnPending || isPayPending || isApprovePending,
  };
}
