import { ArrowUpRight, Sparkles } from "lucide-react";
import "./LandingHero.css";

interface LandingHeroProps {
  isAmoy: boolean;
  hasPolAccess: boolean;
  polBalance: number;
  minPolForAccess: number;
}

export default function LandingHero({
  isAmoy,
  hasPolAccess,
  polBalance,
  minPolForAccess,
}: LandingHeroProps) {
  return (
    <section className="landing-hero">
      <div className="landing-hero-copy">
        <p className="landing-kicker">Tokenized Sports Experience</p>
        <h2>
          The Stadium Is
          <span> On Chain</span>
        </h2>
        <p>
          Stream premium fixtures, unlock immersive seats, and move from live match feeds to 3D viewing in one
          seamless Web3 dashboard.
        </p>
        <div className="landing-pills">
          <span className={isAmoy ? "pill pill-ok" : "pill pill-warn"}>
            {isAmoy ? "ETH Connected" : "Switch To ETH"}
          </span>
          <span className={hasPolAccess ? "pill pill-ok" : "pill pill-warn"}>
            {hasPolAccess ? "Access Open" : `Need > ${minPolForAccess} POL`}
          </span>
          <span className="pill">Wallet: {polBalance.toFixed(2)} </span>
        </div>
        <div className="landing-actions">
          <button className="btn-primary" type="button">
            Explore Live Matches <ArrowUpRight size={16} />
          </button>
          <button className="btn-secondary" type="button">
            Why Tokenized Access <Sparkles size={16} />
          </button>
        </div>
      </div>

      <div className="landing-hero-media">
        <img
          src="https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80"
          alt="Football crowd and stadium lights"
          className="hero-main-image"
        />
        <div className="hero-side-grid">
          <img
            src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=600&q=80"
            alt="Athlete preparing for game"
          />
          <img
            src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80"
            alt="Live match action"
          />
        </div>
      </div>
    </section>
  );
}
