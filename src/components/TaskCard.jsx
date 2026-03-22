import React from 'react';
import { useTasks } from '../context/TaskContext';
import { Trash2, AlertCircle, Calendar, User, Edit2 } from 'lucide-react';

const priorityColors = {
  low: '#10b981', 
  medium: '#f59e0b',
  high: '#ef4444'
};
const priorityLabels = { low: 'Düşük', medium: 'Orta', high: 'Yüksek' };

export default function TaskCard({ task, onEdit }) {
  const { deleteTask, getUserColor } = useTasks();

  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  const deadlinePassed = task.deadline && new Date(task.deadline) < new Date(new Date().setHours(0,0,0,0));
  
  return (
    <div 
      className="task-card" 
      draggable 
      onDragStart={handleDragStart}
    >
      <div className="task-header">
        <span 
          className="priority-badge"
          style={{ 
            backgroundColor: `${priorityColors[task.priority]}15`,
            color: priorityColors[task.priority],
            border: `1px solid ${priorityColors[task.priority]}40`
          }}
        >
          <AlertCircle size={12} style={{marginRight: '4px'}}/>
          {priorityLabels[task.priority]}
        </span>
        <div className="card-actions" style={{ display: 'flex', gap: '4px' }}>
          <button className="icon-btn" onClick={onEdit} title="Düzenle">
            <Edit2 size={16} />
          </button>
          <button className="icon-btn delete-btn" onClick={() => deleteTask(task.id)} title="Sil">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <h3 className="task-title" onClick={onEdit} style={{ cursor: 'pointer' }}>{task.title}</h3>
      {task.description && <p className="task-desc">{task.description}</p>}
      
      <div className="task-meta">
        {task.assignee && (
          <span className="meta-badge assignee" style={getUserColor(task.assignee) ? {color: getUserColor(task.assignee), fontWeight: 600, borderColor: getUserColor(task.assignee) + '40'} : {}}>
            {getUserColor(task.assignee) && <span style={{width:7, height:7, borderRadius:'50%', background: getUserColor(task.assignee), display:'inline-block', marginRight:'3px'}}></span>}
            <User size={12} style={{marginRight: '4px'}}/>
            {task.assignee}
          </span>
        )}
        {task.deadline && (
          <span className={`meta-badge deadline ${deadlinePassed ? 'overdue' : ''}`}>
            <Calendar size={12} style={{marginRight: '4px'}}/>
            {new Date(task.deadline).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
          </span>
        )}
      </div>
    </div>
  );
}
