import { useEffect, useState } from "react";
import { useEvents } from "../hooks/useEvents";
import { StatusMessage } from "../types";
import "./EventsTab.css";

interface EventsTabProps {
  isConnected: boolean;
  isAmoy: boolean;
  hasPolAccess: boolean;
  polBalance: number;
  minPolForAccess: number;
  onStatus: (type: StatusMessage["type"], message: string) => void;
  onRequestWalletConnect: () => void;
  onEnterStadium: () => void;
}

export default function EventsTab({
  isConnected,
  isAmoy,
  hasPolAccess,
  polBalance,
  minPolForAccess,
  onStatus,
  onRequestWalletConnect,
  onEnterStadium,
}: EventsTabProps) {
  const { events, loading, error } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const closeAccessModal = () => {
    setSelectedEvent(null);
    setIsWalletModalOpen(false);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAccessModal();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleAccess = (eventId: number) => {
    if (!isConnected) {
      setIsWalletModalOpen(true);
      return;
    }

    if (!isAmoy) {
      onStatus("error", "Switch wallet network to ETH to enter events.");
      return;
    }

    if (!hasPolAccess) {
      onStatus(
        "error",
        `Access requires more than ${minPolForAccess} POL on ETH. Current balance: ${polBalance.toFixed(2)} POL.`
      );
      return;
    }

    onStatus("success", `Access granted for Event #${eventId}. Welcome to the stadium.`);
    onEnterStadium();
    closeAccessModal();
  };

  const accessLabel = !isConnected
    ? "Connect Wallet"
    : !isAmoy
      ? "Switch To ETH"
      : hasPolAccess
        ? "Enter Event"
        : `Need > ${minPolForAccess} POL`;

  const accessNote = hasPolAccess
    ? "Wallet verified. You can access every live event and stadium view."
    : `Gate rule: wallet must hold more than ${minPolForAccess} POL on ETH.`;

  const statusClass = hasPolAccess ? "status-ok" : "status-warning";

  const selectedEventData = selectedEvent
    ? events.find((event) => event.id === selectedEvent)
    : null;

  if (loading) {
    return <div className="loading">Loading events...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="events-tab">
      <section className="access-hero">
        <p className="hero-kicker">Web3 Access Rule</p>
        <h2>Live Sports Events</h2>
        <p className="hero-copy">{accessNote}</p>
        <div className="hero-metrics">
          <div className="metric-card">
            <span className="metric-label">Network</span>
            <span className={`metric-value ${isAmoy ? "status-ok" : "status-warning"}`}>
              {isAmoy ? "ETH" : "Wrong Network"}
            </span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Wallet POL</span>
            <span className={`metric-value ${statusClass}`}>{polBalance.toFixed(2)} POL</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Minimum</span>
            <span className="metric-value">&gt; {minPolForAccess} POL</span>
          </div>
        </div>
      </section>

      <h2>Live Sports Events</h2>
      <div className="events-grid">
        {events.map((event) => (
          <div key={event.id} className="event-card">
            {event.isLive && <div className="live-badge">LIVE</div>}
            <img src={event.thumbnail} alt={event.name} className="event-thumbnail" />
            <div className="event-info">
              <h3>{event.name}</h3>
              <div className="event-meta">
                <span className="event-sport">{event.sport}</span>
                <span className="event-time">
                  {new Date(event.startTime).toLocaleString()}
                </span>
              </div>
              <div className="event-cost">
                Access Gate: ETH wallet with &gt; {minPolForAccess} POL
              </div>
              <button
                className="btn-primary"
                onClick={() => setSelectedEvent(event.id)}
                disabled={isConnected && (!isAmoy || !hasPolAccess)}
              >
                {accessLabel}
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedEvent && (
        <div className="modal-overlay" onClick={closeAccessModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeAccessModal} aria-label="Close modal">
              ×
            </button>
            <h3>{selectedEventData?.name ?? `Event #${selectedEvent}`}</h3>

            {!isConnected && (
              <div className="wallet-connect-panel">
                <p>Connect your wallet to continue. You can close this panel with the button or Escape key.</p>
                <button
                  className="btn-primary"
                  onClick={() => {
                    onRequestWalletConnect();
                    setIsWalletModalOpen(true);
                  }}
                >
                  Open Wallet Modal
                </button>
              </div>
            )}

            {isConnected && !isAmoy && (
              <div className="wallet-connect-panel">
                <p>Switch your wallet network to ETH, then try again.</p>
              </div>
            )}

            {isConnected && isAmoy && !hasPolAccess && (
              <div className="wallet-connect-panel">
                <p>
                  This wallet currently has {polBalance.toFixed(2)} POL. Access opens automatically once the
                  balance is greater than {minPolForAccess} POL.
                </p>
              </div>
            )}

            {isConnected && hasPolAccess && (
              <div className="wallet-connect-panel">
                <p>
                  Wallet verified with {polBalance.toFixed(2)} POL on ETH. You can enter this event and the
                  3D stadium.
                </p>
              </div>
            )}

            {isWalletModalOpen && (
              <div className="wallet-modal-hint">
                Wallet modal opened. Use its close button or press Escape to dismiss it.
              </div>
            )}

            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={() => handleAccess(selectedEvent)}
                disabled={!isConnected || !hasPolAccess}
              >
                Enter Stadium
              </button>
              <button
                className="btn-secondary"
                onClick={closeAccessModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
