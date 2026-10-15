import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useChainId, useReadContracts, useSwitchChain } from "wagmi";
import {
  ArrowDown,
  ArrowUpRight,
  ShieldCheck,
  Wallet,
  LoaderCircle,
} from "lucide-react";
import { formatUnits, isAddress, parseUnits, zeroAddress } from "viem";
import { useExchange } from "../hooks/useExchange";
import { useBalance } from "../hooks/useBalance";
import { CHAIN_ID, CONTRACT_ADDRESSES } from "../wallet";
import { StatusMessage } from "../types";
import "./ExchangeTab.css";
const rateAbi = [
  {
    name: "sprxPerStable",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "feeBps",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;
interface ExchangeTabProps {
  isConnected: boolean;
  onStatus: (type: StatusMessage["type"], message: string) => void;
}
export default function ExchangeTab({
  isConnected,
  onStatus,
}: ExchangeTabProps) {
  const { approveUSDC, buySPRX, approveSPRX, sellSPRX } = useExchange();
  const { sprxBalance, usdcBalance } = useBalance();
  const queryClient = useQueryClient();
  const { openConnectModal } = useConnectModal();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"idle" | "approval" | "swap">("idle");
  const busy = step !== "idle";
  const configured = [
    CONTRACT_ADDRESSES.accessController,
    CONTRACT_ADDRESSES.streamToken,
    CONTRACT_ADDRESSES.usdc,
  ].every((address) => isAddress(address) && address !== zeroAddress);
  const { data: rateData, isLoading: rateLoading } = useReadContracts({
    contracts: [
      {
        address: CONTRACT_ADDRESSES.accessController as `0x${string}`,
        abi: rateAbi,
        functionName: "sprxPerStable",
        chainId: CHAIN_ID,
      },
      {
        address: CONTRACT_ADDRESSES.accessController as `0x${string}`,
        abi: rateAbi,
        functionName: "feeBps",
        chainId: CHAIN_ID,
      },
    ],
    query: { enabled: configured, refetchInterval: 30000 },
  });
  const rate = rateData?.[0]?.result;
  const fee = rateData?.[1]?.result;
  const hasQuote =
    typeof rate === "bigint" &&
    rate > 0n &&
    typeof fee === "bigint" &&
    fee <= 10000n;
  const buying = direction === "buy";
  const from = buying ? "USDC" : "SPRX";
  const to = buying ? "SPRX" : "USDC";
  let output = "—";
  let validAmount = false;
  try {
    const decimals = buying ? 6 : 18;
    const precisionOk =
      /^\d+(\.\d*)?$/.test(amount) &&
      (amount.split(".")[1]?.length ?? 0) <= decimals;
    const units = precisionOk ? parseUnits(amount, decimals) : 0n;
    validAmount = units > 0n;
    if (validAmount && hasQuote) {
      const gross = buying
        ? units * rate! * 1000000000000n
        : (units * 1000000n) / (rate! * 1000000000000000000n);
      const net = buying ? gross : gross - (gross * fee!) / 10000n;
      output = formatUnits(net, buying ? 18 : 6);
      if (net <= 0n) validAmount = false;
    }
  } catch {
    validAmount = false;
  }
  const submit = async () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    if (chainId !== CHAIN_ID) {
      switchChain({ chainId: CHAIN_ID });
      return;
    }
    if (!validAmount || !hasQuote || !configured || busy) return;
    try {
      setStep("approval");
      onStatus(
        "pending",
        `Step 1 of 2: approve ${from} in your wallet. Waiting for confirmation…`,
      );
      await (buying ? approveUSDC(amount) : approveSPRX(amount));
      setStep("swap");
      onStatus(
        "pending",
        "Step 2 of 2: confirm your swap in the wallet. Waiting for confirmation…",
      );
      await (buying ? buySPRX(amount) : sellSPRX(amount));
      onStatus(
        "success",
        "Swap confirmed on Polygon Amoy. Your tokens are on their way to your wallet.",
      );
      setAmount("");
      void queryClient.invalidateQueries();
    } catch (error) {
      onStatus(
        "error",
        error instanceof Error
          ? error.message
          : "Swap could not be completed. Please try again.",
      );
    } finally {
      setStep("idle");
    }
  };
  return (
    <section className="exchange-tab">
      <div className="section-heading">
        <div>
          <p className="eyebrow">FUEL YOUR FRONT ROW</p>
          <h2>
            Your tokens. More possibilities<span>.</span>
          </h2>
        </div>
      </div>
      <div className="exchange-layout">
        <div className="exchange-intro">
          <div className="exchange-emblem">
            <Wallet size={40} strokeWidth={1.2} />
          </div>
          <h3>
            A little SPRX.
            <br />A whole lot of sport.
          </h3>
          <p>
            Exchange USDC and SPRX directly through the access controller on
            Polygon Amoy.
          </p>
          <div className="exchange-feature">
            <ShieldCheck size={19} />
            <span>
              Wallet-approved transactions
              <small>You review every approval and swap.</small>
            </span>
          </div>
          <div className="exchange-feature">
            <ArrowUpRight size={19} />
            <span>
              Rates read from the contract
              <small>Sell fees are included in the estimate.</small>
            </span>
          </div>
          <p className="exchange-testnet">
            Testnet only · Use tokens deployed on Polygon Amoy.
          </p>
        </div>
        <div className="swap-card">
          <div className="swap-tabs">
            {(["buy", "sell"] as const).map((item) => (
              <button
                disabled={busy}
                key={item}
                className={direction === item ? "selected" : ""}
                onClick={() => {
                  setDirection(item);
                  setAmount("");
                }}
              >
                {item === "buy" ? "Buy SPRX" : "Sell SPRX"}
              </button>
            ))}
          </div>
          <div className="swap-input">
            <label htmlFor="swap-amount">
              You pay <span>Balance: {buying ? usdcBalance : sprxBalance}</span>
            </label>
            <div>
              <input
                id="swap-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                disabled={busy}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoComplete="off"
              />
              <strong>
                <span className="token-icon">{buying ? "$" : "S"}</span>
                {from}
              </strong>
            </div>
          </div>
          <div className="swap-arrow">
            <ArrowDown size={17} />
          </div>
          <div className="swap-output">
            <span>
              You receive <small>Estimated</small>
            </span>
            <div>
              <strong>{output}</strong>
              <b>{to}</b>
            </div>
          </div>
          <div className="swap-details">
            <span>
              Network<strong>Polygon Amoy</strong>
            </span>
            <span>
              Exchange rate
              <strong>
                {hasQuote ? `1 USDC = ${rate} SPRX` : "Unavailable"}
              </strong>
            </span>
            <span>
              Sell fee
              <strong>{hasQuote ? `${Number(fee) / 100}%` : "—"}</strong>
            </span>
          </div>
          {!configured ? (
            <p className="swap-notice">
              Exchange unavailable. Configure the deployed Amoy contract
              addresses to enable swaps.
            </p>
          ) : !hasQuote ? (
            <p className="swap-notice">
              {rateLoading
                ? "Reading the current contract rate…"
                : "Couldn't read the contract rate. Please check the network configuration."}
            </p>
          ) : null}
          <button
            className="btn-primary swap-submit"
            onClick={submit}
            disabled={
              busy ||
              (isConnected &&
                chainId === CHAIN_ID &&
                (!configured || !hasQuote || !validAmount))
            }
          >
            {busy ? (
              <>
                <LoaderCircle size={16} className="spin" />
                {step === "approval"
                  ? "1/2 · Confirming approval…"
                  : "2/2 · Confirming swap…"}
              </>
            ) : !isConnected ? (
              "Connect wallet"
            ) : chainId !== CHAIN_ID ? (
              "Switch to Polygon Amoy"
            ) : !validAmount ? (
              "Enter an amount"
            ) : (
              `Swap ${from} for ${to}`
            )}{" "}
            {!busy && <ArrowUpRight size={17} />}
          </button>
          <p className="swap-footnote">
            Two wallet confirmations: token approval, then swap.
          </p>
        </div>
      </div>
    </section>
  );
}
