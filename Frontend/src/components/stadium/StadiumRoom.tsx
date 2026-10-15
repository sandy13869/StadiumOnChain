import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Crosshair,
  Footprints,
  Glasses,
  HelpCircle,
  Maximize,
  Minimize,
  MousePointer2,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  Ticket,
  Volume2,
  VolumeX,
} from "lucide-react";
import * as THREE from "three";
import StadiumSeats from "./StadiumSeats";
import MainScreen from "./MainScreen";
import SideScreens from "./SideScreens";
import Lighting from "./Lighting";
import Floor from "./Floor";
import Particles from "./Particles";
import ScoreBoard from "./ScoreBoard";
import Pitch from "./Pitch";
import { BYPASS_ACCESS_GATE } from "../../wallet";
import { DesktopNavigation, HeadsetNavigation } from "./StadiumNavigation";
import { DemoMatch, HeadsetMenu, SeatMarkers } from "./StadiumInteractions";
import { SEATS, type NavigationMode } from "./stadiumConfig";
import "./StadiumRoom.css";

const xrStore = createXRStore();
interface StadiumRoomProps {
  isConnected: boolean;
  isAmoy: boolean;
  hasPolAccess: boolean;
  polBalance: number;
  minPolForAccess: number;
  onGoHome: () => void;
  eventId?: number;
}
class SceneBoundary extends Component<
  { children: ReactNode; onBack: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-error">
        <Orbit size={35} />
        <h3>The 3D scene couldn't start.</h3>
        <p>Try a browser with WebGL enabled, or reload to try again.</p>
        <button className="btn-secondary" onClick={this.props.onBack}>
          Return to lobby
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function StadiumRoom({
  isConnected,
  isAmoy,
  hasPolAccess,
  polBalance,
  minPolForAccess,
  onGoHome,
  eventId,
}: StadiumRoomProps) {
  const [admitted, setAdmitted] = useState(false);
  const [seatIndex, setSeatIndex] = useState(0);
  const [mode, setMode] = useState<NavigationMode>("seat");
  const [reset, setReset] = useState(0);
  const [locked, setLocked] = useState(false);
  const [isXrSession, setIsXrSession] = useState(false);
  const [xrSupported, setXrSupported] = useState<boolean | null>(null);
  const [xrPending, setXrPending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [help, setHelp] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(false);
  const [volume, setVolume] = useState(45);
  const [message, setMessage] = useState(
    "Choose a seat and make yourself at home.",
  );
  const [quality, setQuality] = useState<"balanced" | "high">("balanced");
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [goals, setGoals] = useState(2);
  const [goalSequence, setGoalSequence] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const soundEnabled = useRef(false);
  const ambience = useRef<HTMLAudioElement | null>(null);
  const cheer = useRef<HTMLAudioElement | null>(null);
  const goalTimeout = useRef<ReturnType<typeof setTimeout>>();
  const eligible = isConnected && isAmoy && hasPolAccess;
  const seat = SEATS[seatIndex];
  const clock = `${78 + Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  useEffect(() => {
    let live = true;
    if (navigator.xr && window.isSecureContext)
      navigator.xr
        .isSessionSupported("immersive-vr")
        .then((value) => {
          if (live) setXrSupported(value);
        })
        .catch(() => {
          if (live) setXrSupported(false);
        });
    else setXrSupported(false);
    const unsubscribe = xrStore.subscribe((state) => {
      if (live) {
        setIsXrSession(!!state.session);
        if (state.session) {
          setMode("seat");
          setLocked(false);
        }
      }
    });
    return () => {
      live = false;
      unsubscribe();
      void xrStore
        .getState()
        .session?.end()
        .catch(() => undefined);
    };
  }, []);
  useEffect(() => {
    const audio = new Audio("/audio/crowd-ambience.mp3");
    audio.loop = true;
    audio.preload = "none";
    const cheerAudio = new Audio("/audio/crowd-cheer.mp3");
    cheerAudio.preload = "none";
    ambience.current = audio;
    cheer.current = cheerAudio;
    cheerAudio.onended = () => setCelebrating(false);
    return () => {
      audio.pause();
      cheerAudio.pause();
      cheerAudio.onended = null;
      clearTimeout(goalTimeout.current);
    };
  }, []);
  useEffect(() => {
    if (ambience.current) ambience.current.volume = volume / 100;
    if (cheer.current) cheer.current.volume = volume / 100;
  }, [volume]);
  useEffect(() => {
    if (!admitted || paused) return;
    const timer = setInterval(() => setSeconds((s) => (s + 1) % 720), 1000);
    return () => clearInterval(timer);
  }, [admitted, paused]);
  useEffect(() => {
    const sync = () => {
      if (!document.fullscreenElement) setExpanded(false);
    };
    document.addEventListener("fullscreenchange", sync);
    const lockError = () =>
      setMessage(
        "Mouse capture was blocked. Try Start walking again, or choose Seated / Explore.",
      );
    document.addEventListener("pointerlockerror", lockError);
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHelp(false);
        if (!document.fullscreenElement) setExpanded(false);
      }
    };
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("pointerlockerror", lockError);
      window.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(() => {
    if (eligible) return;
    setAdmitted(false);
    setIsSoundOn(false);
    soundEnabled.current = false;
    ambience.current?.pause();
    cheer.current?.pause();
    clearTimeout(goalTimeout.current);
    goalTimeout.current = undefined;
    void xrStore
      .getState()
      .session?.end()
      .catch(() => undefined);
  }, [eligible]);
  const selectSeat = useCallback((index: number) => {
    setSeatIndex(index);
    setMode("seat");
    setReset((n) => n + 1);
    setMessage(
      `You're in ${SEATS[index].label}, row ${SEATS[index].row}, seat ${SEATS[index].seat}.`,
    );
  }, []);
  const toggleSound = async () => {
    if (!ambience.current) return;
    if (isSoundOn) {
      ambience.current.pause();
      cheer.current?.pause();
      setIsSoundOn(false);
      soundEnabled.current = false;
      setCelebrating(false);
      setMessage("Crowd muted.");
      return;
    }
    try {
      await ambience.current.play();
      setIsSoundOn(true);
      soundEnabled.current = true;
      setMessage("Crowd ambience on. Adjust the volume below.");
    } catch {
      setMessage("Audio couldn't play. Try the crowd button again.");
    }
  };
  const playCheer = async () => {
    setCelebrating(true);
    if (!soundEnabled.current) {
      setMessage("The crowd is cheering! Turn crowd audio on to hear it.");
      return;
    }
    if (cheer.current)
      try {
        cheer.current.currentTime = 0;
        await cheer.current.play();
      } catch {
        setMessage(
          "Cheer audio unavailable. Crowd ambience is still available.",
        );
      }
  };
  const triggerGoal = () => {
    if (paused || goalTimeout.current) return;
    setGoalSequence((n) => n + 1);
    setMessage("Demo play: a shot on goal…");
    goalTimeout.current = setTimeout(() => {
      setGoals((n) => n + 1);
      setMessage("GOAL! A simulated home-team goal.");
      void playCheer();
      goalTimeout.current = undefined;
    }, 1800);
  };
  useEffect(() => {
    if (!celebrating) return;
    const timer = setTimeout(() => setCelebrating(false), 5000);
    return () => clearTimeout(timer);
  }, [celebrating]);
  const exitXR = async () => {
    try {
      await xrStore.getState().session?.end();
    } catch {
      setMessage("Use your headset's system menu to end the VR session.");
    }
  };
  const enterXR = async () => {
    if (xrPending) return;
    setXrPending(true);
    try {
      if (document.pointerLockElement) document.exitPointerLock();
      const session = await xrStore.enterVR();
      if (!session)
        setMessage(
          "No headset session started. Connect a WebXR headset, or use PC fullscreen.",
        );
      else
        setMessage(
          "VR active. Point and select the in-world panel. Right stick: 30° snap turns.",
        );
    } catch {
      setMessage(
        "VR couldn't start. Check headset connection and browser permissions. PC controls remain available.",
      );
    } finally {
      setXrPending(false);
    }
  };
  const toggleFullscreen = async () => {
    if (expanded) {
      if (document.fullscreenElement)
        await document.exitFullscreen().catch(() => undefined);
      setExpanded(false);
      return;
    }
    setExpanded(true);
    try {
      await canvasWrapRef.current?.requestFullscreen?.();
    } catch {
      setMessage("Using an expanded stadium view. Press Escape to return.");
    }
  };
  const leave = async () => {
    await exitXR();
    if (document.fullscreenElement)
      await document.exitFullscreen().catch(() => undefined);
    setExpanded(false);
    setAdmitted(false);
    setIsSoundOn(false);
    soundEnabled.current = false;
    ambience.current?.pause();
    cheer.current?.pause();
    clearTimeout(goalTimeout.current);
    goalTimeout.current = undefined;
  };

  if (!eligible)
    return (
      <section className="stadium-access">
        <Ticket size={38} />
        <h2>Your stadium access</h2>
        <p>
          {!isConnected
            ? "Connect your wallet from the header to check entry."
            : !isAmoy
              ? "Switch your wallet to Polygon Amoy to continue."
              : `Entry requires more than ${minPolForAccess} POL. Current balance: ${polBalance.toFixed(2)} POL.`}
        </p>
        <button className="btn-secondary" onClick={onGoHome}>
          Back to discover
        </button>
      </section>
    );
  if (!admitted)
    return (
      <section className="stadium-lobby">
        <button className="stadium-back" onClick={onGoHome}>
          <ArrowLeft size={15} /> Back to discover
        </button>
        <div className="lobby-heading">
          <div>
            <p className="eyebrow">MATCHDAY STARTS HERE</p>
            <h2>Your seat. Your stadium.</h2>
            <p>
              Pick your view, collect your demo pass, and step into the crowd.
            </p>
          </div>
          <span className="demo-tag">
            {BYPASS_ACCESS_GATE
              ? "FREE DEMO · NO WALLET NEEDED"
              : "WALLET ACCESS ELIGIBLE"}
          </span>
        </div>
        <div className="lobby-layout">
          <div className="seat-choices">
            {SEATS.map((item, i) => (
              <button
                className={`seat-choice ${i === seatIndex ? "selected" : ""}`}
                key={item.id}
                onClick={() => setSeatIndex(i)}
                aria-pressed={i === seatIndex}
              >
                <span className="seat-number">0{i + 1}</span>
                <span>
                  <small>{item.section}</small>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </span>
                <span className="seat-check">
                  {i === seatIndex ? (
                    <Check size={17} />
                  ) : (
                    <ChevronRight size={17} />
                  )}
                </span>
              </button>
            ))}
            <div className="lobby-hints">
              <span>
                <MousePointer2 size={16} />
                PC · Mouse + keyboard
              </span>
              <span>
                <Glasses size={18} />
                VR · WebXR headset
              </span>
            </div>
          </div>
          <div className="demo-ticket">
            <div className="ticket-top">
              <Ticket size={25} />
              <span>SPRX STADIUM PASS</span>
            </div>
            <p className="eyebrow">
              {BYPASS_ACCESS_GATE
                ? "COMPLIMENTARY DEMO ENTRY"
                : "WALLET-ELIGIBLE ENTRY"}
            </p>
            <h3>{seat.label}</h3>
            <p>{seat.section}</p>
            <div className="ticket-details">
              <span>
                ROW<strong>{seat.row}</strong>
              </span>
              <span>
                SEAT<strong>{seat.seat}</strong>
              </span>
              <span>
                ACCESS<strong>PC + VR</strong>
              </span>
            </div>
            <div className="ticket-perforation" />
            <div className="ticket-price">
              <span>
                {BYPASS_ACCESS_GATE ? "Demo admission" : "Entry eligibility"}
              </span>
              <strong>{BYPASS_ACCESS_GATE ? "FREE" : "Ready"}</strong>
            </div>
            <button
              className="btn-primary"
              onClick={() => {
                setAdmitted(true);
                selectSeat(seatIndex);
              }}
            >
              Take my seat <ArrowUpRight size={17} />
            </button>
            <p className="ticket-note">
              {BYPASS_ACCESS_GATE
                ? "A local demo pass, not an NFT or on-chain ticket. No payment or signature."
                : "This pass reflects the current wallet eligibility gate; it is not a purchased NFT."}{" "}
              Match and crowd actions are simulated.
            </p>
          </div>
        </div>
      </section>
    );

  return (
    <section className="stadium-room">
      <div className="stadium-header">
        <div>
          <p className="eyebrow">YOUR FRONT ROW IS READY</p>
          <h2>
            Inside the stadium<span>.</span>
          </h2>
        </div>
        <button className="btn-secondary" onClick={() => void leave()}>
          <ArrowLeft size={15} />
          Change admission
        </button>
      </div>
      <div
        className={`stadium-experience ${expanded ? "is-expanded" : ""}`}
        ref={canvasWrapRef}
      >
        <div className="stadium-topbar">
          <span className="demo-tag">SIMULATED MATCH</span>
          <span className="match-score">
            HOME <b>{goals} : 1</b> AWAY{" "}
            <small>
              {clock} {paused ? "· PAUSED" : ""}
            </small>
          </span>
          <button
            className="icon-control"
            onClick={() => void toggleFullscreen()}
            aria-label={expanded ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {expanded ? <Minimize size={17} /> : <Maximize size={17} />}
          </button>
        </div>
        <div className="stadium-canvas">
          <SceneBoundary onBack={() => void leave()}>
            <Suspense
              fallback={
                <div className="scene-error">
                  Preparing the pitch and stands…
                </div>
              }
            >
              <Canvas
                shadows={quality === "high"}
                dpr={quality === "high" ? [1, 1.75] : 1}
                camera={{
                  position: [...seat.position],
                  fov: 65,
                  near: 0.1,
                  far: 700,
                }}
                gl={{ antialias: true, powerPreference: "high-performance" }}
                fallback={
                  <div className="scene-error">
                    WebGL is unavailable. Enable hardware acceleration to enter
                    the 3D stadium.
                  </div>
                }
                onCreated={({ gl }) => {
                  gl.toneMapping = THREE.ACESFilmicToneMapping;
                  gl.toneMappingExposure = 1.15;
                  gl.domElement.tabIndex = 0;
                  gl.domElement.setAttribute(
                    "aria-label",
                    "Stadium view. Drag to look around. In walk mode, click Start walking and use WASD. Escape releases the mouse.",
                  );
                }}
              >
                <XR store={xrStore}>
                  <color attach="background" args={["#090611"]} />
                  <fog attach="fog" args={["#090611", 250, 600]} />
                  {isXrSession ? (
                    <HeadsetNavigation seatIndex={seatIndex} />
                  ) : (
                    <DesktopNavigation
                      mode={mode}
                      seatIndex={seatIndex}
                      reset={reset}
                      onLock={setLocked}
                    />
                  )}
                  <Lighting />
                  <Floor />
                  <Pitch />
                  <StadiumSeats cheering={celebrating} />
                  <DemoMatch paused={paused} goalSequence={goalSequence} />
                  <MainScreen
                    eventId={eventId}
                    feed={{
                      id: "demo-match",
                      label: "SPRX Football Demo",
                      score: `HOME ${goals} - 1 AWAY`,
                      accent: "#b28aff",
                      paused,
                      clock,
                    }}
                  />
                  <SideScreens />
                  <ScoreBoard homeScore={goals} clock={clock} />
                  <Particles count={quality === "high" ? 600 : 160} />
                  {mode === "orbit" && !isXrSession && (
                    <SeatMarkers onSelect={selectSeat} />
                  )}
                  {isXrSession && (
                    <HeadsetMenu
                      seatIndex={seatIndex}
                      soundOn={isSoundOn}
                      onSeat={() => selectSeat((seatIndex + 1) % SEATS.length)}
                      onSound={() => void toggleSound()}
                      onCheer={() => void playCheer()}
                      onExit={() => void exitXR()}
                    />
                  )}
                </XR>
              </Canvas>
            </Suspense>
          </SceneBoundary>
          {!isXrSession && (
            <>
              <div className="seat-location">
                <Ticket size={14} />
                <span>
                  {mode === "walk"
                    ? "PITCHSIDE WALK"
                    : mode === "orbit"
                      ? "STADIUM EXPLORER"
                      : `${seat.section} · ROW ${seat.row} · SEAT ${seat.seat}`}
                </span>
              </div>
              {mode === "walk" && !locked && (
                <div className="walk-prompt">
                  <Footprints size={25} />
                  <h3>Take a pitchside walk.</h3>
                  <p>
                    WASD to move · Mouse to look · Shift to move faster.
                    <br />
                    Press Escape to release your mouse.
                  </p>
                  <button id="stadium-walk-lock" className="btn-primary">
                    Start walking <ArrowUpRight size={16} />
                  </button>
                </div>
              )}
              {locked && (
                <div className="walk-crosshair" aria-hidden="true">
                  +
                </div>
              )}
              {celebrating && (
                <div className="goal-flash">
                  COME ON, HOME!<span>The crowd is with you.</span>
                </div>
              )}
            </>
          )}
          {help && (
            <div
              className="stadium-help"
              role="region"
              aria-label="Stadium controls"
            >
              <button onClick={() => setHelp(false)} aria-label="Close help">
                ×
              </button>
              <h3>Make yourself at home.</h3>
              <p>
                <b>Seated:</b> drag to look around, or focus the pitch and use
                arrow keys. Your seat stays fixed.
              </p>
              <p>
                <b>Explore:</b> drag to orbit, scroll/pinch to zoom. Click a
                green seat marker to sit there.
              </p>
              <p>
                <b>Walk:</b> click Start walking, then WASD + mouse. Shift moves
                faster; Escape releases the mouse.
              </p>
              <p>
                <b>VR:</b> enter with a WebXR headset. Point and select the
                in-world panel for seats, audio, cheers, or exit. Right stick
                snaps 30°. Remain physically in your safe play area.
              </p>
            </div>
          )}
        </div>
        <div className="stadium-console">
          <div className="console-row">
            <div className="navigation-modes" aria-label="Navigation mode">
              {(
                [
                  { id: "seat", label: "Seated", icon: Ticket },
                  { id: "orbit", label: "Explore", icon: Orbit },
                  { id: "walk", label: "Walk", icon: Footprints },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={mode === id ? "selected" : ""}
                  disabled={
                    isXrSession ||
                    (id === "walk" &&
                      typeof window !== "undefined" &&
                      !("requestPointerLock" in document.documentElement))
                  }
                  onClick={() => {
                    setMode(id);
                    setLocked(false);
                  }}
                  aria-pressed={mode === id}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
            <div className="console-actions">
              <button
                className="icon-control"
                onClick={() => {
                  setReset((n) => n + 1);
                  setMessage("View recentered.");
                }}
                disabled={isXrSession}
                aria-label="Reset camera"
              >
                <RotateCcw size={16} />
              </button>
              <button
                className="icon-control"
                aria-label="Show controls"
                aria-pressed={help}
                onClick={() => setHelp(!help)}
              >
                <HelpCircle size={17} />
              </button>
              <button
                className="vr-button"
                disabled={xrPending || (!isXrSession && xrSupported !== true)}
                onClick={() => void (isXrSession ? exitXR() : enterXR())}
              >
                <Glasses size={17} />
                {xrPending
                  ? "Starting VR…"
                  : isXrSession
                    ? "Exit VR"
                    : "Enter VR"}
              </button>
            </div>
          </div>
          <div className="console-row console-secondary">
            <label className="seat-select">
              Your seat
              <select
                value={seatIndex}
                onChange={(e) => selectSeat(Number(e.target.value))}
              >
                {SEATS.map((item, i) => (
                  <option value={i} key={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="audio-controls">
              <button
                className="icon-control"
                onClick={() => void toggleSound()}
                aria-label={isSoundOn ? "Mute crowd" : "Enable crowd"}
                aria-pressed={isSoundOn}
              >
                {isSoundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Crowd volume"
              />
              <button className="console-text" onClick={() => void playCheer()}>
                Cheer
              </button>
            </div>
            <label className="quality-select">
              Graphics
              <select
                value={quality}
                disabled={isXrSession}
                onChange={(e) =>
                  setQuality(e.target.value as "balanced" | "high")
                }
              >
                <option value="balanced">Balanced</option>
                <option value="high">High · shadows</option>
              </select>
            </label>
          </div>
          <div className="demo-match-actions">
            <button
              className="console-text"
              disabled={!!goalTimeout.current}
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play size={13} /> : <Pause size={13} />}
              {paused ? "Resume play" : "Pause play"}
            </button>
            <button
              className="console-text"
              disabled={paused || !!goalTimeout.current}
              onClick={triggerGoal}
            >
              <Crosshair size={14} />
              Trigger demo goal
            </button>
            <span>
              {xrSupported === true
                ? "Headset ready · WebXR"
                : xrSupported === null
                  ? "Checking VR support…"
                  : "PC mode · For VR, use a WebXR browser and connected headset on HTTPS or localhost."}
            </span>
          </div>
        </div>
      </div>
      <p className="stadium-status-line" role="status">
        {message}
      </p>
    </section>
  );
}
