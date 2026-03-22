import React, { useState } from 'react';
import { useTasks } from '../context/TaskContext';
import TaskModal from './TaskModal';
import { Plus, GripVertical, User, Clock, AlertTriangle } from 'lucide-react';

const COLUMNS = [
  { id: 'todo', title: 'Yapılacak', color: '#ef4444', bgColor: 'rgba(239,68,68,0.08)' },
  { id: 'in-progress', title: 'Devam Eden', color: '#10b981', bgColor: 'rgba(16,185,129,0.08)' },
  { id: 'done', title: 'Tamamlandı', color: '#9ca3af', bgColor: 'rgba(156,163,175,0.08)' }
];

const KanbanCard = ({ task, onEdit, onDragStart }) => {
  const { tagsList, getUserColor } = useTasks();
  const prioColors = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };
  const prioLabels = { low: 'Düşük', medium: 'Orta', high: 'Yüksek' };

  let daysLeft = null;
  if (task.deadline && task.status !== 'done') {
    const today = new Date(); today.setHours(0,0,0,0);
    const dl = new Date(task.deadline); dl.setHours(0,0,0,0);
    daysLeft = Math.ceil((dl - today) / (1000*60*60*24));
  }

  const subtasksDone = task.subtasks?.filter(s => s.isCompleted).length || 0;
  const subtasksTotal = task.subtasks?.length || 0;

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('taskId', task.id); onDragStart(task.id); }}
      onClick={() => onEdit(task)}
      className="kanban-card"
      style={{ cursor: 'grab' }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.4rem' }}>
        <span style={{ fontWeight:600, fontSize:'0.8rem', color:'var(--text-main)', lineHeight:'1.3', flex:1 }}>{task.title}</span>
        <span className="prio-dot" style={{ width:8, height:8, borderRadius:'50%', background: prioColors[task.priority], flexShrink:0, marginTop:'0.3rem', marginLeft:'0.4rem' }}></span>
      </div>

      {task.customerName && (
        <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:'0.3rem' }}>
          🏢 {task.customerName}
        </div>
      )}

      <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', alignItems:'center', marginTop:'0.3rem' }}>
        {task.assignee && (
          <span style={{ display:'flex', alignItems:'center', gap:'0.2rem', fontSize:'0.65rem', color: getUserColor(task.assignee) || 'var(--text-muted)', fontWeight: getUserColor(task.assignee) ? 600 : 400, background:'var(--bg-alt)', padding:'0.15rem 0.4rem', borderRadius:'10px' }}>
            {getUserColor(task.assignee) && <span style={{width:6, height:6, borderRadius:'50%', background: getUserColor(task.assignee), flexShrink:0}}></span>}
            <User size={10}/> {task.assignee}
          </span>
        )}

        {daysLeft !== null && (
          <span style={{
            display:'flex', alignItems:'center', gap:'0.2rem',
            fontSize:'0.65rem',
            color: daysLeft < 0 ? '#ef4444' : daysLeft <= 3 ? '#f59e0b' : 'var(--text-muted)',
            fontWeight: daysLeft <= 3 ? 600 : 400,
            background: daysLeft < 0 ? 'rgba(239,68,68,0.1)' : daysLeft <= 3 ? 'rgba(245,158,11,0.1)' : 'var(--bg-alt)',
            padding:'0.15rem 0.4rem', borderRadius:'10px'
          }}>
            <Clock size={10}/>
            {daysLeft < 0 ? `${Math.abs(daysLeft)} gün gecikme` : daysLeft === 0 ? 'Bugün!' : `${daysLeft} gün`}
          </span>
        )}

        {subtasksTotal > 0 && (
          <span style={{ fontSize:'0.65rem', color: subtasksDone === subtasksTotal ? '#10b981' : 'var(--text-muted)', background:'var(--bg-alt)', padding:'0.15rem 0.4rem', borderRadius:'10px' }}>
            ✓ {subtasksDone}/{subtasksTotal}
          </span>
        )}

        {task.priority === 'high' && (
          <span style={{ fontSize:'0.65rem', color:'#ef4444', fontWeight:600 }}>
            <AlertTriangle size={10}/> Yüksek
          </span>
        )}
      </div>

      {task.tags && task.tags.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.25rem', marginTop:'0.3rem' }}>
          {task.tags.map(tag => (
            <span key={tag} style={{ fontSize:'0.6rem', padding:'0.1rem 0.35rem', borderRadius:'8px', background:'rgba(37,99,235,0.12)', color:'var(--primary)', fontWeight:500 }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default function KanbanView() {
  const { tasks, updateTaskStatus, updateTask, deleteTask, currentUser, usersList, isAdmin, hideAllTasksForUsers } = useTasks();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [defaultStatus, setDefaultStatus] = useState('todo');
  const [dragOverCol, setDragOverCol] = useState(null);

  const activeTasks = tasks.filter(t => {
    if (t.isDeleted) return false;
    if (hideAllTasksForUsers && !isAdmin && t.assignee !== currentUser) return false;
    return true;
  });

  const openNewTask = (status) => {
    setEditingTask(null);
    setDefaultStatus(status);
    setModalOpen(true);
  };

  const openEditModal = (task) => {
    if (task.isNewForAssignee && (!task.assignee || task.assignee === currentUser)) {
      updateTask(task.id, { isNewForAssignee: false });
    }
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      updateTaskStatus(taskId, targetStatus);
    }
    setDragOverCol(null);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    setDragOverCol(colId);
  };

  return (
    <>
      <div className="kanban-board">
        {COLUMNS.map(col => {
          const colTasks = activeTasks.filter(t => t.status === col.id);
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              className="kanban-column"
              onDrop={(e) => handleDrop(e, col.id)}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={() => setDragOverCol(null)}
              style={{
                borderTopColor: col.color,
                background: isOver ? col.bgColor : 'var(--bg-main)',
                transition: 'background 0.2s ease'
              }}
            >
              <div className="kanban-column-header">
                <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                  <span style={{ width:10, height:10, borderRadius:'50%', background: col.color }}></span>
                  <span style={{ fontWeight:600, fontSize:'0.85rem', color:'var(--text-main)' }}>{col.title}</span>
                  <span style={{ fontSize:'0.75rem', color:'var(--text-muted)', background:'var(--bg-alt)', padding:'0.1rem 0.5rem', borderRadius:'10px', fontWeight:600 }}>{colTasks.length}</span>
                </div>
                <button className="icon-btn" onClick={() => openNewTask(col.id)} title="Bu sütuna yeni görev ekle" style={{ padding:'2px' }}>
                  <Plus size={16}/>
                </button>
              </div>

              <div className="kanban-cards">
                {colTasks.length === 0 && (
                  <div style={{ textAlign:'center', padding:'2rem 1rem', color:'var(--text-muted)', fontSize:'0.8rem', fontStyle:'italic', border: '2px dashed var(--border)', borderRadius:'6px' }}>
                    Görevi buraya sürükleyin
                  </div>
                )}
                {colTasks.map(task => (
                  <KanbanCard key={task.id} task={task} onEdit={openEditModal} onDragStart={() => {}} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => { setEditingTask(null); setModalOpen(false); }}
        defaultStatus={defaultStatus}
        editTask={editingTask}
      />
    </>
  );
}
