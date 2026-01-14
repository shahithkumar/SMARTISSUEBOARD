import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CreateIssue from './pages/CreateIssue';
import IssueDetail from './pages/IssueDetail';
import { app } from './firebase'; // Ensure firebase is initialized

import Navbar from './components/Navbar';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';

// Wrapper for protected routes
function PrivateRoute({ children }) {
    const { currentUser } = useAuth();
    return currentUser ? (
        <>
            <Navbar />
            {children}
        </>
    ) : <Navigate to="/login" />;
}

// Placeholder pages for now to avoid build errors if not yet created. 
// I will create Dashboard and CreateIssue in the next steps, but keeping imports valid is key.
// Actually, I'll create placeholder components quickly in this file if they don't exist, 
// OR I'll create the files in the next step.
// Strategy: I will rely on the next steps to create Dashboard and CreateIssue. 
// To prevent runtime crashes while I build them, I'll create minimal versions of them now.

function App() {
    return (
        <Router>
            <AuthProvider>
                <div className="app-container">
                    <Routes>
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/login" element={<Login />} />

                        <Route element={<Layout />}>
                            <Route path="/" element={
                                <PrivateRoute>
                                    <Dashboard />
                                </PrivateRoute>
                            } />
                            <Route path="/create-issue" element={
                                <PrivateRoute>
                                    <CreateIssue />
                                </PrivateRoute>
                            } />
                            <Route path="/issue/:id" element={
                                <PrivateRoute>
                                    <IssueDetail />
                                </PrivateRoute>
                            } />
                            <Route path="/profile" element={
                                <PrivateRoute>
                                    <Profile />
                                </PrivateRoute>
                            } />
                            <Route path="/analytics" element={
                                <PrivateRoute>
                                    <Analytics />
                                </PrivateRoute>
                            } />
                        </Route>
                    </Routes>
                </div>
            </AuthProvider>
        </Router>
    )
}

export default App
