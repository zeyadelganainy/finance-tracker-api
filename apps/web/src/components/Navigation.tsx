import { Link, useLocation } from 'react-router-dom';

export function Navigation() {
  const location = useLocation();

  function isActive(path: string): boolean {
    return location.pathname === path;
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        <h1 style={styles.logo}>Finance Tracker</h1>
        <div style={styles.links}>
          <Link 
            to="/" 
            style={{
              ...styles.link,
              ...(isActive('/') ? styles.linkActive : {})
            }}
          >
            Dashboard
          </Link>
          <Link 
            to="/transactions" 
            style={{
              ...styles.link,
              ...(isActive('/transactions') ? styles.linkActive : {})
            }}
          >
            Transactions
          </Link>
          <Link 
            to="/transactions/new" 
            style={{
              ...styles.link,
              ...(isActive('/transactions/new') ? styles.linkActive : {})
            }}
          >
            Add Transaction
          </Link>
        </div>
      </div>
    </nav>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  nav: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
  },
  logo: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
  },
  links: {
    display: 'flex',
    gap: '24px',
  },
  link: {
    textDecoration: 'none',
    color: '#6b7280',
    fontSize: '16px',
    fontWeight: '500',
    padding: '8px 12px',
    borderRadius: '6px',
    transition: 'all 0.2s',
  },
  linkActive: {
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
};
