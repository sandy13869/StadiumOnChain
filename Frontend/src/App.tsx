import { useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useChainId } from "wagmi";
import { Zap, Ticket, Radio } from "lucide-react";
import Header from "./components/Header";
import LandingHero from "./components/LandingHero";
import Footer from "./components/Footer";
import EventsTab from "./components/EventsTab";
import ExchangeTab from "./components/ExchangeTab";
import StadiumRoom from "./components/stadium/StadiumRoom";
import StatusBar from "./components/StatusBar";
import { StatusMessage } from "./types";
import { CHAIN_ID } from "./wallet";
import "./App.css";

type Tab = "events" | "exchange" | "stadium";
const MIN_POL_FOR_ACCESS = 30;

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("events");
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();

  const { data: nativeBalance } = useBalance({
    address,
    query: { enabled: !!address },
  });

  const polBalance = Number(nativeBalance?.formatted ?? "0");
  const isAmoy = chainId === CHAIN_ID;
  const hasPolAccess = isConnected && isAmoy && polBalance > MIN_POL_FOR_ACCESS;

  const showStatus = (type: StatusMessage["type"], message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 5000);
  };

  return (
    <div className="app-container">
      <Header
        isAmoy={isAmoy}
        polBalance={polBalance}
        minPolForAccess={MIN_POL_FOR_ACCESS}
      />

      <LandingHero
        isAmoy={isAmoy}
        hasPolAccess={hasPolAccess}
        polBalance={polBalance}
        minPolForAccess={MIN_POL_FOR_ACCESS}
      />

      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === "events" ? "active" : ""}`}
          onClick={() => setActiveTab("events")}
        >
          <Radio size={18} />
          Live Events
        </button>
        <button
          className={`tab-btn ${activeTab === "exchange" ? "active" : ""}`}
          onClick={() => setActiveTab("exchange")}
        >
          <Zap size={18} />
          Token Exchange
        </button>
        <button
          className={`tab-btn ${activeTab === "stadium" ? "active" : ""}`}
          onClick={() => setActiveTab("stadium")}
        >
          <Ticket size={18} />
          3D Stadium
        </button>
      </div>

      {activeTab === "events" && (
        <EventsTab
          isConnected={isConnected}
          isAmoy={isAmoy}
          hasPolAccess={hasPolAccess}
          polBalance={polBalance}
          minPolForAccess={MIN_POL_FOR_ACCESS}
          onStatus={showStatus}
          onRequestWalletConnect={() => openConnectModal?.()}
          onEnterStadium={() => setActiveTab("stadium")}
        />
      )}

      {activeTab === "exchange" && (
        <ExchangeTab
          isConnected={isConnected}
          onStatus={showStatus}
        />
      )}

      {activeTab === "stadium" && (
        <StadiumRoom
          isConnected={isConnected}
          isAmoy={isAmoy}
          hasPolAccess={hasPolAccess}
          polBalance={polBalance}
          minPolForAccess={MIN_POL_FOR_ACCESS}
          onGoHome={() => setActiveTab("events")}
        />
      )}

      <Footer />

      {status && <StatusBar status={status} />}
    </div>
  );
}

export default App;
