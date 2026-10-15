import { useAccount, useReadContract } from "wagmi";
import { formatUnits, isAddress, zeroAddress } from "viem";
import { CHAIN_ID, CONTRACT_ADDRESSES } from "../wallet";

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

  const { data: sprxData } = useReadContract({
    address: CONTRACT_ADDRESSES.streamToken as `0x${string}`,
    chainId: CHAIN_ID,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        !!address &&
        isAddress(CONTRACT_ADDRESSES.streamToken) &&
        CONTRACT_ADDRESSES.streamToken !== zeroAddress,
    },
  });

  const { data: usdcData } = useReadContract({
    address: CONTRACT_ADDRESSES.usdc as `0x${string}`,
    chainId: CHAIN_ID,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        !!address &&
        isAddress(CONTRACT_ADDRESSES.usdc) &&
        CONTRACT_ADDRESSES.usdc !== zeroAddress,
    },
  });

  return {
    sprxBalance:
      sprxData !== undefined
        ? Number(formatUnits(sprxData, 18)).toFixed(2)
        : "0.00",
    usdcBalance:
      usdcData !== undefined
        ? Number(formatUnits(usdcData, 6)).toFixed(2)
        : "0.00",
  };
}
