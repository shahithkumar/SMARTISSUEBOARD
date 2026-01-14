import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, arrayUnion, Timestamp, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterPriority, setFilterPriority] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'updated'
    const [showHistory, setShowHistory] = useState(false);
    const { currentUser } = useAuth();

    // ... (useEffect remains same) ...
    // Realtime subscription
    useEffect(() => {
        // We fetch everything and sort/filter client side to avoid complex Firestore index requirements for now
        const q = query(collection(db, 'issues'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const issuesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setIssues(issuesData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Stats calculation (ignoring archived)
    const validIssues = issues.filter(i => !i.isArchived);
    // Display list respects the toggle
    const activeIssues = validIssues.filter(i => showHistory ? true : i.status !== 'Done');

    const stats = {
        total: validIssues.length,
        open: validIssues.filter(i => i.status === 'Open').length,
        inProgress: validIssues.filter(i => i.status === 'In Progress').length,
        done: validIssues.filter(i => i.status === 'Done').length
    };

    // Business Logic: Status Change
    const handleStatusChange = async (issue, newStatus) => {
        const currentStatus = issue.status;

        if (currentStatus === 'Open' && newStatus === 'Done') {
            alert("❌ You must move to In Progress first.");
            return;
        }

        if (newStatus === 'Done' && currentUser.email !== issue.assignedTo) {
            alert("🔒 Only the assigned user can close this issue.");
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
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status");
        }
    };

    const handleArchive = async (issueId) => {
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
            {/* Stats Bar */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Total Issues</div>
                </div>
                <div className="stat-card" style={{ borderColor: 'rgba(34, 197, 94, 0.3)' }}>
                    <div className="stat-value" style={{ color: '#4ade80' }}>{stats.open}</div>
                    <div className="stat-label">Open</div>
                </div>
                <div className="stat-card" style={{ borderColor: 'rgba(234, 179, 8, 0.3)' }}>
                    <div className="stat-value" style={{ color: '#facc15' }}>{stats.inProgress}</div>
                    <div className="stat-label">In Progress</div>
                </div>
                <div className="stat-card" style={{ borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                    <div className="stat-value" style={{ color: '#38bdf8' }}>{stats.done}</div>
                    <div className="stat-label">Done</div>
                </div>
            </div>

            {/* Controls */}
            <div className="dashboard-header">
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link to="/create-issue" className="btn btn-primary">
                        + Create New Issue
                    </Link>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowHistory(!showHistory)}
                        style={{ opacity: showHistory ? 1 : 0.7 }}
                    >
                        {showHistory ? 'Hide History (Completed)' : 'Show History (Completed)'}
                    </button>
                </div>

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
                        <div key={issue.id} className="issue-card">
                            <div className="issue-main">
                                <div className="issue-header">
                                    <Link to={`/issue/${issue.id}`} className="issue-title" style={{ textDecoration: 'none', color: 'white' }}>
                                        {issue.title}
                                    </Link>
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
                                <div className="issue-meta">
                                    <span>Assignee: {issue.assignedTo}</span>
                                    <span>•</span>
                                    <span>{new Date(issue.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                    {issue.updatedAt && (
                                        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}> (Upd: {new Date(issue.updatedAt.seconds * 1000).toLocaleDateString()})</span>
                                    )}
                                </div>
                            </div>

                            <div className="issue-actions" style={{ display: 'flex', gap: '1rem' }}>
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
                                    onClick={() => handleArchive(issue.id)}
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
