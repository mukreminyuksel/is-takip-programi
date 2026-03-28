import React, { useState, useEffect, useRef } from 'react'
import { CompanyProvider, useCompany } from './context/CompanyContext'
import { TaskProvider, useTasks } from './context/TaskContext'
import ErrorBoundary from './components/ErrorBoundary'
import BoardView from './components/BoardView'
import KanbanView from './components/KanbanView'
import GanttView from './components/GanttView'
import DashboardView from './components/DashboardView'
import SettingsModal from './components/SettingsModal'
import DeletedTasksModal from './components/DeletedTasksModal'
import TaskModal from './components/TaskModal'
import { Layout, Bell, UserCircle, Settings, Trash, LogOut, Sun, Moon, LayoutGrid, Columns, GanttChart, Building2, ArrowLeftRight, Users, Search, X as XIcon, BarChart3, KeyRound } from 'lucide-react'

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

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { changeMyPassword } = useTasks();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!currentPw || !newPw) return;
    if (newPw !== confirmPw) { alert('Yeni şifreler eşleşmiyor!'); return; }
    if (newPw.length < 6) { alert('Yeni şifre en az 6 karakter olmalıdır.'); return; }
    setLoading(true);
    const result = await changeMyPassword(currentPw, newPw);
    setLoading(false);
    if (result.success) {
      alert('Şifreniz başarıyla değiştirildi.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      onClose();
    } else {
      alert('Hata: ' + result.error);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-main)', borderRadius: '12px', padding: '2rem', width: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1.2rem', fontSize: '1.1rem' }}>Şifre Değiştir</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <input type="password" placeholder="Mevcut Şifre" value={currentPw} onChange={e => setCurrentPw(e.target.value)} style={{ padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem', outline: 'none' }} />
          <input type="password" placeholder="Yeni Şifre (min 6 karakter)" value={newPw} onChange={e => setNewPw(e.target.value)} style={{ padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem', outline: 'none' }} />
          <input type="password" placeholder="Yeni Şifre (Tekrar)" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} style={{ padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem' }}>İptal</button>
          <button onClick={handleSubmit} disabled={loading} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
            {loading ? 'Değiştiriliyor...' : 'Değiştir'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Header = ({ onOpenSettings, onOpenDeleted, onOpenCustomers, viewMode, onViewChange, onOpenTask }) => {
  const { currentUser, logout, isAdmin, appNotifications, tasks } = useTasks();
  const { selectedCompany, selectCompany } = useCompany();
  const [notifOpen, setNotifOpen] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const notifRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
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

  useEffect(() => {
    if (!searchOpen) return;
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [searchOpen]);

  const searchResults = searchTerm.trim().length >= 2
    ? tasks.filter(t => {
        if (t.isDeleted) return false;
        const s = searchTerm.toLowerCase();
        return (t.title || '').toLowerCase().includes(s) ||
               (t.customerName || '').toLowerCase().includes(s) ||
               (t.assignee || '').toLowerCase().includes(s) ||
               (t.description || '').toLowerCase().includes(s);
      }).slice(0, 8)
    : [];

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
    <>
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
            <button className={viewMode === 'dashboard' ? 'active' : ''} onClick={() => onViewChange('dashboard')}>
              <BarChart3 size={14}/> Özet
            </button>
            <button onClick={onOpenCustomers} style={{marginLeft:'0.3rem', background:'#f0fdf4', color:'#16a34a', border:'1px solid #bbf7d0'}}>
              <Users size={14}/> Müşteriler
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Global Search */}
          <div style={{position:'relative'}} ref={searchRef}>
            {!searchOpen ? (
              <button className="icon-btn" onClick={() => setSearchOpen(true)} title="Görev Ara" style={{display:'flex', alignItems:'center'}}>
                <Search size={18} />
              </button>
            ) : (
              <div style={{display:'flex', alignItems:'center', gap:'0.3rem', background:'var(--bg-main)', border:'1px solid var(--border)', borderRadius:'8px', padding:'0.2rem 0.5rem', minWidth:'260px'}}>
                <Search size={14} style={{color:'var(--text-muted)', flexShrink:0}} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Görev, müşteri veya kişi ara..."
                  style={{border:'none', outline:'none', background:'transparent', fontSize:'0.8rem', color:'var(--text-main)', width:'100%', padding:'0.2rem'}}
                  onKeyDown={e => { if (e.key === 'Escape') { setSearchOpen(false); setSearchTerm(''); } }}
                />
                <button className="icon-btn" onClick={() => { setSearchOpen(false); setSearchTerm(''); }} style={{padding:'2px'}}>
                  <XIcon size={14} />
                </button>
              </div>
            )}
            {searchOpen && searchTerm.trim().length >= 2 && (
              <div style={{
                position:'absolute', top:'100%', right:0, marginTop:'5px',
                background:'var(--bg-main)', border:'1px solid var(--border)',
                borderRadius:'8px', width:'360px', maxHeight:'400px', overflowY:'auto',
                boxShadow:'0 10px 25px -5px rgba(0,0,0,0.2)', zIndex:1000
              }}>
                {searchResults.length === 0 ? (
                  <div style={{padding:'1.5rem', textAlign:'center', color:'var(--text-muted)', fontSize:'0.85rem'}}>Sonuç bulunamadı.</div>
                ) : (
                  searchResults.map(task => {
                    const statusMap = { 'todo': 'Yapılacak', 'in-progress': 'Devam Eden', 'done': 'Tamamlandı' };
                    const statusColor = { 'todo': '#ef4444', 'in-progress': '#10b981', 'done': '#9ca3af' };
                    return (
                      <div
                        key={task.id}
                        onClick={() => { onOpenTask(task); setSearchOpen(false); setSearchTerm(''); }}
                        style={{padding:'0.6rem 0.8rem', borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background 0.15s'}}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-alt)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{display:'flex', alignItems:'center', gap:'0.4rem', marginBottom:'0.2rem'}}>
                          <span style={{width:6, height:6, borderRadius:'50%', background: statusColor[task.status], flexShrink:0}}></span>
                          <span style={{fontWeight:600, fontSize:'0.85rem', color:'var(--text-main)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{task.title}</span>
                        </div>
                        <div style={{display:'flex', gap:'0.8rem', fontSize:'0.7rem', color:'var(--text-muted)'}}>
                          <span>{statusMap[task.status]}</span>
                          {task.assignee && <span>@{task.assignee}</span>}
                          {task.customerName && <span>🏢 {task.customerName}</span>}
                          {task.deadline && <span>{new Date(task.deadline).toLocaleDateString('tr-TR')}</span>}
                        </div>
                      </div>
                    );
                  })
                )}
                {searchResults.length > 0 && (
                  <div style={{padding:'0.4rem 0.8rem', fontSize:'0.7rem', color:'var(--text-muted)', textAlign:'center', borderTop:'1px solid var(--border)'}}>
                    {searchResults.length === 8 ? 'İlk 8 sonuç gösteriliyor' : `${searchResults.length} sonuç`}
                  </div>
                )}
              </div>
            )}
          </div>

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
          <button className="icon-btn" onClick={() => setPwModalOpen(true)} title="Şifre Değiştir">
            <KeyRound size={18} />
          </button>
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
    <ChangePasswordModal isOpen={pwModalOpen} onClose={() => setPwModalOpen(false)} />
    </>
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
  const { currentUser, loginWithGoogle, loginWithEmail, registerWithEmail, publicResetPassword, authLoading, tasks, usersList, isAdmin } = useTasks();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState(null);
  const [isDeletedOpen, setIsDeletedOpen] = useState(false);
  const [customerTaskData, setCustomerTaskData] = useState(null);
  const [searchEditTask, setSearchEditTask] = useState(null);
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
          {isLoginMode && (
            <div style={{textAlign:'center', marginTop:'0.3rem'}}>
              <span
                style={{fontSize:'0.78rem', color:'var(--text-muted)', cursor:'pointer', textDecoration:'underline'}}
                onClick={async () => {
                  let email = emailInput.trim();
                  if (!email) { alert('Lütfen önce e-posta adresinizi veya telefon numaranızı yazın.'); return; }
                  if (/^0?\d{10}$/.test(email)) email = email + '@tasktrack.net';
                  else if (!email.includes('@')) email = email + '@tasktrack.net';
                  const result = await publicResetPassword(email);
                  if (result.success) alert('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.\n\nGelen kutunuzu (ve spam klasörünü) kontrol edin.');
                  else alert('Hata: ' + result.error);
                }}
              >
                Şifremi Unuttum
              </span>
            </div>
          )}
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

  // Onboarding: ilk giriş — usersList henüz oluşuyor
  if (currentUser && usersList.length <= 1 && isAdmin && !localStorage.getItem('onboarding-done-' + selectedCompany?.id)) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', padding: '2rem', textAlign: 'center' }}>
        <Layout size={56} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.3rem' }}>TaskTrack'e Hos Geldiniz!</h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '500px' }}>
          <strong>{selectedCompany?.displayName || selectedCompany?.name}</strong> sirketi icin kurulum tamamlandi.
          Siz bu sirketin ilk yoneticisisiniz ({currentUser}).
        </p>
        <div style={{ background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '1.5rem', maxWidth: '480px', textAlign: 'left', marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 0.8rem', fontSize: '1rem', color: '#1e40af' }}>Siradaki Adimlar:</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem', color: '#334155' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}><span style={{ fontWeight: 700, color: '#2563eb' }}>1.</span> Ayarlar'dan personellerinizi ekleyin</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}><span style={{ fontWeight: 700, color: '#2563eb' }}>2.</span> Etiketleri (Web, Tasarim vb.) ozellestirin</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}><span style={{ fontWeight: 700, color: '#2563eb' }}>3.</span> Ilk gorevinizi olusturun</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}><span style={{ fontWeight: 700, color: '#2563eb' }}>4.</span> Dosya yukleme icin Google Drive ayarlarini yapin (Sistem Ayarlari)</div>
          </div>
        </div>
        <button
          onClick={() => { localStorage.setItem('onboarding-done-' + selectedCompany?.id, 'true'); setIsSettingsOpen(true); }}
          style={{ padding: '0.9rem 2rem', borderRadius: '10px', background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}
        >
          Basla — Personel Ekle
        </button>
        <button
          onClick={() => localStorage.setItem('onboarding-done-' + selectedCompany?.id, 'true')}
          style={{ marginTop: '0.8rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
        >
          Sonra yaparim, direkt panele git
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header onOpenSettings={() => { setSettingsTab(null); setIsSettingsOpen(true); }} onOpenDeleted={() => setIsDeletedOpen(true)} onOpenCustomers={() => { setSettingsTab('customers'); setIsSettingsOpen(true); }} viewMode={viewMode} onViewChange={handleViewChange} onOpenTask={(task) => setSearchEditTask(task)} />
      <main className="app-main">
        {viewMode === 'dashboard' ? <DashboardView /> : viewMode === 'kanban' ? <KanbanView /> : viewMode === 'gantt' ? <GanttView /> : <BoardView customerTaskData={customerTaskData} onCustomerTaskHandled={() => setCustomerTaskData(null)} />}
      </main>
      <NotificationContainer />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} initialTab={settingsTab} onCreateTaskFromCustomer={(data) => { setCustomerTaskData(data); setIsSettingsOpen(false); }} />
      <DeletedTasksModal isOpen={isDeletedOpen} onClose={() => setIsDeletedOpen(false)} />
      {searchEditTask && (
        <TaskModal
          isOpen={true}
          onClose={() => setSearchEditTask(null)}
          defaultStatus="todo"
          editTask={searchEditTask}
        />
      )}
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
    <ErrorBoundary>
      <CompanyProvider>
        <TaskProvider>
          <AppContent />
        </TaskProvider>
      </CompanyProvider>
    </ErrorBoundary>
  )
}

export default App
