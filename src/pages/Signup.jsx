import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function Signup() {
    const [signupMode, setSignupMode] = useState('Member'); // 'Member' or 'Admin'
    const [role, setRole] = useState('Developer');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [masterKey, setMasterKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    const SYSTEM_MASTER_KEY = "APNIBUS_ROOT_2024";

    async function handleSubmit(e) {
        e.preventDefault();

        if (password !== passwordConfirm) {
            return setError('Passwords do not match');
        }

        if (signupMode === 'Admin' && masterKey !== SYSTEM_MASTER_KEY) {
            return setError('⛔ ACCESS DENIED: Invalid System Master Key.');
        }

        try {
            setError('');
            setLoading(true);
            const userCredential = await signup(email, password);
            const user = userCredential.user;

            const userData = {
                email: user.email,
                role: signupMode === 'Admin' ? 'super_admin' : role,
                createdAt: serverTimestamp()
            };

            if (signupMode === 'Admin') {
                userData.promotedBy = 'System Master Key';
            }

            await setDoc(doc(db, "users", user.uid), userData);

            navigate('/');
        } catch (err) {
            setError('Failed to create an account: ' + err.message);
        }
        setLoading(false);
    }

    const isAdmin = signupMode === 'Admin';

    return (
        <div className="auth-container" style={{
            transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            flexDirection: 'column',
            background: isAdmin
                ? 'radial-gradient(circle at 10% 10%, rgba(255, 45, 85, 0.15) 0%, transparent 50%), radial-gradient(circle at 90% 90%, rgba(157, 0, 255, 0.1) 0%, transparent 50%), var(--bg-deep)'
                : 'radial-gradient(circle at 10% 10%, rgba(0, 242, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 90% 90%, rgba(255, 0, 247, 0.1) 0%, transparent 50%), var(--bg-deep)'
        }}>

            <div className="auth-card" style={{
                borderColor: isAdmin ? 'var(--danger)' : 'var(--accent-primary)',
                background: isAdmin ? 'rgba(20, 5, 5, 0.8)' : 'rgba(5, 10, 20, 0.8)',
                boxShadow: isAdmin ? '0 0 40px rgba(255, 45, 85, 0.2)' : '0 0 40px rgba(0, 242, 255, 0.2)'
            }}>
                <div className="auth-header" style={{ marginBottom: '2.5rem' }}>
                    <h2 style={{
                        fontSize: '2.5rem',
                        marginBottom: '0.5rem',
                        background: isAdmin ? 'linear-gradient(to bottom, #fff 0%, #ff2d55 100%)' : 'linear-gradient(to bottom, #fff 0%, #00f2ff 100%)',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                        fontWeight: '900',
                        letterSpacing: '-0.02em'
                    }}>
                        {isAdmin ? 'SYSTEM ADMIN' : 'SMART ISSUE BOARD'}
                    </h2>
                    <p style={{ letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: '800', opacity: 0.8, color: isAdmin ? 'var(--danger)' : 'var(--accent-primary)' }}>
                        {isAdmin ? 'System Admin Registration' : 'Standard User Registration'}
                    </p>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.6)', padding: '8px', borderRadius: 'var(--radius-md)', marginBottom: '2.5rem', border: '1px solid var(--glass-border)' }}>
                    <button
                        onClick={() => { setSignupMode('Member'); setError(''); }}
                        style={{
                            flex: 1, padding: '0.8rem', border: 'none', borderRadius: 'calc(var(--radius-md) - 6px)', cursor: 'pointer',
                            background: signupMode === 'Member' ? 'var(--accent-primary)' : 'transparent',
                            color: signupMode === 'Member' ? '#000' : 'var(--text-dim)',
                            fontWeight: '900', transition: '0.4s', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.15em'
                        }}
                    >
                        Standard User
                    </button>
                    <button
                        onClick={() => { setSignupMode('Admin'); setError(''); }}
                        style={{
                            flex: 1, padding: '0.8rem', border: 'none', borderRadius: 'calc(var(--radius-md) - 6px)', cursor: 'pointer',
                            background: signupMode === 'Admin' ? 'var(--danger)' : 'transparent',
                            color: signupMode === 'Admin' ? '#fff' : 'var(--text-dim)',
                            fontWeight: '900', transition: '0.4s', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.15em'
                        }}
                    >
                        Administrator
                    </button>
                </div>

                {error && <div className="alert-error" style={{
                    background: isAdmin ? 'rgba(255, 45, 85, 0.1)' : 'rgba(0, 242, 255, 0.05)',
                    borderColor: isAdmin ? 'var(--danger)' : 'var(--accent-primary)',
                    color: isAdmin ? '#ffbaba' : 'var(--accent-primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    fontSize: '0.8rem',
                    fontWeight: '700'
                }}>{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label style={{ color: isAdmin ? 'var(--danger)' : 'var(--accent-primary)', opacity: 0.8 }}>EMAIL ADDRESS</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={isAdmin ? "admin@system.internal" : "email@example.com"}
                            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--glass-border)' }}
                        />
                    </div>

                    {!isAdmin && (
                        <div className="form-group">
                            <label style={{ color: 'var(--accent-primary)', opacity: 0.8 }}>USER ROLE</label>
                            <select
                                className="form-control"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                style={{ background: 'rgba(255,255,255,0.04)', color: 'white', border: '1px solid var(--glass-border)' }}
                            >
                                <option value="Developer" style={{ color: 'black' }}>Developer (Standard)</option>
                                <option value="Manager" style={{ color: 'black' }}>Manager (Team Lead)</option>
                                <option value="Reporter" style={{ color: 'black' }}>Reporter (Read Only)</option>
                            </select>
                        </div>
                    )}

                    {isAdmin && (
                        <div className="form-group">
                            <label style={{ color: 'var(--danger)', fontWeight: '900', letterSpacing: '0.1em' }}>⚡ SYSTEM MASTER KEY</label>
                            <input
                                type="password"
                                required
                                value={masterKey}
                                onChange={(e) => setMasterKey(e.target.value)}
                                placeholder="••••••••••••••••"
                                style={{ borderColor: 'var(--danger)', background: 'rgba(255, 45, 85, 0.05)', color: 'var(--danger)' }}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label style={{ color: isAdmin ? 'var(--danger)' : 'var(--accent-primary)', opacity: 0.8 }}>PASSWORD</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a strong password"
                            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--glass-border)' }}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ color: isAdmin ? 'var(--danger)' : 'var(--accent-primary)', opacity: 0.8 }}>CONFIRM PASSWORD</label>
                        <input
                            type="password"
                            required
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            placeholder="Confirm your password"
                            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--glass-border)' }}
                        />
                    </div>

                    <button disabled={loading} type="submit" className="btn btn-primary btn-block" style={{
                        background: isAdmin ? 'linear-gradient(135deg, var(--danger), #ff5d8f)' : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        boxShadow: isAdmin ? '0 10px 30px rgba(255, 45, 85, 0.3)' : '0 10px 30px rgba(0, 242, 255, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        marginTop: '1.5rem'
                    }}>
                        {loading ? (isAdmin ? 'CREATING ADMIN...' : 'CREATING ACCOUNT...') : (isAdmin ? 'CREATE ADMIN' : 'CREATE ACCOUNT')}
                    </button>
                </form>

                <div className="auth-footer" style={{ marginTop: '2rem' }}>
                    ALREADY HAVE AN ACCOUNT? <Link to="/login" style={{ color: isAdmin ? 'var(--danger)' : 'var(--accent-primary)', fontWeight: '900' }}>SIGN IN</Link>
                </div>
            </div>
        </div>
    );
}
