import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment } from "@react-three/drei";
import * as THREE from "three";
import StadiumSeats from "./StadiumSeats";
import MainScreen from "./MainScreen";
import SideScreens from "./SideScreens";
import Lighting from "./Lighting";
import Floor from "./Floor";
import Particles from "./Particles";
import ScoreBoard from "./ScoreBoard";
import "./StadiumRoom.css";

interface StadiumRoomProps {
  isConnected: boolean;
  isAmoy: boolean;
  hasPolAccess: boolean;
  polBalance: number;
  minPolForAccess: number;
  onGoHome: () => void;
  eventId?: number;
}

const STADIUM_YOUTUBE_FEEDS = [
  "M7lc1UVf-VE",
  "aqz-KE-bpKQ",
  "5qap5aO4i9A",
];

function getEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1`;
}

function MotionSensorCamera({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  const targetRotation = useRef({ x: -0.18, y: 0 });

  useEffect(() => {
    if (!enabled) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta ?? 0;
      const gamma = event.gamma ?? 0;
      targetRotation.current.x = THREE.MathUtils.clamp(THREE.MathUtils.degToRad(-beta * 0.35), -0.8, 0.35);
      targetRotation.current.y = THREE.MathUtils.clamp(THREE.MathUtils.degToRad(gamma * 0.8), -1.2, 1.2);
    };

    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => window.removeEventListener("deviceorientation", handleOrientation, true);
  }, [enabled]);

  useFrame(() => {
    if (!enabled) return;
    camera.rotation.order = "YXZ";
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetRotation.current.x, 0.1);
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetRotation.current.y, 0.1);
  });

  return null;
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
  const [feedIndex, setFeedIndex] = useState(0);
  const [isVrMode, setIsVrMode] = useState(false);
  const [isVrFallbackMode, setIsVrFallbackMode] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(false);
  const [isCrowdPulseOn, setIsCrowdPulseOn] = useState(false);
  const [audioStatus, setAudioStatus] = useState("");
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const ambienceAudioRef = useRef<HTMLAudioElement | null>(null);
  const cheerAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const syncFullscreenState = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const isFullscreen = !!(document.fullscreenElement || doc.webkitFullscreenElement);
      if (!isFullscreen) {
        setIsVrMode(false);
        setIsVrFallbackMode(false);
      }
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState as EventListener);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState as EventListener);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const doc = document as Document & {
          webkitExitFullscreen?: () => Promise<void> | void;
          webkitFullscreenElement?: Element | null;
        };

        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => undefined);
        } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
          Promise.resolve(doc.webkitExitFullscreen()).catch(() => undefined);
        }
        setIsVrMode(false);
        setIsVrFallbackMode(false);
        onGoHome();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onGoHome]);

  useEffect(() => {
    const ambience = new Audio("/audio/crowd-ambience.mp3");
    ambience.loop = true;
    ambience.volume = 0.55;
    ambience.preload = "auto";

    const cheer = new Audio("/audio/crowd-cheer.mp3");
    cheer.loop = true;
    cheer.volume = 0.45;
    cheer.preload = "auto";

    ambienceAudioRef.current = ambience;
    cheerAudioRef.current = cheer;

    return () => {
      ambience.pause();
      ambience.currentTime = 0;
      cheer.pause();
      cheer.currentTime = 0;
    };
  }, []);

  const handleToggleSound = async () => {
    const ambience = ambienceAudioRef.current;
    if (!ambience) {
      setAudioStatus("Audio files not ready");
      return;
    }

    if (isSoundOn) {
      ambience.pause();
      ambience.currentTime = 0;
      if (cheerAudioRef.current) {
        cheerAudioRef.current.pause();
        cheerAudioRef.current.currentTime = 0;
      }
      setIsSoundOn(false);
      setIsCrowdPulseOn(false);
      setAudioStatus("Sound Off");
      return;
    }

    try {
      await ambience.play();
      setIsSoundOn(true);
      setAudioStatus("Crowd Ambience On");
    } catch {
      setAudioStatus("Tap again to allow audio on this device");
    }
  };

  const handleToggleCheers = async () => {
    const cheer = cheerAudioRef.current;
    if (!cheer) {
      setAudioStatus("Cheer track unavailable");
      return;
    }

    if (!isSoundOn) {
      await handleToggleSound();
    }

    if (isCrowdPulseOn) {
      cheer.pause();
      cheer.currentTime = 0;
      setIsCrowdPulseOn(false);
      setAudioStatus("Crowd Ambience On");
      return;
    }

    try {
      cheer.currentTime = 0;
      await cheer.play();
      setIsCrowdPulseOn(true);
      setAudioStatus("Crowd + Audience Cheer On");
    } catch {
      setAudioStatus("Cheer effect blocked by browser autoplay policy");
    }
  };

  const toggleVrMode = async () => {
    try {
      const doc = document as Document & {
        webkitExitFullscreen?: () => Promise<void> | void;
        webkitFullscreenElement?: Element | null;
      };

      if (isVrMode) {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
          await Promise.resolve(doc.webkitExitFullscreen());
        }
        setIsVrMode(false);
        setIsVrFallbackMode(false);
        return;
      }

      if (typeof DeviceOrientationEvent !== "undefined" && "requestPermission" in DeviceOrientationEvent) {
        const result = await (
          DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<"granted" | "denied"> }
        ).requestPermission?.();
        if (result === "denied") {
          setAudioStatus("Motion permission denied");
          return;
        }
      }

      if (canvasWrapRef.current && !document.fullscreenElement && !doc.webkitFullscreenElement) {
        const canvasElement = canvasWrapRef.current as HTMLDivElement & {
          webkitRequestFullscreen?: () => Promise<void> | void;
        };

        if (canvasElement.requestFullscreen) {
          await canvasElement.requestFullscreen();
        } else if (canvasElement.webkitRequestFullscreen) {
          await Promise.resolve(canvasElement.webkitRequestFullscreen());
        } else {
          setIsVrFallbackMode(true);
        }

        const orientationController = screen.orientation as ScreenOrientation & {
          lock?: (orientation: "landscape" | "portrait") => Promise<void>;
        };
        if (orientationController?.lock) {
          orientationController.lock("landscape").catch(() => undefined);
        }
      }
      setIsVrMode(true);
    } catch {
      setIsVrMode(true);
      setIsVrFallbackMode(true);
      setAudioStatus("Using mobile immersive mode");
    }
  };

  const currentVideoId = STADIUM_YOUTUBE_FEEDS[feedIndex % STADIUM_YOUTUBE_FEEDS.length];

  if (!isConnected) {
    return (
      <div className="stadium-room">
        <div className="stadium-overlay">
          <div className="overlay-content">
            <button className="overlay-close" onClick={onGoHome} aria-label="Close and go home">
              ×
            </button>
            <h2>Connect Your Wallet</h2>
            <p>Connect your wallet to enter the 3D stadium and watch live events</p>
            <button className="btn-secondary" onClick={onGoHome}>
              Back To Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAmoy || !hasPolAccess) {
    return (
      <div className="stadium-room">
        <div className="stadium-overlay">
          <div className="overlay-content">
            <button className="overlay-close" onClick={onGoHome} aria-label="Close and go home">
              ×
            </button>
            <h2>Access Locked</h2>
            <p>
              Stadium entry requires ETH network and wallet balance above {minPolForAccess} POL.
              Current balance: {polBalance.toFixed(2)} POL.
            </p>
            <button className="btn-secondary" onClick={onGoHome}>
              Back To Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`stadium-room ${isVrFallbackMode ? "vr-mobile-mode" : ""}`}>
      <div className="stadium-header">
        <h2>Virtual Stadium</h2>
        <p>Immersive 3D viewing experience</p>
      </div>
      
      <div className={`stadium-canvas ${isVrMode ? "vr-active" : ""}`} ref={canvasWrapRef}>
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[0, 8, 25]} fov={60} />
          <MotionSensorCamera enabled={isVrMode} />
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={!isVrMode}
            minDistance={10}
            maxDistance={50}
            maxPolarAngle={Math.PI / 2}
          />
          
          <Lighting />
          <Floor />
          <StadiumSeats />
          <MainScreen eventId={eventId} youtubeEmbedUrl={getEmbedUrl(currentVideoId)} />
          <SideScreens />
          <ScoreBoard />
          <Particles count={200} />
          
          <Environment preset="night" />
        </Canvas>
      </div>

      <p className="stadium-status-line">
        {audioStatus || (isVrMode ? "VR Motion Mode Active" : "Standard Viewing Mode")}
      </p>

      <div className="stadium-controls">
        <button className="control-btn">
          Change View
        </button>
        <button className="control-btn" onClick={handleToggleSound}>
          {isSoundOn ? "Mute Crowd" : "Enable Crowd"}
        </button>
        <button className="control-btn" onClick={handleToggleCheers}>
          {isCrowdPulseOn ? "Disable Cheers" : "Enable Cheers"}
        </button>
        <button
          className="control-btn"
          onClick={() => setFeedIndex((prev) => (prev + 1) % STADIUM_YOUTUBE_FEEDS.length)}
        >
          Next Feed
        </button>
        <button className="control-btn primary" onClick={toggleVrMode}>
          {isVrMode ? "Exit VR Mode" : "Enter VR Mode"}
        </button>
      </div>
    </div>
  );
}
