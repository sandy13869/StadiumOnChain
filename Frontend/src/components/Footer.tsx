import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-left">
        <p className="footer-title">Tokenized SPRX</p>
        <p className="footer-subtitle">Immersive sports streaming with on-chain access.</p>
      </div>
      <div className="footer-right">
        <p>Copyright {year} Tokenized SPRX. All rights reserved.</p>
        <p>Design credits: Sandeep</p>
      </div>
    </footer>
  );
}
