import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useChainId } from "wagmi";
import Header from "./components/Header";
import LandingHero from "./components/LandingHero";
import Footer from "./components/Footer";
import EventsTab from "./components/EventsTab";
import ExchangeTab from "./components/ExchangeTab";
const StadiumRoom = lazy(() => import("./components/stadium/StadiumRoom"));
import StatusBar from "./components/StatusBar";
import { StatusMessage } from "./types";
import { CHAIN_ID, BYPASS_ACCESS_GATE } from "./wallet";
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
  // When the local bypass is enabled the network + POL balance gate is skipped.
  const hasPolAccess =
    BYPASS_ACCESS_GATE ||
    (isConnected && isAmoy && polBalance > MIN_POL_FOR_ACCESS);
  const networkOk = BYPASS_ACCESS_GATE || isAmoy;

  const statusTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(statusTimer.current), []);
  const navigate = (tab: Tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const showStatus = (type: StatusMessage["type"], message: string) => {
    setStatus({ type, message });
    clearTimeout(statusTimer.current);
    if (type !== "pending")
      statusTimer.current = setTimeout(() => setStatus(null), 7000);
  };

  return (
    <div className="app-container">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header activeTab={activeTab} onNavigate={navigate} isAmoy={isAmoy} />
      <main className="main-content" id="main-content">
        {activeTab === "events" && (
          <LandingHero
            onExplore={() =>
              document
                .getElementById("events")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            onEnterStadium={() => navigate("stadium")}
            onExchange={() => navigate("exchange")}
          />
        )}

        {activeTab === "events" && (
          <EventsTab
            isConnected={isConnected || BYPASS_ACCESS_GATE}
            isAmoy={networkOk}
            hasPolAccess={hasPolAccess}
            polBalance={polBalance}
            minPolForAccess={MIN_POL_FOR_ACCESS}
            onStatus={showStatus}
            onRequestWalletConnect={() => openConnectModal?.()}
            onEnterStadium={() => navigate("stadium")}
          />
        )}

        {activeTab === "exchange" && (
          <ExchangeTab isConnected={isConnected} onStatus={showStatus} />
        )}

        {activeTab === "stadium" && (
          <Suspense
            fallback={<div className="loading">Preparing your stadium…</div>}
          >
            <StadiumRoom
              isConnected={isConnected || BYPASS_ACCESS_GATE}
              isAmoy={networkOk}
              hasPolAccess={hasPolAccess}
              polBalance={polBalance}
              minPolForAccess={MIN_POL_FOR_ACCESS}
              onGoHome={() => navigate("events")}
            />
          </Suspense>
        )}

        <Footer />
      </main>

      {status && <StatusBar status={status} />}
    </div>
  );
}

export default App;
