import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCampaign } from '../../contexts/CampaignContext';

export default function Header() {
  const location = useLocation();
  const campaign = useCampaign();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const rootPath = `/c/${campaign.slug}`;
  const path = (suffix: string) => (suffix ? `${rootPath}/${suffix}` : rootPath);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

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

  const isActive = (suffix: string) => location.pathname === path(suffix);

  return (
    <header className="header">
      <div className="header-inner">
        <Link to={path('')} className="header-logo" aria-label={`${campaign.candidateName} home`}>
          <img src={campaign.logoUrl} alt="" className="header-logo-img" />
          <span className="header-logo-text">
            <span className="header-logo-candidate">{campaign.candidateName}</span>
            <span className="header-logo-district">{campaign.homeDistrict}</span>
          </span>
        </Link>
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
        <nav ref={navRef} className={`header-nav ${menuOpen ? 'open' : ''}`}>
          <Link to={path('')} className={isActive('') ? 'active' : ''} onClick={handleLinkClick}>Map</Link>
          <Link to={path('submit')} className={isActive('submit') ? 'active' : ''} onClick={handleLinkClick}>Big Sign</Link>
          <Link to={path('my-locations')} className={isActive('my-locations') ? 'active' : ''} onClick={handleLinkClick}>My Locations</Link>
          <Link to={path('admin')} className={isActive('admin') ? 'active' : ''} onClick={handleLinkClick}>Admin</Link>
          <Link to="/" className="header-switch-campaign" onClick={handleLinkClick}>Switch</Link>
        </nav>
      </div>
    </header>
  );
}
