import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '../firebase';

export default function Navbar() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch {
            console.error("Failed to log out");
        }
    };

    // Fetch Notifications for Current User
    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'users', currentUser.uid, 'notifications'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.read).length);
        });

        return unsubscribe;
    }, [currentUser]);

    const markAsRead = async (notif) => {
        try {
            await updateDoc(doc(db, 'users', currentUser.uid, 'notifications', notif.id), {
                read: true
            });
            setShowDropdown(false);
            if (notif.issueId) {
                navigate(`/issue/${notif.issueId}`);
            }
        } catch (error) {
            console.error("Error marking read:", error);
        }
    };

    if (!currentUser) return null;

    return (
        <nav className="navbar" style={{
            position: 'sticky',
            top: '1.5rem',
            margin: '0 2rem 3rem 2rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--glass-border)',
            background: 'rgba(5, 6, 11, 0.8)',
            backdropFilter: 'blur(20px)',
            zIndex: 1000,
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 2rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                <Link to="/" className="navbar-brand" style={{
                    fontSize: '1.25rem',
                    fontWeight: '900',
                    letterSpacing: '0.1em',
                    color: '#fff',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    SMART <span style={{ color: 'var(--accent-primary)' }}>ISSUE BOARD</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.3, letterSpacing: '0.3em', marginLeft: '0.5rem' }}>OS</span>
                </Link>

                <Link to="/create-issue" className="nav-item-btn create-btn" title="Create Issue" style={{
                    background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.2), rgba(0, 149, 255, 0.2))',
                    border: '1px solid rgba(0, 242, 255, 0.6)',
                    padding: '0.8rem 1.8rem',
                    boxShadow: '0 0 25px rgba(0, 242, 255, 0.4), inset 0 0 10px rgba(0, 242, 255, 0.2)',
                    color: 'var(--accent-primary)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem'
                }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 242, 255, 0.6), inset 0 0 15px rgba(0, 242, 255, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 242, 255, 0.4), inset 0 0 10px rgba(0, 242, 255, 0.2)';
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    }}>
                    <span style={{ fontSize: '1.3rem', filter: 'drop-shadow(0 0 8px var(--accent-primary))' }}>➕</span>
                    <span style={{ fontWeight: '950', fontSize: '0.8rem', letterSpacing: '0.2em' }} className="hide-mobile">CREATE ISSUE</span>
                </Link>

                <Link to="/analytics" className="nav-item-btn analytics-btn" title="System Analytics" style={{
                    background: 'linear-gradient(135deg, rgba(157, 0, 255, 0.2), rgba(255, 0, 247, 0.2))',
                    border: '1px solid rgba(157, 0, 255, 0.4)',
                    padding: '0.8rem 1.5rem',
                    boxShadow: '0 0 15px rgba(157, 0, 255, 0.3)',
                    color: 'var(--accent-secondary)'
                }}>
                    <span style={{ fontSize: '1.2rem' }}>📊</span>
                    <span style={{ fontWeight: '900', fontSize: '0.75rem', letterSpacing: '0.15em' }} className="hide-mobile">ANALYTICS</span>
                </Link>

                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <Link to="/" style={{
                        textDecoration: 'none',
                        color: 'var(--text-main)',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                    }}>
                        Board
                    </Link>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                {/* Notifications Bell */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: unreadCount > 0 ? 'var(--accent-primary)' : 'var(--text-dim)',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            position: 'relative',
                            padding: '0.5rem',
                            transition: 'all 0.3s'
                        }}
                    >
                        {unreadCount > 0 ? '🔔' : '🔕'}
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: 'var(--danger)',
                                color: 'white',
                                fontSize: '0.6rem',
                                padding: '1px 4px',
                                borderRadius: 'var(--radius-full)',
                                fontWeight: '900',
                                border: '2px solid var(--bg-deep)'
                            }}>
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Dropdown */}
                    {showDropdown && (
                        <div className="glass-panel" style={{
                            position: 'absolute',
                            top: '120%',
                            right: '-1rem',
                            width: '340px',
                            background: 'rgba(10, 11, 20, 0.95)',
                            padding: '0',
                            zIndex: 1000,
                            overflow: 'hidden'
                        }}>
                            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: '800', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notifications</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{unreadCount} UNREAD</span>
                            </div>
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '3rem 1rem', color: 'var(--text-dim)', textAlign: 'center', fontSize: '0.8rem' }}>
                                        No new notifications.
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <div
                                            key={n.id}
                                            onClick={() => markAsRead(n)}
                                            style={{
                                                padding: '1.25rem',
                                                borderBottom: '1px solid var(--glass-border)',
                                                cursor: 'pointer',
                                                background: n.read ? 'transparent' : 'rgba(56, 189, 248, 0.05)',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(56, 189, 248, 0.05)'}
                                        >
                                            <div style={{ fontSize: '0.85rem', color: n.read ? 'var(--text-muted)' : 'white', fontWeight: n.read ? '400' : '600' }}>{n.message}</div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.5rem', fontWeight: '700' }}>
                                                {n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleTimeString() : 'INITIATING...'}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div style={{ borderTop: '1px solid var(--glass-border)', padding: '1rem', display: 'flex', justifyContent: 'center' }}>
                                <button onClick={() => setShowDropdown(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.1em', cursor: 'pointer' }}>CLOSE NOTIFICATIONS</button>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/profile" style={{
                        textDecoration: 'none',
                        border: '1px solid var(--glass-border)',
                        padding: '0.2rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--glass-bg)'
                    }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '900', color: '#000', fontSize: '0.8rem'
                        }}>
                            {currentUser.email[0].toUpperCase()}
                        </div>
                    </Link>
                </div>

                <button onClick={handleLogout} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 1.2rem', borderRadius: 'var(--radius-md)', fontWeight: '900', letterSpacing: '0.1em' }}>
                    SIGN OUT
                </button>
            </div>
        </nav>
    );
}
