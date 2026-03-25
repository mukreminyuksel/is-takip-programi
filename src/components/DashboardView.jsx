import React, { useState, useMemo } from 'react';
import { useTasks } from '../context/TaskContext';
import TaskModal from './TaskModal';
import { TrendingUp, Clock, AlertTriangle, CheckCircle, ListTodo, Users, BarChart3 } from 'lucide-react';

export default function DashboardView() {
  const { tasks, usersList, currentUser, isAdmin, hideAllTasksForUsers, updateTask, getUserColor } = useTasks();
  const [editingTask, setEditingTask] = useState(null);

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const activeTasks = useMemo(() => tasks.filter(t => !t.isDeleted), [tasks]);

  const stats = useMemo(() => {
    const todo = activeTasks.filter(t => t.status === 'todo');
    const inProgress = activeTasks.filter(t => t.status === 'in-progress');
    const done = activeTasks.filter(t => t.status === 'done');

    const overdue = activeTasks.filter(t => {
      if (t.status === 'done' || !t.deadline) return false;
      const dl = new Date(t.deadline); dl.setHours(0,0,0,0);
      return dl < today;
    });

    const dueToday = activeTasks.filter(t => {
      if (t.status === 'done' || !t.deadline) return false;
      const dl = new Date(t.deadline); dl.setHours(0,0,0,0);
      return dl.getTime() === today.getTime();
    });

    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const completedThisWeek = done.filter(t => {
      if (!t.logs || t.logs.length === 0) return false;
      const lastLog = t.logs[t.logs.length - 1];
      return lastLog.date && new Date(lastLog.date) >= weekAgo;
    });

    const weeklyRate = activeTasks.length > 0
      ? Math.round((completedThisWeek.length / Math.max(1, todo.length + inProgress.length + completedThisWeek.length)) * 100)
      : 0;

    // My tasks
    const myTasks = activeTasks.filter(t => t.assignee === currentUser);
    const myOverdue = myTasks.filter(t => {
      if (t.status === 'done' || !t.deadline) return false;
      const dl = new Date(t.deadline); dl.setHours(0,0,0,0);
      return dl < today;
    });

    return {
      total: activeTasks.length, todo: todo.length, inProgress: inProgress.length, done: done.length,
      overdue: overdue.length, dueToday: dueToday.length,
      completedThisWeek: completedThisWeek.length, weeklyRate,
      myTotal: myTasks.length, myOverdue: myOverdue.length,
      overdueList: overdue, dueTodayList: dueToday
    };
  }, [activeTasks, today, currentUser]);

  // Per-person stats
  const personStats = useMemo(() => {
    if (!isAdmin && hideAllTasksForUsers) return [];
    return usersList.map(u => {
      const uTasks = activeTasks.filter(t => t.assignee === u.name);
      const uTodo = uTasks.filter(t => t.status === 'todo').length;
      const uInProgress = uTasks.filter(t => t.status === 'in-progress').length;
      const uDone = uTasks.filter(t => t.status === 'done').length;
      const uOverdue = uTasks.filter(t => {
        if (t.status === 'done' || !t.deadline) return false;
        const dl = new Date(t.deadline); dl.setHours(0,0,0,0);
        return dl < today;
      }).length;
      return { name: u.name, color: u.color, total: uTasks.length, todo: uTodo, inProgress: uInProgress, done: uDone, overdue: uOverdue };
    }).filter(u => u.total > 0).sort((a, b) => b.overdue - a.overdue || b.total - a.total);
  }, [activeTasks, usersList, today, isAdmin, hideAllTasksForUsers]);

  const openTask = (task) => {
    if (task.isNewForAssignee && (!task.assignee || task.assignee === currentUser)) {
      updateTask(task.id, { isNewForAssignee: false });
    }
    setEditingTask(task);
  };

  const KpiCard = ({ icon, label, value, color, sub }) => (
    <div style={{
      flex:'1 1 160px', minWidth:'140px', padding:'1rem 1.2rem', background:'var(--bg-main)',
      border:'1px solid var(--border)', borderRadius:'10px', borderLeft:`4px solid ${color}`,
      display:'flex', flexDirection:'column', gap:'0.3rem'
    }}>
      <div style={{display:'flex', alignItems:'center', gap:'0.4rem', color:'var(--text-muted)', fontSize:'0.75rem'}}>
        {icon} {label}
      </div>
      <div style={{fontSize:'1.8rem', fontWeight:800, color, lineHeight:1}}>{value}</div>
      {sub && <div style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>{sub}</div>}
    </div>
  );

  const TaskRow = ({ task }) => {
    const dl = task.deadline ? new Date(task.deadline) : null;
    let daysText = '';
    if (dl) {
      dl.setHours(0,0,0,0);
      const diff = Math.ceil((dl - today) / (1000*60*60*24));
      if (diff < 0) daysText = `${Math.abs(diff)} gün gecikmiş`;
      else if (diff === 0) daysText = 'Bugün!';
      else daysText = `${diff} gün kaldı`;
    }
    const statusColor = { 'todo': '#ef4444', 'in-progress': '#10b981', 'done': '#9ca3af' };
    return (
      <div
        onClick={() => openTask(task)}
        style={{display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.5rem 0.7rem', borderBottom:'1px solid var(--border)', cursor:'pointer', fontSize:'0.8rem', transition:'background 0.15s'}}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-alt)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{width:7, height:7, borderRadius:'50%', background: statusColor[task.status], flexShrink:0}}></span>
        <span style={{flex:1, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text-main)'}}>{task.title}</span>
        {task.assignee && <span style={{fontSize:'0.7rem', color: getUserColor(task.assignee) || 'var(--text-muted)', fontWeight: getUserColor(task.assignee) ? 600 : 400}}>{task.assignee}</span>}
        {daysText && <span style={{fontSize:'0.65rem', color: daysText.includes('gecikmiş') ? '#ef4444' : daysText === 'Bugün!' ? '#f59e0b' : 'var(--text-muted)', fontWeight:600, whiteSpace:'nowrap'}}>{daysText}</span>}
      </div>
    );
  };

  return (
    <>
      <div style={{padding:'0.5rem 0'}}>
        <h2 style={{margin:'0 0 1rem', fontSize:'1rem', fontWeight:700, color:'var(--text-main)', textTransform:'uppercase', display:'flex', alignItems:'center', gap:'0.5rem'}}>
          <BarChart3 size={18}/> Özet Pano
        </h2>

        {/* KPI Cards */}
        <div style={{display:'flex', gap:'0.75rem', flexWrap:'wrap', marginBottom:'1.2rem'}}>
          <KpiCard icon={<ListTodo size={14}/>} label="Toplam Görev" value={stats.total} color="#3b82f6" sub={`${stats.todo} yapılacak, ${stats.inProgress} devam eden`} />
          <KpiCard icon={<AlertTriangle size={14}/>} label="Geciken" value={stats.overdue} color="#ef4444" sub={stats.overdue > 0 ? 'Acil ilgi gerekiyor' : 'Harika!'} />
          <KpiCard icon={<Clock size={14}/>} label="Bugün Biten" value={stats.dueToday} color="#f59e0b" sub="Bugün teslim edilmeli" />
          <KpiCard icon={<CheckCircle size={14}/>} label="Bu Hafta Tamamlanan" value={stats.completedThisWeek} color="#10b981" sub={`Haftalık oran: %${stats.weeklyRate}`} />
          <KpiCard icon={<TrendingUp size={14}/>} label="Tamamlanan" value={stats.done} color="#8b5cf6" sub={stats.total > 0 ? `%${Math.round(stats.done / stats.total * 100)} tamamlanma` : ''} />
        </div>

        <div style={{display:'flex', gap:'1rem', flexWrap:'wrap'}}>
          {/* Overdue & Due Today Lists */}
          <div style={{flex:'1 1 350px', minWidth:'300px'}}>
            {stats.overdueList.length > 0 && (
              <div style={{marginBottom:'1rem', border:'1px solid #fecaca', borderRadius:'8px', overflow:'hidden'}}>
                <div style={{padding:'0.5rem 0.8rem', background:'#fef2f2', borderBottom:'1px solid #fecaca', display:'flex', alignItems:'center', gap:'0.4rem'}}>
                  <AlertTriangle size={14} color="#ef4444"/>
                  <span style={{fontSize:'0.8rem', fontWeight:700, color:'#dc2626'}}>Geciken Görevler ({stats.overdueList.length})</span>
                </div>
                <div style={{maxHeight:'200px', overflowY:'auto'}}>
                  {stats.overdueList.map(t => <TaskRow key={t.id} task={t} />)}
                </div>
              </div>
            )}

            {stats.dueTodayList.length > 0 && (
              <div style={{marginBottom:'1rem', border:'1px solid #fde68a', borderRadius:'8px', overflow:'hidden'}}>
                <div style={{padding:'0.5rem 0.8rem', background:'#fffbeb', borderBottom:'1px solid #fde68a', display:'flex', alignItems:'center', gap:'0.4rem'}}>
                  <Clock size={14} color="#f59e0b"/>
                  <span style={{fontSize:'0.8rem', fontWeight:700, color:'#d97706'}}>Bugün Biten Görevler ({stats.dueTodayList.length})</span>
                </div>
                <div style={{maxHeight:'200px', overflowY:'auto'}}>
                  {stats.dueTodayList.map(t => <TaskRow key={t.id} task={t} />)}
                </div>
              </div>
            )}

            {stats.overdueList.length === 0 && stats.dueTodayList.length === 0 && (
              <div style={{padding:'2rem', textAlign:'center', color:'var(--text-muted)', fontSize:'0.85rem', border:'1px solid var(--border)', borderRadius:'8px', background:'var(--bg-main)'}}>
                Geciken veya bugün biten görev yok. Harika!
              </div>
            )}
          </div>

          {/* Person Stats Table */}
          {personStats.length > 0 && (
            <div style={{flex:'1 1 400px', minWidth:'350px'}}>
              <div style={{border:'1px solid var(--border)', borderRadius:'8px', overflow:'hidden'}}>
                <div style={{padding:'0.5rem 0.8rem', background:'var(--bg-alt)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:'0.4rem'}}>
                  <Users size={14} color="var(--primary)"/>
                  <span style={{fontSize:'0.8rem', fontWeight:700, color:'var(--text-main)'}}>Ekip Performansı</span>
                </div>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.75rem'}}>
                    <thead>
                      <tr style={{background:'var(--bg-alt)'}}>
                        <th style={{padding:'0.4rem 0.6rem', textAlign:'left', borderBottom:'1px solid var(--border)', fontWeight:600, color:'var(--text-main)'}}>Kişi</th>
                        <th style={{padding:'0.4rem 0.5rem', textAlign:'center', borderBottom:'1px solid var(--border)', fontWeight:600, color:'var(--text-muted)'}}>Toplam</th>
                        <th style={{padding:'0.4rem 0.5rem', textAlign:'center', borderBottom:'1px solid var(--border)', fontWeight:600, color:'#ef4444'}}>Yapılacak</th>
                        <th style={{padding:'0.4rem 0.5rem', textAlign:'center', borderBottom:'1px solid var(--border)', fontWeight:600, color:'#10b981'}}>Devam</th>
                        <th style={{padding:'0.4rem 0.5rem', textAlign:'center', borderBottom:'1px solid var(--border)', fontWeight:600, color:'#9ca3af'}}>Bitti</th>
                        <th style={{padding:'0.4rem 0.5rem', textAlign:'center', borderBottom:'1px solid var(--border)', fontWeight:600, color:'#dc2626'}}>Geciken</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personStats.map(p => (
                        <tr key={p.name} style={{borderBottom:'1px solid var(--border)'}}>
                          <td style={{padding:'0.4rem 0.6rem'}}>
                            <div style={{display:'flex', alignItems:'center', gap:'0.3rem'}}>
                              <span style={{width:8, height:8, borderRadius:'50%', background: p.color || '#6b7280', flexShrink:0}}></span>
                              <span style={{fontWeight:600, color: p.color || 'var(--text-main)'}}>{p.name}</span>
                              {p.name === currentUser && <span style={{fontSize:'0.6rem', color:'var(--primary)', fontWeight:400}}>(siz)</span>}
                            </div>
                          </td>
                          <td style={{textAlign:'center', padding:'0.4rem 0.5rem', fontWeight:600}}>{p.total}</td>
                          <td style={{textAlign:'center', padding:'0.4rem 0.5rem', color:'#ef4444', fontWeight: p.todo > 0 ? 600 : 400}}>{p.todo}</td>
                          <td style={{textAlign:'center', padding:'0.4rem 0.5rem', color:'#10b981', fontWeight: p.inProgress > 0 ? 600 : 400}}>{p.inProgress}</td>
                          <td style={{textAlign:'center', padding:'0.4rem 0.5rem', color:'#9ca3af'}}>{p.done}</td>
                          <td style={{textAlign:'center', padding:'0.4rem 0.5rem', color: p.overdue > 0 ? '#dc2626' : 'var(--text-muted)', fontWeight: p.overdue > 0 ? 700 : 400, background: p.overdue > 0 ? 'rgba(239,68,68,0.08)' : 'transparent'}}>{p.overdue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <TaskModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        defaultStatus="todo"
        editTask={editingTask}
      />
    </>
  );
}
