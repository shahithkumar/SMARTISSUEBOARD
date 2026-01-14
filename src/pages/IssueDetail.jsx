import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, increment, arrayUnion, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { sendNotification } from '../utils/notifications';
import UserAvatar from '../components/UserAvatar';

export default function IssueDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [issue, setIssue] = useState(null);
    const [loading, setLoading] = useState(true);

    const [userRole, setUserRole] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const { currentUser } = useAuth(); // Added here for role fetch

    useEffect(() => {
        // Fetch Issue (Real-time)
        const docRef = doc(db, 'issues', id);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setIssue({ id: docSnap.id, ...docSnap.data() });
            } else {
                console.log("No such document!");
                setIssue(null); // Clear issue if deleted
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching issue:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id]);

    useEffect(() => {
        const fetchMetaData = async () => {
            if (currentUser) {
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists()) setUserRole(userDoc.data().role);
            }
        };
        fetchMetaData();
    }, [currentUser]);

    // Separate useEffect for Users List to avoid complexity
    useEffect(() => {
        const fetchUsers = async () => {
            const q = query(collection(db, 'users'));
            const snap = await getDocs(q);
            setUsersList(snap.docs.map(d => ({
                email: d.data().email,
                displayName: d.data().displayName,
                role: d.data().role || 'User'
            })));
        };
        fetchUsers();
    }, []);
    // Status Change Logic
    const handleStatusChange = async (newStatus) => {
        const currentStatus = issue.status;
        if (currentStatus === newStatus) return;

        if (currentStatus === 'Open' && newStatus === 'Done') {
            alert("❌ You must move to In Progress first.");
            return;
        }

        try {
            await updateDoc(doc(db, 'issues', id), {
                status: newStatus,
                updatedAt: serverTimestamp(),
                lastUpdatedBy: currentUser.email,
                version: increment(1),
                history: arrayUnion({
                    field: 'status',
                    from: currentStatus,
                    to: newStatus,
                    by: currentUser.email,
                    at: Timestamp.now()
                })
            });
            // Optimistic Update
            setIssue(prev => ({ ...prev, status: newStatus }));

            // Notify Assignee if altered by someone else
            if (issue.assignedTo !== currentUser.email) {
                await sendNotification(issue.assignedTo, `Status changed to ${newStatus} by ${currentUser.email}`, id);
            }
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status");
        }
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading details...</div>;
    if (!issue) return <div style={{ padding: '2rem', textAlign: 'center' }}>Issue not found. <Link to="/">Go Home</Link></div>;

    return (
        <div className="dashboard-container" style={{ maxWidth: '1000px' }}>
            <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to="/" className="btn btn-secondary">
                    <span style={{ opacity: 0.6 }}>←</span> BOARD
                </Link>
                <div style={{
                    background: 'var(--glass-bg)',
                    padding: '0.4rem 1.2rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--glass-border)',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                }}>
                    <span style={{ color: 'var(--text-dim)', marginRight: '0.5rem' }}>Access:</span>
                    <span style={{ color: userRole === 'Manager' || userRole === 'super_admin' ? 'var(--warning)' : 'var(--accent-primary)' }}>
                        {userRole || 'SYNCING...'}
                    </span>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '3rem', position: 'relative', overflow: 'hidden' }}>
                {/* Status Glow Background Layers */}
                <div style={{
                    position: 'absolute',
                    top: '-10%',
                    right: '-5%',
                    width: '500px',
                    height: '500px',
                    background: issue.priority === 'High' ? 'radial-gradient(circle, rgba(255, 45, 85, 0.12) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(0, 242, 255, 0.12) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    filter: 'blur(60px)',
                    zIndex: 0
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '-10%',
                    left: '-5%',
                    width: '400px',
                    height: '400px',
                    background: 'radial-gradient(circle, rgba(157, 0, 255, 0.08) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    filter: 'blur(50px)',
                    zIndex: 0
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '2rem', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span className={`badge badge-${issue.priority.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>{issue.priority} PRIORITY</span>
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.1em' }}>#{id.slice(0, 8).toUpperCase()}</span>
                    </div>

                    {/* Status Control */}
                    {(currentUser?.email === issue.assignedTo || userRole === 'Manager' || userRole === 'super_admin') ? (
                        <select
                            className="select-filter"
                            value={issue.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                color: 'var(--accent-primary)',
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                fontSize: '0.7rem',
                                padding: '0.6rem 1.2rem',
                                border: '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-md)'
                            }}
                        >
                            <option value="Open">Status: Open</option>
                            <option value="In Progress">Status: In Progress</option>
                            <option value="Done">Status: Resolved</option>
                        </select>
                    ) : (
                        <div style={{
                            background: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid rgba(56, 189, 248, 0.2)',
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--accent-primary)',
                            fontSize: '0.7rem',
                            fontWeight: '800',
                            letterSpacing: '0.1em'
                        }}>
                            {issue.status.toUpperCase()}
                        </div>
                    )}
                </div>

                <h1 className="hero-title" style={{ fontSize: '3.5rem', marginBottom: '2rem', textAlign: 'left', lineHeight: 1.1 }}>{issue.title}</h1>

                <div style={{
                    background: 'rgba(255, 255, 255, 0.01)',
                    padding: '2.5rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--glass-border)',
                    width: '100%',
                    marginBottom: '4rem',
                    position: 'relative',
                    zIndex: 1
                }}>
                    <div style={{
                        position: 'absolute',
                        top: '1.25rem',
                        right: '1.5rem',
                        fontSize: '0.6rem',
                        fontWeight: '800',
                        color: 'var(--text-dim)',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase'
                    }}>Description</div>
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem' }}>{issue.description || 'No system technical description available.'}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', width: '100%', marginBottom: '5rem', position: 'relative', zIndex: 1 }}>
                    <div className="active-stat-item cyan">
                        <h3 style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '0.75rem', fontWeight: '800', letterSpacing: '0.1em' }}>ASSIGNED TO</h3>
                        <UserAvatar email={issue.assignedTo} showName={true} size="sm" />
                    </div>
                    <div className="active-stat-item magenta">
                        <h3 style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '0.75rem', fontWeight: '800', letterSpacing: '0.1em' }}>REPORTED BY</h3>
                        <UserAvatar email={issue.createdBy} showName={true} size="sm" />
                    </div>
                    <div className="active-stat-item amber">
                        <h3 style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '0.75rem', fontWeight: '800', letterSpacing: '0.1em' }}>CREATED ON</h3>
                        <p style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--warning)', letterSpacing: '-0.02em' }}>{issue.createdAt?.seconds ? new Date(issue.createdAt.seconds * 1000).toLocaleDateString() : 'SYNCING...'}</p>
                    </div>
                    <div className="active-stat-item emerald">
                        <h3 style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '0.75rem', fontWeight: '800', letterSpacing: '0.1em' }}>UPDATED ON</h3>
                        <p style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--success)', letterSpacing: '-0.02em' }}>
                            {issue.updatedAt?.seconds ? new Date(issue.updatedAt.seconds * 1000).toLocaleDateString() : 'STABLE'}
                        </p>
                    </div>
                </div>

                {/* Manager / Admin Controls */}
                {(userRole === 'Manager' || userRole === 'super_admin') && (
                    <div style={{
                        padding: '2.5rem',
                        background: 'rgba(245, 158, 11, 0.03)',
                        border: '1px solid rgba(245, 158, 11, 0.1)',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: '4rem',
                        width: '100%',
                        display: 'grid',
                        gridTemplateColumns: '1fr',
                        gap: '2rem'
                    }}>
                        <div>
                            <h3 style={{ fontSize: '0.9rem', color: 'var(--warning)', fontWeight: '800', marginBottom: '1.5rem', letterSpacing: '0.1em' }}>⚡ ADMIN CONTROLS</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '800', color: 'var(--warning)', marginBottom: '0.75rem' }}>REASSIGN USER</label>
                                    <select
                                        className="select-filter"
                                        value={issue.assignedTo}
                                        onChange={async (e) => {
                                            const newAssignee = e.target.value;
                                            if (!window.confirm(`Reassign to ${newAssignee}?`)) return;
                                            try {
                                                await updateDoc(doc(db, 'issues', id), {
                                                    assignedTo: newAssignee,
                                                    updatedAt: serverTimestamp(),
                                                    lastUpdatedBy: currentUser.email,
                                                    version: increment(1),
                                                    history: arrayUnion({ field: 'assignedTo', from: issue.assignedTo, to: newAssignee, by: currentUser.email, at: Timestamp.now() })
                                                });
                                                await sendNotification(newAssignee, `You were RE-ASSIGNED to issue: "${issue.title}"`, id);
                                            } catch (err) { console.error(err); }
                                        }}
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(245, 158, 11, 0.2)' }}
                                    >
                                        {usersList.map(u => (
                                            <option key={u.email} value={u.email} style={{ color: 'black' }}>
                                                {u.displayName || u.email.split('@')[0]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '800', color: 'var(--warning)', marginBottom: '0.75rem' }}>UPDATE PRIORITY</label>
                                    <select
                                        className="select-filter"
                                        value={issue.priority}
                                        onChange={async (e) => {
                                            const newPriority = e.target.value;
                                            try {
                                                await updateDoc(doc(db, 'issues', id), {
                                                    priority: newPriority,
                                                    updatedAt: serverTimestamp(),
                                                    lastUpdatedBy: currentUser.email,
                                                    version: increment(1),
                                                    history: arrayUnion({ field: 'priority', from: issue.priority, to: newPriority, by: currentUser.email, at: Timestamp.now() })
                                                });
                                            } catch (err) { console.error(err); }
                                        }}
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(245, 158, 11, 0.2)' }}
                                    >
                                        <option value="Low" style={{ color: 'black' }}>Low</option>
                                        <option value="Medium" style={{ color: 'black' }}>Medium</option>
                                        <option value="High" style={{ color: 'black' }}>High</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {/* Audit History */}
                <div style={{ width: '100%', borderTop: '1px solid var(--glass-border)', paddingTop: '4rem', marginBottom: '4rem', position: 'relative', zIndex: 1 }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '2.5rem', fontWeight: '800', letterSpacing: '-0.02em' }}>📋 ACTIVITY HISTORY</h3>

                    {!issue.history || issue.history.length === 0 ? (
                        <p style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.9rem' }}>No activity history found for this issue.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {issue.history.map((record, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    gap: '1.5rem',
                                    alignItems: 'center',
                                    padding: '1.25rem',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--glass-border)',
                                    transition: 'all 0.3s'
                                }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: '700', minWidth: '160px' }}>
                                        {record.at?.seconds ? new Date(record.at.seconds * 1000).toLocaleString() : 'DATAPOINT UNKNOWN'}
                                    </span>
                                    <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                                        <span style={{ fontWeight: '800', color: 'var(--accent-primary)' }}>{record.by.split('@')[0].toUpperCase()}</span>
                                        {' CHANGED '}
                                        <span style={{ fontWeight: '800', color: '#fff' }}>[{record.field.toUpperCase()}]</span>
                                        {' : '}
                                        <span style={{ opacity: 0.5 }}>{record.from}</span>
                                        {' ➔ '}
                                        <span style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>{record.to}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Comments Section */}
                <CommentsSection issueId={id} assignee={issue.assignedTo} issueTitle={issue.title} />
            </div>
        </div>
    );
}

function CommentsSection({ issueId, assignee, issueTitle }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'issues', issueId, 'comments'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, [issueId]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setLoading(true);
        try {
            await addDoc(collection(db, 'issues', issueId, 'comments'), {
                text: newComment,
                createdBy: currentUser.email,
                createdAt: serverTimestamp()
            });

            // Notify Assignee (if it's not the commenter)
            if (assignee && assignee !== currentUser.email) {
                await sendNotification(assignee, `${currentUser.email.split('@')[0]} mentioned you on issue`, issueId);
            }

            setNewComment('');
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    return (
        <div style={{ width: '100%', borderTop: '1px solid var(--glass-border)', paddingTop: '4rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '2.5rem', fontWeight: '800', letterSpacing: '-0.02em' }}>💬 COMMENTS</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
                {comments.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-md)', border: '1px dotted var(--glass-border)' }}>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', letterSpacing: '0.05em' }}>NO COMMENTS YET</p>
                    </div>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} style={{
                            alignSelf: comment.createdBy === currentUser.email ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            background: comment.createdBy === currentUser.email ? 'rgba(56, 189, 248, 0.05)' : 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '1.5rem',
                            borderLeft: comment.createdBy === currentUser.email ? '1px solid var(--glass-border)' : '4px solid var(--accent-primary)'
                        }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', gap: '2rem', alignItems: 'center' }}>
                                <UserAvatar email={comment.createdBy} size="sm" showName={true} />
                                <span style={{ fontWeight: '700' }}>{comment.createdAt?.seconds ? new Date(comment.createdAt.seconds * 1000).toLocaleTimeString() : 'UPLOADING...'}</span>
                            </div>
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.9)', lineHeight: '1.6' }}>{comment.text}</p>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)' }}>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Type a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    style={{ flex: 1, background: 'transparent', border: 'none', padding: '1rem' }}
                />
                <button disabled={loading} type="submit" className="btn btn-primary" style={{ padding: '0 2rem' }}>
                    {loading ? '...' : 'SEND'}
                </button>
            </form>
        </div>
    );
}
