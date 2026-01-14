import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();


    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setError('');
            setLoading(true);
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError('Failed to log in: ' + err.message);
        }
        setLoading(false);
    }

    return (
        <div className="auth-container" style={{
            background: 'radial-gradient(circle at 5% 5%, rgba(0, 242, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 95% 95%, rgba(255, 0, 247, 0.1) 0%, transparent 50%), var(--bg-deep)'
        }}>
            <div className="auth-card" style={{
                borderColor: 'var(--accent-primary)',
                boxShadow: '0 0 40px rgba(0, 242, 255, 0.15)'
            }}>
                <div className="auth-header" style={{ marginBottom: '3.5rem' }}>
                    <h2 style={{
                        fontSize: '2.5rem',
                        marginBottom: '0.1rem',
                        background: 'linear-gradient(to bottom, #fff 0%, var(--accent-primary) 100%)',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                        letterSpacing: '0.1em',
                        fontWeight: '950',
                        textIndent: '0.1em'
                    }}>
                        SMART ISSUE BOARD
                    </h2>
                    <p style={{ letterSpacing: '0.3em', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: '800', opacity: 0.8, color: 'var(--accent-primary)' }}>
                        ENTERPRISE ISSUE TRACKER
                    </p>
                </div>

                {error && <div className="alert-error" style={{
                    background: 'rgba(255, 45, 85, 0.05)',
                    borderColor: 'var(--danger)',
                    color: '#ffbaba',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    marginBottom: '2rem',
                    fontSize: '0.8rem',
                    fontWeight: '700'
                }}>{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ color: 'var(--accent-primary)', opacity: 0.8 }}>EMAIL ADDRESS</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--glass-border)' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                        <label style={{ color: 'var(--accent-primary)', opacity: 0.8 }}>PASSWORD</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--glass-border)' }}
                        />
                    </div>

                    <button disabled={loading} type="submit" className="btn btn-primary btn-block" style={{
                        padding: '1.25rem',
                        fontSize: '0.9rem',
                        fontWeight: '900',
                        letterSpacing: '0.2em',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        boxShadow: '0 10px 30px rgba(0, 242, 255, 0.3)'
                    }}>
                        {loading ? 'SIGNING IN...' : 'SIGN IN'}
                    </button>
                </form>

                <div className="auth-footer" style={{ marginTop: '2.5rem' }}>
                    NEED AN ACCOUNT? <Link to="/signup" style={{ color: 'var(--accent-primary)', fontWeight: '900' }}>CREATE ONE</Link>
                </div>
            </div>
        </div>
    );
}

