import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="header-logo">Campaign Sign Tracker</Link>
        <nav className="header-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Map</Link>
          <Link to="/submit" className={location.pathname === '/submit' ? 'active' : ''}>Submit</Link>
          <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>Admin</Link>
        </nav>
      </div>
    </header>
  );
}
