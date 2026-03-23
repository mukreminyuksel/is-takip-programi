import React, { useState, useEffect, useRef } from 'react'
import { TaskProvider, useTasks } from './context/TaskContext'
import BoardView from './components/BoardView'
import KanbanView from './components/KanbanView'
import GanttView from './components/GanttView'
import SettingsModal from './components/SettingsModal'
import DeletedTasksModal from './components/DeletedTasksModal'
import { Layout, Bell, UserCircle, Settings, Trash, LogOut, Sun, Moon, LayoutGrid, Columns, GanttChart } from 'lucide-react'

const NotificationContainer = () => {
  const { notifications } = useTasks();
  if (notifications.length === 0) return null;
  
  return (
    <div className="notification-container">
      {notifications.map(n => (
        <div key={n.id} className="toast-notification">
          <Bell size={14} />
          <span>{n.message}</span>
        </div>
      ))}
    </div>
  );
};

const NotificationDropdown = ({ isOpen, onClose }) => {
  const { appNotifications, currentUser, markAppNotificationAsRead } = useTasks();

  if (!isOpen) return null;

  const safeAppNotifications = appNotifications || [];
  const unreadCount = safeAppNotifications.filter(n => !(n.readBy || []).includes(currentUser)).length;

  return (
    <div style={{position:'absolute', top:'100%', right:'0', marginTop:'10px', background:'var(--bg-main)', border:'1px solid var(--border)', borderRadius:'8px', width:'320px', boxShadow:'0 10px 25px -5px rgba(0,0,0,0.2)', zIndex:1000, display:'flex', flexDirection:'column', maxHeight:'400px'}}>
      <div style={{padding:'1rem', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h3 style={{margin:0, fontSize:'0.9rem', color:'var(--text-main)'}}>Bildirimler ({unreadCount} yeni)</h3>
      </div>
      <div style={{flex:1, overflowY:'auto', padding:'0.5rem'}}>
        {safeAppNotifications.length === 0 ? (
           <div style={{padding:'1rem', textAlign:'center', color:'var(--text-muted)', fontSize:'0.85rem'}}>Henüz bildirim yok.</div>
        ) : (
          safeAppNotifications.map(n => {
            const isUnread = !(n.readBy || []).includes(currentUser);
            return (
              <div key={n.id} onClick={() => markAppNotificationAsRead(n.id)} style={{padding:'0.75rem', borderBottom:'1px solid var(--border)', cursor:'pointer', background: isUnread ? '#eff6ff' : 'transparent', borderRadius:'4px', display:'flex', flexDirection:'column', gap:'0.3rem', marginBottom:'4px'}}>
                <span style={{fontSize:'0.85rem', color:'var(--text-main)', fontWeight: isUnread ? 600 : 400}}>{n.text}</span>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.7rem', color:'var(--text-muted)'}}>
                  <span>{n.author}</span>
                  <span>{new Date(n.date).toLocaleString('tr-TR', { dateStyle:'short', timeStyle:'short' })}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
};

const Header = ({ onOpenSettings, onOpenDeleted, viewMode, onViewChange }) => {
  const { currentUser, logout, isAdmin, appNotifications } = useTasks();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'light');

  useEffect(() => {
    if (!notifOpen) return;
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('app-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  // Apply theme on mount
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const safeAppNotifications = appNotifications || [];
  const unreadCount = safeAppNotifications.filter(n => !(n.readBy || []).includes(currentUser)).length;

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo-title">
          <Layout className="logo-icon" size={24} />
          <h1>İş Takip Programı</h1>
          <div className="view-toggle" style={{marginLeft:'0.5rem'}}>
            <button className={viewMode === 'table' ? 'active' : ''} onClick={() => onViewChange('table')}>
              <LayoutGrid size={14}/> Tablo
            </button>
            <button className={viewMode === 'kanban' ? 'active' : ''} onClick={() => onViewChange('kanban')}>
              <Columns size={14}/> Kanban
            </button>
            <button className={viewMode === 'gantt' ? 'active' : ''} onClick={() => onViewChange('gantt')}>
              <GanttChart size={14}/> Gantt
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <UserCircle size={18} style={{ color: "var(--text-muted)" }}/>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{currentUser}</span>
            {isAdmin && <span style={{ fontSize: '0.7rem', background: '#fef08a', color: '#854d0e', padding: '2px 6px', borderRadius: '4px' }}>Admin</span>}
          </div>
          <button className="icon-btn" onClick={logout} title="Çıkış Yap">
            <LogOut size={18} />
          </button>
          
          <button className="icon-btn" onClick={toggleTheme} title={theme === 'light' ? 'Karanlık Tema' : 'Aydınlık Tema'} style={{display:'flex', alignItems:'center'}}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} color="#fbbf24" />}
          </button>
          
          <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.5rem' }}></div>

          <div style={{position:'relative'}} ref={notifRef}>
            <button className="icon-btn" onClick={() => setNotifOpen(!notifOpen)} title="Bildirimler" style={{position:'relative'}}>
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{position:'absolute', top:'-4px', right:'-4px', background:'#ef4444', color:'white', fontSize:'0.65rem', fontWeight:700, padding:'2px 5px', borderRadius:'10px'}}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
            <NotificationDropdown isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
          </div>

          <button className="icon-btn" onClick={onOpenDeleted} title="Silinen Görevler (Çöp Kutusu)">
            <Trash size={20} />
          </button>
          <button className="icon-btn" onClick={onOpenSettings} title="Personel ve Ayarlar">
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

const AppContent = () => {
  const { currentUser, loginWithGoogle, loginWithEmail, registerWithEmail, authLoading, tasks } = useTasks();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeletedOpen, setIsDeletedOpen] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('app-view') || 'table');
  
  const handleViewChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('app-view', mode);
  };

  // Push notification for overdue tasks
  useEffect(() => {
    if (!currentUser || !tasks || tasks.length === 0) return;
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      const today = new Date(); today.setHours(0,0,0,0);
      const myOverdue = tasks.filter(t => {
        if (t.isDeleted || t.status === 'done') return false;
        if (t.assignee !== currentUser) return false;
        if (!t.deadline) return false;
        const dl = new Date(t.deadline); dl.setHours(0,0,0,0);
        return dl <= today;
      });

      if (myOverdue.length > 0) {
        const lastNotif = localStorage.getItem('last-push-date');
        const todayStr = today.toISOString().split('T')[0];
        if (lastNotif !== todayStr) {
          new Notification('İş Takip - Dikkat!', {
            body: `${myOverdue.length} adet görevinizin süresi dolmuş veya bugün bitiyor!`,
            icon: '📋'
          });
          localStorage.setItem('last-push-date', todayStr);
        }
      }
    }
  }, [currentUser, tasks]);
  
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);

  if (authLoading) {
    return <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)'}}>Uygulama Yükleniyor...</div>;
  }

  if (!currentUser) {
    const handleAuth = () => {
      if (!emailInput.trim() || !passwordInput) return;
      let processedEmail = emailInput.trim();
      
      // If user types a phone number like 05351234567 or 5351234567, map it to a fake email for Firebase
      if (/^0?\d{10}$/.test(processedEmail)) {
        processedEmail = processedEmail + '@tasktrack.net';
      } else if (!processedEmail.includes('@')) {
        processedEmail = processedEmail + '@tasktrack.net';
      }
      
      if (isLoginMode) loginWithEmail(processedEmail, passwordInput);
      else registerWithEmail(processedEmail, passwordInput);
    };

    return (
      <div className="login-screen" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <Layout size={64} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
        <h1 style={{ marginBottom: '2rem', fontSize: '2rem', color: 'var(--text-main)', textAlign: 'center' }}>İş Takip Programı</h1>
        
        <div style={{display:'flex', flexDirection:'column', gap:'0.8rem', width:'300px', marginBottom: '1.5rem'}}>
          <input 
            type="text" 
            placeholder="E-posta veya Telefon Numarası" 
            value={emailInput} 
            onChange={e => setEmailInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            style={{padding:'0.8rem', borderRadius:'8px', border:'1px solid var(--border)', fontSize:'0.9rem', outline:'none'}} 
          />
          <input 
            type="password" 
            placeholder="Şifre" 
            value={passwordInput} 
            onChange={e => setPasswordInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            style={{padding:'0.8rem', borderRadius:'8px', border:'1px solid var(--border)', fontSize:'0.9rem', outline:'none'}} 
          />
          
          <button 
            onClick={handleAuth}
            style={{ padding: '0.8rem', borderRadius:'8px', background:'var(--primary)', color:'#fff', cursor:'pointer', fontWeight:600, border:'none', fontSize:'0.95rem', marginTop: '0.4rem' }}
          >
            {isLoginMode ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
          
          <div style={{textAlign:'center', fontSize:'0.8rem', color:'var(--text-muted)', marginTop: '0.5rem'}}>
            {isLoginMode ? 'Hesabınız yok mu? ' : 'Zaten hesabınız var mı? '}
            <span style={{color:'var(--primary)', cursor:'pointer', fontWeight:600}} onClick={() => setIsLoginMode(!isLoginMode)}>
              {isLoginMode ? 'Kayıt Ol' : 'Giriş Yap'}
            </span>
          </div>
        </div>

        <div style={{width:'300px', display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.5rem'}}>
          <div style={{flex:1, height:'1px', background:'var(--border)'}}></div>
          <span style={{color:'var(--text-muted)', fontSize:'0.8rem'}}>veya</span>
          <div style={{flex:1, height:'1px', background:'var(--border)'}}></div>
        </div>

        <button 
          onClick={loginWithGoogle}
          style={{ width: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#fff', border: '1px solid #ccc', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, color: '#333', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" style={{ width: '20px', height: '20px' }} />
          Google ile Giriş Yap
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} onOpenDeleted={() => setIsDeletedOpen(true)} viewMode={viewMode} onViewChange={handleViewChange} />
      <main className="app-main">
        {viewMode === 'kanban' ? <KanbanView /> : viewMode === 'gantt' ? <GanttView /> : <BoardView />}
      </main>
      <NotificationContainer />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <DeletedTasksModal isOpen={isDeletedOpen} onClose={() => setIsDeletedOpen(false)} />
    </div>
  );
};

function App() {
  return (
    <TaskProvider>
      <AppContent />
    </TaskProvider>
  )
}

export default App
