import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  ArrowUpRight,
  AudioLines,
  Compass,
  Orbit,
  ArrowLeftRight,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { BYPASS_ACCESS_GATE } from "../wallet";
import "./Header.css";

export type Tab = "events" | "exchange" | "stadium";
interface HeaderProps {
  activeTab: Tab;
  onNavigate: (tab: Tab) => void;
  isAmoy: boolean;
}
export default function Header({ activeTab, onNavigate, isAmoy }: HeaderProps) {
  return (
    <>
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => onNavigate("events")}
          aria-label="SPRX home"
        >
          <span className="brand-mark">
            <AudioLines size={25} />
          </span>
          <span>
            sprx<span className="brand-period">.</span>
          </span>
        </button>
        <p className="nav-caption">YOUR FRONT ROW</p>
        <nav aria-label="Main navigation">
          {(
            [
              { id: "events", label: "Discover", icon: Compass },
              { id: "stadium", label: "3D Stadium", icon: Orbit },
              { id: "exchange", label: "Token Exchange", icon: ArrowLeftRight },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${activeTab === id ? "active" : ""}`}
              onClick={() => onNavigate(id)}
              aria-current={activeTab === id ? "page" : undefined}
            >
              <Icon size={19} />
              {label}
              {id === "stadium" && <span className="nav-new">3D</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-promo">
            <Orbit size={28} />
            <h3>More than a screen.</h3>
            <p>A whole new way to be at the game.</p>
            <button onClick={() => onNavigate("stadium")}>
              Explore the stadium <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="chain-note">
            <ShieldCheck size={16} />
            <span>
              Powered by Polygon<span>Amoy test network</span>
            </span>
          </div>
        </div>
      </aside>
      <header className="header">
        <div className="header-location">
          <span className="header-breadcrumb">The home of on-chain sports</span>
          <span className="header-page">
            {activeTab === "events"
              ? "Discover"
              : activeTab === "stadium"
                ? "Your stadium"
                : "Token exchange"}
          </span>
        </div>
        <div className="header-right">
          <span className="network-pill">
            <Radio size={13} />
            {BYPASS_ACCESS_GATE
              ? "Preview mode"
              : isAmoy
                ? "Polygon Amoy"
                : "Switch network"}
          </span>
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="address"
          />
        </div>
      </header>
    </>
  );
}
