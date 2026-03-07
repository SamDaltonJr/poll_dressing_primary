import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ShareButton from './ShareButton';

export default function Header() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        navRef.current && !navRef.current.contains(e.target as Node) &&
        hamburgerRef.current && !hamburgerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  function handleLinkClick() {
    setMenuOpen(false);
  }

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="header-logo">Campaign Sign Tracker</Link>
        <div className="header-actions">
          <ShareButton />
          <button
            ref={hamburgerRef}
            className={`header-hamburger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
        <nav ref={navRef} className={`header-nav ${menuOpen ? 'open' : ''}`}>
          <Link to="/" className={location.pathname === '/' ? 'active' : ''} onClick={handleLinkClick}>Map</Link>
          <Link to="/submit" className={location.pathname === '/submit' ? 'active' : ''} onClick={handleLinkClick}>Big Sign</Link>
          <Link to="/my-locations" className={location.pathname === '/my-locations' ? 'active' : ''} onClick={handleLinkClick}>My Locations</Link>
          <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''} onClick={handleLinkClick}>Admin</Link>
        </nav>
      </div>
    </header>
  );
}
