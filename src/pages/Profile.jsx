import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Profile() {
    const { currentUser } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [role, setRole] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchUserData = async () => {
            if (currentUser) {
                const docRef = doc(db, 'users', currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setDisplayName(data.displayName || '');
                    setPhotoURL(data.photoURL || '');
                    setRole(data.role || 'Developer');
                }
            }
        };
        fetchUserData();
    }, [currentUser]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const docRef = doc(db, 'users', currentUser.uid);
            await updateDoc(docRef, {
                displayName,
                photoURL
            });
            setMessage('Profile updated successfully!');
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage('Failed to update profile.');
        }
        setLoading(false);
    };

    return (
        <div className="dashboard-container" style={{ maxWidth: '800px' }}>
            <div className="auth-header" style={{ textAlign: 'left', marginBottom: '3rem' }}>
                <h2 className="hero-title" style={{ fontSize: '2.5rem', textAlign: 'left', marginBottom: '0.5rem' }}>USER PROFILE</h2>
                <p style={{ color: 'var(--text-dim)', letterSpacing: '0.05em', fontWeight: '700' }}>ACCOUNT SETTINGS | ACCESS LEVEL</p>
            </div>

            <div className="glass-panel" style={{ padding: '3.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '3.5rem', position: 'relative' }}>
                    <div style={{
                        width: '140px',
                        height: '140px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary), var(--accent-tertiary))',
                        margin: '0 auto 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        border: '1px solid var(--glass-border)',
                        padding: '4px',
                        boxShadow: '0 10px 40px rgba(157, 0, 255, 0.3), 0 0 20px rgba(0, 242, 255, 0.2)'
                    }}>
                        <div style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            background: 'var(--bg-surface)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                        }}>
                            {photoURL ? (
                                <img src={photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: '3.5rem', color: 'var(--text-main)', fontWeight: '900', textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
                                    {currentUser?.email?.[0]?.toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.75rem', fontWeight: '900', letterSpacing: '-0.03em', color: 'var(--text-main)' }}>{displayName || currentUser?.email}</h2>
                    <span className={`badge ${role === 'super_admin' ? 'badge-high' : role === 'Manager' ? 'badge-medium' : 'badge-low'}`} style={{
                        padding: '0.5rem 1.5rem',
                        fontSize: '0.7rem',
                        fontWeight: '900',
                        letterSpacing: '0.15em'
                    }}>
                        {role === 'super_admin' ? 'SYSTEM ADMIN' : role.toUpperCase()} ROLE
                    </span>
                </div>

                {message && (
                    <div style={{
                        background: message.includes('Failed') ? 'rgba(239, 68, 68, 0.05)' : 'rgba(34, 197, 94, 0.05)',
                        color: message.includes('Failed') ? 'var(--danger)' : 'var(--success)',
                        border: `1px solid ${message.includes('Failed') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`,
                        padding: '1.25rem',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '2.5rem',
                        textAlign: 'center',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        animation: 'fadeIn 0.5s ease'
                    }}>
                        {message.toUpperCase()}
                    </div>
                )}

                <form onSubmit={handleUpdate} className="auth-form">
                    <div className="form-group" style={{ marginBottom: '2rem' }}>
                        <label style={{ color: 'var(--text-dim)', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.15em', marginBottom: '0.75rem', display: 'block' }}>DISPLAY NAME</label>
                        <input
                            type="text"
                            className="form-control"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="e.g., Sara Connor"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '2rem' }}>
                        <label style={{ color: 'var(--text-dim)', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.15em', marginBottom: '0.75rem', display: 'block' }}>PROFILE PICTURE URL</label>
                        <input
                            type="url"
                            className="form-control"
                            value={photoURL}
                            onChange={(e) => setPhotoURL(e.target.value)}
                            placeholder="https://example.com/avatar.jpg"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}
                        />
                        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem', fontWeight: '600', letterSpacing: '0.05em' }}>
                            PROVIDE DIRECT IMAGE LINK (PNG/JPG).
                        </p>
                    </div>

                    <div className="form-group" style={{ marginBottom: '3rem' }}>
                        <label style={{ color: 'var(--text-dim)', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.15em', marginBottom: '0.75rem', display: 'block' }}>SYSTEM ACCESS LEVEL</label>
                        <input
                            type="text"
                            className="form-control"
                            value={role}
                            disabled
                            style={{ opacity: 0.3, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}
                        />
                        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem', fontWeight: '600', letterSpacing: '0.05em' }}>
                            ACCESS ROLE MANAGED BY SYSTEM ADMINISTRATORS.
                        </p>
                    </div>

                    <button disabled={loading} type="submit" className="btn btn-primary btn-block" style={{ padding: '1.25rem', fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.2em' }}>
                        {loading ? 'SAVING CHANGES...' : 'SAVE CHANGES'}
                    </button>
                </form>
            </div>
        </div>
    );
}
