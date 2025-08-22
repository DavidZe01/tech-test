import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import SystemStatus from './components/SystemStatus';
import { apiService } from './services/api';
import './styles/App.css';

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [systemStatus, setSystemStatus] = useState(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Check backend connection on component mount
  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      await apiService.healthCheck();
      setIsBackendConnected(true);
      
      // Get system status
      const status = await apiService.getStatus();
      setSystemStatus(status);
    } catch (error) {
      console.error('Backend connection failed:', error);
      setIsBackendConnected(false);
    }
  };

  const tabs = [
    { id: 'chat', label: '💬 Medical Chat', component: ChatInterface },
    { id: 'status', label: '📊 System Status', component: SystemStatus }
  ];

  const renderActiveComponent = () => {
    const activeTabData = tabs.find(tab => tab.id === activeTab);
    if (!activeTabData) return null;

    const Component = activeTabData.component;
    
    if (activeTab === 'status') {
      return <Component 
        systemStatus={systemStatus} 
        isConnected={isBackendConnected}
        onRefresh={checkBackendConnection}
      />;
    }
    
    return <Component />;
  };

  return (
    <div className="app">
  {/* Header removed to maximize vertical space */}

      <nav className="app-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            disabled={!isBackendConnected && tab.id !== 'status'}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {!isBackendConnected && activeTab !== 'status' ? (
          <div className="connection-error">
            <h2>⚠️ Backend Connection Error</h2>
            <p>Please make sure the Flask backend is running on http://localhost:5000</p>
            <button onClick={checkBackendConnection} className="retry-button">
              🔄 Retry Connection
            </button>
            <div className="startup-instructions">
              <h3>To start the backend:</h3>
              <pre>
                cd tech-challenge{'\n'}
                export OPENAI_API_KEY="your-key-here"{'\n'}
                python flask_backend.py
              </pre>
            </div>
          </div>
        ) : (
          renderActiveComponent()
        )}
      </main>
    </div>
  );
}

export default App;