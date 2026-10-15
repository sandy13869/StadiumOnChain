import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  X,
  ShieldCheck,
  Orbit,
  Radio,
} from "lucide-react";
import { useEvents } from "../hooks/useEvents";
import { StatusMessage } from "../types";
import { BYPASS_ACCESS_GATE } from "../wallet";
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
  const { events, loading, error, refetch } = useEvents();
  const [sport, setSport] = useState("All sports");
  const [query, setQuery] = useState("");
  const [liveOnly, setLiveOnly] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selectedEvent !== null) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selectedEvent]);
  const selected = events.find((event) => event.id === selectedEvent);
  const filtered = events.filter(
    (event) =>
      (sport === "All sports" || event.sport === sport) &&
      (!liveOnly || event.isLive) &&
      `${event.name} ${event.sport}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const enter = () => {
    onStatus(
      "success",
      BYPASS_ACCESS_GATE
        ? "Opening stadium preview. No payment required."
        : "Wallet access verified. Welcome to the stadium.",
    );
    setSelectedEvent(null);
    onEnterStadium();
  };
  return (
    <section className="events-tab" id="events" aria-labelledby="events-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">FIND YOUR NEXT MOMENT</p>
          <h2 id="events-title">
            The game is on<span>.</span>
          </h2>
        </div>
        <button
          className={`live-filter ${liveOnly ? "selected" : ""}`}
          aria-pressed={liveOnly}
          onClick={() => setLiveOnly(!liveOnly)}
        >
          <Radio size={15} /> Live now{" "}
          <span>{events.filter((e) => e.isLive).length}</span>
        </button>
      </div>
      <div className="events-toolbar">
        <div className="sport-filters" aria-label="Filter by sport">
          {[
            "All sports",
            ...Array.from(new Set(events.map((e) => e.sport))),
          ].map((item) => (
            <button
              key={item}
              onClick={() => setSport(item)}
              aria-pressed={sport === item}
              className={sport === item ? "selected" : ""}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="event-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find an event"
            aria-label="Search events"
          />
        </label>
      </div>
      {loading ? (
        <div
          className="events-grid"
          aria-label="Loading events"
          aria-busy="true"
        >
          {[1, 2, 3].map((i) => (
            <div className="event-skeleton" key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="empty-state">
          <Radio size={28} />
          <h3>Taking a quick timeout.</h3>
          <p>
            We couldn't load the event schedule. Check that the API server is
            running.
          </p>
          <button className="btn-secondary" onClick={refetch}>
            Try again <ArrowRight size={16} />
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <SlidersHorizontal size={28} />
          <h3>No events in this lineup.</h3>
          <p>Try another sport or search.</p>
          <button
            className="btn-secondary"
            onClick={() => {
              setSport("All sports");
              setQuery("");
              setLiveOnly(false);
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="events-grid">
          {filtered.map((event) => (
            <article className="event-card" key={event.id}>
              <button
                className="event-visual"
                onClick={() => setSelectedEvent(event.id)}
                aria-label={`View ${event.name}`}
              >
                <img src={event.thumbnail} alt="" loading="lazy" />
                <span
                  className={event.isLive ? "live-badge" : "upcoming-badge"}
                >
                  {event.isLive ? "LIVE" : "SCHEDULED"}
                </span>
                <span className="event-3d">
                  <Orbit size={13} /> 3D READY
                </span>
                <span className="event-open">
                  <ArrowUpRight size={23} />
                </span>
              </button>
              <div className="event-info">
                <div className="event-meta">
                  <span>{event.sport}</span>
                  <span>
                    {new Date(event.startTime).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <h3>{event.name}</h3>
                <div className="event-bottom">
                  <span>
                    {BYPASS_ACCESS_GATE ? (
                      <>
                        <span className="preview-dot" /> Preview available
                      </>
                    ) : (
                      <>
                        {event.costPerMinute} USDC <small>/ min</small>
                      </>
                    )}
                  </span>
                  <button
                    onClick={() => setSelectedEvent(event.id)}
                    aria-label={`View ${event.name}`}
                  >
                    View event <ArrowUpRight size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="schedule-note">
        <ShieldCheck size={14} />
        <span>
          Demo event lineup · Polygon Amoy testnet
          {BYPASS_ACCESS_GATE
            ? " · Stadium preview is open. No payment required."
            : " · Wallet eligibility is checked before entry."}
        </span>
      </div>
      <div className="stadium-banner">
        <div className="banner-orbit">
          <Orbit size={56} strokeWidth={1} />
        </div>
        <div>
          <p className="eyebrow">A DIFFERENT POINT OF VIEW</p>
          <h3>Welcome to your virtual home ground.</h3>
          <p>Choose your angle. Feel the crowd. Make the stadium yours.</p>
        </div>
        <button className="btn-primary" onClick={onEnterStadium}>
          Enter 3D stadium <ArrowUpRight size={17} />
        </button>
      </div>
      <dialog
        ref={dialog}
        className="access-dialog"
        aria-labelledby="event-dialog-title"
        onCancel={() => setSelectedEvent(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedEvent(null);
        }}
        onClose={() => setSelectedEvent(null)}
      >
        <button
          className="modal-close"
          onClick={() => setSelectedEvent(null)}
          aria-label="Close event details"
        >
          <X size={20} />
        </button>
        <span className="dialog-icon">
          <Orbit size={28} />
        </span>
        <p className="eyebrow">YOUR FRONT ROW AWAITS</p>
        <h2 id="event-dialog-title">{selected?.name}</h2>
        <p>
          {BYPASS_ACCESS_GATE
            ? "Explore the immersive stadium in preview mode. No wallet or payment is required. The event lineup and broadcast feeds are demonstrations."
            : !isConnected
              ? "Connect your wallet to check your stadium eligibility on Polygon Amoy."
              : !isAmoy
                ? "Switch your wallet to Polygon Amoy to continue."
                : !hasPolAccess
                  ? `Entry requires more than ${minPolForAccess} POL on Polygon Amoy. Your balance is ${polBalance.toFixed(2)} POL.`
                  : "Your wallet is eligible. You're ready to enter the stadium."}
        </p>
        <div className="dialog-summary">
          <span>
            Network<strong>Polygon Amoy</strong>
          </span>
          <span>
            Access
            <strong>
              {BYPASS_ACCESS_GATE ? "Free preview" : "Wallet verification"}
            </strong>
          </span>
        </div>
        {!isConnected && !BYPASS_ACCESS_GATE ? (
          <button className="btn-primary" onClick={onRequestWalletConnect}>
            Connect wallet <ArrowRight size={16} />
          </button>
        ) : (
          <button
            className="btn-primary"
            disabled={!hasPolAccess || !isAmoy}
            onClick={enter}
          >
            Enter stadium <ArrowUpRight size={17} />
          </button>
        )}
      </dialog>
    </section>
  );
}
