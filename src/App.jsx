import React, { useState, useEffect, useRef } from 'react'
import { CompanyProvider, useCompany } from './context/CompanyContext'
import { TaskProvider, useTasks } from './context/TaskContext'
import BoardView from './components/BoardView'
import KanbanView from './components/KanbanView'
import GanttView from './components/GanttView'
import SettingsModal from './components/SettingsModal'
import DeletedTasksModal from './components/DeletedTasksModal'
import { Layout, Bell, UserCircle, Settings, Trash, LogOut, Sun, Moon, LayoutGrid, Columns, GanttChart, Building2, ArrowLeftRight, Users } from 'lucide-react'

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

const Header = ({ onOpenSettings, onOpenDeleted, onOpenCustomers, viewMode, onViewChange }) => {
  const { currentUser, logout, isAdmin, appNotifications } = useTasks();
  const { selectedCompany, selectCompany } = useCompany();
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const safeAppNotifications = appNotifications || [];
  const unreadCount = safeAppNotifications.filter(n => !(n.readBy || []).includes(currentUser)).length;

  const handleSwitchCompany = async () => {
    await logout();
    selectCompany(null);
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo-title">
          <Layout className="logo-icon" size={24} />
          <h1><span style={{fontWeight:800, color:'var(--primary)', letterSpacing:'-0.5px'}}>TaskTrack</span> <span style={{fontSize:'0.7em', fontWeight:400, color:'var(--text-muted)', marginLeft:'0.3rem'}}>{selectedCompany?.displayName || ''}</span></h1>
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
            <button onClick={onOpenCustomers} style={{marginLeft:'0.3rem', background:'#f0fdf4', color:'#16a34a', border:'1px solid #bbf7d0'}}>
              <Users size={14}/> Müşteriler
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {selectedCompany && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: selectedCompany.color || '#3b82f6', color: '#fff', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
              <Building2 size={13} />
              {selectedCompany.name}
            </div>
          )}
          <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <UserCircle size={18} style={{ color: "var(--text-muted)" }}/>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{currentUser}</span>
            {isAdmin && <span style={{ fontSize: '0.7rem', background: '#fef08a', color: '#854d0e', padding: '2px 6px', borderRadius: '4px' }}>Admin</span>}
          </div>
          <button className="icon-btn" onClick={logout} title="Çıkış Yap">
            <LogOut size={18} />
          </button>
          <button className="icon-btn" onClick={handleSwitchCompany} title="Şirket Değiştir">
            <ArrowLeftRight size={18} />
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

const CompanySelector = () => {
  const { companies, companiesLoading, selectCompany } = useCompany();

  if (companiesLoading) {
    return <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', background: 'var(--bg-main)'}}>Yükleniyor...</div>;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <Building2 size={64} style={{ color: 'var(--primary, #3b82f6)', marginBottom: '1rem' }} />
      <h1 style={{ marginBottom: '0.5rem', fontSize: '2rem', color: 'var(--text-main)', textAlign: 'center' }}>TaskTrack</h1>
      <p style={{ marginBottom: '2rem', fontSize: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>Giriş yapmak istediğiniz şirketi seçin</p>

      <div style={{display:'flex', flexDirection:'column', gap:'1rem', width:'320px'}}>
        {companies.map(c => (
          <button
            key={c.id}
            onClick={() => selectCompany(c.id)}
            style={{
              padding:'1.2rem 1.5rem',
              borderRadius:'12px',
              border: `2px solid ${c.color || '#3b82f6'}`,
              background:'var(--bg-main, #fff)',
              cursor:'pointer',
              fontSize:'1.1rem',
              fontWeight: 700,
              color: c.color || '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            onMouseEnter={e => { e.target.style.background = c.color || '#3b82f6'; e.target.style.color = '#fff'; }}
            onMouseLeave={e => { e.target.style.background = 'var(--bg-main, #fff)'; e.target.style.color = c.color || '#3b82f6'; }}
          >
            <Building2 size={22} />
            {c.displayName || c.name}
          </button>
        ))}
      </div>

      {companies.length === 0 && (
        <p style={{color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '1rem'}}>
          Henüz şirket tanımlanmamış. Sayfa yenileniyor...
        </p>
      )}
    </div>
  );
};

const AppContent = () => {
  const { selectedCompany, companyFirebase } = useCompany();
  const { currentUser, loginWithGoogle, loginWithEmail, registerWithEmail, authLoading, tasks } = useTasks();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState(null);
  const [isDeletedOpen, setIsDeletedOpen] = useState(false);
  const [customerTaskData, setCustomerTaskData] = useState(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('app-view') || 'table');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);

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

  // Show company selector if no company selected
  if (!selectedCompany || !companyFirebase) {
    return <CompanySelector />;
  }

  if (authLoading) {
    return <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)'}}>Uygulama Yükleniyor...</div>;
  }

  if (!currentUser) {
    const handleAuth = () => {
      if (!emailInput.trim() || !passwordInput) return;
      let processedEmail = emailInput.trim();

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Building2 size={28} style={{ color: selectedCompany?.color || '#3b82f6' }} />
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: selectedCompany?.color || '#3b82f6' }}>{selectedCompany?.displayName || selectedCompany?.name}</span>
        </div>
        <Layout size={64} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
        <h1 style={{ marginBottom: '2rem', fontSize: '2rem', color: 'var(--text-main)', textAlign: 'center' }}>TaskTrack</h1>

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
          style={{ width: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#fff', border: '1px solid #ccc', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, color: '#333', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '1rem' }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" style={{ width: '20px', height: '20px' }} />
          Google ile Giriş Yap
        </button>

        <BackToCompanySelector />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header onOpenSettings={() => { setSettingsTab(null); setIsSettingsOpen(true); }} onOpenDeleted={() => setIsDeletedOpen(true)} onOpenCustomers={() => { setSettingsTab('customers'); setIsSettingsOpen(true); }} viewMode={viewMode} onViewChange={handleViewChange} />
      <main className="app-main">
        {viewMode === 'kanban' ? <KanbanView /> : viewMode === 'gantt' ? <GanttView /> : <BoardView customerTaskData={customerTaskData} onCustomerTaskHandled={() => setCustomerTaskData(null)} />}
      </main>
      <NotificationContainer />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} initialTab={settingsTab} onCreateTaskFromCustomer={(data) => { setCustomerTaskData(data); setIsSettingsOpen(false); }} />
      <DeletedTasksModal isOpen={isDeletedOpen} onClose={() => setIsDeletedOpen(false)} />
    </div>
  );
};

const BackToCompanySelector = () => {
  const { selectCompany } = useCompany();
  return (
    <button
      onClick={() => selectCompany(null)}
      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline', marginTop: '0.5rem' }}
    >
      ← Şirket Seçimine Geri Dön
    </button>
  );
};

function App() {
  return (
    <CompanyProvider>
      <TaskProvider>
        <AppContent />
      </TaskProvider>
    </CompanyProvider>
  )
}

export default App
