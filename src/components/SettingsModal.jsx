import React, { useState, useEffect } from 'react';
import { useTasks } from '../context/TaskContext';
import { useCompany } from '../context/CompanyContext';
import { X, Plus, Trash2, Edit2, ShieldAlert, Tag, Palette, KeyRound, Server, Users, Calendar, MessageCircle, Maximize, Minimize, CheckCircle, XCircle, Loader } from 'lucide-react';
import * as XLSX from 'xlsx';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function SettingsModal({ isOpen, onClose, initialTab, onCreateTaskFromCustomer }) {
  const { tasks, usersList, addUser, editUser, deleteUser, isAdmin, tagsList, addTag, editTag, deleteTag, getUserColor, updateUserColor, adminCreateAuthUser, adminSendPasswordReset, adminChangePassword, adminUpdateAuthLogin, customersList, addCustomer, editCustomer, deleteCustomer, deadlineColors, saveDeadlineColors, getAssignees, companyDb: db } = useTasks();
  const { companies, addCompany, updateCompany, deleteCompany } = useCompany();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('personnel');
  const [tagForm, setTagForm] = useState({ id: null, label: '', color: '#3b82f6' });
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', role: 'admin', phone: '', whatsapp: '', email: '', finance: '' });

  // Auth management states
  const [authNewLogin, setAuthNewLogin] = useState('');
  const [authNewPassword, setAuthNewPassword] = useState('');
  const [authNewLinkedUser, setAuthNewLinkedUser] = useState('');
  const [authChangeUserId, setAuthChangeUserId] = useState('');
  const [authChangeNewPw, setAuthChangeNewPw] = useState('');
  const [authEditLoginUserId, setAuthEditLoginUserId] = useState('');
  const [authEditLoginNew, setAuthEditLoginNew] = useState('');
  const [authResetEmail, setAuthResetEmail] = useState('');
  const [authMessage, setAuthMessage] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
      setIsEditing(false);
      setActiveTab(initialTab || 'personnel');
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const startDrag = (e) => {
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  if (!isOpen) return null;

  if (!isAdmin) {
    return (
      <div className="modal-overlay" onMouseDown={onClose} style={{ zIndex: 1050 }}>
        <div className="modal-content" style={{maxWidth: '450px', transform: `translate(${position.x}px, ${position.y}px)`, transition: isDragging ? 'none' : 'transform 0.1s ease', resize: 'both', position: 'relative'}} onMouseDown={e => e.stopPropagation()}>
          <div className="modal-header" onMouseDown={startDrag} style={{ cursor: 'move' }}>
            <h2>Personel Kontrol Paneli</h2>
            <div onMouseDown={e => e.stopPropagation()}>
              <button className="icon-btn" onClick={onClose}><X size={20} /></button>
            </div>
          </div>
          <div style={{padding: '3rem 2rem', textAlign: 'center'}}>
            <ShieldAlert size={48} color="#ef4444" style={{marginBottom: '1rem', opacity: 0.8}} />
            <h3 style={{color: '#ef4444', marginBottom: '0.5rem'}}>Erişim Engellendi</h3>
            <p style={{color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5'}}>
              Şirket çalışanlarının bilgilerini görüntülemek ve yönetmek için <strong>Admin</strong> yetkisine sahip olmalısınız. Lütfen aktif kullanıcınızı değiştirin.
            </p>
            <button className="btn btn-secondary" style={{marginTop: '1.5rem', margin: '1.5rem auto 0 auto'}} onClick={onClose}>Geri Dön</button>
          </div>
        </div>
      </div>
    );
  }

  const openForm = (user = null) => {
    if (user) {
      setFormData(user);
    } else {
      setFormData({ id: null, name: '', role: 'admin', phone: '', whatsapp: '', email: '', finance: '' });
    }
    setIsEditing(true);
  };

  const formatPhone = (phone) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 0) return '';
    let pure = digits;
    if (pure.startsWith('90') && pure.length >= 12) pure = pure.substring(2);
    else if (pure.startsWith('0') && pure.length >= 11) pure = pure.substring(1);
    if (pure.length === 10 && (pure.startsWith('5') || pure.startsWith('2') || pure.startsWith('3') || pure.startsWith('4'))) {
      return '+90' + pure;
    }
    return phone.trim();
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const savedData = { ...formData };
    if (savedData.phone) savedData.phone = formatPhone(savedData.phone);
    if (savedData.whatsapp) savedData.whatsapp = formatPhone(savedData.whatsapp);
    
    if (savedData.id) {
      editUser(savedData.id, savedData);
    } else {
      addUser(savedData);
    }
    setIsEditing(false);
  };

  const handleMigrateData = async () => {
    if (!window.confirm("Bilgisayarınızdaki eski yerel veriler (localStorage), Google Bulut sistemine kopyalanacak. Onaylıyor musunuz? Sadece 1 kez yapmanız yeterlidir.")) return;
    
    try {
      const savedTasks = localStorage.getItem('is-takip-tasks');
      const savedUsers = localStorage.getItem('is-takip-usersList');
      
      let tasksMigrated = 0;
      let usersMigrated = 0;

      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        for (const t of parsedTasks) {
          await setDoc(doc(db, 'tasks', String(t.id)), t);
          tasksMigrated++;
        }
      }

      if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers);
        for (const u of parsedUsers) {
          await setDoc(doc(db, 'usersList', String(u.id)), u);
          usersMigrated++;
        }
      }

      alert(`Taşıma Başarılı! \n\n${tasksMigrated} Adet Görev\n${usersMigrated} Adet Personel başarıyla buluta kopyalandı.`);
    } catch (e) {
      alert("Hata oluştu: " + e.message);
    }
  };

  const handleExportExcel = () => {
    const tasksData = tasks.map(t => ({
      'Görev ID': t.id || '',
      'Görev Adı': t.title,
      'Müşteri Adı/Ünvanı': t.customerName || '',
      'Müşteri Telefonu': t.customerPhone || '',
      'Durum': t.status === 'done' ? 'Tamamlandı' : (t.status === 'in-progress' ? 'Devam Eden' : 'Yapılacak'),
      'Öncelik': t.priority === 'high' ? 'Yüksek' : (t.priority === 'medium' ? 'Orta' : 'Düşük'),
      'Atanan Kişi': getAssignees(t).join(', '),
      'Başlangıç Tarihi': t.startDate ? new Date(t.startDate).toLocaleDateString('tr-TR') : '-',
      'Bitiş Tarihi': t.deadline ? new Date(t.deadline).toLocaleDateString('tr-TR') : '-',
      'Açıklama/Detay': t.description || '',
      'Silinmiş (Çöp)': t.isDeleted ? 'Evet' : 'Hayır',
      '__NOTES_JSON__': JSON.stringify(t.notes || [])
    }));

    const usersData = usersList.map(u => ({
      'Kayıt ID': u.id,
      'Ad Soyad': u.name,
      'Sistem Yetkisi': u.role === 'admin' ? 'Admin Yöneticisi' : 'Kullanıcı',
      'Telefon Numarası': u.phone || '-',
      'WhatsApp Numarası': u.whatsapp || '-',
      'E-Posta Adresi': u.email || '-',
      'Mali ve Diğer Notlar': u.finance || '-'
    }));

    const wb = XLSX.utils.book_new();
    const wsTasks = XLSX.utils.json_to_sheet(tasksData);
    const wsUsers = XLSX.utils.json_to_sheet(usersData);

    XLSX.utils.book_append_sheet(wb, wsTasks, "Görev Listesi");
    XLSX.utils.book_append_sheet(wb, wsUsers, "Personel Listesi");

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `istakip_excel_rapor_${dateStr}.xlsx`);
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("Uyarı: Excel 'Görev Listesi' sekmenizdeki veriler sisteme eklenecek. \nGörev ID'si dolu olanlar güncellenecek, boş olanlar yeni görev olarak eklenecek. Onaylıyor musunuz?")) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        const wsTasks = wb.Sheets["Görev Listesi"];
        if (!wsTasks) throw new Error("Excel dosyasında 'Görev Listesi' isimli bir sayfa (sekme) bulunamadı.");
        const tasksData = XLSX.utils.sheet_to_json(wsTasks);

        let tCount = 0;
        let pCount = 0;

        for (const row of tasksData) {
          let status = 'todo';
          if (row['Durum'] === 'Devam Eden') status = 'in-progress';
          if (row['Durum'] === 'Tamamlandı') status = 'done';

          let priority = 'medium';
          if (row['Öncelik'] === 'Düşük') priority = 'low';
          if (row['Öncelik'] === 'Yüksek') priority = 'high';

          const parseDate = (d) => {
            if (!d || d === '-') return null;
            if (typeof d === 'number') {
              const date = new Date(Math.round((d - 25569) * 86400 * 1000));
              return date.toISOString();
            }
            if (typeof d === 'string') {
              const parts = d.split('.');
              if (parts.length === 3) {
                 return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`).toISOString();
              }
              const date = new Date(d);
              if (!isNaN(date.getTime())) return date.toISOString();
            }
            return null;
          };

          const taskObj = {
            title: row['Görev Adı'] || 'İsimsiz Görev',
            customerName: row['Müşteri Adı/Ünvanı'] || '',
            customerPhone: row['Müşteri Telefonu'] || '',
            description: row['Açıklama/Detay'] || row['Açıklama'] || '',
            status,
            priority,
            assignee: row['Atanan Kişi'] || '',
            startDate: parseDate(row['Başlangıç Tarihi']),
            deadline: parseDate(row['Bitiş Tarihi']),
            isDeleted: row['Silinmiş (Çöp)'] === 'Evet',
            notes: []
          };

          try {
            if (row['__NOTES_JSON__']) {
              taskObj.notes = JSON.parse(row['__NOTES_JSON__']);
            }
          } catch(e) {}

          const id = row['Görev ID'];
          if (id) {
             taskObj.id = id;
             await setDoc(doc(db, 'tasks', String(id)), taskObj);
             tCount++;
          } else {
             taskObj.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
             taskObj.date = new Date().toISOString(); 
             taskObj.isNewForAssignee = true;
             await setDoc(doc(db, 'tasks', String(taskObj.id)), taskObj);
             pCount++;
          }
        }
        alert(`Excel İçe Aktarma Başarılı!\n${tCount} mevcut görev güncellendi, ${pCount} yeni görev eklendi.`);
        onClose();
      } catch (err) {
        console.error(err);
        alert("Excel içe aktarma hatası: " + err.message);
      }
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleExportData = () => {
    const data = {
      tasks: tasks,
      usersList: usersList,
      exportDate: new Date().toISOString()
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `istakip_yedek_${dateStr}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.tasks || !data.usersList) {
          alert('Geçersiz veya bozuk yedekleme dosyası formatı!');
          return;
        }

        if (!window.confirm(`DİKKAT: Bu işlem mevcut verilerinizin üzerine ${data.tasks.length} Görev ve ${data.usersList.length} Personel yazacaktır. Onaylıyor musunuz?`)) {
          e.target.value = null;
          return;
        }

        let tCount = 0;
        let uCount = 0;

        for (const t of data.tasks) {
          await setDoc(doc(db, 'tasks', String(t.id)), t);
          tCount++;
        }
        for (const u of data.usersList) {
          await setDoc(doc(db, 'usersList', String(u.id)), u);
          uCount++;
        }
        alert(`Geri Yükleme Başarılı!\n${tCount} Görev ve ${uCount} Personel başarıyla buluta yüklendi.`);
      } catch (err) {
        alert('Dosya okuma veya yükleme hatası: ' + err.message);
      }
      e.target.value = null;
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose} style={{ zIndex: 1050, padding: isFullScreen ? 0 : undefined }}>
      <div className={`modal-content ${isFullScreen ? 'fullscreen' : ''}`} style={!isFullScreen ? {maxWidth: '1100px', width: '90vw', transform: `translate(${position.x}px, ${position.y}px)`, transition: isDragging ? 'none' : 'transform 0.1s ease', resize: 'both', position: 'relative'} : {}} onMouseDown={e => e.stopPropagation()}>
        <div className="modal-header" onMouseDown={isFullScreen ? undefined : startDrag} style={{ cursor: isFullScreen ? 'default' : 'move', paddingBottom: 0 }}>
          <div style={{display:'flex', alignItems:'center', gap:'1.5rem', alignSelf:'flex-end', flexWrap:'wrap'}}>
            <h2 onClick={() => {setActiveTab('personnel'); setIsEditing(false);}} style={{cursor:'pointer', paddingBottom:'0.8rem', margin:0, fontSize:'1.1rem', color: activeTab === 'personnel' ? 'var(--text-main)' : 'var(--text-muted)', borderBottom: activeTab === 'personnel' ? '2px solid var(--primary)' : '2px solid transparent'}}>
              Personel Yönetimi
            </h2>
            <h2 onClick={() => {setActiveTab('analytics'); setIsEditing(false);}} style={{cursor:'pointer', paddingBottom:'0.8rem', margin:0, fontSize:'1.1rem', color: activeTab === 'analytics' ? 'var(--text-main)' : 'var(--text-muted)', borderBottom: activeTab === 'analytics' ? '2px solid var(--primary)' : '2px solid transparent'}}>
              İstatistik ve Raporlar
            </h2>
            <h2 onClick={() => {setActiveTab('tags'); setIsEditing(false);}} style={{cursor:'pointer', paddingBottom:'0.8rem', margin:0, fontSize:'1.1rem', color: activeTab === 'tags' ? 'var(--text-main)' : 'var(--text-muted)', borderBottom: activeTab === 'tags' ? '2px solid var(--primary)' : '2px solid transparent', display:'flex', alignItems:'center', gap:'0.4rem'}}>
              <Tag size={16}/> Etiket Yönetimi
            </h2>
            <h2 onClick={() => {setActiveTab('colors'); setIsEditing(false);}} style={{cursor:'pointer', paddingBottom:'0.8rem', margin:0, fontSize:'1.1rem', color: activeTab === 'colors' ? 'var(--text-main)' : 'var(--text-muted)', borderBottom: activeTab === 'colors' ? '2px solid var(--primary)' : '2px solid transparent', display:'flex', alignItems:'center', gap:'0.4rem'}}>
              <Palette size={16}/> Renk Yönetimi
            </h2>
            <h2 onClick={() => {setActiveTab('accounts'); setIsEditing(false); setAuthMessage(null);}} style={{cursor:'pointer', paddingBottom:'0.8rem', margin:0, fontSize:'1.1rem', color: activeTab === 'accounts' ? 'var(--text-main)' : 'var(--text-muted)', borderBottom: activeTab === 'accounts' ? '2px solid var(--primary)' : '2px solid transparent', display:'flex', alignItems:'center', gap:'0.4rem'}}>
              <KeyRound size={16}/> Hesap Yönetimi
            </h2>
            <h2 onClick={() => {setActiveTab('customers'); setIsEditing(false);}} style={{cursor:'pointer', paddingBottom:'0.8rem', margin:0, fontSize:'1.1rem', color: activeTab === 'customers' ? 'var(--text-main)' : 'var(--text-muted)', borderBottom: activeTab === 'customers' ? '2px solid var(--primary)' : '2px solid transparent', display:'flex', alignItems:'center', gap:'0.4rem'}}>
              <Users size={16}/> Müşteri Listesi
            </h2>
            <h2 onClick={() => {setActiveTab('system'); setIsEditing(false);}} style={{cursor:'pointer', paddingBottom:'0.8rem', margin:0, fontSize:'1.1rem', color: activeTab === 'system' ? 'var(--text-main)' : 'var(--text-muted)', borderBottom: activeTab === 'system' ? '2px solid var(--primary)' : '2px solid transparent', display:'flex', alignItems:'center', gap:'0.4rem'}}>
              <Server size={16}/> Sistem Ayarları
            </h2>
          </div>
          <div onMouseDown={e => e.stopPropagation()} style={{paddingBottom:'0.8rem', display:'flex', alignItems:'center', gap:'0.3rem'}}>
            <button className="icon-btn" onClick={() => { setIsFullScreen(!isFullScreen); setPosition({x:0,y:0}); }} title={isFullScreen ? 'Küçült' : 'Tam Ekran'}>{isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}</button>
            <button className="icon-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>
        
        {!isEditing && activeTab === 'personnel' && (
          <div className="settings-body">
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem', alignItems:'center'}}>
              <h3 style={{fontSize:'1rem'}}>Şirket Çalışanları ({usersList.length})</h3>
              <div style={{display:'flex', gap: '0.5rem'}}>
                <button className="btn btn-secondary btn-small" onClick={handleMigrateData} style={{color:'#f59e0b', fontSize:'0.75rem', padding:'0.2rem 0.5rem', background:'transparent', border:'1px solid #f59e0b'}} title="Lokal veriyi kurtar">
                  Lokal Kurtarma
                </button>
                <button className="btn btn-secondary btn-small" onClick={handleExportExcel} style={{color:'#10b981', fontSize:'0.75rem', padding:'0.2rem 0.5rem', background:'transparent', border:'1px solid #10b981'}} title="Görevleri ve personeli Excel tablosu olarak indir">
                  Excel Çıktısı Al
                </button>
                <label className="btn btn-secondary btn-small" style={{color:'#10b981', background:'transparent', border:'1px dotted #10b981', cursor: 'pointer', margin: 0, display:'flex', alignItems:'center'}} title="Düzenlenmiş Excel dosyasını geri yükle">
                  Excel'den Yükle
                  <input type="file" accept=".xlsx, .xls" style={{display:'none'}} onChange={handleImportExcel} />
                </label>
                <div style={{width:'1px', background:'var(--border)'}}></div>
                <button className="btn btn-secondary btn-small" onClick={handleExportData} style={{background:'#10b981', color:'#fff', borderColor:'#10b981'}} title="JSON Geri Yükleme Dosyası">
                  Yedek İndir (JSON)
                </button>
                <label className="btn btn-secondary btn-small" style={{background:'#3b82f6', color:'#fff', borderColor:'#3b82f6', cursor: 'pointer', margin: 0, display:'flex', alignItems:'center'}} title="Yedek dosyasından veritabanını geri yükle">
                  Yedek Yükle
                  <input type="file" accept=".json" style={{display:'none'}} onChange={handleImportData} />
                </label>
                <div style={{width:'1px', background:'var(--border)'}}></div>
                <button className="btn btn-primary btn-small" onClick={() => openForm()}><Plus size={14} style={{marginRight: '4px'}}/> Yeni Kişi Ekle</button>
              </div>
            </div>
            <div className="table-container" style={{maxHeight:'60vh', overflowY:'auto'}}>
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>Ad Soyad / Yetki</th>
                    <th>İletişim Bilgileri</th>
                    <th>E-Posta Adresi</th>
                    <th>Mali / Diğer Notlar</th>
                    <th style={{width: '60px'}}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{fontWeight: 600, color: 'var(--text-main)', display:'flex', alignItems:'center', gap:'0.4rem'}}>
                          {u.name}
                          {u.isOnline && <span title="Şu an Sistemde Aktif (Çevrimiçi)" style={{width: 8, height: 8, background: '#10b981', borderRadius: '50%', display: 'inline-block'}}></span>}
                        </div>
                        <div style={{fontSize: '0.7rem', color: u.role === 'admin' ? '#ef4444' : 'var(--text-muted)', fontWeight: u.role==='admin'?600:400}}>
                          {u.role === 'admin' ? 'Admin Yöneticisi' : 'Kullanıcı'}
                        </div>
                      </td>
                      <td>
                        {u.phone && <div style={{fontSize:'0.8rem'}}>Tel: {u.phone}</div>}
                        {u.whatsapp && <div style={{fontSize:'0.8rem'}}>WP: {u.whatsapp}</div>}
                        {(!u.phone && !u.whatsapp) && <span style={{color:'var(--text-muted)'}}>-</span>}
                      </td>
                      <td>{u.email || '-'}</td>
                      <td style={{fontSize:'0.75rem', color: 'var(--text-muted)'}}>{u.finance || '-'}</td>
                      <td>
                        <button className="icon-btn" onClick={() => openForm(u)}><Edit2 size={14}/></button>
                        <button className="icon-btn delete-btn" onClick={() => deleteUser(u.id)}><Trash2 size={14}/></button>
                      </td>
                    </tr>
                  ))}
                  {usersList.length === 0 && (
                    <tr><td colSpan="5" className="empty-row" style={{textAlign:'center', padding:'1rem'}}>Çalışan bulunamadı.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {!isEditing && activeTab === 'analytics' && (
          <div className="settings-body">
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'1rem', marginBottom:'2rem'}}>
              <div style={{background:'var(--bg-card)', padding:'1rem', borderRadius:'8px', border:'1px solid var(--border)', textAlign:'center'}}>
                <div style={{fontSize:'2rem', fontWeight:800, color:'var(--text-main)'}}>{tasks.filter(t => !t.isDeleted).length}</div>
                <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Toplam Görev</div>
              </div>
              <div style={{background:'var(--bg-card)', padding:'1rem', borderRadius:'8px', border:'1px solid var(--border)', textAlign:'center'}}>
                <div style={{fontSize:'2rem', fontWeight:800, color:'#9ca3af'}}>{tasks.filter(t=>t.status==='done' && !t.isDeleted).length}</div>
                <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Tamamlanan</div>
              </div>
              <div style={{background:'var(--bg-card)', padding:'1rem', borderRadius:'8px', border:'1px solid var(--border)', textAlign:'center'}}>
                <div style={{fontSize:'2rem', fontWeight:800, color:'#10b981'}}>{tasks.filter(t=>t.status==='in-progress' && !t.isDeleted).length}</div>
                <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Devam Eden</div>
              </div>
              <div style={{background:'var(--bg-card)', padding:'1rem', borderRadius:'8px', border:'1px solid var(--border)', textAlign:'center'}}>
                <div style={{fontSize:'2rem', fontWeight:800, color:'#ef4444'}}>{tasks.filter(t=>t.status==='todo' && !t.isDeleted).length}</div>
                <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Bekleyen</div>
              </div>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', marginBottom:'2rem'}}>
              <div style={{background:'var(--bg-card)', padding:'1.5rem', borderRadius:'8px', border:'1px solid var(--border)'}}>
                <h4 style={{fontSize:'0.9rem', marginBottom:'1rem', textAlign:'center', color:'var(--text-main)'}}>Görev Durum Dağılımı</h4>
                <div style={{maxWidth:'220px', margin:'0 auto'}}>
                  <Doughnut
                    data={{
                      labels: ['Yapılacak', 'Devam Eden', 'Tamamlandı'],
                      datasets: [{
                        data: [
                          tasks.filter(t=>t.status==='todo' && !t.isDeleted).length,
                          tasks.filter(t=>t.status==='in-progress' && !t.isDeleted).length,
                          tasks.filter(t=>t.status==='done' && !t.isDeleted).length
                        ],
                        backgroundColor: ['#ef4444', '#10b981', '#9ca3af'],
                        borderWidth: 0,
                        hoverOffset: 6
                      }]
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12, color: 'var(--text-main)' } }
                      }
                    }}
                  />
                </div>
              </div>

              <div style={{background:'var(--bg-card)', padding:'1.5rem', borderRadius:'8px', border:'1px solid var(--border)'}}>
                <h4 style={{fontSize:'0.9rem', marginBottom:'1rem', textAlign:'center', color:'var(--text-main)'}}>Kişi Başına Görev Yükü</h4>
                <Bar
                  data={{
                    labels: usersList.map(u => u.name),
                    datasets: [
                      {
                        label: 'Bekleyen',
                        data: usersList.map(u => tasks.filter(t => getAssignees(t).includes(u.name) && t.status === 'todo' && !t.isDeleted).length),
                        backgroundColor: '#ef4444',
                        borderRadius: 3
                      },
                      {
                        label: 'Devam Eden',
                        data: usersList.map(u => tasks.filter(t => getAssignees(t).includes(u.name) && t.status === 'in-progress' && !t.isDeleted).length),
                        backgroundColor: '#10b981',
                        borderRadius: 3
                      },
                      {
                        label: 'Tamamlanan',
                        data: usersList.map(u => tasks.filter(t => getAssignees(t).includes(u.name) && t.status === 'done' && !t.isDeleted).length),
                        backgroundColor: '#9ca3af',
                        borderRadius: 3
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } }
                    },
                    scales: {
                      x: { stacked: true, grid: { display: false } },
                      y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                  }}
                />
              </div>
            </div>

            <h3 style={{fontSize:'1rem', marginBottom:'1rem'}}>Personel Performans Analizi</h3>
            <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
              {usersList.map(u => {
                 const uTasks = tasks.filter(t => getAssignees(t).includes(u.name) && !t.isDeleted);
                 const uDone = uTasks.filter(t => t.status === 'done').length;
                 const uTotal = uTasks.length;
                 const pct = uTotal === 0 ? 0 : Math.round((uDone / uTotal) * 100);
                 return (
                   <div key={u.id} style={{display:'flex', flexDirection:'column', gap:'0.4rem'}}>
                     <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.85rem'}}>
                       <span style={{fontWeight:600}}>{u.name}</span>
                       <span style={{color:'var(--text-muted)'}}>{uDone} / {uTotal} iş tamamlandı (%{pct})</span>
                     </div>
                     <div style={{width:'100%', height:'8px', background:'var(--bg-hover)', borderRadius:'4px', overflow:'hidden'}}>
                       <div style={{height:'100%', width:`${pct}%`, background:'var(--primary)', transition:'width 0.5s ease', borderRadius:'4px'}}></div>
                     </div>
                   </div>
                 );
              })}
            </div>
          </div>
        )}

        {!isEditing && activeTab === 'tags' && (
          <div className="settings-body">
            <div style={{marginBottom:'1.5rem', padding:'1rem', background:'var(--bg-alt)', borderRadius:'8px', border:'1px solid var(--border)'}}>
              <h4 style={{fontSize:'0.9rem', marginBottom:'0.75rem', color:'var(--text-main)'}}>Yeni Etiket Ekle / Düzenle</h4>
              <div style={{display:'flex', gap:'0.75rem', alignItems:'flex-end', flexWrap:'wrap'}}>
                <div style={{flex:1, minWidth:'150px'}}>
                  <label style={{fontSize:'0.7rem', fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:'0.15rem'}}>Etiket Adı</label>
                  <input type="text" value={tagForm.label} onChange={e => setTagForm({...tagForm, label: e.target.value})} placeholder="Örn: Web Tasarım" style={{width:'100%', padding:'0.4rem 0.5rem', border:'1px solid var(--border)', borderRadius:'4px', fontSize:'0.8rem'}} />
                </div>
                <div style={{width:'80px'}}>
                  <label style={{fontSize:'0.7rem', fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:'0.15rem'}}>Renk</label>
                  <input type="color" value={tagForm.color} onChange={e => setTagForm({...tagForm, color: e.target.value})} style={{width:'100%', height:'32px', border:'1px solid var(--border)', borderRadius:'4px', cursor:'pointer', padding:'2px'}} />
                </div>
                <button className="btn btn-primary btn-small" onClick={() => {
                  if (!tagForm.label.trim()) return;
                  if (tagForm.id) {
                    editTag(tagForm.id, { label: tagForm.label, color: tagForm.color });
                  } else {
                    addTag({ label: tagForm.label, color: tagForm.color });
                  }
                  setTagForm({ id: null, label: '', color: '#3b82f6' });
                  setIsEditingTag(false);
                }} style={{height:'32px'}}>
                  {tagForm.id ? 'Güncelle' : 'Ekle'}
                </button>
                {tagForm.id && (
                  <button className="btn btn-secondary btn-small" onClick={() => { setTagForm({ id: null, label: '', color: '#3b82f6' }); setIsEditingTag(false); }} style={{height:'32px'}}>
                    İptal
                  </button>
                )}
              </div>
            </div>

            <h4 style={{fontSize:'0.9rem', marginBottom:'0.75rem', color:'var(--text-main)'}}>Mevcut Etiketler ({tagsList.length})</h4>
            <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
              {tagsList.map(tag => (
                <div key={tag.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.6rem 0.75rem', background:'var(--bg-main)', border:'1px solid var(--border)', borderRadius:'6px'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
                    <span style={{width:16, height:16, borderRadius:'50%', background: tag.color, flexShrink:0}}></span>
                    <span style={{fontWeight:600, fontSize:'0.85rem', color:'var(--text-main)'}}>{tag.label}</span>
                    <span style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>{tag.color}</span>
                  </div>
                  <div style={{display:'flex', gap:'0.3rem'}}>
                    <button className="icon-btn" onClick={() => { setTagForm({ id: tag.id, label: tag.label, color: tag.color }); setIsEditingTag(true); }}><Edit2 size={14}/></button>
                    <button className="icon-btn delete-btn" onClick={() => { if(window.confirm(`"${tag.label}" etiketini silmek istediğinize emin misiniz?`)) deleteTag(tag.id); }}><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
              {tagsList.length === 0 && (
                <div style={{textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:'0.85rem'}}>Henüz etiket eklenmemiş.</div>
              )}
            </div>
          </div>
        )}

        {!isEditing && activeTab === 'colors' && (
          <div className="settings-body">
            <div style={{marginBottom:'1rem'}}>
              <h3 style={{fontSize:'1rem', marginBottom:'0.5rem', color:'var(--text-main)'}}>Personel Renk Kişiselleştirme</h3>
              <p style={{fontSize:'0.8rem', color:'var(--text-muted)', lineHeight:'1.5', marginBottom:'1.5rem'}}>
                Her personel için bir renk seçebilirsiniz. Seçtiğiniz renk, uygulamadaki tüm alanlarda (tablo, kanban, gantt vb.) ilgili kişinin adının yanında gösterilecektir.
              </p>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:'0.75rem'}}>
              {usersList.map(u => {
                const currentColor = u.color || '#6b7280';
                return (
                  <div key={u.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.75rem 1rem', background:'var(--bg-main)', border:'1px solid var(--border)', borderRadius:'8px', transition:'box-shadow 0.2s ease'}}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
                      <div style={{width:36, height:36, borderRadius:'50%', background: currentColor, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'0.85rem', textShadow:'0 1px 2px rgba(0,0,0,0.3)', flexShrink:0}}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{fontWeight:600, fontSize:'0.9rem', color: currentColor}}>{u.name}</div>
                        <div style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>{u.role === 'admin' ? 'Admin' : 'Kullanıcı'}</div>
                      </div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
                      <span style={{fontSize:'0.7rem', color:'var(--text-muted)', fontFamily:'monospace'}}>{currentColor}</span>
                      <input 
                        type="color" 
                        value={currentColor} 
                        onChange={(e) => updateUserColor(u.id, e.target.value)}
                        style={{width:'40px', height:'32px', border:'1px solid var(--border)', borderRadius:'6px', cursor:'pointer', padding:'2px'}}
                      />
                      {u.color && (
                        <button 
                          className="icon-btn" 
                          onClick={() => updateUserColor(u.id, '')} 
                          title="Rengi kaldır"
                          style={{fontSize:'0.65rem', color:'#ef4444', padding:'0.2rem 0.4rem', border:'1px solid #fecaca', borderRadius:'4px'}}
                        >
                          <Trash2 size={12}/>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {usersList.length === 0 && (
                <div style={{textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:'0.85rem'}}>Henüz personel eklenmemiş.</div>
              )}
            </div>

            <div style={{marginTop:'2rem', padding:'1rem', background:'var(--bg-alt)', borderRadius:'8px', border:'1px solid var(--border)'}}>              <h4 style={{fontSize:'0.85rem', marginBottom:'0.75rem', color:'var(--text-main)'}}>Hızlı Renk Paleti</h4>
              <div style={{display:'flex', flexWrap:'wrap', gap:'0.5rem'}}>
                {[
                  {name:'Mor', color:'#8b5cf6'}, {name:'Mavi', color:'#3b82f6'}, {name:'Camgöbeği', color:'#06b6d4'},
                  {name:'Yeşil', color:'#10b981'}, {name:'Sarı', color:'#eab308'}, {name:'Turuncu', color:'#f97316'},
                  {name:'Kırmızı', color:'#ef4444'}, {name:'Pembe', color:'#ec4899'}, {name:'Gül', color:'#f43f5e'},
                  {name:'İndigo', color:'#6366f1'}, {name:'Koyu Yeşil', color:'#059669'}, {name:'Kahverengi', color:'#92400e'}
                ].map(p => (
                  <div key={p.color} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'0.2rem'}}>
                    <div style={{width:28, height:28, borderRadius:'50%', background: p.color, cursor:'pointer', border:'2px solid transparent', transition:'transform 0.15s ease, border-color 0.15s ease'}}
                      title={`${p.name} (${p.color}) - Kopyalamak için tıklayın`}
                      onClick={() => { navigator.clipboard.writeText(p.color); }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; e.currentTarget.style.borderColor = 'var(--text-main)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'transparent'; }}
                    />
                    <span style={{fontSize:'0.55rem', color:'var(--text-muted)'}}>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Deadline Renk Düzeni */}
            <div style={{marginTop:'2rem', padding:'1rem', background:'var(--bg-alt)', borderRadius:'8px', border:'1px solid var(--border)'}}>
              <h4 style={{fontSize:'0.85rem', marginBottom:'0.5rem', color:'var(--text-main)'}}>Bitiş Tarihi Renk Düzeni</h4>
              <p style={{fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'1rem', lineHeight:'1.4'}}>
                Görevlerin bitiş tarihine kalan gün sayısına göre satır/kutu arka plan rengini ve Gantt bar rengini belirler. Tablo, Kanban ve Gantt ekranlarında uygulanır.
              </p>
              <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
                {(deadlineColors || []).map((entry, idx) => (
                  <div key={idx} style={{display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.5rem 0.75rem', background:'var(--bg-main)', border:'1px solid var(--border)', borderRadius:'6px'}}>
                    <div style={{width:28, height:28, borderRadius:'4px', background: entry.color, border:'1px solid var(--border)', flexShrink:0}} />
                    <div style={{display:'flex', alignItems:'center', gap:'0.5rem', flex:1, flexWrap:'wrap'}}>
                      <label style={{fontSize:'0.7rem', color:'var(--text-muted)', width:'55px'}}>
                        {entry.days < 0 ? 'Geçmiş' : entry.days === 0 ? 'Son gün' : `${entry.days} gün`}
                      </label>
                      <input
                        type="number"
                        value={entry.days}
                        onChange={(e) => {
                          const updated = [...deadlineColors];
                          updated[idx] = { ...updated[idx], days: parseInt(e.target.value) || 0 };
                          saveDeadlineColors(updated);
                        }}
                        style={{width:'50px', padding:'0.2rem 0.3rem', fontSize:'0.75rem', borderRadius:'4px', border:'1px solid var(--border)', background:'var(--bg-main)', color:'var(--text-main)', textAlign:'center'}}
                        title="Gün sayısı"
                      />
                      <input
                        type="color"
                        value={entry.hex}
                        onChange={(e) => {
                          const hex = e.target.value;
                          const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
                          const alpha = entry.alpha ?? 0.20;
                          const updated = [...deadlineColors];
                          updated[idx] = { ...updated[idx], hex, color: `rgba(${r}, ${g}, ${b}, ${alpha})` };
                          saveDeadlineColors(updated);
                        }}
                        style={{width:'36px', height:'28px', border:'1px solid var(--border)', borderRadius:'4px', cursor:'pointer', padding:'1px'}}
                        title="Renk seç"
                      />
                      <div style={{display:'flex', alignItems:'center', gap:'0.3rem', minWidth:'100px'}}>
                        <input
                          type="range"
                          min="0" max="100" step="1"
                          value={Math.round((entry.alpha ?? parseFloat((entry.color.match(/[\d.]+\)$/)?.[0]) || 0.20)) * 100)}
                          onChange={(e) => {
                            const alpha = parseInt(e.target.value) / 100;
                            const hex = entry.hex;
                            const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
                            const updated = [...deadlineColors];
                            updated[idx] = { ...updated[idx], alpha, color: `rgba(${r}, ${g}, ${b}, ${alpha})` };
                            saveDeadlineColors(updated);
                          }}
                          style={{width:'60px', cursor:'pointer'}}
                          title="Opasite"
                        />
                        <span style={{fontSize:'0.6rem', color:'var(--text-muted)', fontFamily:'monospace', minWidth:'28px'}}>
                          {Math.round((entry.alpha ?? parseFloat((entry.color.match(/[\d.]+\)$/)?.[0]) || 0.20)) * 100)}%
                        </span>
                      </div>
                      <input
                        type="text"
                        value={entry.label}
                        onChange={(e) => {
                          const updated = [...deadlineColors];
                          updated[idx] = { ...updated[idx], label: e.target.value };
                          saveDeadlineColors(updated);
                        }}
                        style={{flex:1, minWidth:'80px', padding:'0.2rem 0.4rem', fontSize:'0.7rem', borderRadius:'4px', border:'1px solid var(--border)', background:'var(--bg-main)', color:'var(--text-main)'}}
                        placeholder="Etiket"
                      />
                      <button
                        className="icon-btn"
                        onClick={() => {
                          const updated = deadlineColors.filter((_, i) => i !== idx);
                          saveDeadlineColors(updated);
                        }}
                        title="Kaldır"
                        style={{fontSize:'0.65rem', color:'#ef4444', padding:'0.2rem', border:'1px solid #fecaca', borderRadius:'4px'}}
                      >
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex', gap:'0.5rem', marginTop:'0.75rem'}}>
                <button
                  className="btn btn-secondary btn-small"
                  onClick={() => {
                    const updated = [...deadlineColors, { days: 10, color: 'rgba(200, 200, 200, 0.15)', label: 'Yeni', hex: '#9ca3af', alpha: 0.15 }];
                    saveDeadlineColors(updated);
                  }}
                  style={{fontSize:'0.75rem', padding:'0.3rem 0.6rem', display:'flex', alignItems:'center', gap:'0.3rem'}}
                >
                  <Plus size={12}/> Yeni Kademe Ekle
                </button>
                <button
                  className="btn btn-secondary btn-small"
                  onClick={() => {
                    saveDeadlineColors([
                      { days: 7, color: 'rgba(253, 224, 71, 0.15)', label: '7 gün', hex: '#fde047', alpha: 0.15 },
                      { days: 5, color: 'rgba(250, 204, 21, 0.18)', label: '5 gün', hex: '#facc15', alpha: 0.18 },
                      { days: 3, color: 'rgba(245, 158, 11, 0.20)', label: '3 gün', hex: '#f59e0b', alpha: 0.20 },
                      { days: 2, color: 'rgba(239, 68, 68, 0.20)', label: '2 gün', hex: '#ef4444', alpha: 0.20 },
                      { days: 1, color: 'rgba(185, 28, 28, 0.25)', label: '1 gün', hex: '#b91c1c', alpha: 0.25 },
                      { days: 0, color: 'rgba(168, 85, 247, 0.22)', label: 'Son gün (pembemsi mor)', hex: '#a855f7', alpha: 0.22 },
                      { days: -1, color: 'rgba(124, 58, 237, 0.25)', label: 'Süresi geçmiş (mor)', hex: '#7c3aed', alpha: 0.25 },
                    ]);
                  }}
                  style={{fontSize:'0.75rem', padding:'0.3rem 0.6rem', color:'#f59e0b', border:'1px solid #f59e0b'}}
                >
                  Varsayılana Sıfırla
                </button>
              </div>
              {/* Preview */}
              <div style={{marginTop:'0.75rem', padding:'0.5rem', background:'var(--bg-main)', borderRadius:'6px', border:'1px solid var(--border)'}}>
                <div style={{fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:'0.4rem', fontWeight:600}}>Önizleme:</div>
                <div style={{display:'flex', gap:'3px', flexWrap:'wrap'}}>
                  {[...(deadlineColors || [])].sort((a,b) => b.days - a.days).map((entry, idx) => (
                    <div key={idx} style={{padding:'0.3rem 0.6rem', borderRadius:'4px', background: entry.color, fontSize:'0.65rem', color:'var(--text-main)', border:'1px solid var(--border)', textAlign:'center', minWidth:'55px'}}>
                      <div style={{fontWeight:600}}>{entry.label}</div>
                      <div style={{fontSize:'0.55rem', color:'var(--text-muted)'}}>{entry.days < 0 ? 'geçmiş' : `${entry.days} gün`}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {!isEditing && activeTab === 'accounts' && (
          <div className="settings-body">
            {authMessage && (
              <div style={{padding:'0.75rem 1rem', marginBottom:'1rem', borderRadius:'6px', fontSize:'0.85rem', background: authMessage.type === 'success' ? '#d1fae5' : '#fee2e2', color: authMessage.type === 'success' ? '#065f46' : '#991b1b', border: `1px solid ${authMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`}}>
                {authMessage.text}
              </div>
            )}

            {/* Current Users & Passwords Table */}
            <div style={{marginBottom:'1.5rem'}}>
              <h4 style={{fontSize:'0.95rem', marginBottom:'0.75rem', color:'var(--text-main)'}}>Kayıtlı Hesaplar ve Şifreler</h4>
              <div className="table-container" style={{maxHeight:'35vh', overflowY:'auto'}}>
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>Personel</th>
                      <th>Yetki</th>
                      <th>Giriş Bilgisi (Telefon/E-posta)</th>
                      <th>Şifre</th>
                      <th style={{width:'80px'}}>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map(u => (
                      <tr key={u.id}>
                        <td style={{fontWeight:600}}>{u.name}</td>
                        <td>
                          <span style={{fontSize:'0.7rem', color: u.role === 'admin' ? '#ef4444' : 'var(--text-muted)', fontWeight: u.role === 'admin' ? 600 : 400}}>
                            {u.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                          </span>
                        </td>
                        <td style={{fontSize:'0.8rem'}}>
                          {u.authLogin || u.authEmail || u.email || <span style={{color:'#ef4444', fontSize:'0.75rem'}}>Hesap yok</span>}
                        </td>
                        <td>
                          {u.authPassword ? (
                            <span style={{fontFamily:'monospace', fontSize:'0.8rem', background:'var(--bg-hover)', padding:'0.15rem 0.4rem', borderRadius:'4px', userSelect:'all'}}>{u.authPassword}</span>
                          ) : (
                            <span style={{color:'var(--text-muted)', fontSize:'0.75rem'}}>-</span>
                          )}
                        </td>
                        <td style={{display:'flex', gap:'0.2rem'}}>
                          {(u.authEmail) && (
                            <>
                              <button className="icon-btn" title="Giriş Bilgisi Değiştir" onClick={() => {
                                setAuthEditLoginUserId(u.id);
                                setAuthEditLoginNew(u.authLogin || '');
                                setAuthChangeUserId('');
                                setAuthMessage(null);
                              }}>
                                <Edit2 size={14}/>
                              </button>
                              <button className="icon-btn" title="Şifre Değiştir" onClick={() => {
                                setAuthChangeUserId(u.id);
                                setAuthChangeNewPw('');
                                setAuthEditLoginUserId('');
                                setAuthMessage(null);
                              }}>
                                <KeyRound size={14}/>
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    {usersList.length === 0 && (
                      <tr><td colSpan="5" style={{textAlign:'center', padding:'1rem', color:'var(--text-muted)'}}>Personel bulunamadı.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inline Password Change */}
            {authChangeUserId && (() => {
              const selectedUser = usersList.find(u => u.id === authChangeUserId);
              if (!selectedUser) return null;
              const targetAuthEmail = selectedUser.authEmail || selectedUser.email;
              const currentPw = selectedUser.authPassword || '';
              return (
                <div style={{background:'#fef3c7', padding:'1rem', borderRadius:'8px', border:'1px solid #fcd34d', marginBottom:'1.5rem'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem'}}>
                    <h4 style={{fontSize:'0.9rem', margin:0, color:'#92400e'}}>
                      {selectedUser.name} - Şifre Değiştir
                    </h4>
                    <button className="icon-btn" onClick={() => setAuthChangeUserId('')} style={{color:'#92400e'}}><X size={16}/></button>
                  </div>
                  <div style={{display:'flex', gap:'0.75rem', alignItems:'flex-end', flexWrap:'wrap'}}>
                    <div style={{flex:1, minWidth:'120px'}}>
                      <label style={{fontSize:'0.7rem', fontWeight:600, color:'#92400e', display:'block', marginBottom:'0.15rem'}}>Giriş Bilgisi</label>
                      <input type="text" value={targetAuthEmail || ''} disabled style={{width:'100%', padding:'0.4rem 0.5rem', border:'1px solid #fcd34d', borderRadius:'4px', fontSize:'0.85rem', background:'#fffbeb', color:'#78350f'}} />
                    </div>
                    <div style={{flex:1, minWidth:'120px'}}>
                      <label style={{fontSize:'0.7rem', fontWeight:600, color:'#92400e', display:'block', marginBottom:'0.15rem'}}>Mevcut Şifre</label>
                      <input type="text" value={currentPw} disabled style={{width:'100%', padding:'0.4rem 0.5rem', border:'1px solid #fcd34d', borderRadius:'4px', fontSize:'0.85rem', background:'#fffbeb', color:'#78350f', fontFamily:'monospace'}} />
                    </div>
                    <div style={{flex:1, minWidth:'120px'}}>
                      <label style={{fontSize:'0.7rem', fontWeight:600, color:'#92400e', display:'block', marginBottom:'0.15rem'}}>Yeni Şifre (en az 6 karakter)</label>
                      <input type="text" value={authChangeNewPw} onChange={e => setAuthChangeNewPw(e.target.value)} placeholder="Yeni şifre girin" style={{width:'100%', padding:'0.4rem 0.5rem', border:'1px solid #fcd34d', borderRadius:'4px', fontSize:'0.85rem', background:'#fff'}} />
                    </div>
                    <button
                      className="btn btn-primary btn-small"
                      disabled={authLoading || !authChangeNewPw || !currentPw}
                      onClick={async () => {
                        setAuthLoading(true);
                        setAuthMessage(null);
                        const result = await adminChangePassword(targetAuthEmail, currentPw, authChangeNewPw);
                        if (result.success) {
                          setAuthMessage({ type: 'success', text: `${selectedUser.name} kullanıcısının şifresi başarıyla değiştirildi.` });
                          setAuthChangeUserId('');
                          setAuthChangeNewPw('');
                        } else {
                          setAuthMessage({ type: 'error', text: `Hata: ${result.error}` });
                        }
                        setAuthLoading(false);
                      }}
                    >
                      {authLoading ? 'İşleniyor...' : 'Şifreyi Değiştir'}
                    </button>
                  </div>
                  {!currentPw && (
                    <p style={{fontSize:'0.75rem', color:'#dc2626', marginTop:'0.5rem', marginBottom:0}}>
                      Bu kullanıcının mevcut şifresi kayıtlı değil. Aşağıdaki "Şifre Sıfırlama E-postası" yöntemini kullanabilirsiniz.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Inline Login Credential Change */}
            {authEditLoginUserId && (() => {
              const selectedUser = usersList.find(u => u.id === authEditLoginUserId);
              if (!selectedUser) return null;
              const oldAuthEmail = selectedUser.authEmail;
              const currentPw = selectedUser.authPassword || '';
              return (
                <div style={{background:'#ede9fe', padding:'1rem', borderRadius:'8px', border:'1px solid #c4b5fd', marginBottom:'1.5rem'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem'}}>
                    <h4 style={{fontSize:'0.9rem', margin:0, color:'#5b21b6'}}>
                      {selectedUser.name} - Giriş Bilgisi Değiştir
                    </h4>
                    <button className="icon-btn" onClick={() => setAuthEditLoginUserId('')} style={{color:'#5b21b6'}}><X size={16}/></button>
                  </div>
                  <div style={{display:'flex', gap:'0.75rem', alignItems:'flex-end', flexWrap:'wrap'}}>
                    <div style={{flex:1, minWidth:'150px'}}>
                      <label style={{fontSize:'0.7rem', fontWeight:600, color:'#5b21b6', display:'block', marginBottom:'0.15rem'}}>Mevcut Giriş Bilgisi</label>
                      <input type="text" value={selectedUser.authLogin || oldAuthEmail || ''} disabled style={{width:'100%', padding:'0.4rem 0.5rem', border:'1px solid #c4b5fd', borderRadius:'4px', fontSize:'0.85rem', background:'#f5f3ff', color:'#4c1d95'}} />
                    </div>
                    <div style={{flex:1, minWidth:'150px'}}>
                      <label style={{fontSize:'0.7rem', fontWeight:600, color:'#5b21b6', display:'block', marginBottom:'0.15rem'}}>Yeni Giriş Bilgisi (Telefon veya E-posta)</label>
                      <input type="text" value={authEditLoginNew} onChange={e => setAuthEditLoginNew(e.target.value)} placeholder="05351234567 veya ornek@sirket.com" style={{width:'100%', padding:'0.4rem 0.5rem', border:'1px solid #c4b5fd', borderRadius:'4px', fontSize:'0.85rem', background:'#fff'}} />
                      {authEditLoginNew && !/\S+@\S+/.test(authEditLoginNew) && (
                        <span style={{fontSize:'0.65rem', color:'#7c3aed', marginTop:'0.15rem', display:'block'}}>
                          Giriş adresi: {authEditLoginNew.trim()}@tasktrack.net
                        </span>
                      )}
                    </div>
                    <button
                      className="btn btn-primary btn-small"
                      disabled={authLoading || !authEditLoginNew || !currentPw || !oldAuthEmail}
                      onClick={async () => {
                        setAuthLoading(true);
                        setAuthMessage(null);
                        const result = await adminUpdateAuthLogin(oldAuthEmail, currentPw, authEditLoginNew);
                        if (result.success) {
                          setAuthMessage({ type: 'success', text: `${selectedUser.name} kullanıcısının giriş bilgisi değiştirildi: ${authEditLoginNew}` });
                          setAuthEditLoginUserId('');
                          setAuthEditLoginNew('');
                        } else {
                          setAuthMessage({ type: 'error', text: `Hata: ${result.error}` });
                        }
                        setAuthLoading(false);
                      }}
                      style={{background:'#7c3aed', borderColor:'#7c3aed'}}
                    >
                      {authLoading ? 'İşleniyor...' : 'Giriş Bilgisini Değiştir'}
                    </button>
                  </div>
                  {!currentPw && (
                    <p style={{fontSize:'0.75rem', color:'#dc2626', marginTop:'0.5rem', marginBottom:0}}>
                      Bu kullanıcının mevcut şifresi kayıtlı değil. Giriş bilgisi değiştirmek için şifre bilinmelidir.
                    </p>
                  )}
                </div>
              );
            })()}

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem'}}>
              {/* Create New User */}
              <div style={{background:'var(--bg-card)', padding:'1.5rem', borderRadius:'8px', border:'1px solid var(--border)'}}>
                <h4 style={{fontSize:'0.95rem', marginBottom:'1rem', color:'var(--text-main)', display:'flex', alignItems:'center', gap:'0.5rem'}}>
                  <Plus size={16}/> Yeni Kullanıcı Hesabı Oluştur
                </h4>
                <p style={{fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'1rem', lineHeight:'1.5'}}>
                  Telefon numarası veya e-posta adresi ile yeni hesap oluşturur. Kullanıcı bu bilgilerle sisteme giriş yapabilir.
                </p>
                <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
                  <div>
                    <label style={{fontSize:'0.7rem', fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:'0.15rem'}}>Bağlı Personel</label>
                    <select value={authNewLinkedUser} onChange={e => setAuthNewLinkedUser(e.target.value)} style={{width:'100%', padding:'0.4rem 0.5rem', border:'1px solid var(--border)', borderRadius:'4px', fontSize:'0.85rem', background:'var(--bg-main)'}}>
                      <option value="">Personel seçin (isteğe bağlı)...</option>
                      {usersList.filter(u => !u.authEmail).map(u => (
                        <option key={u.id} value={u.id}>{u.name} {u.email ? `(${u.email})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:'0.7rem', fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:'0.15rem'}}>Kullanıcı Adı (Telefon veya E-posta)</label>
                    <input type="text" value={authNewLogin} onChange={e => setAuthNewLogin(e.target.value)} placeholder="05351234567 veya ornek@sirket.com" style={{width:'100%', padding:'0.4rem 0.5rem', border:'1px solid var(--border)', borderRadius:'4px', fontSize:'0.85rem'}} />
                    {authNewLogin && !/\S+@\S+/.test(authNewLogin) && (
                      <span style={{fontSize:'0.65rem', color:'var(--text-muted)', marginTop:'0.15rem', display:'block'}}>
                        Giriş adresi: {authNewLogin.trim()}@tasktrack.net
                      </span>
                    )}
                  </div>
                  <div>
                    <label style={{fontSize:'0.7rem', fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:'0.15rem'}}>Şifre (en az 6 karakter)</label>
                    <input type="text" value={authNewPassword} onChange={e => setAuthNewPassword(e.target.value)} placeholder="Şifre belirleyin" style={{width:'100%', padding:'0.4rem 0.5rem', border:'1px solid var(--border)', borderRadius:'4px', fontSize:'0.85rem'}} />
                  </div>
                  <button
                    className="btn btn-primary btn-small"
                    disabled={authLoading || !authNewLogin || !authNewPassword}
                    onClick={async () => {
                      setAuthLoading(true);
                      setAuthMessage(null);
                      const result = await adminCreateAuthUser(authNewLogin, authNewPassword, authNewLinkedUser || null);
                      if (result.success) {
                        setAuthMessage({ type: 'success', text: `Hesap başarıyla oluşturuldu: ${authNewLogin}` });
                        setAuthNewLogin('');
                        setAuthNewPassword('');
                        setAuthNewLinkedUser('');
                      } else {
                        setAuthMessage({ type: 'error', text: `Hata: ${result.error}` });
                      }
                      setAuthLoading(false);
                    }}
                    style={{marginTop:'0.5rem'}}
                  >
                    {authLoading ? 'İşleniyor...' : 'Hesap Oluştur'}
                  </button>
                </div>
              </div>

              {/* Password Reset Email */}
              <div style={{background:'var(--bg-card)', padding:'1.5rem', borderRadius:'8px', border:'1px solid var(--border)'}}>
                <h4 style={{fontSize:'0.95rem', marginBottom:'1rem', color:'var(--text-main)', display:'flex', alignItems:'center', gap:'0.5rem'}}>
                  Şifre Sıfırlama E-postası Gönder
                </h4>
                <p style={{fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'1rem', lineHeight:'1.5'}}>
                  Kullanıcıya şifre sıfırlama bağlantısı içeren bir e-posta gönderir. Sadece gerçek e-posta adresi olan hesaplar için çalışır (telefon numarası ile oluşturulan hesaplar için kullanılamaz).
                </p>
                <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
                  <div>
                    <label style={{fontSize:'0.7rem', fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:'0.15rem'}}>Kullanıcı</label>
                    <select value={authResetEmail} onChange={e => setAuthResetEmail(e.target.value)} style={{width:'100%', padding:'0.4rem 0.5rem', border:'1px solid var(--border)', borderRadius:'4px', fontSize:'0.85rem', background:'var(--bg-main)'}}>
                      <option value="">Kullanıcı seçin...</option>
                      {usersList.filter(u => u.email && u.email.includes('@') && !u.email.includes('@tasktrack.net')).map(u => (
                        <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="btn btn-secondary btn-small"
                    disabled={authLoading || !authResetEmail}
                    onClick={async () => {
                      setAuthLoading(true);
                      setAuthMessage(null);
                      const result = await adminSendPasswordReset(authResetEmail);
                      if (result.success) {
                        setAuthMessage({ type: 'success', text: `Şifre sıfırlama e-postası gönderildi: ${authResetEmail}` });
                      } else {
                        setAuthMessage({ type: 'error', text: `Hata: ${result.error}` });
                      }
                      setAuthLoading(false);
                    }}
                    style={{background:'#f59e0b', color:'#fff', borderColor:'#f59e0b', marginTop:'0.5rem'}}
                  >
                    {authLoading ? 'Gönderiliyor...' : 'Sıfırlama E-postası Gönder'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isEditing && activeTab === 'customers' && (
          <CustomersTab customersList={customersList} addCustomer={addCustomer} editCustomer={editCustomer} deleteCustomer={deleteCustomer} currentUser={useTasks().currentUser} usersList={usersList} onCreateTaskFromCustomer={onCreateTaskFromCustomer} />
        )}

        {!isEditing && activeTab === 'system' && (
          <SystemSettingsTab companies={companies} addCompany={addCompany} updateCompany={updateCompany} deleteCompany={deleteCompany} />
        )}

        {isEditing && (
          <form className="modal-form" onSubmit={handleSave} style={{padding:'1.5rem'}}>
            <h3 style={{marginBottom:'1.5rem', fontSize:'1.1rem', color: 'var(--primary)'}}>{formData.id ? 'Kurumsal Çalışan Düzenle' : 'Yeni Kurumsal Çalışan Kaydı'}</h3>
            
            <div className="form-row" style={{display:'flex', gap:'1rem'}}>
              <div className="form-group" style={{flex:2}}>
                <label>Ad Soyad *</label>
                <input type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} required autoFocus/>
              </div>
              <div className="form-group" style={{flex:1}}>
                <label>Sistem Yetkisi *</label>
                <select value={formData.role || 'user'} onChange={e=>setFormData({...formData, role: e.target.value})} style={{width:'100%', padding:'0.45rem', border:'1px solid var(--border)', borderRadius:'4px', background: 'var(--bg-main)', fontSize:'0.85rem'}}>
                  <option value="user">Standart Kullanıcı</option>
                  <option value="admin">Sistem Yöneticisi (Admin)</option>
                </select>
              </div>
            </div>

            <div className="form-row" style={{display:'flex', gap:'1rem'}}>
              <div className="form-group" style={{flex:1}}>
                <label>Telefon Numarası</label>
                <input type="text" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} placeholder="0555..."/>
              </div>
              <div className="form-group" style={{flex:1}}>
                <label>WhatsApp Numarası</label>
                <input type="text" value={formData.whatsapp} onChange={e=>setFormData({...formData, whatsapp: e.target.value})} placeholder="+90555..."/>
              </div>
            </div>
            
            <div className="form-group">
              <label>E-Posta Adresi</label>
              <input type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} placeholder="ornek@sirket.com"/>
            </div>
            <div className="form-group">
              <label>Mali Bilgiler (IBAN, Banka, Maaş, SSK vs.)</label>
              <input type="text" value={formData.finance} onChange={e=>setFormData({...formData, finance: e.target.value})} placeholder="TR00..."/>
            </div>
            
            <div className="modal-actions" style={{marginTop:'2rem'}}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>İptal</button>
              <button type="submit" className="btn btn-primary" style={{paddingLeft:'1.5rem', paddingRight:'1.5rem'}}>Kaydet</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function formatPhoneTR(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return '';
  let pure = digits;
  if (pure.startsWith('90') && pure.length >= 12) pure = pure.substring(2);
  else if (pure.startsWith('0') && pure.length >= 11) pure = pure.substring(1);
  if (pure.length === 10 && (pure.startsWith('5') || pure.startsWith('2') || pure.startsWith('3') || pure.startsWith('4'))) {
    return '+90' + pure;
  }
  return phone.trim();
}

function CustomersTab({ customersList, addCustomer, editCustomer, deleteCustomer, currentUser, usersList, onCreateTaskFromCustomer }) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const emptyForm = { customerName: '', customerOfficialName: '', customerPhone: '', customerEmail: '', customerPhone2: '', customerAddress: '', customerTaxNo: '', customerTaxOffice: '', customerTradeRegNo: '' };
  const [form, setForm] = useState(emptyForm);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');

  const filtered = customersList.filter(c => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (c.customerName || '').toLowerCase().includes(s) ||
           (c.customerPhone || '').includes(s) ||
           (c.customerEmail || '').toLowerCase().includes(s) ||
           (c.customerTaxNo || '').includes(s);
  });

  const startEdit = (c) => {
    setEditingId(c.id);
    setForm({ customerName: c.customerName || '', customerOfficialName: c.customerOfficialName || '', customerPhone: c.customerPhone || '', customerEmail: c.customerEmail || '', customerPhone2: c.customerPhone2 || '', customerAddress: c.customerAddress || '', customerTaxNo: c.customerTaxNo || '', customerTaxOffice: c.customerTaxOffice || '', customerTradeRegNo: c.customerTradeRegNo || '' });
    setNotes(c.notes || []);
    setNewNote('');
    setShowAddForm(false);
  };

  const cancelEdit = () => { setEditingId(null); setShowAddForm(false); setForm(emptyForm); setNotes([]); setNewNote(''); };

  const handleAddNote = async () => {
    if (!newNote.trim() || !editingId) return;
    const noteObj = { id: Date.now().toString(), text: newNote, author: currentUser || 'Sistem', date: new Date().toISOString() };
    const updatedNotes = [...notes, noteObj];
    setNotes(updatedNotes);
    await editCustomer(editingId, { notes: updatedNotes });
    setNewNote('');
  };

  const handleSave = async () => {
    if (!form.customerName.trim()) { alert('Müşteri adı zorunludur.'); return; }
    const savedForm = {
      ...form,
      customerPhone: formatPhoneTR(form.customerPhone),
      customerPhone2: formatPhoneTR(form.customerPhone2)
    };
    if (editingId) {
      await editCustomer(editingId, { ...savedForm, notes });
      setEditingId(null);
    } else {
      await addCustomer({ ...savedForm, notes: [] });
      setShowAddForm(false);
    }
    setForm(emptyForm);
    setNotes([]);
    setNewNote('');
  };

  const handleCalendar = () => {
    if (!editingId) return;
    const c = customersList.find(x => x.id === editingId) || form;
    const baseUrl = 'https://calendar.google.com/calendar/u/0/r/eventedit';
    const params = new URLSearchParams();
    params.append('text', `Müşteri: ${form.customerName}`);
    let details = '';
    if (form.customerName) details += `Müşteri: ${form.customerName}\n`;
    if (form.customerPhone) details += `Tel: ${form.customerPhone}\n`;
    if (form.customerEmail) details += `E-mail: ${form.customerEmail}\n`;
    if (form.customerAddress) details += `Adres: ${form.customerAddress}\n`;
    params.append('details', details);
    const now = new Date();
    const todayStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    params.append('dates', `${todayStr}T100000/${todayStr}T120000`);
    window.open(`${baseUrl}?${params.toString()}`, '_blank');
  };

  const handleWhatsApp = () => {
    let text = `Müşteri: ${form.customerName}\n`;
    if (form.customerPhone) text += `Tel: ${formatPhoneTR(form.customerPhone)}\n`;
    if (form.customerEmail) text += `E-mail: ${form.customerEmail}\n`;
    if (form.customerAddress) text += `Adres: ${form.customerAddress}\n`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleExportCustomersExcel = () => {
    if (customersList.length === 0) { alert('Dışa aktarılacak müşteri kaydı bulunmuyor.'); return; }
    const data = customersList.map(c => ({
      'Müşteri Adı/Ünvanı': c.customerName || '',
      'Müşteri Adı/Ünvanı (Resmi)': c.customerOfficialName || '',
      'İletişim Tel/GSM': c.customerPhone || '',
      'E-mail': c.customerEmail || '',
      'Telefon 2': c.customerPhone2 || '',
      'Adres Bilgisi': c.customerAddress || '',
      'Vergi No': c.customerTaxNo || '',
      'Vergi Dairesi': c.customerTaxOffice || '',
      'Ticaret Sicil No': c.customerTradeRegNo || ''
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Müşteri Listesi");
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `musteri_listesi_${dateStr}.xlsx`);
  };

  const handleImportCustomersExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.confirm("Excel dosyasındaki müşteri bilgileri sisteme eklenecek. Aynı isimli müşteriler güncellenir, yenileri eklenir. Onaylıyor musunuz?")) { e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) throw new Error("Excel dosyasında sayfa bulunamadı.");
        const rows = XLSX.utils.sheet_to_json(ws);
        let addCount = 0, updateCount = 0;
        for (const row of rows) {
          const name = (row['Müşteri Adı/Ünvanı'] || row['Müşteri Adı'] || row['Ad Soyad'] || row['Ünvan'] || '').toString().trim();
          if (!name) continue;
          const custData = {
            customerName: name,
            customerOfficialName: (row['Müşteri Adı/Ünvanı (Resmi)'] || row['Resmi Ünvan'] || '').toString().trim() || name,
            customerPhone: formatPhoneTR((row['İletişim Tel/GSM'] || row['Telefon'] || row['Tel'] || '').toString().trim()),
            customerEmail: (row['E-mail'] || row['Email'] || row['E-posta'] || '').toString().trim(),
            customerPhone2: formatPhoneTR((row['Telefon 2'] || row['Tel 2'] || '').toString().trim()),
            customerAddress: (row['Adres Bilgisi'] || row['Adres'] || '').toString().trim(),
            customerTaxNo: (row['Vergi No'] || row['VKN'] || '').toString().trim(),
            customerTaxOffice: (row['Vergi Dairesi'] || '').toString().trim(),
            customerTradeRegNo: (row['Ticaret Sicil No'] || '').toString().trim()
          };
          const existing = customersList.find(c => c.customerName && c.customerName.trim().toLowerCase() === name.toLowerCase());
          if (existing) {
            await editCustomer(existing.id, custData);
            updateCount++;
          } else {
            await addCustomer(custData);
            addCount++;
          }
        }
        alert(`Excel İçe Aktarma Başarılı!\n${addCount} yeni müşteri eklendi, ${updateCount} mevcut müşteri güncellendi.`);
      } catch (err) {
        alert("Excel içe aktarma hatası: " + err.message);
      }
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const inputStyle = { width: '100%', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.85rem', background: 'var(--bg-main)' };
  const labelStyle = { fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' };

  return (
    <div className="settings-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ fontSize: '1rem', margin: 0 }}>Kayıtlı Müşteriler ({customersList.length})</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Müşteri ara..." style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', width: '200px' }} />
          <button className="btn btn-secondary btn-small" onClick={handleExportCustomersExcel} style={{ color: '#10b981', fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'transparent', border: '1px solid #10b981' }}>Excel Çıktısı</button>
          <label className="btn btn-secondary btn-small" style={{ color: '#10b981', background: 'transparent', border: '1px dotted #10b981', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
            Excel'den Yükle
            <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleImportCustomersExcel} />
          </label>
          {!showAddForm && !editingId && (
            <button className="btn btn-primary btn-small" onClick={() => { setShowAddForm(true); setForm(emptyForm); setNotes([]); }}><Plus size={14} style={{ marginRight: '4px' }} /> Yeni Müşteri</button>
          )}
        </div>
      </div>

      {(showAddForm || editingId) && (
        <div style={{ background: 'var(--bg-alt)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-main)' }}>{editingId ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}</h4>
            {editingId && (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button type="button" className="btn btn-secondary btn-small" onClick={handleCalendar} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff', fontSize: '0.7rem' }}>
                  <Calendar size={13} /> Google Takvime Ekle
                </button>
                <button type="button" className="btn btn-secondary btn-small" onClick={handleWhatsApp} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4', fontSize: '0.7rem' }}>
                  <MessageCircle size={13} /> WhatsApp
                </button>
                {onCreateTaskFromCustomer && (
                  <button type="button" className="btn btn-secondary btn-small" onClick={() => {
                    const notesText = notes.length > 0 ? notes.map((n, i) => `${i + 1}- ${n.text}`).join('\n') : '';
                    onCreateTaskFromCustomer({
                      customerName: form.customerName,
                      customerOfficialName: form.customerOfficialName,
                      customerPhone: form.customerPhone,
                      customerEmail: form.customerEmail,
                      customerPhone2: form.customerPhone2,
                      customerAddress: form.customerAddress,
                      customerTaxNo: form.customerTaxNo,
                      customerTaxOffice: form.customerTaxOffice,
                      customerTradeRegNo: form.customerTradeRegNo,
                      description: notesText
                    });
                  }} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#7c3aed', borderColor: '#c4b5fd', background: '#f5f3ff', fontSize: '0.7rem' }}>
                    <Plus size={13} /> Görev Oluştur
                  </button>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <div><label style={labelStyle}>Müşteri Adı Soyadı/Ünvanı *</label><input style={inputStyle} value={form.customerName} onChange={e => {
              const val = e.target.value;
              setForm(f => ({ ...f, customerName: val, ...(f.customerOfficialName === '' || f.customerOfficialName === f.customerName ? { customerOfficialName: val } : {}) }));
            }} placeholder="Ahmet Yılmaz / ABC Ltd." /></div>
            <div><label style={labelStyle}>Müşteri Adı Soyadı/Ünvanı (Resmi)</label><input style={inputStyle} value={form.customerOfficialName} onChange={e => setForm({ ...form, customerOfficialName: e.target.value })} placeholder="Vergi levhasındaki resmi ad" /></div>
            <div><label style={labelStyle}>İletişim Numarası Tel/GSM</label><input style={inputStyle} value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} onBlur={() => setForm(f => ({ ...f, customerPhone: formatPhoneTR(f.customerPhone) }))} placeholder="+905XXXXXXXXX" /></div>
            <div><label style={labelStyle}>E-mail</label><input style={inputStyle} value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })} placeholder="ornek@firma.com" /></div>
            <div><label style={labelStyle}>Telefon 2</label><input style={inputStyle} value={form.customerPhone2} onChange={e => setForm({ ...form, customerPhone2: e.target.value })} onBlur={() => setForm(f => ({ ...f, customerPhone2: formatPhoneTR(f.customerPhone2) }))} placeholder="+905XXXXXXXXX" /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Adres Bilgisi</label><input style={inputStyle} value={form.customerAddress} onChange={e => setForm({ ...form, customerAddress: e.target.value })} placeholder="Atatürk Cad. No:1 İstanbul" /></div>
            <div><label style={labelStyle}>Vergi No</label><input style={inputStyle} value={form.customerTaxNo} onChange={e => setForm({ ...form, customerTaxNo: e.target.value })} placeholder="1234567890" /></div>
            <div><label style={labelStyle}>Vergi Dairesi</label><input style={inputStyle} value={form.customerTaxOffice} onChange={e => setForm({ ...form, customerTaxOffice: e.target.value })} placeholder="Kadıköy V.D." /></div>
            <div><label style={labelStyle}>Ticaret Sicil No</label><input style={inputStyle} value={form.customerTradeRegNo} onChange={e => setForm({ ...form, customerTradeRegNo: e.target.value })} placeholder="123456" /></div>
          </div>

          {editingId && (
            <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Notlar ({notes.length})</h4>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Müşteriye ilişkin not ekle..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddNote(); } }} style={{ flex: 1, padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.85rem', background: 'var(--bg-main)' }} />
                <button className="btn btn-primary btn-small" onClick={handleAddNote}>Not Ekle</button>
              </div>
              {notes.length > 0 && (
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {[...notes].reverse().map(n => (
                    <div key={n.id} style={{ padding: '0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>{n.text}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <span style={{ fontWeight: 600 }}>{n.author}</span>
                        <span>{new Date(n.date).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {notes.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Henüz not eklenmemiş.</div>}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button className="btn btn-secondary btn-small" onClick={cancelEdit}>İptal</button>
            <button className="btn btn-primary btn-small" onClick={handleSave}>{editingId ? 'Güncelle' : 'Ekle'}</button>
          </div>
        </div>
      )}

      <div className="table-container" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
        <table className="compact-table">
          <thead>
            <tr>
              <th>Müşteri Adı/Ünvanı</th>
              <th>Telefon</th>
              <th>E-mail</th>
              <th>Adres</th>
              <th>Vergi No / Dairesi</th>
              <th style={{ width: '60px' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={editingId === c.id ? { background: 'var(--bg-alt)' } : {}}>
                <td style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => startEdit(c)}>{c.customerName}</td>
                <td style={{ fontSize: '0.8rem' }}>
                  {c.customerPhone && <div>{c.customerPhone}</div>}
                  {c.customerPhone2 && <div style={{ color: 'var(--text-muted)' }}>{c.customerPhone2}</div>}
                  {!c.customerPhone && !c.customerPhone2 && '-'}
                </td>
                <td style={{ fontSize: '0.8rem' }}>{c.customerEmail || '-'}</td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.customerAddress}>{c.customerAddress || '-'}</td>
                <td style={{ fontSize: '0.75rem' }}>
                  {c.customerTaxNo && <div>{c.customerTaxNo}</div>}
                  {c.customerTaxOffice && <div style={{ color: 'var(--text-muted)' }}>{c.customerTaxOffice}</div>}
                  {!c.customerTaxNo && !c.customerTaxOffice && '-'}
                </td>
                <td>
                  <button className="icon-btn" onClick={() => startEdit(c)}><Edit2 size={14} /></button>
                  <button className="icon-btn delete-btn" onClick={() => deleteCustomer(c.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                {search ? 'Aramanızla eşleşen müşteri bulunamadı.' : 'Henüz müşteri kaydı bulunmuyor. Görev oluştururken girilen müşteri bilgileri otomatik olarak buraya kaydedilir.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SystemSettingsTab({ companies, addCompany, updateCompany, deleteCompany }) {
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const emptyForm = {
    name: '', displayName: '', color: '#3b82f6',
    firebaseConfig: { apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '' },
    gasDeploymentUrl: '', driveFolderId: ''
  };
  const [form, setForm] = useState(emptyForm);

  const startEdit = (company) => {
    setEditingId(company.id);
    setForm({
      name: company.name || '',
      displayName: company.displayName || '',
      color: company.color || '#3b82f6',
      firebaseConfig: company.firebaseConfig || emptyForm.firebaseConfig,
      gasDeploymentUrl: company.gasDeploymentUrl || '',
      driveFolderId: company.driveFolderId || ''
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setForm(emptyForm);
  };

  const handleSaveEdit = async () => {
    if (!form.name || !form.firebaseConfig.apiKey) {
      alert('Şirket adı ve Firebase API Key zorunludur.');
      return;
    }
    await updateCompany(editingId, form);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleAdd = async () => {
    if (!form.name || !form.firebaseConfig.apiKey) {
      alert('Şirket adı ve Firebase API Key zorunludur.');
      return;
    }
    await addCompany(form);
    setShowAddForm(false);
    setForm(emptyForm);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" şirketini silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) return;
    await deleteCompany(id);
  };

  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | 'success' | 'error'
  const [testMessage, setTestMessage] = useState('');

  const testFirebaseConnection = async () => {
    const cfg = form.firebaseConfig;
    if (!cfg.apiKey || !cfg.projectId) {
      setTestStatus('error');
      setTestMessage('API Key ve Project ID zorunludur.');
      return;
    }
    setTestStatus('testing');
    setTestMessage('Bağlantı test ediliyor...');
    let testApp = null;
    try {
      testApp = initializeApp(cfg, 'connection-test-' + Date.now());
      const testDb = getFirestore(testApp);
      await getDocs(collection(testDb, '__test__'));
      setTestStatus('success');
      setTestMessage('Firebase bağlantısı başarılı! Firestore erişimi doğrulandı.');
    } catch (err) {
      if (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions')) {
        setTestStatus('success');
        setTestMessage('Firebase bağlantısı başarılı! (Firestore erişim kuralları aktif)');
      } else {
        setTestStatus('error');
        setTestMessage('Bağlantı hatası: ' + (err.message || 'Bilinmeyen hata'));
      }
    } finally {
      if (testApp) { try { deleteApp(testApp); } catch(e){} }
    }
  };

  const updateFirebaseField = (field, value) => {
    setTestStatus(null);
    setForm(prev => ({ ...prev, firebaseConfig: { ...prev.firebaseConfig, [field]: value } }));
  };

  const inputStyle = { width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem', background: 'var(--bg-main)', color: 'var(--text-main)' };
  const labelStyle = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' };
  const sectionStyle = { background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.2rem', marginBottom: '1rem' };

  const CompanyForm = ({ onSave, saveLabel }) => (
    <div style={sectionStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '0.8rem', marginBottom: '1rem' }}>
        <div>
          <label style={labelStyle}>Şirket Kodu *</label>
          <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="PRCD" />
        </div>
        <div>
          <label style={labelStyle}>Görünen Ad</label>
          <input style={inputStyle} value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="PRCD Şirketi" />
        </div>
        <div>
          <label style={labelStyle}>Renk</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: '36px', height: '36px', border: 'none', cursor: 'pointer' }} />
            <input style={{ ...inputStyle, flex: 1 }} value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0 0.6rem' }}>
        <h4 style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-main)' }}>Firebase Yapılandırması *</h4>
        <button
          type="button"
          onClick={testFirebaseConnection}
          disabled={testStatus === 'testing'}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.35rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
            border: '1px solid', cursor: testStatus === 'testing' ? 'wait' : 'pointer',
            background: testStatus === 'success' ? '#f0fdf4' : testStatus === 'error' ? '#fef2f2' : '#f0f9ff',
            color: testStatus === 'success' ? '#16a34a' : testStatus === 'error' ? '#dc2626' : '#2563eb',
            borderColor: testStatus === 'success' ? '#bbf7d0' : testStatus === 'error' ? '#fecaca' : '#bfdbfe'
          }}
        >
          {testStatus === 'testing' ? <Loader size={13} style={{animation:'spin 1s linear infinite'}} /> : testStatus === 'success' ? <CheckCircle size={13} /> : testStatus === 'error' ? <XCircle size={13} /> : <Server size={13} />}
          {testStatus === 'testing' ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}
        </button>
      </div>
      {testStatus && testStatus !== 'testing' && (
        <div style={{
          padding: '0.5rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', marginBottom: '0.6rem',
          background: testStatus === 'success' ? '#f0fdf4' : '#fef2f2',
          color: testStatus === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${testStatus === 'success' ? '#bbf7d0' : '#fecaca'}`
        }}>
          {testMessage}
        </div>
      )}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.8rem', marginBottom: '0.8rem', fontSize: '0.78rem', color: '#1e40af', lineHeight: '1.5' }}>
        <strong>Firebase Proje Kurulum Rehberi:</strong><br/>
        1. <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" style={{color:'#2563eb'}}>Firebase Console</a>'a gidin ve "Proje ekle" butonuna tiklatin<br/>
        2. Proje adini girin (ornegin: "firma-adi-istakip"), olusturun<br/>
        3. Sol menuden <strong>Authentication</strong> {">"} "Baslayin" {">"} "Email/Password" ve "Google" yontemlerini aktif edin<br/>
        4. Sol menuden <strong>Firestore Database</strong> {">"} "Veritabani olustur" {">"} "Test modunda basla" secin<br/>
        5. Sol menuden <strong>Proje Ayarlari</strong> (disli ikon) {">"} "Uygulamalariniz" {">"} Web uygulamasi ekle ({"</>"})<br/>
        6. Gosterilen <strong>firebaseConfig</strong> degerlerini asagidaki alanlara yapiştirin
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        <div>
          <label style={labelStyle}>API Key *</label>
          <input style={inputStyle} value={form.firebaseConfig.apiKey} onChange={e => updateFirebaseField('apiKey', e.target.value)} placeholder="AIzaSy..." />
        </div>
        <div>
          <label style={labelStyle}>Auth Domain</label>
          <input style={inputStyle} value={form.firebaseConfig.authDomain} onChange={e => updateFirebaseField('authDomain', e.target.value)} placeholder="proje-adi.firebaseapp.com" />
        </div>
        <div>
          <label style={labelStyle}>Project ID</label>
          <input style={inputStyle} value={form.firebaseConfig.projectId} onChange={e => updateFirebaseField('projectId', e.target.value)} placeholder="proje-adi" />
        </div>
        <div>
          <label style={labelStyle}>Storage Bucket</label>
          <input style={inputStyle} value={form.firebaseConfig.storageBucket} onChange={e => updateFirebaseField('storageBucket', e.target.value)} placeholder="proje-adi.firebasestorage.app" />
        </div>
        <div>
          <label style={labelStyle}>Messaging Sender ID</label>
          <input style={inputStyle} value={form.firebaseConfig.messagingSenderId} onChange={e => updateFirebaseField('messagingSenderId', e.target.value)} placeholder="123456789" />
        </div>
        <div>
          <label style={labelStyle}>App ID</label>
          <input style={inputStyle} value={form.firebaseConfig.appId} onChange={e => updateFirebaseField('appId', e.target.value)} placeholder="1:123:web:abc123" />
        </div>
      </div>

      <h4 style={{ fontSize: '0.9rem', margin: '1rem 0 0.6rem', color: 'var(--text-main)' }}>Dosya Yükleme Ayarları (Google Drive)</h4>
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.8rem', marginBottom: '0.8rem', fontSize: '0.78rem', color: '#1e40af', lineHeight: '1.5' }}>
        <strong>Kurulum Rehberi:</strong><br/>
        1. <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" style={{color:'#2563eb'}}>Google Drive</a>'a gidin ve yeni bir klasor oluturun (ornegin: "TaskTrack Dosyalar")<br/>
        2. Klasore sag tiklayip "Paylas" deyin, "Baglantiya sahip herkes" secenegini "Duzenleyici" yapin<br/>
        3. Klasor URL'sindeki ID'yi kopyalayin (drive.google.com/drive/folders/<strong>BU_KISIM</strong>)<br/>
        4. <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" style={{color:'#2563eb'}}>Google Apps Script</a>'e gidin, yeni proje olusturun<br/>
        5. Asagidaki kodu yapiştirin (klasor ID'sini degistirin), "Dagit" {">"} "Web uygulamasi" olarak dagitin<br/>
        6. Erisim: "Herkes" secin, URL'yi asagiya yapiştirin
        <details style={{marginTop:'0.5rem'}}>
          <summary style={{cursor:'pointer', fontWeight:600, color:'#1d4ed8'}}>Google Apps Script Kodu (tiklayip kopyalayin)</summary>
          <pre style={{background:'#1e293b', color:'#e2e8f0', padding:'0.8rem', borderRadius:'6px', fontSize:'0.72rem', overflow:'auto', marginTop:'0.4rem', whiteSpace:'pre-wrap'}}>{`function doPost(e) {
  var folderId = "KLASOR_ID_BURAYA"; // Drive klasor ID'nizi yazin
  var folder = DriveApp.getFolderById(folderId);
  var blob = Utilities.newBlob(
    Utilities.base64Decode(e.parameter.data),
    e.parameter.mimeType,
    e.parameter.fileName
  );
  var file = folder.createFile(blob);
  file.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      fileId: file.getId(),
      url: file.getUrl()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}`}</pre>
        </details>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        <div>
          <label style={labelStyle}>Google Apps Script URL *</label>
          <input style={inputStyle} value={form.gasDeploymentUrl} onChange={e => setForm({ ...form, gasDeploymentUrl: e.target.value })} placeholder="https://script.google.com/macros/s/.../exec" />
        </div>
        <div>
          <label style={labelStyle}>Google Drive Klasor ID *</label>
          <input style={inputStyle} value={form.driveFolderId} onChange={e => setForm({ ...form, driveFolderId: e.target.value })} placeholder="1aBcDeFgHiJkLmNoPqRsT..." />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.2rem' }}>
        <button className="btn btn-secondary" onClick={cancelEdit} style={{ fontSize: '0.85rem' }}>İptal</button>
        <button className="btn btn-primary" onClick={onSave} style={{ fontSize: '0.85rem' }}>{saveLabel}</button>
      </div>
    </div>
  );

  return (
    <div className="settings-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <h3 style={{ fontSize: '1rem', margin: 0 }}>Kayıtlı Şirketler ({companies.length})</h3>
        {!showAddForm && !editingId && (
          <button className="btn btn-primary btn-small" onClick={() => { setShowAddForm(true); setForm(emptyForm); }} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
            <Plus size={15} /> Yeni Şirket Ekle
          </button>
        )}
      </div>

      {showAddForm && <CompanyForm onSave={handleAdd} saveLabel="Şirket Ekle" />}

      {companies.map(c => (
        <div key={c.id}>
          {editingId === c.id ? (
            <CompanyForm onSave={handleSaveEdit} saveLabel="Güncelle" />
          ) : (
            <div style={{ ...sectionStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.color || '#3b82f6' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{c.displayName || c.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {c.name} | {c.firebaseConfig?.projectId || 'Yapılandırılmamış'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="icon-btn" onClick={() => startEdit(c)} title="Düzenle"><Edit2 size={16} /></button>
                <button className="icon-btn" onClick={() => handleDelete(c.id, c.name)} title="Sil" style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
              </div>
            </div>
          )}
        </div>
      ))}

      {companies.length === 0 && !showAddForm && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          Henüz şirket kaydı bulunmuyor. Otomatik oluşturulacak...
        </div>
      )}

      <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '0.82rem', color: '#92400e', lineHeight: '1.5' }}>
        <strong>Yeni Şirket Ekleme Rehberi:</strong><br />
        1. Firebase Console'dan yeni bir proje oluşturun<br />
        2. Authentication &gt; Sign-in method'dan Email/Password ve Google'ı aktifleştirin<br />
        3. Firestore Database oluşturun (production mode)<br />
        4. Proje ayarlarından Firebase config bilgilerini kopyalayın<br />
        5. Yukarıdaki "Yeni Şirket Ekle" butonuna tıklayarak bilgileri girin
      </div>
    </div>
  );
}
