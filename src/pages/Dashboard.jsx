import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, serverTimestamp, arrayUnion, Timestamp, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { sendNotification } from '../utils/notifications';
import UserAvatar from '../components/UserAvatar';

export default function Dashboard() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterPriority, setFilterPriority] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState('active'); // 'active' | 'history'
    const [userRole, setUserRole] = useState(null);

    // Fetch User Role
    useEffect(() => {
        const fetchRole = async () => {
            if (currentUser) {
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists()) {
                    setUserRole(userDoc.data().role);
                }
            }
        };
        fetchRole();
    }, [currentUser]);

    // Fetch Issues
    useEffect(() => {
        const q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching issues:", error);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    // Stats calculation (ignoring archived for Active, counting all for Total)
    const activeIssues = issues.filter(i => {
        if (viewMode === 'active') {
            return !i.isArchived && i.status !== 'Done';
        } else {
            return i.isArchived || i.status === 'Done';
        }
    });

    // Stats calculation
    const allIssues = issues;
    const closedIssues = issues.filter(i => i.status === 'Done' || i.isArchived);

    // 1. Avg Resolution Time (in Hours)
    // Naively uses (updatedAt - createdAt) for Done issues
    const totalDurationMs = closedIssues.reduce((acc, i) => {
        if (i.createdAt && i.updatedAt) {
            return acc + (i.updatedAt.seconds - i.createdAt.seconds) * 1000;
        }
        return acc;
    }, 0);
    const avgCloseTimeHours = closedIssues.length ? Math.round((totalDurationMs / closedIssues.length) / (1000 * 60 * 60)) : 0;

    // 2. SLA Breaches (High Priority, Open/In Progress, > 3 days old)
    const slaBreaches = issues.filter(i =>
        i.priority === 'High' &&
        i.status !== 'Done' &&
        !i.isArchived &&
        i.createdAt &&
        (Date.now() - i.createdAt.seconds * 1000 > 3 * 24 * 60 * 60 * 1000)
    ).length;

    // 3. Weekly Velocity (Closed in last 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const weeklyVelocity = closedIssues.filter(i =>
        i.updatedAt && (i.updatedAt.seconds * 1000 > sevenDaysAgo)
    ).length;

    const stats = {
        total: issues.length,
        open: issues.filter(i => i.status === 'Open' && !i.isArchived).length,
        activeLoad: activeIssues.filter(i => i.assignedTo === currentUser?.email).length,
        avgCloseTime: avgCloseTimeHours,
        slaBreaches,
        weeklyVelocity
    };

    // Business Logic: Status Change
    const handleStatusChange = async (issue, newStatus) => {
        const currentStatus = issue.status;

        if (currentStatus === 'Open' && newStatus === 'Done') {
            alert("❌ You must move to In Progress first.");
            return;
        }

        if (newStatus === 'Done' && currentUser.email !== issue.assignedTo && userRole !== 'Manager' && userRole !== 'super_admin') {
            alert("🔒 Only the assigned user (or Manager) can close this issue.");
            return;
        }

        try {
            await updateDoc(doc(db, 'issues', issue.id), {
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

            // Notify Assignee (if not the one changing status)
            if (issue.assignedTo !== currentUser.email) {
                await sendNotification(issue.assignedTo, `Your issue "${issue.title}" was moved to ${newStatus} by ${currentUser.email}`, issue.id);
            }
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status");
        }
    };

    const handleArchive = async (issueId, issuePriority, issueCreatedAt) => {
        // Enforce SLA Block
        const isSLABreach = issuePriority === 'High' && issueCreatedAt && (Date.now() - issueCreatedAt.seconds * 1000 > 3 * 24 * 60 * 60 * 1000);

        if (isSLABreach) {
            if (userRole !== 'super_admin') {
                alert("⛔ SLA BREACH PROTECTION: High Priority issues overdue by >3 days cannot be archived. Contact Super Admin.");
                return;
            }
        }

        if (!window.confirm("Are you sure you want to archive this issue?")) return;
        try {
            await updateDoc(doc(db, 'issues', issueId), {
                isArchived: true,
                archivedAt: serverTimestamp(),
                archivedBy: currentUser.email,
                archiveReason: 'User archived from dashboard',
                updatedAt: serverTimestamp(),
                lastUpdatedBy: currentUser.email,
                version: increment(1),
                history: arrayUnion({
                    field: 'status',
                    from: 'Active',
                    to: 'Archived',
                    by: currentUser.email,
                    at: Timestamp.now()
                })
            });
        } catch (error) {
            console.error("Error archiving issue:", error);
            alert("Failed to archive: " + error.message);
        }
    };

    // Filtering & Sorting
    const filteredIssues = activeIssues
        .filter(issue => {
            const matchesStatus = filterStatus === 'All' || issue.status === filterStatus;
            const matchesPriority = filterPriority === 'All' || issue.priority === filterPriority;
            const matchesSearch = issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                issue.description?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesStatus && matchesPriority && matchesSearch;
        })
        .sort((a, b) => {
            const dateA = sortBy === 'updated' ? (a.updatedAt?.seconds || 0) : (a.createdAt?.seconds || 0);
            const dateB = sortBy === 'updated' ? (b.updatedAt?.seconds || 0) : (b.createdAt?.seconds || 0);
            return dateB - dateA; // Descending
        });

    return (
        <div className="dashboard-container">
            {/* Premium Stats Bar */}
            <div className="active-stats-container">
                <div className="active-stat-item cyan">
                    <span className="active-stat-label">Total Issues</span>
                    <span className="active-stat-value">{stats.total}</span>
                </div>
                <div className="active-stat-item amber">
                    <span className="active-stat-label">Open Issues</span>
                    <span className="active-stat-value">{stats.open}</span>
                </div>
                <div className="active-stat-item magenta">
                    <span className="active-stat-label">My Issues</span>
                    <span className="active-stat-value">{stats.myOpen}</span>
                </div>
                <div className="active-stat-item emerald">
                    <span className="active-stat-label">Resolved Issues</span>
                    <span className="active-stat-value">{stats.resolved}</span>
                </div>
            </div>

            {/* Stats Bar */}


            {/* View Switching Tabs */}
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <button
                    onClick={() => setViewMode('active')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: viewMode === 'active' ? 'var(--accent-primary)' : 'var(--text-dim)',
                        fontSize: '0.9rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        cursor: 'pointer',
                        padding: '0.5rem 0',
                        position: 'relative',
                        transition: 'all 0.3s'
                    }}
                >
                    🚀 Active Board
                    {viewMode === 'active' && <div style={{ position: 'absolute', bottom: '-0.75rem', left: 0, right: 0, height: '2px', background: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-primary)' }} />}
                </button>
                <button
                    onClick={() => setViewMode('history')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: viewMode === 'history' ? 'var(--accent-primary)' : 'var(--text-dim)',
                        fontSize: '0.9rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        cursor: 'pointer',
                        padding: '0.5rem 0',
                        position: 'relative',
                        transition: 'all 0.3s'
                    }}
                >
                    📜 Closed & History
                    {viewMode === 'history' && <div style={{ position: 'absolute', bottom: '-0.75rem', left: 0, right: 0, height: '2px', background: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-primary)' }} />}
                </button>
                {/* Role Badge for Debugging/Clarity */}
                <div style={{ marginLeft: 'auto', background: 'var(--glass-bg)', padding: '0.4rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>Rank</span>
                    <span style={{
                        color: userRole === 'Manager' || userRole === 'super_admin' ? 'var(--warning)' : '#fff',
                        fontWeight: '800',
                        fontSize: '0.8rem'
                    }}>
                        {userRole || 'Syncing...'}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="dashboard-header">
                {viewMode === 'active' ? (
                    <Link to="/create-issue" className="btn btn-primary">
                        + Create New Issue
                    </Link>
                ) : (
                    <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        Viewing Archived and Completed Issues
                    </div>
                )}

                <div className="filters-bar">
                    <select
                        className="select-filter"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="newest">Sort: Newest</option>
                        <option value="updated">Sort: Last Updated</option>
                    </select>

                    <select
                        className="select-filter"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                    </select>

                    <select
                        className="select-filter"
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                    >
                        <option value="All">All Priority</option>
                        <option value="High">High ⚠</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>

                    <input
                        type="text"
                        placeholder="Search issues... 🔍"
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Issue List */}
            <div className="issue-list">
                {loading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading issues...</div>
                ) : activeIssues.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>No issues yet. Create your first one.</p>
                    </div>
                ) : filteredIssues.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>No issues found matching your filters.</p>
                    </div>
                ) : (
                    filteredIssues.map(issue => (
                        <div
                            key={issue.id}
                            className="issue-card"
                            onClick={() => navigate(`/issue/${issue.id}`)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="issue-main">
                                <div className="issue-header">
                                    <div className="issue-title" style={{ color: 'white', fontWeight: 'bold' }}>
                                        {issue.title}
                                    </div>
                                    <span className={`badge badge-${issue.priority.toLowerCase()}`}>
                                        {issue.priority}
                                    </span>
                                    {/* SLA Warning: High Priority > 3 days old */}
                                    {issue.priority === 'High' && issue.status !== 'Done' && issue.createdAt && (Date.now() - issue.createdAt.seconds * 1000 > 3 * 24 * 60 * 60 * 1000) && (
                                        <span title="SLA BREACH: High priority overdue by >3 days" style={{ color: '#ef4444', marginLeft: '0.5rem', cursor: 'help' }}>
                                            🔥
                                        </span>
                                    )}
                                </div>
                                <div className="issue-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
                                    <UserAvatar email={issue.assignedTo} size="sm" />
                                    <span style={{ color: 'var(--accent-primary)', fontWeight: '700', fontSize: '0.8rem' }}>{issue.assignedTo.split('@')[0]}</span>
                                    <span style={{ opacity: 0.3 }}>•</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-dim)' }}>{new Date(issue.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                    {issue.updatedAt && (
                                        <span style={{ fontSize: '0.7rem', fontStyle: 'italic', opacity: 0.4 }}> (Revised {new Date(issue.updatedAt.seconds * 1000).toLocaleDateString()})</span>
                                    )}
                                </div>
                            </div>

                            <div className="issue-actions" style={{ display: 'flex', gap: '1rem' }} onClick={(e) => e.stopPropagation()}>
                                <select
                                    className="select-filter"
                                    value={issue.status}
                                    onChange={(e) => handleStatusChange(issue, e.target.value)}
                                    style={{ width: '140px' }}
                                >
                                    <option value="Open">Open</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Done">Done</option>
                                </select>
                                <button
                                    onClick={() => handleArchive(issue.id, issue.priority, issue.createdAt)}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', opacity: 0.7 }}
                                    title="Archive Issue"
                                >
                                    Archive
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
