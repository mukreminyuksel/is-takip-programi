import React, { useState, useEffect } from 'react';
import { useTasks } from '../context/TaskContext';
import { X, RefreshCcw, Trash2 } from 'lucide-react';

export default function DeletedTasksModal({ isOpen, onClose }) {
  const { tasks, restoreTask, permanentDeleteTask, isAdmin } = useTasks();

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

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

  const deletedTasks = tasks.filter(t => t.isDeleted);

  return (
    <div className="modal-overlay" onMouseDown={onClose} style={{ zIndex: 1050 }}>
      <div 
        className="modal-content" 
        style={{maxWidth: '800px', transform: `translate(${position.x}px, ${position.y}px)`, transition: isDragging ? 'none' : 'transform 0.1s ease', resize: 'both', position: 'relative'}} 
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="modal-header" onMouseDown={startDrag} style={{ cursor: 'move' }}>
          <h2>Silinen Görevler (Geri Dönüşüm Kutusu)</h2>
          <div onMouseDown={e => e.stopPropagation()}>
            <button className="icon-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>
        
        <div className="settings-body" style={{padding: '1.5rem'}}>
          {!isAdmin && (
            <div style={{marginBottom: '1rem', padding: '0.75rem', background: '#fef2f2', color: '#991b1b', borderRadius: '4px', fontSize: '0.85rem'}}>
              <strong>Bilgi:</strong> Sadece "Admin" yetkisine sahip kullanıcılar çöpteki öğeleri kalıcı olarak silebilir. Öğeleri geri yükleyebilirsiniz.
            </div>
          )}
          <div className="table-container">
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Görev Adı</th>
                  <th>Silinme Durumu</th>
                  <th>Eski Sahibi</th>
                  <th style={{width: '90px'}}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {deletedTasks.map(t => (
                  <tr key={t.id}>
                    <td style={{fontWeight: 500, color: 'var(--text-muted)'}}>{t.title}</td>
                    <td><span style={{color: '#ef4444', fontSize: '0.8rem', fontWeight: 600}}>Silindi</span></td>
                    <td>{t.assignee || '-'}</td>
                    <td>
                      <button className="icon-btn" onClick={() => restoreTask(t.id)} title="Geri Yükle" style={{color: '#10b981'}}><RefreshCcw size={14}/></button>
                      {isAdmin && (
                        <button className="icon-btn delete-btn" onClick={() => permanentDeleteTask(t.id)} title="Kalıcı Olarak Sil"><Trash2 size={14}/></button>
                      )}
                    </td>
                  </tr>
                ))}
                {deletedTasks.length === 0 && (
                  <tr><td colSpan="4" className="empty-row" style={{textAlign:'center', padding:'1rem'}}>Çöp kutusu boş.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
