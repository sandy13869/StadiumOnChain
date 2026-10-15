import {
  ArrowUpRight,
  Play,
  MoveUpRight,
  Orbit,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import "./LandingHero.css";
interface LandingHeroProps {
  onExplore: () => void;
  onEnterStadium: () => void;
  onExchange: () => void;
}
export default function LandingHero({
  onExplore,
  onEnterStadium,
  onExchange,
}: LandingHeroProps) {
  return (
    <>
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="hero-image" />
        <div className="hero-grain" />
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="accent-dot" /> THE GAME. REIMAGINED.
          </span>
          <h1 id="hero-title">
            Don't just watch.
            <br />
            <span>Be there.</span>
          </h1>
          <p>
            Your sport. Your seat. Your moment.
            <br />
            Step inside a new era of on-chain sports.
          </p>
          <div className="landing-actions">
            <button className="btn-primary" onClick={onExplore}>
              Explore events <ArrowUpRight size={18} />
            </button>
            <button className="hero-play" onClick={onEnterStadium}>
              <span>
                <Play size={15} fill="currentColor" />
              </span>
              Experience 3D
            </button>
          </div>
        </div>
        <div className="hero-corner">
          <Orbit size={20} />
          <span>
            IMMERSIVE BY DESIGN
            <br />
            <strong>Built for the fans.</strong>
          </span>
        </div>
        <div className="hero-bottom">
          <span>THE BEST SEAT IS WHEREVER YOU ARE.</span>
          <span>
            360° EXPERIENCE <MoveUpRight size={15} />
          </span>
        </div>
      </section>
      <div className="experience-strip">
        <div>
          <ShieldCheck size={20} />
          <span>
            On-chain access<strong>Your wallet. Your way in.</strong>
          </span>
        </div>
        <button onClick={onEnterStadium}>
          <Orbit size={22} />
          <span>
            Immersive stadium<strong>Get closer to every moment.</strong>
          </span>
          <ArrowUpRight size={16} />
        </button>
        <button onClick={onExchange}>
          <Wallet size={20} />
          <span>
            Powered by SPRX<strong>Swap tokens. Unlock experiences.</strong>
          </span>
          <ArrowUpRight size={16} />
        </button>
      </div>
    </>
  );
}
