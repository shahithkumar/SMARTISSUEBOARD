import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import { Link } from 'react-router-dom';

export default function Analytics() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'issues'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading analytics...</div>;

    // --- Data Processing for Charts ---

    // 1. Status Distribution (Pie / Bar)
    const statusData = [
        { name: 'Open', value: issues.filter(i => i.status === 'Open').length },
        { name: 'In Progress', value: issues.filter(i => i.status === 'In Progress').length },
        { name: 'Done', value: issues.filter(i => i.status === 'Done' || i.isArchived).length },
    ];
    const COLORS = ['#ff2d55', '#ffb700', '#00ff95'];

    // 2. Priority Distribution (Pie)
    const priorityData = [
        { name: 'High', value: issues.filter(i => i.priority === 'High').length, color: '#ff2d55' },
        { name: 'Medium', value: issues.filter(i => i.priority === 'Medium').length, color: '#ffb700' },
        { name: 'Low', value: issues.filter(i => i.priority === 'Low').length, color: '#00ff95' },
    ];

    // 3. Workload by Assignee (Bar)
    const assigneeMap = {};
    issues.forEach(i => {
        if (!i.assignedTo) return;
        const assignee = i.assignedTo.split('@')[0]; // Simple name
        if (i.status !== 'Done' && !i.isArchived) {
            assigneeMap[assignee] = (assigneeMap[assignee] || 0) + 1;
        }
    });
    const workloadData = Object.keys(assigneeMap).map(key => ({
        name: key,
        activeIssues: assigneeMap[key]
    }));

    // 4. Velocity (Area Chart - Issues Created by Date)
    const dateMap = {};
    issues.forEach(i => {
        if (!i.createdAt?.seconds) return;
        const date = new Date(i.createdAt.seconds * 1000).toLocaleDateString();
        dateMap[date] = (dateMap[date] || 0) + 1;
    });
    // Sort dates
    const velocityData = Object.keys(dateMap)
        .sort((a, b) => new Date(a) - new Date(b))
        .map(date => ({
            date: date,
            created: dateMap[date]
        }));


    return (
        <div className="dashboard-container" style={{ maxWidth: '1200px' }}>
            <div style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 className="hero-title" style={{ fontSize: '3.5rem', textAlign: 'left', marginBottom: '0.5rem' }}>SYSTEM ANALYTICS</h1>
                    <p style={{ color: 'var(--text-dim)', letterSpacing: '0.1em', fontWeight: '800' }}>REAL-TIME DASHBOARD | RESOURCE METRICS</p>
                </div>
                <Link to="/" className="btn btn-secondary">← BOARD</Link>
            </div>

            {/* Mission Stats Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '4rem' }}>
                <div className="active-stat-item cyan">
                    <h3 style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '0.75rem', fontWeight: '800', letterSpacing: '0.1em' }}>TOTAL ISSUES</h3>
                    <p style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1 }}>{issues.length}</p>
                </div>
                <div className="active-stat-item amber">
                    <h3 style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '0.75rem', fontWeight: '800', letterSpacing: '0.1em' }}>OPEN ISSUES</h3>
                    <p style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--warning)', lineHeight: 1 }}>{issues.filter(i => i.status === 'Open').length}</p>
                </div>
                <div className="active-stat-item radical-red">
                    <h3 style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '0.75rem', fontWeight: '800', letterSpacing: '0.1em' }}>HIGH PRIORITY</h3>
                    <p style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--danger)', lineHeight: 1 }}>{issues.filter(i => i.priority === 'High' && i.status !== 'Done').length}</p>
                </div>
                <div className="active-stat-item emerald">
                    <h3 style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '0.75rem', fontWeight: '800', letterSpacing: '0.1em' }}>COMPLETION RATE</h3>
                    <p style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--success)', lineHeight: 1 }}>
                        {issues.length > 0 ? Math.round((issues.filter(i => i.status === 'Done').length / issues.length) * 100) : 0}%
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2.5rem', marginBottom: '4rem' }}>

                {/* Status distribution */}
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.15em', marginBottom: '2.5rem', color: 'var(--text-dim)' }}>ISSUE STATUS</h3>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusData}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    contentStyle={{ background: 'rgba(5, 6, 15, 0.95)', border: '1px solid var(--glass-border)', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
                                />
                                <Bar dataKey="value" fill="url(#barGradient)" radius={[8, 8, 0, 0]} barSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Priority Breakdown */}
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.15em', marginBottom: '2.5rem', color: 'var(--text-dim)' }}>PRIORITY BREAKDOWN</h3>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={priorityData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={10}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {priorityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} opacity={0.9} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: 'rgba(5, 6, 15, 0.95)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Team Workload */}
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.15em', marginBottom: '2.5rem', color: 'var(--text-dim)' }}>TEAM WORKLOAD</h3>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={workloadData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                                <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis dataKey="name" type="category" stroke="#fff" fontSize={11} fontWeight={800} width={80} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    contentStyle={{ background: 'rgba(5, 6, 15, 0.95)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
                                />
                                <Bar dataKey="activeIssues" fill="var(--accent-tertiary)" radius={[0, 6, 6, 0]} barSize={25} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Velocity Trend */}
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.15em', marginBottom: '2.5rem', color: 'var(--text-dim)' }}>ACTIVITY TREND</h3>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={velocityData}>
                                <defs>
                                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--accent-secondary)" stopOpacity={0.4} />
                                        <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: 'rgba(5, 6, 15, 0.95)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
                                />
                                <Area type="monotone" dataKey="created" stroke="var(--accent-secondary)" strokeWidth={4} fill="url(#areaGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
