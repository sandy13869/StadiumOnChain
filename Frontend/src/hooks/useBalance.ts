import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACT_ADDRESSES } from "../wallet";

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function useBalance() {
  const { address } = useAccount();
  const [sprxBalance, setSprxBalance] = useState("0.00");
  const [usdcBalance, setUsdcBalance] = useState("0.00");

  const { data: sprxData } = useReadContract({
    address: CONTRACT_ADDRESSES.streamToken as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const { data: usdcData } = useReadContract({
    address: CONTRACT_ADDRESSES.usdc as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  useEffect(() => {
    if (sprxData) {
      setSprxBalance(parseFloat(formatUnits(sprxData as bigint, 18)).toFixed(2));
    }
  }, [sprxData]);

  useEffect(() => {
    if (usdcData) {
      setUsdcBalance(parseFloat(formatUnits(usdcData as bigint, 6)).toFixed(2));
    }
  }, [usdcData]);

  return { sprxBalance, usdcBalance };
}
