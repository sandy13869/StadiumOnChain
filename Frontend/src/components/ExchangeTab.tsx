import { useState } from "react";
import { useExchange } from "../hooks/useExchange";
import { StatusMessage } from "../types";
import "./ExchangeTab.css";

interface ExchangeTabProps {
  isConnected: boolean;
  onStatus: (type: StatusMessage["type"], message: string) => void;
}

export default function ExchangeTab({ isConnected, onStatus }: ExchangeTabProps) {
  const { approveUSDC, buySPRX, approveSPRX, sellSPRX, loading } = useExchange();
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");

  const handleBuy = async () => {
    if (!isConnected) {
      onStatus("error", "Please connect your wallet first");
      return;
    }
    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      onStatus("error", "Please enter a valid amount");
      return;
    }

    try {
      onStatus("pending", "Approving USDC...");
      await approveUSDC(buyAmount);
      onStatus("pending", "Buying SPRX...");
      await buySPRX(buyAmount);
      onStatus("success", `Successfully bought SPRX with ${buyAmount} USDC`);
      setBuyAmount("");
    } catch (err) {
      onStatus("error", err instanceof Error ? err.message : "Transaction failed");
    }
  };

  const handleSell = async () => {
    if (!isConnected) {
      onStatus("error", "Please connect your wallet first");
      return;
    }
    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      onStatus("error", "Please enter a valid amount");
      return;
    }

    try {
      onStatus("pending", "Approving SPRX...");
      await approveSPRX(sellAmount);
      onStatus("pending", "Selling SPRX...");
      await sellSPRX(sellAmount);
      onStatus("success", `Successfully sold ${sellAmount} SPRX`);
      setSellAmount("");
    } catch (err) {
      onStatus("error", err instanceof Error ? err.message : "Transaction failed");
    }
  };

  return (
    <div className="exchange-tab">
      <h2>Token Exchange</h2>
      
      <div className="exchange-cards">
        <div className="exchange-card">
          <h3>Buy SPRX</h3>
          <p className="exchange-description">
            Exchange USDC for SPRX tokens to access premium content
          </p>
          
          <div className="exchange-input">
            <label>USDC Amount</label>
            <input
              type="number"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              disabled={!isConnected}
            />
          </div>

          <div className="exchange-rate">
            <span>Rate:</span>
            <span>1 USDC = 100 SPRX</span>
          </div>

          <button
            className="btn-primary"
            onClick={handleBuy}
            disabled={loading || !isConnected}
          >
            {loading ? "Processing..." : "Buy SPRX"}
          </button>
        </div>

        <div className="exchange-card">
          <h3>Sell SPRX</h3>
          <p className="exchange-description">
            Convert your SPRX tokens back to USDC stablecoin
          </p>
          
          <div className="exchange-input">
            <label>SPRX Amount</label>
            <input
              type="number"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              disabled={!isConnected}
            />
          </div>

          <div className="exchange-rate">
            <span>Rate:</span>
            <span>100 SPRX = 1 USDC (minus 1% fee)</span>
          </div>

          <button
            className="btn-primary"
            onClick={handleSell}
            disabled={loading || !isConnected}
          >
            {loading ? "Processing..." : "Sell SPRX"}
          </button>
        </div>
      </div>

      <div className="exchange-info">
        <h4>About SPRX Token</h4>
        <p>
          SPRX is the native utility token of the Tokenized SPRX platform. Use it to access
          premium sports streaming content, participate in governance, and earn rewards.
        </p>
        <ul>
          <li>Burn SPRX for instant stream access</li>
          <li>Trade SPRX/USDC at competitive rates</li>
          <li>1% protocol fee on all sell transactions</li>
        </ul>
      </div>
    </div>
  );
}
