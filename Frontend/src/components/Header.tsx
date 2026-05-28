import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useBalance } from "../hooks/useBalance";
import "./Header.css";

interface HeaderProps {
  isAmoy: boolean;
  polBalance: number;
  minPolForAccess: number;
}

export default function Header({ isAmoy, polBalance, minPolForAccess }: HeaderProps) {
  const { sprxBalance, usdcBalance } = useBalance();
  const hasAccess = isAmoy && polBalance > minPolForAccess;

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <div className="logo-thunder" aria-hidden="true">⚡</div>
          <h1>Tokenized SPRX</h1>
        </div>
        <div className="balance-display">
          <div className="balance-item">
            <span className="balance-label">SPRX</span>
            <span className="balance-value">{sprxBalance}</span>
          </div>
          <div className="balance-item">
            <span className="balance-label">USDC</span>
            <span className="balance-value">{usdcBalance}</span>
          </div>
          <div className="balance-item">
            {/* <span className="balance-label">POL</span>
            <span className="balance-value">{polBalance.toFixed(2)}</span> */}
          </div>
        </div>
      </div>
      <div className="header-right">
        <div className="network-pill">
          <span className={isAmoy ? "dot ok" : "dot warn"} />
          {isAmoy ? "ETH" : "Wrong Network"}
        </div>
        <div className="access-pill">
          {hasAccess ? "Access Enabled" : `Need > ${minPolForAccess} POL`}
        </div>
      <ConnectButton />
      </div>
    </header>
  );
}
