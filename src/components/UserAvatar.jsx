import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// Simple in-memory cache to prevent 100s of requests for the same user
const userCache = {};

export default function UserAvatar({ email, size = 'md', showName = false }) {
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        if (!email) return;

        if (userCache[email]) {
            setUserData(userCache[email]);
            return;
        }

        const fetchUser = async () => {
            try {
                const q = query(collection(db, 'users'), where('email', '==', email));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const data = snapshot.docs[0].data();
                    const profile = {
                        displayName: data.displayName || email.split('@')[0],
                        photoURL: data.photoURL
                    };
                    userCache[email] = profile; // Cache it
                    setUserData(profile);
                } else {
                    // Fallback if not found in DB
                    setUserData({ displayName: email.split('@')[0], photoURL: null });
                }
            } catch (error) {
                console.error("Error fetching avatar:", error);
            }
        };

        fetchUser();
    }, [email]);

    const sizeMap = {
        sm: { width: '24px', height: '24px', fontSize: '0.75rem' },
        md: { width: '32px', height: '32px', fontSize: '0.875rem' },
        lg: { width: '48px', height: '48px', fontSize: '1.25rem' },
        xl: { width: '80px', height: '80px', fontSize: '2rem' }
    };

    const s = sizeMap[size];

    if (!userData) return <span style={{ color: 'var(--text-secondary)' }}>Loading...</span>;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
                width: s.width,
                height: s.height,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000',
                fontWeight: '900',
                fontSize: s.fontSize,
                overflow: 'hidden',
                border: '1px solid var(--glass-border)',
                flexShrink: 0,
                boxShadow: size === 'xl' ? '0 10px 30px rgba(56, 189, 248, 0.2)' : 'none'
            }}>
                {userData.photoURL ? (
                    <img src={userData.photoURL} alt={userData.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    userData.displayName[0]?.toUpperCase()
                )}
            </div>
            {showName && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--text-main)', fontSize: size === 'sm' ? '0.8rem' : '0.9rem', fontWeight: '800', letterSpacing: '-0.01em' }}>
                        {userData.displayName}
                    </span>
                    {size !== 'sm' && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: '700', letterSpacing: '0.05em' }}>
                            {email.split('@')[0].toUpperCase()}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
