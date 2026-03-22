import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useTasks } from '../context/TaskContext';
import TaskModal from './TaskModal';

const SCALE_OPTIONS = [
  { id: 'day', label: 'Gün', days: 1 },
  { id: 'week', label: 'Hafta', days: 7 },
  { id: 'month', label: 'Ay', days: 30 }
];

const statusColors = { 'todo': '#ef4444', 'in-progress': '#10b981', 'done': '#9ca3af' };
const statusLabels = { 'todo': 'Yapılacak', 'in-progress': 'Devam Eden', 'done': 'Tamamlandı' };

export default function GanttView() {
  const { tasks, updateTask, currentUser, getUserColor } = useTasks();
  const [scale, setScale] = useState('week');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [dragInfo, setDragInfo] = useState(null); // { taskId, edge: 'left'|'right', startX, origDate }
  const timelineRef = useRef(null);
  const leftPanelRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, scrollLeft: 0 });

  const activeTasks = tasks.filter(t => !t.isDeleted && t.startDate && t.deadline);

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
    if (task.isNewForAssignee && (!task.assignee || task.assignee === currentUser)) {
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

  const sortedTasks = [...activeTasks].sort((a, b) => {
    if (a.assignee !== b.assignee) return (a.assignee || '').localeCompare(b.assignee || '');
    return new Date(a.startDate) - new Date(b.startDate);
  });

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

      <div className="gantt-container" style={{ display:'flex', border:'1px solid var(--border)', borderRadius:'6px', overflow:'hidden', background:'var(--bg-main)', maxHeight: 'calc(100vh - 200px)' }}>
        {/* Left: Task info columns */}
        <div 
          ref={leftPanelRef}
          onScroll={handleLeftPanelScroll}
          style={{ minWidth:'380px', maxWidth:'420px', borderRight:'2px solid var(--border)', flexShrink:0, overflowY:'auto', overflowX:'hidden', scrollbarWidth:'none' }}
        >
          {/* Header */}
          <div style={{ height:'40px', display:'flex', alignItems:'center', background:'var(--bg-alt)', borderBottom:'1px solid var(--border)', position:'sticky', top:0, zIndex:2, fontSize:'0.7rem', fontWeight:600, color:'var(--text-main)' }}>
            <div style={{flex:1, padding:'0 0.5rem', minWidth:'150px'}}>Görev Adı</div>
            <div style={{width:'65px', textAlign:'center', borderLeft:'1px solid var(--border)', padding:'0 0.25rem'}}>Başlangıç</div>
            <div style={{width:'65px', textAlign:'center', borderLeft:'1px solid var(--border)', padding:'0 0.25rem'}}>Bitiş</div>
            <div style={{width:'75px', textAlign:'center', borderLeft:'1px solid var(--border)', padding:'0 0.25rem'}}>Durum</div>
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
                {task.assignee && (
                  <span style={{fontSize:'0.55rem', color: getUserColor(task.assignee) || 'var(--text-muted)', fontWeight: getUserColor(task.assignee) ? 600 : 400, marginLeft:'0.2rem', flexShrink:0}}>
                    ({task.assignee})
                  </span>
                )}
              </div>
              <div style={{width:'65px', textAlign:'center', color:'var(--text-muted)', borderLeft:'1px solid var(--border)', padding:'0 0.25rem'}}>
                {formatShortDate(task.startDate)}
              </div>
              <div style={{width:'65px', textAlign:'center', color:'var(--text-muted)', borderLeft:'1px solid var(--border)', padding:'0 0.25rem'}}>
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
              const barColor = statusColors[task.status];
              const isDone = task.status === 'done';

              return (
                <div key={task.id} style={{ height: ROW_HEIGHT, position:'relative', borderBottom:'1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-alt)' }}>
                  {/* Main bar */}
                  <div
                    className="gantt-bar"
                    onClick={() => openEdit(task)}
                    title={`${task.title}\n${task.assignee || 'Atanmamış'}\n${new Date(task.startDate).toLocaleDateString('tr-TR')} → ${new Date(task.deadline).toLocaleDateString('tr-TR')}`}
                    style={{
                      position:'absolute',
                      top: 4, height: ROW_HEIGHT - 8,
                      left, width,
                      background: isDone ? `${barColor}60` : `${barColor}cc`,
                      borderRadius:'3px', cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'0.6rem', color:'#fff', fontWeight:500,
                      overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis',
                      textDecoration: isDone ? 'line-through' : 'none',
                      opacity: isDone ? 0.5 : 1,
                    }}
                  >
                    {width > 60 && <span style={{padding:'0 6px'}}>{task.assignee || ''}</span>}
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
        <div style={{display:'flex', alignItems:'center', gap:'0.3rem'}}>
          <span style={{width:12, height:12, borderRadius:'2px', background:'#ef4444cc'}}></span>
          <span style={{fontSize:'0.7rem', color:'var(--text-main)'}}>Yapılacak</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'0.3rem'}}>
          <span style={{width:12, height:12, borderRadius:'2px', background:'#10b981cc'}}></span>
          <span style={{fontSize:'0.7rem', color:'var(--text-main)'}}>Devam Eden</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'0.3rem'}}>
          <span style={{width:12, height:12, borderRadius:'2px', background:'#9ca3afcc'}}></span>
          <span style={{fontSize:'0.7rem', color:'var(--text-main)'}}>Tamamlandı</span>
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
