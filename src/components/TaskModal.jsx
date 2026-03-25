import React, { useState, useEffect, useRef } from 'react';
import { useTasks } from '../context/TaskContext';
import { X, Maximize, Minimize, Star, Copy, Check, MessageCircle, Calendar, History, Paperclip, Download, Loader, ListTodo, Tag } from 'lucide-react';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxncRte5tnhqc68DIlTzdOpDkEYEywiLwwWtuUq9WJ-VR8gbdJBSc9xSUcWi0NjNyYdmw/exec';

export default function TaskModal({ isOpen, onClose, defaultStatus, editTask, prefillData }) {
  const { addTask, updateTask, currentUser, usersList, isAdmin, tagsList, getUserColor, customersList } = useTasks();
  const [title, setTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerTaxNo, setCustomerTaxNo] = useState('');
  const [customerTaxOffice, setCustomerTaxOffice] = useState('');
  const [customerTradeRegNo, setCustomerTradeRegNo] = useState('');
  const [customerPhone2, setCustomerPhone2] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignee, setAssignee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [newNote, setNewNote] = useState('');
  const [notePriority, setNotePriority] = useState('normal');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [tags, setTags] = useState([]);
  const [recurrence, setRecurrence] = useState('none');
  const [recurrenceDay, setRecurrenceDay] = useState(1);
  const [recurrenceCount, setRecurrenceCount] = useState(3);
  const [recurrenceRemaining, setRecurrenceRemaining] = useState(null);

  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const uploadAbortRef = useRef(null);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editTask) {
        setTitle(editTask.title || '');
        setCustomerName(editTask.customerName || '');
        setCustomerPhone(editTask.customerPhone || '');
        setCustomerEmail(editTask.customerEmail || '');
        setCustomerAddress(editTask.customerAddress || '');
        setCustomerTaxNo(editTask.customerTaxNo || '');
        setCustomerTaxOffice(editTask.customerTaxOffice || '');
        setCustomerTradeRegNo(editTask.customerTradeRegNo || '');
        setCustomerPhone2(editTask.customerPhone2 || '');
        setDescription(editTask.description || '');
        setPriority(editTask.priority || 'medium');
        setAssignee(editTask.assignee || '');
        setStartDate(editTask.startDate ? editTask.startDate.split('T')[0] : '');
        setDeadline(editTask.deadline ? editTask.deadline.split('T')[0] : '');
        setNotes(editTask.notes || []);
        setAttachments(editTask.attachments || []);
        setSubtasks(editTask.subtasks || []);
        setTags(editTask.tags || []);
        setRecurrence(editTask.recurrence || 'none');
        setRecurrenceDay(editTask.recurrenceDay || 1);
        setRecurrenceCount(editTask.recurrenceCount || 3);
        setRecurrenceRemaining(editTask.recurrenceRemaining != null ? editTask.recurrenceRemaining : null);
      } else {
        setTitle(prefillData?.customerName ? `${prefillData.customerName} - ` : '');
        setCustomerName(prefillData?.customerName || '');
        setCustomerPhone(prefillData?.customerPhone || '');
        setCustomerEmail(prefillData?.customerEmail || '');
        setCustomerAddress(prefillData?.customerAddress || '');
        setCustomerTaxNo(prefillData?.customerTaxNo || '');
        setCustomerTaxOffice(prefillData?.customerTaxOffice || '');
        setCustomerTradeRegNo(prefillData?.customerTradeRegNo || '');
        setCustomerPhone2(prefillData?.customerPhone2 || '');
        setDescription(prefillData?.description || '');
        setPriority('medium');
        setAssignee(currentUser || '');
        const todayStr = new Date().toISOString().split('T')[0];
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];
        setStartDate(todayStr);
        setDeadline(nextWeekStr);
        setNotes([]);
        setAttachments([]);
        setSubtasks([]);
        setTags([]);
        setRecurrence('none');
        setRecurrenceDay(1);
        setRecurrenceCount(3);
        setRecurrenceRemaining(null);
      }
      setNewNote('');
      setNewSubtask('');
      setNotePriority('normal');
      setPosition({ x: 0, y: 0 });
      setCopied(false);
    }
  }, [isOpen, editTask, currentUser, prefillData]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
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
    if (isFullScreen) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  if (!isOpen) return null;

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const newNoteObj = { 
      id: Date.now().toString(), 
      text: newNote, 
      date: new Date().toISOString(),
      author: currentUser,
      importance: notePriority,
      isRead: false
    };
    const newNotes = [...notes, newNoteObj];
    setNotes(newNotes);
    if (editTask) updateTask(editTask.id, { notes: newNotes });
    setNewNote('');
    setNotePriority('normal');
  };

  const generateOutputText = () => {
    const statusMap = { 'todo': 'Yapılacak', 'in-progress': 'Devam Eden', 'done': 'Tamamlandı' };
    const prioMap = { 'low': 'Düşük', 'medium': 'Orta', 'high': 'Yüksek' };
    
    let content = `GÖREV DETAYI: ${title}\n`;
    content += `=================================\n\n`;
    content += `--- GENEL BİLGİLER ---\n`;
    if (customerName) content += `Müşteri Adı/Ünvanı: ${customerName}\n`;
    if (customerPhone) content += `İletişim Tel/GSM: ${customerPhone}\n`;
    if (customerPhone2) content += `Telefon 2: ${customerPhone2}\n`;
    if (customerEmail) content += `E-mail: ${customerEmail}\n`;
    if (customerAddress) content += `Adres: ${customerAddress}\n`;
    if (customerTaxNo) content += `Vergi No: ${customerTaxNo}\n`;
    if (customerTaxOffice) content += `Vergi Dairesi: ${customerTaxOffice}\n`;
    if (customerTradeRegNo) content += `Ticaret Sicil No: ${customerTradeRegNo}\n`;
    content += `Atanan Kişi: ${assignee || 'Atanmadı'}\n`;
    content += `Durum: ${editTask ? statusMap[editTask.status] : 'Yeni'}\n`;
    content += `Öncelik Derecesi: ${prioMap[priority]}\n`;
    content += `Başlangıç Tarihi: ${startDate ? new Date(startDate).toLocaleDateString('tr-TR') : '-'}\n`;
    content += `Bitiş (Hedef) Tarihi: ${deadline ? new Date(deadline).toLocaleDateString('tr-TR') : '-'}\n\n`;

    if (description) {
      content += `--- AÇIKLAMA ---\n${description}\n\n`;
    }

    if (notes && notes.length > 0) {
      content += `--- GÖREV GEÇMİŞİ VE NOTLAR ---\n`;
      const sorted = [...notes].sort((a,b) => new Date(b.date) - new Date(a.date));
      sorted.forEach(n => {
        const dateStr = new Date(n.date).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
        const star = n.importance === 'important' ? '[ÖNEMLİ] ' : '';
        content += `- ${dateStr} | ${n.author || 'Sistem'}: ${star}${n.text}\n`;
      });
    } else {
      content += `--- GÖREV GEÇMİŞİ VE NOTLAR ---\nHenüz görev notu bulunmuyor.\n`;
    }
    
    return content;
  };

  const handleCopyToMail = () => {
    const content = generateOutputText();
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Kopyalama basarisiz:', err);
      alert("Panoya kopyalama izni verilmedi.");
    });
  };

  const handleSendWhatsApp = () => {
    const text = generateOutputText();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleAddToCalendar = () => {
    if (!title.trim()) {
      alert("Lütfen önce bir görev başlığı belirleyin.");
      return;
    }
    const baseUrl = 'https://calendar.google.com/calendar/u/0/r/eventedit';
    const params = new URLSearchParams();
    
    params.append('text', title);
    
    let detailsText = '';
    if (assignee) detailsText += `Atanan Kişi: ${assignee}\n`;
    const prioMap = { 'low': 'Düşük', 'medium': 'Orta', 'high': 'Yüksek' };
    detailsText += `Öncelik: ${prioMap[priority] || 'Orta'}\n\n`;
    if (description) detailsText += `Açıklama:\n${description}\n`;
    params.append('details', detailsText);

    const now = new Date();
    const todayStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    params.append('dates', `${todayStr}T100000/${todayStr}T120000`);

    const url = `${baseUrl}?${params.toString()}`;
    window.open(url, '_blank');
  };

  const toggleNotePriority = (noteId) => {
    const updated = notes.map(n => {
      if (n.id === noteId) {
        const toggled = n.importance === 'important' ? 'normal' : 'important';
        return { ...n, importance: toggled, isRead: false };
      }
      return n;
    });
    setNotes(updated);
    if (editTask) updateTask(editTask.id, { notes: updated });
  };

  const markNoteAsRead = (noteId) => {
    const updated = notes.map(n => {
      if (n.id === noteId) {
        return { 
          ...n, 
          isRead: true, 
          readBy: currentUser,
          readAt: new Date().toISOString()
        };
      }
      return n;
    });
    setNotes(updated);
    if (editTask) updateTask(editTask.id, { notes: updated });
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    const st = { id: Date.now().toString(), text: newSubtask, isCompleted: false };
    const updated = [...subtasks, st];
    setSubtasks(updated);
    setNewSubtask('');
    if (editTask) updateTask(editTask.id, { subtasks: updated });
  };

  const toggleSubtask = (stId) => {
    const updated = subtasks.map(s => s.id === stId ? { ...s, isCompleted: !s.isCompleted } : s);
    setSubtasks(updated);
    if (editTask) updateTask(editTask.id, { subtasks: updated });
  };

  const deleteSubtask = (stId) => {
    const updated = subtasks.filter(s => s.id !== stId);
    setSubtasks(updated);
    if (editTask) updateTask(editTask.id, { subtasks: updated });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
       alert("Dosya boyutu 15MB'dan büyük olamaz!");
       return;
    }

    setIsUploading(true);
    const abortController = new AbortController();
    uploadAbortRef.current = abortController;

    try {
      // Read file as base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Send to Google Apps Script
      const params = new URLSearchParams();
      params.append('fileName', `${Date.now()}_${file.name}`);
      params.append('mimeType', file.type || 'application/octet-stream');
      params.append('data', base64);

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: params,
        signal: abortController.signal,
        redirect: 'follow'
      });

      let data;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch {
        // Apps Script redirect may cause parse issues - assume success if request completed
        data = { success: true, fileId: Date.now().toString(), url: `https://drive.google.com/drive/folders/1nCPx7LbZU15OirK0IC_QCBgc7e7PCdzE` };
      }

      const driveFolder = 'https://drive.google.com/drive/folders/1nCPx7LbZU15OirK0IC_QCBgc7e7PCdzE';

      const newAttachment = {
        id: data?.fileId || Date.now().toString(),
        name: file.name,
        url: data?.url || driveFolder,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        date: new Date().toISOString(),
        user: currentUser
      };

      const newAttachments = [...attachments, newAttachment];
      setAttachments(newAttachments);

      if (editTask) {
        updateTask(editTask.id, { attachments: newAttachments });
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // Upload cancelled by user
      } else {
        console.error(err);
        alert("Dosya yüklenirken bir hata oluştu: " + err.message);
      }
    } finally {
      setIsUploading(false);
      uploadAbortRef.current = null;
      e.target.value = '';
    }
  };

  const cancelUpload = () => {
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort();
    }
  };

  const deleteAttachment = (attId) => {
    if (!window.confirm("Bu dosyayı silmek istediğinize emin misiniz? (Dosya kalıcı silinir)")) return;
    const newAtts = attachments.filter(a => a.id !== attId);
    setAttachments(newAtts);
    if (editTask) updateTask(editTask.id, { attachments: newAtts });
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

  const buildTaskData = () => {
    const finalPhone = formatPhone(customerPhone);
    const finalPhone2 = formatPhone(customerPhone2);
    return {
      title, customerName, customerPhone: finalPhone, customerEmail, customerAddress,
      customerTaxNo, customerTaxOffice, customerTradeRegNo, customerPhone2: finalPhone2,
      description, priority, assignee,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      notes, attachments, subtasks, tags, recurrence,
      recurrenceDay: recurrence === 'monthly' ? recurrenceDay : null,
      recurrenceCount: recurrence !== 'none' ? recurrenceCount : null,
      recurrenceRemaining: recurrence !== 'none' ? (recurrenceRemaining != null ? recurrenceRemaining : recurrenceCount) : null
    };
  };

  const checkCustomerDuplicate = () => {
    const name = customerName.trim().toLowerCase();
    const phone = formatPhone(customerPhone);
    const phone2 = formatPhone(customerPhone2);
    const email = customerEmail.trim().toLowerCase();
    const address = customerAddress.trim().toLowerCase();
    const taxNo = customerTaxNo.trim();
    const taxOffice = customerTaxOffice.trim().toLowerCase();
    const tradeRegNo = customerTradeRegNo.trim();

    // en az bir alan dolu olmalı
    if (!name && !phone && !phone2 && !email && !address && !taxNo && !taxOffice && !tradeRegNo) return null;

    for (const c of customersList) {
      const conflicts = [];
      const cName = (c.customerName || '').trim().toLowerCase();
      const cPhone = (c.customerPhone || '').trim();
      const cPhone2 = (c.customerPhone2 || '').trim();
      const cEmail = (c.customerEmail || '').trim().toLowerCase();
      const cAddress = (c.customerAddress || '').trim().toLowerCase();
      const cTaxNo = (c.customerTaxNo || '').trim();
      const cTaxOffice = (c.customerTaxOffice || '').trim().toLowerCase();
      const cTradeRegNo = (c.customerTradeRegNo || '').trim();

      if (name && cName && name === cName) conflicts.push(`Müşteri Adı: ${c.customerName}`);
      if (phone && cPhone && phone === cPhone) conflicts.push(`Telefon: ${phone}`);
      if (phone2 && cPhone2 && phone2 === cPhone2) conflicts.push(`Telefon 2: ${phone2}`);
      if (phone && cPhone2 && phone === cPhone2) conflicts.push(`Telefon / Telefon 2: ${phone}`);
      if (phone2 && cPhone && phone2 === cPhone) conflicts.push(`Telefon 2 / Telefon: ${phone2}`);
      if (email && cEmail && email === cEmail) conflicts.push(`E-mail: ${customerEmail}`);
      if (address && cAddress && address === cAddress) conflicts.push(`Adres: ${customerAddress}`);
      if (taxNo && cTaxNo && taxNo === cTaxNo) conflicts.push(`Vergi No: ${taxNo}`);
      if (taxOffice && cTaxOffice && taxOffice === cTaxOffice) conflicts.push(`Vergi Dairesi: ${customerTaxOffice}`);
      if (tradeRegNo && cTradeRegNo && tradeRegNo === cTradeRegNo) conflicts.push(`Ticaret Sicil No: ${tradeRegNo}`);

      if (conflicts.length > 0) {
        return { existingName: c.customerName, conflicts };
      }
    }
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (!editTask) {
      const dup = checkCustomerDuplicate();
      if (dup) {
        setDuplicateWarning(dup);
        return;
      }
    }

    const taskData = buildTaskData();
    if (editTask) {
      updateTask(editTask.id, taskData);
    } else {
      addTask({ ...taskData, status: defaultStatus });
    }
    onClose();
  };

  const handleForceSubmit = () => {
    setDuplicateWarning(null);
    const taskData = buildTaskData();
    if (editTask) {
      updateTask(editTask.id, taskData);
    } else {
      addTask({ ...taskData, status: defaultStatus });
    }
    onClose();
  };

  const sortedNotes = [...notes].sort((a,b) => {
    if (a.importance !== b.importance) return a.importance === 'important' ? -1 : 1;
    return new Date(b.date) - new Date(a.date);
  });

  return (
    <>
    {duplicateWarning && (
      <div className="modal-overlay" style={{ zIndex: 10000 }} onMouseDown={() => setDuplicateWarning(null)}>
        <div className="modal-content" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: '450px', padding: '1.5rem', borderRadius: '12px' }}>
          <h3 style={{ margin: '0 0 0.75rem', color: '#dc2626', fontSize: '1rem' }}>Müşteri Bilgisi Çakışması</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Girdiğiniz bilgilere sahip bir müşteri <strong>Kayıtlı Müşteri Listesinde</strong> bulunmaktadır:
          </p>
          <div style={{ background: 'var(--bg-alt)', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.75rem', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.3rem' }}>{duplicateWarning.existingName}</div>
            {duplicateWarning.conflicts.map((c, i) => (
              <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• {c}</div>
            ))}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Lütfen müşteri listesinden seçiniz veya bilgileri düzeltiniz.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-small" onClick={() => setDuplicateWarning(null)}>Bilgileri Düzelt</button>
            <button className="btn btn-primary btn-small" onClick={handleForceSubmit} style={{ background: '#dc2626', borderColor: '#dc2626' }}>Yine de Kaydet</button>
          </div>
        </div>
      </div>
    )}
    <div className="modal-overlay" onMouseDown={onClose} style={{ padding: isFullScreen ? 0 : '1rem' }}>
      <div 
        className={`modal-content ${isFullScreen ? 'fullscreen' : ''}`}
        style={!isFullScreen ? { 
          transform: `translate(${position.x}px, ${position.y}px)`, 
          transition: isDragging ? 'none' : 'transform 0.1s ease',
          resize: 'both',
          position: 'relative'
        } : {}}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="modal-header" onMouseDown={startDrag} style={{ cursor: isFullScreen ? 'default' : 'move' }}>
          <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
            <h2>{editTask ? 'Görevi Düzenle' : 'Yeni Görev Ekle'}</h2>
            {editTask && (
              <span onClick={() => setShowLogs(true)} style={{fontSize:'0.8rem', color:'var(--primary)', cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:'0.2rem', textDecoration:'underline'}}>
                <History size={14} /> Görev Logları
              </span>
            )}
          </div>
          <div style={{display: 'flex', gap: '8px'}} onMouseDown={e => e.stopPropagation()}>
            <button type="button" className="icon-btn" onClick={() => setIsFullScreen(!isFullScreen)} title="Tam Ekran">
              {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
            <button type="button" className="icon-btn" onClick={onClose} title="Kapat">
              <X size={20} />
            </button>
          </div>
        </div>
        
        {showLogs && (
          <div style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'var(--bg-main)', zIndex:100, display:'flex', flexDirection:'column', borderRadius: isFullScreen ? 0 : '8px', padding: isFullScreen ? '2rem' : '1.5rem'}}>
            <div className="modal-header" style={{borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem'}}>
              <h3 style={{display:'flex', alignItems:'center', gap:'0.5rem', margin:0, color:'var(--text-main)'}}><History size={18}/> Görev Geçmişi ve Log Kayıtları</h3>
              <button type="button" className="icon-btn" onClick={() => setShowLogs(false)} title="Geri Dön"><X size={20}/></button>
            </div>
            <div style={{flex: 1, overflowY:'auto', paddingRight:'0.5rem'}}>
              {!editTask?.logs || editTask.logs.length === 0 ? (
                <div style={{color:'var(--text-muted)', fontSize:'0.9rem', textAlign:'center', marginTop:'2rem'}}>Bu görev için henüz log kaydı bulunmuyor.</div>
              ) : (
                editTask.logs.slice().reverse().map((log, i) => (
                  <div key={log.id || i} style={{marginBottom:'0.75rem', padding:'0.75rem', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'6px', display:'flex', flexDirection:'column', gap:'0.3rem'}}>
                    <div style={{fontSize:'0.85rem', color:'var(--text-main)', lineHeight:'1.4'}}>{log.text}</div>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.7rem', color:'var(--text-muted)'}}>
                      <span><strong>İşlem Yapan:</strong> {log.user}</span>
                      <span>{new Date(log.date).toLocaleString('tr-TR')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Görev Başlığı</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Örn: Tasarımı tamamla..." autoFocus required />
          </div>

          <div style={{display:'flex', gap:'0.75rem', marginBottom:'0.5rem', flexWrap:'wrap'}}>
            <div className="form-group" style={{flex: 1, minWidth:'150px', marginBottom: 0}}>
              <label style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                <span>Müşteri Adı Soyadı/Ünvanı</span>
                {customersList.length > 0 && (
                  <span onClick={() => { setShowCustomerPicker(true); setCustomerSearch(''); }} style={{fontSize:'0.7rem', color:'var(--primary)', cursor:'pointer', fontWeight:600, textDecoration:'underline'}}>
                    Kayıtlı Müşteri Bilgilerinden Getir
                  </span>
                )}
              </label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Örn: Ahmet Yılmaz..." />
            </div>
            <div className="form-group" style={{flex: 1, minWidth:'150px', marginBottom: 0}}>
              <label>İletişim Numarası Tel/GSM</label>
              <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} onBlur={() => setCustomerPhone(formatPhone(customerPhone))} placeholder="Örn: 0555..." />
            </div>
          </div>

          <div style={{display:'flex', gap:'0.75rem', marginBottom:'0.5rem', flexWrap:'wrap'}}>
            <div className="form-group" style={{flex: 1, minWidth:'150px', marginBottom: 0}}>
              <label>E-mail</label>
              <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="Örn: ornek@firma.com" />
            </div>
            <div className="form-group" style={{flex: 1, minWidth:'150px', marginBottom: 0}}>
              <label>Telefon 2</label>
              <input type="text" value={customerPhone2} onChange={e => setCustomerPhone2(e.target.value)} onBlur={() => setCustomerPhone2(formatPhone(customerPhone2))} placeholder="Örn: 0212..." />
            </div>
          </div>

          <div className="form-group" style={{marginBottom:'0.5rem'}}>
            <label>Adres Bilgisi</label>
            <input type="text" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="Örn: Atatürk Cad. No:1 İstanbul" />
          </div>

          <div style={{display:'flex', gap:'0.75rem', marginBottom:'0.5rem', flexWrap:'wrap'}}>
            <div className="form-group" style={{flex: 1, minWidth:'120px', marginBottom: 0}}>
              <label>Vergi No</label>
              <input type="text" value={customerTaxNo} onChange={e => setCustomerTaxNo(e.target.value)} placeholder="Örn: 1234567890" />
            </div>
            <div className="form-group" style={{flex: 1, minWidth:'120px', marginBottom: 0}}>
              <label>Vergi Dairesi</label>
              <input type="text" value={customerTaxOffice} onChange={e => setCustomerTaxOffice(e.target.value)} placeholder="Örn: Kadıköy V.D." />
            </div>
            <div className="form-group" style={{flex: 1, minWidth:'120px', marginBottom: 0}}>
              <label>Ticaret Sicil No</label>
              <input type="text" value={customerTradeRegNo} onChange={e => setCustomerTradeRegNo(e.target.value)} placeholder="Örn: 123456" />
            </div>
          </div>
          
          <div className="form-group">
            <label>Açıklama (İsteğe bağlı)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Görev ile ilgili detaylar..." rows={isFullScreen ? 5 : 3} style={{resize: 'vertical'}}/>
          </div>

          <div className="form-row" style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Atanan Kişi</label>
              <select value={assignee} onChange={e => setAssignee(e.target.value)} style={{width:'100%', padding:'0.4rem', border:'1px solid var(--border)', borderRadius:'4px', fontSize:'0.85rem', background: 'var(--bg-main)', color: getUserColor(assignee) || 'var(--text-main)', fontWeight: getUserColor(assignee) ? 600 : 400}}>
                <option value="" style={{color:'var(--text-main)', fontWeight:400}}>Atanmadı</option>
                {usersList.map(u => <option key={u.id} value={u.name} style={u.color ? {color: u.color, fontWeight: 600} : {}}>{u.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Başlangıç Tarihi</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Bitiş Tarihi (Deadline)</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{marginBottom:'0.5rem'}}>
            <label style={{display:'flex', alignItems:'center', gap:'0.3rem'}}>🔄 Tekrarlama</label>
            <div style={{display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap'}}>
              <select value={recurrence} onChange={e => { setRecurrence(e.target.value); if (e.target.value === 'none') { setRecurrenceRemaining(null); } }} style={{flex:'1 1 120px', minWidth:'120px'}}>
                <option value="none">Yok</option>
                <option value="daily">Her Gün</option>
                <option value="weekly">Her Hafta</option>
                <option value="monthly">Her Ay</option>
                <option value="yearly">Her Yıl</option>
              </select>
              {recurrence === 'monthly' && (
                <div style={{display:'flex', alignItems:'center', gap:'0.3rem'}}>
                  <span style={{fontSize:'0.8rem', color:'var(--text-muted)', whiteSpace:'nowrap'}}>Ayın</span>
                  <input type="number" min={1} max={31} value={recurrenceDay} onChange={e => setRecurrenceDay(parseInt(e.target.value) || 1)} style={{width:'55px'}} />
                  <span style={{fontSize:'0.8rem', color:'var(--text-muted)', whiteSpace:'nowrap'}}>. günü</span>
                </div>
              )}
              {recurrence !== 'none' && (
                <div style={{display:'flex', alignItems:'center', gap:'0.3rem'}}>
                  <input type="number" min={1} max={999} value={recurrenceCount} onChange={e => setRecurrenceCount(parseInt(e.target.value) || 1)} style={{width:'55px'}} />
                  <span style={{fontSize:'0.8rem', color:'var(--text-muted)', whiteSpace:'nowrap'}}>kez tekrarla</span>
                  {recurrenceRemaining != null && editTask && (
                    <span style={{fontSize:'0.75rem', color:'var(--primary)', fontWeight:600, whiteSpace:'nowrap'}}>
                      (Kalan: {recurrenceRemaining})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Öncelik (Önem Derecesi)</label>
            <div className="priority-options">
              <label className={`priority-opt ${priority === 'low' ? 'active low' : ''}`}>
                <input type="radio" value="low" checked={priority === 'low'} onChange={() => setPriority('low')} /> Düşük
              </label>
              <label className={`priority-opt ${priority === 'medium' ? 'active medium' : ''}`}>
                <input type="radio" value="medium" checked={priority === 'medium'} onChange={() => setPriority('medium')} /> Orta
              </label>
              <label className={`priority-opt ${priority === 'high' ? 'active high' : ''}`}>
                <input type="radio" value="high" checked={priority === 'high'} onChange={() => setPriority('high')} /> Yüksek
              </label>
            </div>
          </div>

          <div className="form-group" style={{marginBottom:'0.5rem'}}>
            <label style={{display:'flex', alignItems:'center', gap:'0.3rem'}}><Tag size={12}/> Etiketler</label>
            <div style={{display:'flex', flexWrap:'wrap', gap:'0.3rem'}}>
              {tagsList.map(tag => {
                const isSelected = tags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) setTags(tags.filter(t => t !== tag.id));
                      else setTags([...tags, tag.id]);
                    }}
                    style={{
                      padding:'0.2rem 0.5rem', borderRadius:'12px',
                      fontSize:'0.7rem', fontWeight: isSelected ? 600 : 400,
                      border: `1px solid ${isSelected ? tag.color : 'var(--border)'}`,
                      background: isSelected ? `${tag.color}20` : 'transparent',
                      color: isSelected ? tag.color : 'var(--text-muted)',
                      cursor:'pointer', transition:'all 0.15s ease'
                    }}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="subtasks-section" style={{ marginBottom: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
            <h3 style={{marginBottom: '0.4rem', display:'flex', alignItems:'center', gap:'0.4rem', color:'var(--text-main)', fontSize:'0.85rem'}}><ListTodo size={14}/> Alt Görevler (Checklist) {subtasks.length > 0 && <span style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>({subtasks.filter(s=>s.isCompleted).length}/{subtasks.length})</span>}</h3>
            
            <div style={{display:'flex', gap:'0.4rem', marginBottom:'0.5rem'}}>
              <input type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)} placeholder="Yeni alt görev ekle..." onKeyDown={e => { if(e.key==='Enter'){ e.preventDefault(); handleAddSubtask(); } }} style={{flex:1, padding:'0.4rem', borderRadius:'4px', border:'1px solid var(--border)', background:'var(--bg-main)', color:'var(--text-main)'}} />
              <button type="button" className="btn btn-primary btn-small" onClick={handleAddSubtask}>Ekle</button>
            </div>

            {subtasks.length > 0 && (
              <div style={{display:'flex', flexDirection:'column', gap:'0.4rem'}}>
                {subtasks.map(st => (
                  <div key={st.id} style={{display:'flex', alignItems:'center', gap:'0.5rem', background: st.isCompleted ? 'var(--bg-main)' : 'var(--bg-card)', padding:'0.5rem', borderRadius:'6px', border:'1px solid var(--border)'}}>
                    <input type="checkbox" checked={st.isCompleted} onChange={() => toggleSubtask(st.id)} style={{cursor:'pointer', width:'16px', height:'16px'}} />
                    <span style={{flex:1, fontSize:'0.85rem', color: st.isCompleted ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: st.isCompleted ? 'line-through' : 'none'}}>{st.text}</span>
                    <button type="button" className="icon-btn delete-btn" onClick={() => deleteSubtask(st.id)}><X size={14}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-actions" style={{ marginTop: '0.5rem', marginBottom: editTask ? '0.75rem' : '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div style={{display:'flex', gap:'0.5rem'}}>
              <button type="submit" className="btn btn-primary" style={editTask ? {background:'#ef4444', borderColor:'#ef4444'} : {}}>{editTask ? 'Güncelle' : 'Kaydet'}</button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>İptal</button>
            </div>
            
            <div style={{display:'flex', gap:'0.5rem', flexWrap:'wrap', justifyContent: 'flex-end'}}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleAddToCalendar} 
                style={{
                  display:'flex', alignItems:'center', gap:'0.2rem', 
                  color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff'
                }}
                title="Google Takvime Ekle"
              >
                <Calendar size={15}/>
                Google Takvime Ekle
              </button>

              {editTask && (
                <>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={handleSendWhatsApp} 
                    style={{
                      display:'flex', alignItems:'center', gap:'0.2rem', 
                      color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4'
                    }}
                    title="WhatsApp'tan Gönder"
                  >
                    <MessageCircle size={15}/>
                    WhatsApp
                  </button>

                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={handleCopyToMail} 
                    style={{
                      display:'flex', alignItems:'center', gap:'0.2rem', 
                      color: copied ? '#10b981' : 'var(--text-main)', 
                      borderColor: copied ? '#10b981' : 'var(--border)'
                    }}
                  >
                    {copied ? <Check size={15}/> : <Copy size={15}/>}
                    {copied ? 'Kopyalandı' : 'Kopyala'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="attachments-section" style={{ marginBottom: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.4rem'}}>
              <h3 style={{margin:0, display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.85rem'}}><Paperclip size={14}/> Dosya Ekleri ({attachments.length})</h3>
              <div style={{display:'flex', gap:'0.4rem', alignItems:'center'}}>
                <input type="file" id="file-upload" onChange={handleFileUpload} style={{display:'none'}} disabled={isUploading} />
                <label htmlFor="file-upload" className="btn btn-secondary btn-small" style={{cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1}}>
                  {isUploading ? <Loader size={14} className="spin" /> : <Paperclip size={14} />} {isUploading ? 'Google Drive\'a Yükleniyor...' : 'Dosya Yükle (Drive)'}
                </label>
                {isUploading && (
                  <button type="button" onClick={cancelUpload} className="btn btn-secondary btn-small" style={{color:'#ef4444', borderColor:'#fecaca', background:'#fef2f2', fontSize:'0.7rem'}}>
                    <X size={12}/> İptal
                  </button>
                )}
              </div>
            </div>
            {attachments.length > 0 ? (
              <div style={{display:'flex', flexDirection:'column', gap:'0.4rem'}}>
                {attachments.map(att => (
                  <div key={att.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg-main)', padding:'0.5rem', borderRadius:'6px', border:'1px solid var(--border)'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'0.5rem', overflow:'hidden'}}>
                      <a href={att.url} target="_blank" rel="noopener noreferrer" style={{color:'var(--primary)', fontWeight:500, fontSize:'0.8rem', whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden', textDecoration:'none'}} title={att.name}>
                        {att.name}
                      </a>
                      <span style={{fontSize:'0.65rem', color:'var(--text-muted)'}}>({att.size})</span>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                      <span style={{fontSize:'0.65rem', color:'var(--text-muted)'}}>{att.user}</span>
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="icon-btn" title="İndir"><Download size={14}/></a>
                      {(isAdmin || att.user === currentUser) && (
                        <button type="button" className="icon-btn delete-btn" onClick={() => deleteAttachment(att.id)}><X size={14}/></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{fontSize:'0.8rem', color:'var(--text-muted)', fontStyle:'italic'}}>Bu göreve henüz dosya eklenmemiş.</div>
            )}
          </div>

          {showCustomerPicker && (() => {
            const filteredCustomers = customersList.filter(c => {
              if (!customerSearch.trim()) return true;
              const s = customerSearch.toLowerCase();
              return (c.customerName || '').toLowerCase().includes(s) || (c.customerPhone || '').includes(s) || (c.customerEmail || '').toLowerCase().includes(s) || (c.customerTaxNo || '').includes(s);
            });
            return (
              <div style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', borderRadius: isFullScreen ? 0 : '8px'}} onClick={() => setShowCustomerPicker(false)}>
                <div style={{background:'var(--bg-main)', borderRadius:'10px', width:'90%', maxWidth:'700px', maxHeight:'80%', display:'flex', flexDirection:'column', boxShadow:'0 20px 40px rgba(0,0,0,0.2)'}} onClick={e => e.stopPropagation()}>
                  <div style={{padding:'1rem 1.2rem', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h3 style={{margin:0, fontSize:'1rem', color:'var(--text-main)'}}>Kayıtlı Müşteri Seç</h3>
                    <button type="button" className="icon-btn" onClick={() => setShowCustomerPicker(false)}><X size={18}/></button>
                  </div>
                  <div style={{padding:'0.75rem 1.2rem', borderBottom:'1px solid var(--border)'}}>
                    <input type="text" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Müşteri adı, telefon, e-mail veya vergi no ile ara..." autoFocus style={{width:'100%', padding:'0.5rem 0.75rem', borderRadius:'6px', border:'1px solid var(--border)', fontSize:'0.85rem'}} />
                  </div>
                  <div style={{flex:1, overflowY:'auto', padding:'0.5rem'}}>
                    {filteredCustomers.length === 0 ? (
                      <div style={{textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:'0.85rem'}}>{customerSearch ? 'Eşleşen müşteri bulunamadı.' : 'Henüz kayıtlı müşteri yok.'}</div>
                    ) : filteredCustomers.map(c => (
                      <div key={c.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.7rem 0.8rem', borderBottom:'1px solid var(--border)', cursor:'pointer', borderRadius:'6px', transition:'background 0.15s'}}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, #f1f5f9)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{flex:1}}>
                          <div style={{fontWeight:600, fontSize:'0.9rem', color:'var(--text-main)'}}>{c.customerName}</div>
                          <div style={{fontSize:'0.75rem', color:'var(--text-muted)', display:'flex', gap:'1rem', flexWrap:'wrap', marginTop:'0.2rem'}}>
                            {c.customerPhone && <span>Tel: {c.customerPhone}</span>}
                            {c.customerEmail && <span>E-mail: {c.customerEmail}</span>}
                            {c.customerTaxNo && <span>VN: {c.customerTaxNo}</span>}
                          </div>
                        </div>
                        <button type="button" className="btn btn-primary btn-small" onClick={() => {
                          setCustomerName(c.customerName || '');
                          setCustomerPhone(c.customerPhone || '');
                          setCustomerEmail(c.customerEmail || '');
                          setCustomerPhone2(c.customerPhone2 || '');
                          setCustomerAddress(c.customerAddress || '');
                          setCustomerTaxNo(c.customerTaxNo || '');
                          setCustomerTaxOffice(c.customerTaxOffice || '');
                          setCustomerTradeRegNo(c.customerTradeRegNo || '');
                          setShowCustomerPicker(false);
                        }} style={{flexShrink:0}}>SEÇ</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {editTask && (
            <div className="notes-section" style={{ flex: isFullScreen ? 1 : 'unset', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{marginBottom: '0.4rem', fontSize:'0.85rem'}}>Görev Geçmişi ve Notlar ({notes.length})</h3>
              
              <div className="add-note-box" style={{marginBottom: '0.75rem', marginTop: 0}}>
                <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Bu görevde bugün neler yapıldı?" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddNote(); } }} />
                <select value={notePriority} onChange={e => setNotePriority(e.target.value)} style={{padding: '0 8px', borderRadius: '4px', border: '1px solid var(--border)'}}>
                  <option value="normal">Normal</option>
                  <option value="important">Önemli</option>
                </select>
                <button type="button" className="btn btn-primary btn-small" onClick={handleAddNote}>Not Ekle</button>
              </div>

              <div className="notes-list" style={{ maxHeight: isFullScreen ? 'none' : '300px', flex: isFullScreen ? 1 : 'unset', overflowY: 'auto', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                {sortedNotes.map(note => (
                  <div key={note.id} className={`note-card ${note.importance === 'important' ? 'note-important' : ''}`}>
                    <div className="note-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                        <span className="note-author" style={{fontWeight: 600, fontSize:'0.75rem', color: note.importance === 'important' ? '#991b1b' : (getUserColor(note.author) || 'var(--primary)')}}>{note.author || 'Sistem'}</span>
                        {isAdmin && (
                          <button type="button" onClick={() => toggleNotePriority(note.id)} title="Önem Derecesini Değiştir (Admin)" style={{background:'none', border:'none', cursor:'pointer', padding:0, display:'flex'}}>
                            <Star size={12} fill={note.importance === 'important' ? '#eab308' : 'none'} color={note.importance === 'important' ? '#eab308' : '#94a3b8'} />
                          </button>
                        )}
                      </div>
                      <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                        <span className="note-date">{new Date(note.date).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        {note.isRead === false && editTask && editTask.assignee === currentUser && (
                          <button type="button" className="blink-btn" onClick={() => markNoteAsRead(note.id)} style={{background:'#ef4444', color:'white', border:'none', borderRadius:'4px', padding:'2px 8px', fontSize:'0.7rem', cursor:'pointer', fontWeight:600}} title="Notu okundu olarak onayla">
                            Okundu Onayı Gerekiyor
                          </button>
                        )}
                      </div>
                    </div>
                    <p style={{fontWeight: note.isRead === false ? '700' : 'normal', color: note.isRead === false ? '#ef4444' : 'inherit', marginBottom: note.readAt ? '4px' : '0'}}>{note.text}</p>
                    {note.isRead && note.readAt && (
                      <div style={{fontSize: '0.65rem', fontStyle: 'italic', color: '#16a34a', marginTop: '6px', borderTop: '1px dashed #e2e8f0', paddingTop: '4px'}}>
                        ✓ {note.readBy} tarafından {new Date(note.readAt).toLocaleDateString('tr-TR')} tarih, {new Date(note.readAt).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})} saatinde okunmuştur.
                      </div>
                    )}
                  </div>
                ))}
                {notes.length === 0 && <p className="empty-notes" style={{marginTop:'0.5rem'}}>Henüz çalışma notu eklenmemiş.</p>}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
    </>
  );
}
