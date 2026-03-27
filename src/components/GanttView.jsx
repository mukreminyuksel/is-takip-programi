import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useTasks } from '../context/TaskContext';
import TaskModal from './TaskModal';
import { ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';

const GanttBarTooltip = ({ task, tagsList, children }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const showRef = useRef(null);
  const hideRef = useRef(null);

  useEffect(() => () => { clearTimeout(showRef.current); clearTimeout(hideRef.current); }, []);

  const onEnter = (e) => {
    clearTimeout(hideRef.current);
    if (show) return;
    const x = e.clientX; const y = e.clientY;
    showRef.current = setTimeout(() => { setPos({ x, y }); setShow(true); }, 1300);
  };
  const onLeave = () => { clearTimeout(showRef.current); hideRef.current = setTimeout(() => setShow(false), 300); };
  const onTipEnter = () => clearTimeout(hideRef.current);
  const onTipLeave = () => { hideRef.current = setTimeout(() => setShow(false), 300); };

  const statusMap = { 'todo': 'Yapılacak', 'in-progress': 'Devam Eden', 'done': 'Tamamlandı' };
  const prioMap = { 'low': 'Düşük', 'medium': 'Orta', 'high': 'Yüksek' };
  const sortedNotes = useMemo(() => task.notes ? [...task.notes].sort((a,b) => { if (a.importance !== b.importance) return a.importance === 'important' ? -1 : 1; return new Date(b.date) - new Date(a.date); }) : [], [task.notes]);

  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave} style={{display:'contents'}}>
      {children}
      {show && (
        <div onMouseEnter={onTipEnter} onMouseLeave={onTipLeave} style={{
          position:'fixed', top: Math.min(pos.y + 15, window.innerHeight - 320), left: Math.min(pos.x + 15, window.innerWidth - 300),
          background:'var(--bg-main)', border:'1px solid var(--border)', padding:'0.75rem', borderRadius:'6px',
          boxShadow:'0 10px 25px -5px rgba(0,0,0,0.3)', zIndex:99999, width:'280px', maxHeight:'300px', overflowY:'auto',
          fontSize:'0.8rem', pointerEvents:'auto', color:'var(--text-main)', whiteSpace:'normal', lineHeight:'1.4'
        }}>
          <h4 style={{margin:'0 0 0.4rem', fontSize:'0.85rem', color:'var(--primary)', borderBottom:'1px solid var(--border)', paddingBottom:'4px'}}>{task.title}</h4>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2px 8px', fontSize:'0.7rem', marginBottom:'0.4rem'}}>
            <div><b>Durum:</b> {statusMap[task.status]}</div>
            <div><b>Öncelik:</b> {prioMap[task.priority]}</div>
            <div><b>Atanan:</b> {(Array.isArray(task.assignees) && task.assignees.length > 0 ? task.assignees : task.assignee ? [task.assignee] : []).join(', ') || '-'}</div>
            <div><b>Bitiş:</b> {task.deadline ? new Date(task.deadline).toLocaleDateString('tr-TR') : '-'}</div>
          </div>
          {task.customerName && <div style={{fontSize:'0.7rem', marginBottom:'0.3rem'}}><b>Müşteri:</b> {task.customerName}</div>}
          {task.description && <div style={{fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:'0.3rem', maxHeight:'40px', overflow:'hidden'}}>{task.description}</div>}
          {task.tags?.length > 0 && (
            <div style={{display:'flex', gap:'3px', flexWrap:'wrap', marginBottom:'0.4rem'}}>
              {task.tags.map(tid => { const t = (tagsList||[]).find(x => x.id === tid); return t ? <span key={tid} style={{fontSize:'0.55rem', padding:'1px 4px', borderRadius:'6px', background:`${t.color}18`, color:t.color, border:`1px solid ${t.color}40`}}>{t.label}</span> : null; })}
            </div>
          )}
          {sortedNotes.length > 0 && (
            <>
              <h4 style={{margin:'0.4rem 0 0.3rem', fontSize:'0.75rem', color:'var(--primary)', borderBottom:'1px solid var(--border)', paddingBottom:'3px'}}>Notlar ({sortedNotes.length})</h4>
              <div style={{display:'flex', flexDirection:'column', gap:'0.3rem'}}>
                {sortedNotes.slice(0, 5).map(n => (
                  <div key={n.id} style={{borderBottom:'1px dotted #cbd5e1', paddingBottom:'3px'}}>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.65rem'}}>
                      <span style={{fontWeight:600, color: n.importance === 'important' ? '#991b1b' : 'var(--text-main)'}}>{n.importance === 'important' ? '⭐ ' : ''}{n.author}</span>
                      <span style={{color:'var(--text-muted)'}}>{new Date(n.date).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div style={{fontSize:'0.7rem', color: n.isRead === false ? '#ef4444' : 'var(--text-main)', fontWeight: n.isRead === false ? 700 : 'normal'}}>{n.text}</div>
                  </div>
                ))}
                {sortedNotes.length > 5 && <div style={{fontSize:'0.65rem', color:'var(--text-muted)', fontStyle:'italic'}}>+{sortedNotes.length - 5} not daha...</div>}
              </div>
            </>
          )}
          {task.subtasks?.length > 0 && (
            <>
              <h4 style={{margin:'0.4rem 0 0.3rem', fontSize:'0.75rem', color:'var(--primary)', borderBottom:'1px solid var(--border)', paddingBottom:'3px'}}>Alt Görevler ({task.subtasks.filter(s=>s.isCompleted).length}/{task.subtasks.length})</h4>
              <div style={{fontSize:'0.7rem'}}>
                {task.subtasks.map(st => <div key={st.id}>{st.isCompleted ? '✓' : '○'} <span style={{textDecoration: st.isCompleted ? 'line-through' : 'none', color: st.isCompleted ? 'var(--text-muted)' : 'var(--text-main)'}}>{st.text}</span></div>)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const SCALE_OPTIONS = [
  { id: 'day', label: 'Gün', days: 1 },
  { id: 'week', label: 'Hafta', days: 7 },
  { id: 'month', label: 'Ay', days: 30 }
];

const statusColors = { 'todo': '#ef4444', 'in-progress': '#10b981', 'done': '#9ca3af' };
const statusLabels = { 'todo': 'Yapılacak', 'in-progress': 'Devam Eden', 'done': 'Tamamlandı' };
const priorityColors = { 'low': '#10b981', 'medium': '#f59e0b', 'high': '#ef4444' };
const priorityLabels = { 'low': 'Düşük', 'medium': 'Orta', 'high': 'Yüksek' };
const priorityValue = { 'low': 1, 'medium': 2, 'high': 3 };

export default function GanttView() {
  const { tasks, updateTask, currentUser, getUserColor, isAdmin, hideAllTasksForUsers, tagsList, getDeadlineBarColor, deadlineColors, getAssignees } = useTasks();
  const [scale, setScale] = useState('day');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [dragInfo, setDragInfo] = useState(null); // { taskId, edge: 'left'|'right', startX, origDate }
  const timelineRef = useRef(null);
  const leftPanelRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, scrollLeft: 0 });
  const [sortCol, setSortCol] = useState('startDate');
  const [sortDir, setSortDir] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: [], priority: [] });

  const activeTasks = tasks.filter(t => {
    if (t.isDeleted || !t.startDate || !t.deadline) return false;
    if (hideAllTasksForUsers && !isAdmin && !getAssignees(t).includes(currentUser)) return false;
    return true;
  });

  const { minDate, maxDate, totalDays, dateColumns } = useMemo(() => {
    if (activeTasks.length === 0) {
      const today = new Date();
      const min = new Date(today); min.setDate(min.getDate() - 7);
      const max = new Date(today); max.setDate(max.getDate() + 30);
      return { minDate: min, maxDate: max, totalDays: 37, dateColumns: [] };
    }

    let min = new Date(activeTasks[0].startDate);
    let max = new Date(activeTasks[0].deadline);
    
    activeTasks.forEach(t => {
      const s = new Date(t.startDate);
      const e = new Date(t.deadline);
      if (s < min) min = s;
      if (e > max) max = e;
    });

    min.setDate(min.getDate() - 3);
    max.setDate(max.getDate() + 7);
    min.setHours(0,0,0,0);
    max.setHours(0,0,0,0);

    const total = Math.ceil((max - min) / (1000*60*60*24));
    
    const cols = [];
    const scaleObj = SCALE_OPTIONS.find(s => s.id === scale);
    const step = scaleObj.days;
    let current = new Date(min);
    
    while (current <= max) {
      cols.push(new Date(current));
      current.setDate(current.getDate() + step);
    }

    return { minDate: min, maxDate: max, totalDays: total, dateColumns: cols };
  }, [activeTasks, scale]);

  const colWidth = scale === 'day' ? 40 : scale === 'week' ? 80 : 120;
  const totalWidth = dateColumns.length * colWidth;

  const formatColDate = (date) => {
    if (scale === 'day') return date.toLocaleDateString('tr-TR', { day:'numeric', month:'short' });
    if (scale === 'week') {
      const end = new Date(date); end.setDate(end.getDate() + 6);
      return `${date.getDate()} - ${end.toLocaleDateString('tr-TR', { day:'numeric', month:'short' })}`;
    }
    return date.toLocaleDateString('tr-TR', { month:'long', year:'numeric' });
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit' });
  };

  const getBarPosition = (task) => {
    const start = new Date(task.startDate); start.setHours(0,0,0,0);
    const end = new Date(task.deadline); end.setHours(0,0,0,0);
    
    const startOffset = Math.max(0, (start - minDate) / (1000*60*60*24));
    const duration = Math.max(1, (end - start) / (1000*60*60*24) + 1);
    
    const left = (startOffset / totalDays) * totalWidth;
    const width = Math.max(20, (duration / totalDays) * totalWidth);
    
    return { left, width };
  };

  const openEdit = (task) => {
    if (task.isNewForAssignee && (getAssignees(task).length === 0 || getAssignees(task).includes(currentUser))) {
      updateTask(task.id, { isNewForAssignee: false });
    }
    setEditingTask(task);
    setModalOpen(true);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const todayOffset = (() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const offset = (today - minDate) / (1000*60*60*24);
    return (offset / totalDays) * totalWidth;
  })();

  const sortedTasks = useMemo(() => {
    let result = activeTasks.filter(t => {
      const matchStatus = filters.status.length === 0 || filters.status.includes(t.status);
      const matchPriority = filters.priority.length === 0 || filters.priority.includes(t.priority);
      return matchStatus && matchPriority;
    });

    result.sort((a, b) => {
      let aVal, bVal;
      if (sortCol === 'priority') {
        aVal = priorityValue[a.priority] || 0;
        bVal = priorityValue[b.priority] || 0;
      } else if (sortCol === 'status') {
        const sOrder = { 'todo': 0, 'in-progress': 1, 'done': 2 };
        aVal = sOrder[a.status] ?? 0;
        bVal = sOrder[b.status] ?? 0;
      } else if (sortCol === 'startDate' || sortCol === 'deadline') {
        aVal = a[sortCol] ? new Date(a[sortCol]).getTime() : 9999999999999;
        bVal = b[sortCol] ? new Date(b[sortCol]).getTime() : 9999999999999;
      } else {
        aVal = (a[sortCol] || '').toString().toLowerCase();
        bVal = (b[sortCol] || '').toString().toLowerCase();
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [activeTasks, sortCol, sortDir, filters]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ArrowUpDown size={10} style={{marginLeft:'2px', opacity:0.3}}/>;
    return sortDir === 'asc' ? <ArrowUp size={10} style={{marginLeft:'2px'}}/> : <ArrowDown size={10} style={{marginLeft:'2px'}}/>;
  };

  const ROW_HEIGHT = 32;

  // --- Drag to resize bars ---
  const pxPerDay = totalDays > 0 ? totalWidth / totalDays : 1;

  const handleEdgeDragStart = (e, taskId, edge) => {
    e.stopPropagation();
    e.preventDefault();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const origDate = edge === 'left' ? task.startDate : task.deadline;
    setDragInfo({ taskId, edge, startX: e.clientX, origDate });

    const handleMove = (ev) => {
      const dx = ev.clientX - e.clientX;
      const daysDelta = Math.round(dx / pxPerDay);
      if (daysDelta === 0) return;
      
      const orig = new Date(origDate);
      orig.setDate(orig.getDate() + daysDelta);
      const newDateStr = orig.toISOString();

      if (edge === 'left') {
        if (new Date(newDateStr) < new Date(task.deadline)) {
          updateTask(taskId, { startDate: newDateStr });
        }
      } else {
        if (new Date(newDateStr) > new Date(task.startDate)) {
          updateTask(taskId, { deadline: newDateStr });
        }
      }
    };

    const handleUp = () => {
      setDragInfo(null);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  // --- Middle-click or grab to pan timeline ---
  const handleTimelinePanStart = (e) => {
    // Only pan on middle click or if clicking on empty space (not on a bar)
    if (e.target.closest('.gantt-bar') || e.target.closest('.gantt-bar-edge')) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, scrollLeft: timelineRef.current?.scrollLeft || 0 };

    const handleMove = (ev) => {
      if (!timelineRef.current) return;
      const dx = ev.clientX - panStart.current.x;
      timelineRef.current.scrollLeft = panStart.current.scrollLeft - dx;
    };

    const handleUp = () => {
      setIsPanning(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  // Sync vertical scroll between left panel and timeline
  const handleTimelineScroll = (e) => {
    if (leftPanelRef.current) {
      leftPanelRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const handleLeftPanelScroll = (e) => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = e.target.scrollTop;
    }
  };

  return (
    <>
      <div style={{ marginBottom: '0.75rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
          <h2 style={{ margin:0, fontSize:'0.9rem', fontWeight:600, color:'var(--text-main)', textTransform:'uppercase' }}>Gantt Grafiği</h2>
          <span style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>{activeTasks.length} Görev (tarihli)</span>
        </div>
        <div style={{display:'flex', gap:'0.5rem', alignItems:'center'}}>
          <div style={{position:'relative'}}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding:'0.3rem 0.7rem', fontSize:'0.75rem', cursor:'pointer', fontWeight:500,
                background: (filters.status.length > 0 || filters.priority.length > 0) ? '#e0f2fe' : 'var(--bg-main)',
                color: (filters.status.length > 0 || filters.priority.length > 0) ? '#0369a1' : 'var(--text-muted)',
                border: `1px solid ${(filters.status.length > 0 || filters.priority.length > 0) ? '#38bdf8' : 'var(--border)'}`,
                borderRadius:'6px', display:'flex', alignItems:'center', gap:'0.3rem'
              }}
            >
              <Filter size={13}/> Filtre
            </button>
            {showFilters && (
              <div style={{
                position:'absolute', top:'100%', right:0, marginTop:'5px',
                background:'var(--bg-main)', border:'1px solid var(--border)',
                borderRadius:'6px', padding:'1rem', width:'220px',
                boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)', zIndex:100
              }}>
                <h4 style={{fontSize:'0.8rem', marginBottom:'0.4rem', color:'var(--text-main)', borderBottom:'1px solid var(--border)', paddingBottom:'4px'}}>Durum</h4>
                <div style={{display:'flex', flexDirection:'column', gap:'0.3rem', marginBottom:'0.8rem'}}>
                  {Object.entries(statusLabels).map(([id, label]) => (
                    <label key={id} style={{fontSize:'0.75rem', display:'flex', alignItems:'center', gap:'0.3rem', cursor:'pointer', color:'var(--text-main)'}}>
                      <input type="checkbox" checked={filters.status.includes(id)}
                        onChange={(e) => setFilters({...filters, status: e.target.checked ? [...filters.status, id] : filters.status.filter(x => x !== id)})}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <h4 style={{fontSize:'0.8rem', marginBottom:'0.4rem', color:'var(--text-main)', borderBottom:'1px solid var(--border)', paddingBottom:'4px'}}>Öncelik</h4>
                <div style={{display:'flex', flexDirection:'column', gap:'0.3rem'}}>
                  {Object.entries(priorityLabels).map(([id, label]) => (
                    <label key={id} style={{fontSize:'0.75rem', display:'flex', alignItems:'center', gap:'0.3rem', cursor:'pointer', color:'var(--text-main)'}}>
                      <input type="checkbox" checked={filters.priority.includes(id)}
                        onChange={(e) => setFilters({...filters, priority: e.target.checked ? [...filters.priority, id] : filters.priority.filter(x => x !== id)})}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {(filters.status.length > 0 || filters.priority.length > 0) && (
                  <button
                    style={{marginTop:'0.8rem', width:'100%', padding:'0.4rem', fontSize:'0.7rem', background:'#fef2f2', color:'#ef4444', border:'1px solid #fecaca', borderRadius:'4px', cursor:'pointer', fontWeight:600}}
                    onClick={() => setFilters({status: [], priority: []})}
                  >
                    Filtreleri Temizle
                  </button>
                )}
              </div>
            )}
          </div>
          <div style={{display:'flex', gap:'0', border:'1px solid var(--border)', borderRadius:'6px', overflow:'hidden'}}>
            {SCALE_OPTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setScale(s.id)}
                style={{
                  padding:'0.3rem 0.7rem', fontSize:'0.75rem', cursor:'pointer', fontWeight: scale === s.id ? 600 : 400,
                  background: scale === s.id ? 'var(--primary)' : 'var(--bg-main)',
                  color: scale === s.id ? 'white' : 'var(--text-muted)',
                  border:'none', borderRight: '1px solid var(--border)',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="gantt-container" style={{ display:'flex', border:'1px solid var(--border)', borderRadius:'6px', overflow:'hidden', background:'var(--bg-main)', maxHeight: 'calc(100vh - 200px)' }}>
        {/* Left: Task info columns */}
        <div
          ref={leftPanelRef}
          onScroll={handleLeftPanelScroll}
          style={{ minWidth:'460px', maxWidth:'520px', borderRight:'2px solid var(--border)', flexShrink:0, overflowY:'auto', overflowX:'hidden', scrollbarWidth:'none' }}
        >
          {/* Header */}
          <div style={{ height:'40px', display:'flex', alignItems:'center', background:'var(--bg-alt)', borderBottom:'1px solid var(--border)', position:'sticky', top:0, zIndex:2, fontSize:'0.7rem', fontWeight:600, color:'var(--text-main)' }}>
            <div style={{flex:1, padding:'0 0.5rem', minWidth:'150px'}}>Görev Adı</div>
            <div onClick={() => handleSort('startDate')} style={{width:'65px', textAlign:'center', borderLeft:'1px solid var(--border)', padding:'0 0.25rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>Başlangıç <SortIcon col="startDate"/></div>
            <div onClick={() => handleSort('deadline')} style={{width:'65px', textAlign:'center', borderLeft:'1px solid var(--border)', padding:'0 0.25rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>Bitiş <SortIcon col="deadline"/></div>
            <div onClick={() => handleSort('status')} style={{width:'75px', textAlign:'center', borderLeft:'1px solid var(--border)', padding:'0 0.25rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>Durum <SortIcon col="status"/></div>
            <div onClick={() => handleSort('priority')} style={{width:'70px', textAlign:'center', borderLeft:'1px solid var(--border)', padding:'0 0.25rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>Öncelik <SortIcon col="priority"/></div>
          </div>
          {/* Rows */}
          {sortedTasks.map((task, i) => (
            <div
              key={task.id}
              onClick={() => openEdit(task)}
              style={{
                height: ROW_HEIGHT,
                display:'flex', alignItems:'center',
                borderBottom:'1px solid var(--border)', cursor:'pointer',
                background: i % 2 === 0 ? 'var(--bg-main)' : 'var(--bg-alt)',
                fontSize:'0.65rem',
              }}
            >
              <div style={{flex:1, display:'flex', alignItems:'center', gap:'0.3rem', padding:'0 0.5rem', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', minWidth:'150px'}}>
                <span style={{width:6, height:6, borderRadius:'50%', background: statusColors[task.status], flexShrink:0}}></span>
                <span style={{overflow:'hidden', textOverflow:'ellipsis', fontWeight:500, color:'var(--text-main)'}}>
                  {task.title}
                </span>
                {getAssignees(task).length > 0 && (
                  <span style={{fontSize:'0.55rem', color: getUserColor(getAssignees(task)[0]) || 'var(--text-muted)', fontWeight: 600, marginLeft:'0.2rem', flexShrink:0}}>
                    ({getAssignees(task).join(', ')})
                  </span>
                )}
              </div>
              <div style={{width:'65px', textAlign:'center', color:'var(--text-muted)', borderLeft:'1px solid var(--border)', padding:'0 0.25rem'}}>
                {formatShortDate(task.startDate)}
              </div>
              <div style={{width:'65px', textAlign:'center', borderLeft:'1px solid var(--border)', padding:'0 0.25rem', ...(() => {
                if (task.status === 'done') return { color: 'var(--text-muted)' };
                const now2 = new Date(); now2.setHours(0,0,0,0);
                const dl2 = new Date(task.deadline); dl2.setHours(0,0,0,0);
                const dLeft = Math.ceil((dl2 - now2) / (1000*60*60*24));
                const barColor2 = getDeadlineBarColor(dLeft, false, '#6b7280');
                const hexColor = barColor2.replace(/cc$/, '');
                const fw = dLeft <= 1 ? 700 : dLeft <= 3 ? 600 : 'normal';
                return { color: hexColor, fontWeight: fw };
              })()}}>
                {formatShortDate(task.deadline)}
              </div>
              <div style={{width:'75px', textAlign:'center', borderLeft:'1px solid var(--border)', padding:'0 0.25rem'}}>
                <span style={{
                  fontSize:'0.55rem', padding:'0.1rem 0.3rem', borderRadius:'8px',
                  background: `${statusColors[task.status]}18`, color: statusColors[task.status], fontWeight:600
                }}>
                  {statusLabels[task.status]}
                </span>
              </div>
              <div style={{width:'70px', textAlign:'center', borderLeft:'1px solid var(--border)', padding:'0 0.25rem'}}>
                <span style={{
                  fontSize:'0.55rem', padding:'0.1rem 0.3rem', borderRadius:'8px',
                  background: `${priorityColors[task.priority]}18`, color: priorityColors[task.priority], fontWeight:600
                }}>
                  {priorityLabels[task.priority] || 'Orta'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Timeline */}
        <div
          ref={timelineRef}
          onScroll={handleTimelineScroll}
          onMouseDown={handleTimelinePanStart}
          style={{
            flex:1, overflowX:'scroll', overflowY:'auto', position:'relative',
            cursor: isPanning ? 'grabbing' : 'grab',
          }}
        >
          {/* Column headers */}
          <div style={{ display:'flex', height:'40px', position:'sticky', top:0, zIndex:2, background:'var(--bg-alt)', borderBottom:'1px solid var(--border)' }}>
            {dateColumns.map((date, i) => (
              <div key={i} style={{
                minWidth: colWidth, width: colWidth,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'0.65rem', fontWeight: isToday(date) ? 700 : 400,
                color: isToday(date) ? 'var(--primary)' : 'var(--text-muted)',
                borderRight:'1px solid var(--border)',
                background: isToday(date) ? 'rgba(37,99,235,0.08)' : 'transparent',
                whiteSpace:'nowrap', padding:'0 2px'
              }}>
                {formatColDate(date)}
              </div>
            ))}
          </div>

          {/* Rows with bars */}
          <div style={{ position:'relative', minWidth: totalWidth }}>
            {/* Grid lines */}
            {dateColumns.map((date, i) => (
              <div key={i} style={{
                position:'absolute', top:0, bottom:0,
                left: i * colWidth, width: colWidth,
                borderRight:'1px solid var(--border)',
                background: isToday(date) ? 'rgba(37,99,235,0.04)' : 'transparent',
                pointerEvents:'none'
              }} />
            ))}

            {/* Today line */}
            {todayOffset > 0 && todayOffset < totalWidth && (
              <div style={{
                position:'absolute', top:0, bottom:0,
                left: todayOffset, width:'2px',
                background:'var(--primary)', zIndex:1,
                opacity:0.6
              }} />
            )}

            {/* Task bars */}
            {sortedTasks.map((task, i) => {
              const { left, width } = getBarPosition(task);
              const isDone = task.status === 'done';

              let barColor = statusColors[task.status];
              const now = new Date(); now.setHours(0,0,0,0);
              const dl = task.deadline ? new Date(task.deadline) : null;
              let daysLeft = null;
              if (dl) { dl.setHours(0,0,0,0); daysLeft = Math.ceil((dl - now) / (1000*60*60*24)); }
              const barBg = getDeadlineBarColor(daysLeft, isDone, barColor);

              return (
                <GanttBarTooltip key={task.id} task={task} tagsList={tagsList}>
                  <div style={{ height: ROW_HEIGHT, position:'relative', borderBottom:'1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-alt)' }}>
                    {/* Main bar */}
                    <div
                      className="gantt-bar"
                      onClick={() => openEdit(task)}
                      style={{
                        position:'absolute',
                        top: 4, height: ROW_HEIGHT - 8,
                        left, width,
                        background: barBg,
                        borderRadius:'3px', cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'0.6rem', color:'#fff', fontWeight:500,
                        overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis',
                        textDecoration: isDone ? 'line-through' : 'none',
                        opacity: isDone ? 0.5 : 1,
                      }}
                    >
                      {width > 60 && <span style={{padding:'0 6px'}}>{getAssignees(task).join(', ')}</span>}
                    </div>

                    {/* Left drag handle */}
                    <div
                      className="gantt-bar-edge"
                      onMouseDown={(e) => handleEdgeDragStart(e, task.id, 'left')}
                      style={{
                        position:'absolute',
                        top: 4, height: ROW_HEIGHT - 8,
                        left: left - 2, width: 8,
                        cursor:'ew-resize', zIndex: 3,
                        borderRadius:'3px 0 0 3px',
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => e.target.style.background = `${barColor}88`}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    />
                    {/* Right drag handle */}
                    <div
                      className="gantt-bar-edge"
                      onMouseDown={(e) => handleEdgeDragStart(e, task.id, 'right')}
                      style={{
                        position:'absolute',
                        top: 4, height: ROW_HEIGHT - 8,
                        left: left + width - 6, width: 8,
                        cursor:'ew-resize', zIndex: 3,
                        borderRadius:'0 3px 3px 0',
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => e.target.style.background = `${barColor}88`}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    />
                  </div>
                </GanttBarTooltip>
              );
            })}

            {sortedTasks.length === 0 && (
              <div style={{padding:'3rem', textAlign:'center', color:'var(--text-muted)', fontSize:'0.85rem'}}>
                Gantt grafiğini görmek için görevlerinize başlangıç ve bitiş tarihi ekleyin.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Color legend */}
      <div style={{
        display:'flex', gap:'1.5rem', alignItems:'center', justifyContent:'center',
        marginTop:'0.75rem', padding:'0.5rem 1rem',
        background:'var(--bg-alt)', borderRadius:'6px', border:'1px solid var(--border)',
        flexWrap:'wrap'
      }}>
        <span style={{fontSize:'0.7rem', fontWeight:600, color:'var(--text-muted)'}}>Renk Kodları:</span>
        {Object.entries(statusColors).map(([id, color]) => (
          <div key={id} style={{display:'flex', alignItems:'center', gap:'0.3rem'}}>
            <span style={{width:12, height:12, borderRadius:'2px', background:`${color}cc`}}></span>
            <span style={{fontSize:'0.7rem', color:'var(--text-main)'}}>{statusLabels[id]}</span>
          </div>
        ))}
        <div style={{borderLeft:'1px solid var(--border)', paddingLeft:'1rem', display:'flex', gap:'1rem', flexWrap:'wrap'}}>
          {[...deadlineColors].sort((a,b) => b.days - a.days).filter(c => c.days <= 1).map((c, i) => (
            <div key={i} style={{display:'flex', alignItems:'center', gap:'0.3rem'}}>
              <span style={{width:12, height:12, borderRadius:'2px', background:`${c.hex}cc`}}></span>
              <span style={{fontSize:'0.7rem', color:'var(--text-main)'}}>{c.label}</span>
            </div>
          ))}
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'0.3rem', borderLeft:'1px solid var(--border)', paddingLeft:'1rem'}}>
          <span style={{width:12, height:2, background:'var(--primary)'}}></span>
          <span style={{fontSize:'0.7rem', color:'var(--text-main)'}}>Bugün</span>
        </div>
        <span style={{fontSize:'0.65rem', color:'var(--text-muted)', fontStyle:'italic'}}>
          ↔ Çubuk kenarlarından çekerek tarih değiştirin • Boş alana tıklayıp sürükleyerek kaydırın
        </span>
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => { setEditingTask(null); setModalOpen(false); }}
        defaultStatus="todo"
        editTask={editingTask}
      />
    </>
  );
}
