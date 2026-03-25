import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTasks } from '../context/TaskContext';
import { Plus, Edit2, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Filter, Calendar, MessageCircle } from 'lucide-react';
import TaskModal from './TaskModal';

const STATUSES = [
  { id: 'todo', title: 'Yapılacak' },
  { id: 'in-progress', title: 'Devam Eden' },
  { id: 'done', title: 'Tamamlandı' }
];

const priorityValue = { 'low': 1, 'medium': 2, 'high': 3 };

const TaskTitleCell = ({ task, onEdit }) => {
  const { tagsList } = useTasks();
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const unreadNotesCount = task.notes?.filter(n => n.isRead === false)?.length || 0;

  const handleMouseEnter = (e) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (showTooltip) return;
    
    const x = e.clientX;
    const y = e.clientY;
    showTimerRef.current = setTimeout(() => {
      setTooltipPos({ x, y });
      setShowTooltip(true);
    }, 1000);
  };

  const handleMouseLeave = () => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 300);
  };

  const handleTooltipEnter = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  const handleTooltipLeave = () => {
    hideTimerRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 300);
  };

  useEffect(() => {
    return () => { 
      if (showTimerRef.current) clearTimeout(showTimerRef.current); 
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current); 
    };
  }, []);

  const sortedNotes = useMemo(() => {
    if (!task.notes) return [];
    return [...task.notes].sort((a,b) => {
      if (a.importance !== b.importance) return a.importance === 'important' ? -1 : 1;
      return new Date(b.date) - new Date(a.date);
    });
  }, [task.notes]);

  const isDone = task.status === 'done';
  let daysLeft = null;
  if (!isDone && task.deadline) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const dlDate = new Date(task.deadline);
    dlDate.setHours(0,0,0,0);
    daysLeft = Math.ceil((dlDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <td 
      className="cell-title" 
      onClick={() => { handleMouseLeave(); onEdit(task); }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={{display:'inline-flex', alignItems: 'center', flexWrap:'wrap', gap:'6px'}}>
        <span>{task.title}</span>
        {task.recurrence && task.recurrence !== 'none' && (
          <span title={{'daily':'Her Gün','weekly':'Her Hafta','monthly':'Her Ay','yearly':'Her Yıl'}[task.recurrence]} style={{fontSize:'0.75rem', cursor:'default'}}>🔄</span>
        )}
        {task.isNewForAssignee && (
          <span className="new-badge" style={{margin:0}}>⭐️ Yeni Görev</span>
        )}
        {unreadNotesCount > 0 && (
          <span className="new-badge" style={{background:'#eff6ff', color:'#2563eb', borderColor:'#bfdbfe', margin:0, padding:'0.15rem 0.4rem'}}>
            💬 {unreadNotesCount} Yeni Not
          </span>
        )}
        {daysLeft !== null && daysLeft <= 3 && (
          <span style={{color: '#ef4444', fontSize: '0.65rem', fontWeight: 600, marginLeft: '0.3rem'}}>
            (Son {daysLeft < 0 ? `gecikme: ${Math.abs(daysLeft)} gün` : daysLeft === 0 ? 'gün!' : `${daysLeft} gün`}) ⚠️
          </span>
        )}
        {daysLeft !== null && daysLeft > 3 && (
          <span style={{color: 'var(--text-muted)', fontSize: '0.6rem', fontWeight: 400, marginLeft: '0.3rem'}}>
            ({daysLeft} gün kaldı)
          </span>
        )}
        {task.tags && task.tags.length > 0 && task.tags.map(tagId => {
          const tagObj = tagsList.find(t => t.id === tagId);
          if (!tagObj) return null;
          return (
            <span key={tagId} style={{ fontSize:'0.55rem', padding:'0.1rem 0.3rem', borderRadius:'8px', background:`${tagObj.color}18`, color: tagObj.color, fontWeight:500, border:`1px solid ${tagObj.color}40` }}>
              {tagObj.label}
            </span>
          );
        })}
      </div>
      {showTooltip && (
        <div 
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
          style={{
          position: 'fixed',
          top: Math.min(tooltipPos.y + 15, window.innerHeight - 300),
          left: Math.min(tooltipPos.x + 15, window.innerWidth - 300),
          background: 'var(--bg-main)',
          border: '1px solid var(--border)',
          padding: '1rem',
          borderRadius: '6px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
          zIndex: 99999,
          width: '280px',
          maxHeight: '260px',
          overflowY: 'auto',
          fontSize: '0.85rem',
          pointerEvents: 'auto',
          color: 'var(--text-main)',
          cursor: 'default',
          whiteSpace: 'normal',
          lineHeight: '1.4'
        }}>
          <h4 style={{marginBottom: '0.5rem', fontSize:'0.9rem', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '4px'}}>
            Görev Notları ({task.notes?.length || 0})
          </h4>
          {sortedNotes.length > 0 ? (
            <div style={{display:'flex', flexDirection:'column', gap:'0.6rem'}}>
              {sortedNotes.map(n => (
                <div key={n.id} style={{borderBottom: '1px dotted #cbd5e1', paddingBottom: '0.4rem'}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:'2px'}}>
                    <span style={{fontWeight:600, color: n.importance === 'important' ? '#991b1b' : 'var(--text-main)', fontSize:'0.75rem'}}>
                      {n.importance === 'important' && '⭐ '}{n.author}
                    </span>
                    <span style={{fontSize:'0.65rem', color:'var(--text-muted)'}}>
                      {new Date(n.date).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  <div style={{color: n.isRead === false ? '#ef4444' : 'var(--text-main)', fontWeight: n.isRead === false ? '700' : 'normal'}}>{n.text}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{color:'var(--text-muted)', fontStyle:'italic'}}>Henüz not eklenmemiş.</div>
          )}

          {task.subtasks && task.subtasks.length > 0 && (
            <>
              <h4 style={{marginTop:'0.75rem', marginBottom:'0.4rem', fontSize:'0.85rem', color:'var(--primary)', borderBottom:'1px solid var(--border)', paddingBottom:'4px'}}>
                Alt Görevler ({task.subtasks.filter(s=>s.isCompleted).length}/{task.subtasks.length})
              </h4>
              <div style={{display:'flex', flexDirection:'column', gap:'0.3rem'}}>
                {task.subtasks.map(st => (
                  <div key={st.id} style={{display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.8rem'}}>
                    <span style={{color: st.isCompleted ? '#10b981' : '#ef4444'}}>{st.isCompleted ? '✓' : '○'}</span>
                    <span style={{color: st.isCompleted ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: st.isCompleted ? 'line-through' : 'none'}}>{st.text}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </td>
  );
};

function TaskTable({ title, tasksList, onEdit, onDelete, onStatusChange, usersList, isAdmin, currentUser, updateTask, getUserColor, headerExtra, showCheckboxes, tagsList }) {
  const [sortCol, setSortCol] = useState('deadline');
  const [sortDir, setSortDir] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: [], priority: [], assignee: [], tags: [], dateStart: '', dateEnd: '' });
  const [selectedIds, setSelectedIds] = useState(new Set());

  const handleBulkCalendar = () => {
    const selected = filteredAndSorted.filter(t => selectedIds.has(t.id));
    if (selected.length === 0) { alert('Lütfen gönderilmesini istediğiniz görevleri seçiniz.'); return; }
    const statusMap = { 'todo': 'Yapılacak', 'in-progress': 'Devam Eden', 'done': 'Tamamlandı' };
    const prioMap = { 'low': 'Düşük', 'medium': 'Orta', 'high': 'Yüksek' };
    const baseUrl = 'https://calendar.google.com/calendar/u/0/r/eventedit';
    const params = new URLSearchParams();
    params.append('text', `İş Takip - ${selected.length} Görev`);
    let details = '';
    selected.forEach((task, i) => {
      details += `${i+1}. ${task.title}\n`;
      details += `   Durum: ${statusMap[task.status] || task.status}\n`;
      details += `   Öncelik: ${prioMap[task.priority] || 'Orta'}\n`;
      if (task.assignee) details += `   Kişi: ${task.assignee}\n`;
      if (task.deadline) details += `   Bitiş: ${new Date(task.deadline).toLocaleDateString('tr-TR')}\n`;
      details += '\n';
    });
    params.append('details', details);
    const now = new Date();
    const todayStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    params.append('dates', `${todayStr}T100000/${todayStr}T120000`);
    window.open(`${baseUrl}?${params.toString()}`, '_blank');
  };

  const handleBulkWhatsApp = () => {
    const selected = filteredAndSorted.filter(t => selectedIds.has(t.id));
    if (selected.length === 0) { alert('Lütfen gönderilmesini istediğiniz görevleri seçiniz.'); return; }
    const statusMap = { 'todo': 'Yapılacak', 'in-progress': 'Devam Eden', 'done': 'Tamamlandı' };
    const prioMap = { 'low': 'Düşük', 'medium': 'Orta', 'high': 'Yüksek' };
    let text = `📋 *İş Takip - ${selected.length} Görev*\n${'='.repeat(30)}\n\n`;
    selected.forEach((task, i) => {
      text += `*${i+1}. ${task.title}*\n`;
      text += `Durum: ${statusMap[task.status] || task.status}\n`;
      text += `Öncelik: ${prioMap[task.priority] || 'Orta'}\n`;
      if (task.assignee) text += `Kişi: ${task.assignee}\n`;
      if (task.deadline) text += `Bitiş: ${new Date(task.deadline).toLocaleDateString('tr-TR')}\n`;
      text += '\n';
    });
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSorted.length && filteredAndSorted.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSorted.map(t => t.id)));
    }
  };

  const toggleSelectRow = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const filteredAndSorted = useMemo(() => {
    let result = tasksList.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.assignee && t.assignee.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = filters.status.length === 0 || filters.status.includes(t.status);
      const matchPriority = filters.priority.length === 0 || filters.priority.includes(t.priority);
      const matchAssignee = filters.assignee.length === 0 || filters.assignee.includes(t.assignee || 'UNASSIGN');
      const matchTags = filters.tags.length === 0 || (t.tags && t.tags.some(tag => filters.tags.includes(tag)));

      let matchDate = true;
      if (filters.dateStart || filters.dateEnd) {
         const d = t.deadline ? t.deadline.split('T')[0] : null;
         if (filters.dateStart && (!d || d < filters.dateStart)) matchDate = false;
         if (filters.dateEnd && (!d || d > filters.dateEnd)) matchDate = false;
      }

      return matchSearch && matchStatus && matchPriority && matchAssignee && matchTags && matchDate;
    });

    result.sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (b.status === 'done' && a.status !== 'done') return -1;

      let aVal = a[sortCol];
      let bVal = b[sortCol];
      
      if (sortCol === 'priority') {
        aVal = priorityValue[a.priority] || 0;
        bVal = priorityValue[b.priority] || 0;
      } else if (sortCol === 'deadline' || sortCol === 'startDate' || sortCol === 'date') {
        aVal = aVal ? new Date(aVal).getTime() : 9999999999999;
        bVal = bVal ? new Date(bVal).getTime() : 9999999999999;
      }
      
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasksList, sortCol, sortDir, searchTerm, filters]);

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ArrowUpDown size={12} style={{marginLeft:'4px', opacity:0.3}}/>;
    return sortDir === 'asc' ? <ArrowUp size={12} style={{marginLeft:'4px'}}/> : <ArrowDown size={12} style={{marginLeft:'4px'}}/>;
  };

  return (
    <div className="table-container-wrapper">
      <div className="table-toolbar">
        <div style={{display:'flex', alignItems:'center', flexShrink:0, whiteSpace:'nowrap'}}>
          <h3 style={{whiteSpace:'nowrap'}}>{title} ({filteredAndSorted.length})</h3>
          {headerExtra}
        </div>
        <div style={{position: 'relative', display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
          <div style={{display:'flex', gap:'0.4rem', borderRight:'1px solid var(--border)', paddingRight:'0.5rem', alignItems:'center'}}>
            {selectedIds.size > 0 && (
              <span style={{fontSize:'0.75rem', fontWeight:600, color:'var(--primary)', display:'flex', alignItems:'center', whiteSpace:'nowrap'}}>
                {selectedIds.size} Seçili:
              </span>
            )}
            <button onClick={handleBulkCalendar} className="btn btn-secondary btn-small" style={{display:'flex', alignItems:'center', gap:'0.2rem', color:'#2563eb', borderColor:'#bfdbfe', background:'#eff6ff', fontSize:'0.7rem', whiteSpace:'nowrap'}}>
              <Calendar size={13}/> Google Takvime Ekle
            </button>
            <button onClick={handleBulkWhatsApp} className="btn btn-secondary btn-small" style={{display:'flex', alignItems:'center', gap:'0.2rem', color:'#16a34a', borderColor:'#bbf7d0', background:'#f0fdf4', fontSize:'0.7rem', whiteSpace:'nowrap'}}>
              <MessageCircle size={13}/> WhatsApp Gönder
            </button>
          </div>
          <input 
            type="text" 
            placeholder="Ara: Başlık veya Kişi..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button 
            className={`btn btn-secondary btn-small`} 
            onClick={() => setShowFilters(!showFilters)}
            title="Gelişmiş Filtreleme"
            style={(filters.status.length > 0 || filters.priority.length > 0 || filters.assignee.length > 0 || filters.tags.length > 0 || filters.dateStart || filters.dateEnd) ? {background: '#e0f2fe', borderColor: '#38bdf8', color: '#0369a1'} : {}}
          >
            <Filter size={14} style={{marginRight: '4px'}}/> Filtre
          </button>
          
          {showFilters && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '5px',
              background: 'var(--bg-main)', border: '1px solid var(--border)',
              borderRadius: '6px', padding: '1.2rem', width: '320px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 100,
              maxHeight: '80vh', overflowY: 'auto'
            }}>
              <h4 style={{fontSize: '0.85rem', marginBottom: '0.5rem', color:'var(--text-main)', borderBottom:'1px solid var(--border)', paddingBottom: '4px'}}>Duruma Göre</h4>
              <div style={{display:'flex', flexDirection:'column', gap:'0.4rem', marginBottom:'1rem'}}>
                {STATUSES.map(s => (
                  <label key={s.id} style={{fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', color:'var(--text-main)'}}>
                    <input type="checkbox" checked={filters.status.includes(s.id)} 
                      onChange={(e) => {
                        const newStatuses = e.target.checked 
                          ? [...filters.status, s.id] 
                          : filters.status.filter(x => x !== s.id);
                        setFilters({...filters, status: newStatuses});
                      }}
                    />
                    {s.title}
                  </label>
                ))}
              </div>
              
              <h4 style={{fontSize: '0.85rem', marginBottom: '0.5rem', color:'var(--text-main)', borderBottom:'1px solid var(--border)', paddingBottom: '4px'}}>Önceliğe Göre</h4>
              <div style={{display:'flex', flexDirection:'column', gap:'0.4rem'}}>
                {[
                  { id: 'low', title: 'Düşük' },
                  { id: 'medium', title: 'Orta' },
                  { id: 'high', title: 'Yüksek' }
                ].map(p => (
                  <label key={p.id} style={{fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', color:'var(--text-main)'}}>
                    <input type="checkbox" checked={filters.priority.includes(p.id)} 
                      onChange={(e) => {
                        const newPriorities = e.target.checked 
                          ? [...filters.priority, p.id] 
                          : filters.priority.filter(x => x !== p.id);
                        setFilters({...filters, priority: newPriorities});
                      }}
                    />
                    {p.title}
                  </label>
                ))}
              </div>
              
              <h4 style={{fontSize: '0.85rem', marginBottom: '0.5rem', marginTop:'1rem', color:'var(--text-main)', borderBottom:'1px solid var(--border)', paddingBottom: '4px'}}>Kişiye Göre</h4>
              <div style={{display:'flex', flexDirection:'column', gap:'0.4rem', maxHeight:'120px', overflowY:'auto'}}>
                {usersList.map(u => (
                  <label key={u.id} style={{fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', color:'var(--text-main)'}}>
                    <input type="checkbox" checked={filters.assignee.includes(u.name)} 
                      onChange={(e) => {
                        const newAssignees = e.target.checked ? [...filters.assignee, u.name] : filters.assignee.filter(x => x !== u.name);
                        setFilters({...filters, assignee: newAssignees});
                      }}
                    />
                    {u.name}
                  </label>
                ))}
                <label style={{fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', color:'var(--text-main)'}}>
                  <input type="checkbox" checked={filters.assignee.includes('UNASSIGN')} 
                      onChange={(e) => setFilters({...filters, assignee: e.target.checked ? [...filters.assignee, 'UNASSIGN'] : filters.assignee.filter(x => x !== 'UNASSIGN')})} />
                  Atanmamış İşler
                </label>
              </div>

              <h4 style={{fontSize: '0.85rem', marginBottom: '0.5rem', marginTop:'1rem', color:'var(--text-main)', borderBottom:'1px solid var(--border)', paddingBottom: '4px'}}>Etikete Göre</h4>
              <div style={{display:'flex', flexDirection:'column', gap:'0.4rem', maxHeight:'120px', overflowY:'auto'}}>
                {(tagsList || []).map(tag => (
                  <label key={tag.id} style={{fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', color:'var(--text-main)'}}>
                    <input type="checkbox" checked={filters.tags.includes(tag.id)}
                      onChange={(e) => {
                        const newTags = e.target.checked ? [...filters.tags, tag.id] : filters.tags.filter(x => x !== tag.id);
                        setFilters({...filters, tags: newTags});
                      }}
                    />
                    <span style={{display:'inline-block', width:'10px', height:'10px', borderRadius:'50%', background: tag.color || '#6b7280'}}></span>
                    {tag.label}
                  </label>
                ))}
              </div>

              <h4 style={{fontSize: '0.85rem', marginBottom: '0.5rem', marginTop:'1rem', color:'var(--text-main)', borderBottom:'1px solid var(--border)', paddingBottom: '4px'}}>Bitiş Tarihi Aralığı</h4>
              <div style={{display:'flex', flexDirection:'column', gap:'0.4rem'}}>
                <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                  <span style={{fontSize:'0.75rem', width:'35px', color:'var(--text-muted)'}}>Baş:</span>
                  <input type="date" value={filters.dateStart} onChange={e => setFilters({...filters, dateStart: e.target.value})} style={{flex:1, padding:'0.3rem', fontSize:'0.75rem', borderRadius:'4px', border:'1px solid var(--border)', outline:'none'}} />
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                  <span style={{fontSize:'0.75rem', width:'35px', color:'var(--text-muted)'}}>Bit:</span>
                  <input type="date" value={filters.dateEnd} onChange={e => setFilters({...filters, dateEnd: e.target.value})} style={{flex:1, padding:'0.3rem', fontSize:'0.75rem', borderRadius:'4px', border:'1px solid var(--border)', outline:'none'}} />
                </div>
              </div>

              {(filters.status.length > 0 || filters.priority.length > 0 || filters.assignee.length > 0 || filters.tags.length > 0 || filters.dateStart || filters.dateEnd) && (
                <button
                  style={{marginTop:'1.5rem', width:'100%', padding:'0.5rem', fontSize:'0.75rem', background:'#fef2f2', color:'#ef4444', border:'1px solid #fecaca', borderRadius:'4px', cursor:'pointer', fontWeight:600}}
                  onClick={() => setFilters({status: [], priority: [], assignee: [], tags: [], dateStart: '', dateEnd: ''})}
                >
                  Filtreleri Temizle
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="table-container">
        <table className="compact-table">
          <thead>
            <tr>
              {(isAdmin || showCheckboxes) && (
                <th style={{width: '30px', textAlign:'center'}}>
                  <input type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredAndSorted.length}
                    onChange={toggleSelectAll}
                  />
                </th>
              )}
              <th onClick={() => handleSort('title')} style={{cursor:'pointer', width: '30%'}}>Görev Adı <SortIcon col="title"/></th>
              <th onClick={() => handleSort('status')} style={{cursor:'pointer'}}>Durum <SortIcon col="status"/></th>
              <th onClick={() => handleSort('priority')} style={{cursor:'pointer'}}>Öncelik <SortIcon col="priority"/></th>
              <th onClick={() => handleSort('assignee')} style={{cursor:'pointer'}}>Kişi <SortIcon col="assignee"/></th>
              <th onClick={() => handleSort('startDate')} style={{cursor:'pointer'}}>Başlangıç <SortIcon col="startDate"/></th>
              <th onClick={() => handleSort('deadline')} style={{cursor:'pointer'}}>Bitiş Tarihi <SortIcon col="deadline"/></th>
              <th className="actions-col">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map(task => {
              const isDone = task.status === 'done';
              const dlDate = task.deadline ? new Date(task.deadline) : null;
              let daysLeft = null;
              let dlStyle = {};

              if (dlDate) {
                const today = new Date();
                today.setHours(0,0,0,0);
                dlDate.setHours(0,0,0,0);
                daysLeft = Math.ceil((dlDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                if (!isDone) {
                  if (daysLeft < 0) {
                    dlStyle.backgroundColor = `rgba(239, 68, 68, 0.4)`;
                  } else if (daysLeft <= 7) {
                    const intensity = 0.4 - (daysLeft / 7) * 0.4;
                    dlStyle.backgroundColor = `rgba(239, 68, 68, ${intensity})`;
                  }
                }
              }

              const deadlinePassed = !isDone && daysLeft !== null && daysLeft < 0;
              const trClass = `${isDone ? 'row-completed ' : ''}`.trim();

              return (
                <tr key={task.id} className={trClass}>
                  {(isAdmin || showCheckboxes) && (
                    <td style={{textAlign:'center'}} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(task.id)} onChange={() => toggleSelectRow(task.id)} />
                    </td>
                  )}
                  <TaskTitleCell task={task} onEdit={onEdit} />
                  <td>
                    {(isAdmin || task.assignee === currentUser) ? (
                      <select 
                        value={task.status} 
                        onChange={(e) => onStatusChange(task.id, e.target.value)}
                        className={`status-select status-${task.status}`}
                        onClick={e => e.stopPropagation()}
                      >
                        {STATUSES.map(s => <option value={s.id} key={s.id}>{s.title}</option>)}
                      </select>
                    ) : (
                      <span className={`status-${task.status}`}>{STATUSES.find(s=>s.id===task.status)?.title}</span>
                    )}
                  </td>
                  <td className={`text-prio-${task.priority}`}>
                    {isAdmin ? (
                       <select 
                         value={task.priority} 
                         onChange={(e) => updateTask(task.id, { priority: e.target.value })}
                         className={`status-select text-prio-${task.priority}`}
                         onClick={e => e.stopPropagation()}
                       >
                         <option value="low">Düşük</option>
                         <option value="medium">Orta</option>
                         <option value="high">Yüksek</option>
                       </select>
                    ) : (
                      <>
                        <span className={`prio-dot prio-${task.priority}`}></span>
                        {task.priority === 'low' ? 'Düşük' : task.priority === 'medium' ? 'Orta' : 'Yüksek'}
                      </>
                    )}
                  </td>
                  <td>
                    {isAdmin ? (
                      <select 
                        value={task.assignee || ''} 
                        onChange={(e) => updateTask(task.id, { assignee: e.target.value })}
                        className="status-select"
                        onClick={e => e.stopPropagation()}
                        style={getUserColor(task.assignee) ? {color: getUserColor(task.assignee), fontWeight: 600} : {}}
                      >
                        <option value="">Atanmamış</option>
                        {usersList?.map(u => <option key={u.id} value={u.name} style={u.color ? {color: u.color, fontWeight: 600} : {}}>{u.name}</option>)}
                      </select>
                    ) : (
                      <span style={getUserColor(task.assignee) ? {color: getUserColor(task.assignee), fontWeight: 600} : {}}>{task.assignee || '-'}</span>
                    )}
                  </td>
                  <td style={{fontSize:'0.65rem', fontWeight:400}}>
                     {isAdmin ? (
                       <input type="date" value={task.startDate ? task.startDate.split('T')[0] : ''} onChange={e => updateTask(task.id, { startDate: e.target.value })} onClick={e => e.stopPropagation()} className="status-select" style={{padding:'0', fontSize:'0.65rem'}} />
                     ) : (
                       task.startDate ? new Date(task.startDate).toLocaleDateString('tr-TR') : '-'
                     )}
                  </td>
                  <td className={deadlinePassed && !isAdmin ? 'text-red' : ''} style={{...dlStyle, fontSize:'0.65rem', fontWeight: deadlinePassed ? 600 : 400}}>
                     {isAdmin ? (
                       <input type="date" value={task.deadline ? task.deadline.split('T')[0] : ''} onChange={e => updateTask(task.id, { deadline: e.target.value })} onClick={e => e.stopPropagation()} className="status-select" style={{padding:'0', color: deadlinePassed ? '#ef4444' : 'inherit', backgroundColor: 'transparent', border: 'none', fontSize:'0.65rem'}} />
                     ) : (
                       task.deadline ? new Date(task.deadline).toLocaleDateString('tr-TR') : '-'
                     )}
                  </td>
                  <td className="actions-col">
                    <button className="icon-btn" onClick={() => onEdit(task)}><Edit2 size={14}/></button>
                    {isAdmin && <button className="icon-btn delete-btn" onClick={() => onDelete(task.id)}><Trash2 size={14}/></button>}
                  </td>
                </tr>
              );
            })}
            {filteredAndSorted.length === 0 && (
              <tr>
                <td colSpan="6" className="empty-row" style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem 1rem' }}>
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BoardView({ customerTaskData, onCustomerTaskHandled }) {
  const { tasks, updateTaskStatus, deleteTask, currentUser, updateTask, usersList, isAdmin, getUserColor, hideAllTasksForUsers, toggleHideAllTasks, tagsList } = useTasks();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [prefillData, setPrefillData] = useState(null);

  useEffect(() => {
    if (customerTaskData) {
      setEditingTask(null);
      setPrefillData(customerTaskData);
      setModalOpen(true);
      if (onCustomerTaskHandled) onCustomerTaskHandled();
    }
  }, [customerTaskData]);

  const openNewTaskModal = () => {
    setEditingTask(null);
    setPrefillData(null);
    setModalOpen(true);
  };

  const openEditModal = (task) => {
    if (task.isNewForAssignee && (!task.assignee || task.assignee === currentUser)) {
      updateTask(task.id, { isNewForAssignee: false });
    }
    setEditingTask(task);
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditingTask(null);
    setPrefillData(null);
    setModalOpen(false);
  };

  const activeTasks = tasks.filter(t => !t.isDeleted);
  const myTasks = activeTasks.filter(t => t.assignee === currentUser);

  const myTodoCount = myTasks.filter(t => t.status === 'todo').length;
  const myInProgressCount = myTasks.filter(t => t.status === 'in-progress').length;

  return (
    <>
      <div className="table-header-actions" style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem'}}>
        <div style={{display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap'}}>
          <h2 style={{margin:0}}>GÖREV PANELİ (V9.2.3)</h2>
          <div style={{fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'0.5rem', background:'var(--bg-main)', padding:'0.4rem 0.8rem', borderRadius:'20px', border:'1px solid var(--border)'}}>
            <span style={{color:'var(--text-muted)'}}>Üzerinizde:</span>
            <span style={{color:'#ef4444', fontWeight:600}}>{myTodoCount} Yapılacak</span>
            <span style={{color:'var(--border)'}}>|</span>
            <span style={{color:'#10b981', fontWeight:600}}>{myInProgressCount} Devam Eden</span>
            <span style={{color:'var(--text-main)', fontSize:'0.8rem'}}>iş bulunuyor.</span>
          </div>
        </div>
        <button className="btn btn-primary btn-small" onClick={openNewTaskModal}>
          <Plus size={16} style={{marginRight: '4px'}}/> Yeni Görev
        </button>
      </div>

      <div className="split-view">
        <div className={hideAllTasksForUsers && !isAdmin ? '' : 'split-pane'} style={hideAllTasksForUsers && !isAdmin ? {width: '100%'} : {}}>
          <TaskTable
            title={`Benim İşlerim (${currentUser})`}
            tasksList={myTasks}
            onEdit={openEditModal}
            onDelete={deleteTask}
            onStatusChange={updateTaskStatus}
            usersList={usersList}
            isAdmin={isAdmin}
            currentUser={currentUser}
            updateTask={updateTask}
            getUserColor={getUserColor}
            showCheckboxes={true}
            tagsList={tagsList}
          />
        </div>
        {!(hideAllTasksForUsers && !isAdmin) && (
          <div className="split-pane">
            <TaskTable
              title="Tüm İşler Listesi"
              tasksList={activeTasks}
              onEdit={openEditModal}
              onDelete={deleteTask}
              onStatusChange={updateTaskStatus}
              usersList={usersList}
              isAdmin={isAdmin}
              currentUser={currentUser}
              updateTask={updateTask}
              getUserColor={getUserColor}
              headerExtra={isAdmin && (
                <label style={{display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.7rem', fontWeight:500, color: hideAllTasksForUsers ? '#ef4444' : 'var(--text-muted)', cursor:'pointer', background: hideAllTasksForUsers ? '#fef2f2' : 'var(--bg-alt)', padding:'0.15rem 0.5rem', borderRadius:'12px', border: `1px solid ${hideAllTasksForUsers ? '#fecaca' : 'var(--border)'}`, whiteSpace:'nowrap', flexShrink:0}}>
                  <input type="checkbox" checked={hideAllTasksForUsers} onChange={(e) => toggleHideAllTasks(e.target.checked)} style={{cursor:'pointer', width:'13px', height:'13px'}} />
                  Diğer kullanıcılar için gizle
                </label>
              )}
              tagsList={tagsList}
            />
          </div>
        )}
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={closeModal}
        defaultStatus="todo"
        editTask={editingTask}
        prefillData={prefillData}
      />
    </>
  );
}
