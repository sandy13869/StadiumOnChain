import { AudioLines, ArrowUpRight } from "lucide-react";
import "./Footer.css";
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-wordmark">
        <AudioLines size={20} /> sprx.<span>For the love of the game.</span>
      </div>
      <div className="footer-right">
        <span>© {new Date().getFullYear()} Tokenized SPRX</span>
        <span>
          Designed by Sandeep <ArrowUpRight size={12} />
        </span>
      </div>
    </footer>
  );
}
