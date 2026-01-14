import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { sendNotification } from '../utils/notifications';

export default function CreateIssue() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Low');
    const [assignedTo, setAssignedTo] = useState('');
    const [loading, setLoading] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [similarIssue, setSimilarIssue] = useState(null); // Changed to object for better logic
    const [users, setUsers] = useState([]);

    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Fetch users AND calc workload (naive client-side count for now)
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Users
                const usersQ = query(collection(db, 'users'));
                const usersSnapshot = await getDocs(usersQ);
                const usersList = usersSnapshot.docs.map(doc => ({
                    email: doc.data().email,
                    displayName: doc.data().displayName
                }));

                // Fetch All Active Issues for Workload Calc
                const issuesQ = query(collection(db, 'issues'), where('status', '!=', 'Done'));
                const issuesSnapshot = await getDocs(issuesQ);
                const workloadMap = {};

                issuesSnapshot.docs.forEach(doc => {
                    const assignee = doc.data().assignedTo;
                    if (assignee) {
                        workloadMap[assignee] = (workloadMap[assignee] || 0) + 1;
                    }
                });

                // Combine user + workload
                const usersWithWorkload = usersList.map(u => ({
                    email: u.email,
                    displayName: u.displayName,
                    activeCount: workloadMap[u.email] || 0
                }));

                setUsers(usersWithWorkload);

            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, []);

    const checkForSimilarIssues = async (newTitle) => {
        const q = query(collection(db, 'issues'));
        const snapshot = await getDocs(q);
        const existingIssues = snapshot.docs.map(doc => doc.data());

        // "Compare Title, Description, Keywords".
        const match = existingIssues.find(i => {
            const t = i.title.toLowerCase();
            const d = (i.description || '').toLowerCase();
            const query = newTitle.toLowerCase();

            return t.includes(query) || d.includes(query) || query.includes(t);
        });

        // Return the whole object to check status
        return match;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !assignedTo) return;

        if (!showWarning) {
            setLoading(true);
            const match = await checkForSimilarIssues(title);

            if (match) {
                setSimilarIssue(match);
                setShowWarning(true); // Always show, logic inside render handles content
                setLoading(false);
                return;
            }
        }

        createIssue();
    };

    const createIssue = async () => {
        setLoading(true);
        try {
            const docRef = await addDoc(collection(db, 'issues'), {
                title,
                description,
                priority,
                status: 'Open',
                assignedTo,
                createdBy: currentUser.email,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastUpdatedBy: currentUser.email,
                version: 1,
                history: [] // Init empty history
            });

            // Notify Assignee
            if (assignedTo !== currentUser.email) {
                await sendNotification(assignedTo, `You were assigned a new issue: "${title}"`, docRef.id);
            }

            navigate('/');
        } catch (error) {
            console.error("Error creating issue:", error);
            alert("Failed to create issue");
        }
        setLoading(false);
    };

    return (
        <div className="dashboard-container" style={{ maxWidth: '800px' }}>
            <div style={{ marginBottom: '4rem' }}>
                <h1 className="hero-title" style={{ fontSize: '3rem', textAlign: 'left', marginBottom: '0.5rem' }}>CREATE ISSUE</h1>
                <p style={{ color: 'var(--text-dim)', letterSpacing: '0.1em', fontWeight: '800' }}>NEW ISSUE REPORT | SYSTEM DETAILS</p>
            </div>

            <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '3rem' }}>

                {showWarning && similarIssue && (
                    <div style={{
                        padding: '2rem',
                        borderRadius: 'var(--radius-lg)',
                        border: similarIssue.status === 'Done' ? '1px solid var(--success)' : '1px solid var(--warning)',
                        background: similarIssue.status === 'Done' ? 'rgba(34, 197, 94, 0.05)' : 'rgba(234, 179, 8, 0.05)',
                        marginBottom: '3rem',
                        animation: 'fadeIn 0.5s ease'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>{similarIssue.status === 'Done' ? '💡' : '⚠'}</span>
                            <h3 style={{ fontSize: '0.9rem', color: similarIssue.status === 'Done' ? 'var(--success)' : 'var(--warning)', fontWeight: '800', letterSpacing: '0.1em' }}>
                                {similarIssue.status === 'Done' ? 'HISTORICAL MATCH FOUND' : 'ACTIVE DUPLICATE DETECTED'}
                            </h3>
                        </div>
                        <p style={{ fontSize: '1.1rem', color: 'white', marginBottom: '0.5rem', fontWeight: '700' }}>"{similarIssue.title}"</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '2rem' }}>Status: {similarIssue.status.toUpperCase()}</p>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => { setShowWarning(false); setSimilarIssue(null); }}
                                style={{ flex: 1 }}
                            >
                                ABORT
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={createIssue}
                                style={{ flex: 1, background: similarIssue.status === 'Done' ? 'var(--success)' : 'var(--warning)', color: '#000' }}
                            >
                                {similarIssue.status === 'Done' ? 'CREATE NEW' : 'OVERRIDE & CREATE'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                    <label style={{ color: 'var(--text-dim)', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.15em', marginBottom: '1rem', display: 'block' }}>ISSUE TITLE</label>
                    <input
                        type="text"
                        required
                        className="form-control"
                        value={title}
                        onChange={(e) => { setTitle(e.target.value); setShowWarning(false); }}
                        placeholder="ENTER BRIEF IDENTIFIER..."
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', fontSize: '1.1rem', padding: '1.25rem' }}
                    />
                </div>

                <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                    <label style={{ color: 'var(--text-dim)', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.15em', marginBottom: '1rem', display: 'block' }}>DESCRIPTION</label>
                    <textarea
                        className="form-control"
                        rows="5"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="PROVIDE FULL CONTEXTUAL DATA..."
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', lineHeight: '1.6', padding: '1.25rem' }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                    <div className="form-group">
                        <label style={{ color: 'var(--text-dim)', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.15em', marginBottom: '1rem', display: 'block' }}>PRIORITY LEVEL</label>
                        <select
                            className="select-filter"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '1rem' }}
                        >
                            <option value="Low" style={{ color: 'black' }}>LEVEL: LOW</option>
                            <option value="Medium" style={{ color: 'black' }}>LEVEL: MEDIUM</option>
                            <option value="High" style={{ color: 'black' }}>LEVEL: CRITICAL ⚠</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label style={{ color: 'var(--text-dim)', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.15em', marginBottom: '1rem', display: 'block' }}>ASSIGN TO</label>
                        <select
                            className="select-filter"
                            required
                            value={assignedTo}
                            onChange={(e) => setAssignedTo(e.target.value)}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '1rem' }}
                        >
                            <option value="" style={{ color: 'black' }}>SELECT AGENT...</option>
                            {users.map(u => (
                                <option key={u.email} value={u.email} style={{ color: 'black' }}>
                                    {u.displayName || u.email.split('@')[0].toUpperCase()} {u.activeCount > 2 ? `[LOADED: ${u.activeCount}]` : `[ACTIVE: ${u.activeCount}]`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {!showWarning && (
                    <button disabled={loading} type="submit" className="btn btn-primary btn-block" style={{ padding: '1.5rem', fontSize: '0.9rem', fontWeight: '800', letterSpacing: '0.2em' }}>
                        {loading ? 'CREATING ISSUE...' : 'CREATE ISSUE'}
                    </button>
                )}
            </form>
        </div>
    );
}
