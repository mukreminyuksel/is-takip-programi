import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth, googleProvider } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const TaskContext = createContext();

export const useTasks = () => useContext(TaskContext);

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [tagsList, setTagsList] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [appNotifications, setAppNotifications] = useState([]);
  
  const [authUser, setAuthUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // String name for backwards compatibility
  const [authLoading, setAuthLoading] = useState(true);

  // Authentication Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (!user) {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Database Listeners
  useEffect(() => {
    if (!authUser) {
      setTasks([]);
      setUsersList([]);
      return;
    }

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    const unsubTags = onSnapshot(collection(db, 'tagsList'), async (snapshot) => {
      const dbTags = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      if (dbTags.length === 0) {
        // Seed default tags
        const defaults = [
          { label: 'Web', color: '#3b82f6', order: 0 },
          { label: 'Tasar\u0131m', color: '#8b5cf6', order: 1 },
          { label: 'Mobil', color: '#06b6d4', order: 2 },
          { label: 'Acil', color: '#ef4444', order: 3 },
          { label: 'M\u00fc\u015fteri', color: '#f59e0b', order: 4 },
          { label: 'Bak\u0131m', color: '#10b981', order: 5 },
          { label: 'Rapor', color: '#6366f1', order: 6 },
          { label: 'Toplant\u0131', color: '#ec4899', order: 7 },
        ];
        for (const t of defaults) {
          try { await addDoc(collection(db, 'tagsList'), t); } catch(e) {}
        }
      } else {
        setTagsList(dbTags.sort((a,b) => (a.order||0) - (b.order||0)));
      }
    });

    const unsubUsers = onSnapshot(collection(db, 'usersList'), async (snapshot) => {
      const dbUsers = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      
      if (dbUsers.length === 0 && authUser) {
        const newAdmin = { 
          name: authUser.displayName || authUser.email, 
          role: 'admin', 
          email: authUser.email || '', 
          phone: '', whatsapp: '', finance: '',
          isOnline: true, lastLogin: new Date().toISOString()
        };
        try {
          await addDoc(collection(db, 'usersList'), newAdmin);
        } catch (e) { console.error("Could not create initial admin:", e); }
      } else {
        setUsersList(dbUsers);
        
        // Resolve strong identity mapping
        if (authUser) {
           let match = dbUsers.find(u => u.email && authUser.email && u.email.trim().toLowerCase() === authUser.email.trim().toLowerCase());
           
           // If logged in via phone number system (@istakip.com attached to authUser email)
           if (!match && authUser.email && authUser.email.includes('@istakip.com')) {
               const phonePrefix = authUser.email.split('@')[0];
               if (phonePrefix.length >= 10) {
                 const purePhone = phonePrefix.slice(-10);
                 match = dbUsers.find(u => {
                    const dbPhone = (u.phone || '').replace(/\D/g, '');
                    const dbWp = (u.whatsapp || '').replace(/\D/g, '');
                    return (dbPhone && dbPhone.endsWith(purePhone)) || (dbWp && dbWp.endsWith(purePhone));
                 });
               }
           }

           if (!match && authUser.displayName) {
               match = dbUsers.find(u => u.name.trim().toLowerCase() === authUser.displayName.trim().toLowerCase());
           }
           
           if (match) {
             setCurrentUser(match.name);
             if (!match.isOnline) {
                updateDoc(doc(db, 'usersList', match.id), { isOnline: true, lastLogin: new Date().toISOString() }).catch(()=>{});
             }
           } else {
             const fallbackName = authUser.displayName || authUser.email;
             setCurrentUser(fallbackName);
             if (!window.sessionStorage.getItem('ghostWarned_' + fallbackName)) {
                 window.sessionStorage.setItem('ghostWarned_' + fallbackName, 'true');
                 alert(`DİKKAT: Giriş yaptığınız hesap (${fallbackName}) sistemdeki hiçbir 'Personel Kartı' ile eşleşmedi!\n\nYetkilerinizi veya üzerinizdeki görevleri görebilmek için;\nLütfen yöneticinizden "Ayarlar > Personel Listesi" bölümündeki kaydınıza bu e-posta adresini (veya telefon numarasını) KUSURSUZ VE BİREBİR AYNI olacak şekilde yazmasını isteyiniz.`);
             }
           }
        }
      }
    });

    return () => {
      unsubTasks();
      unsubUsers();
      unsubTags();
    };
  }, [authUser]);

  const currentUserObj = usersList.find(u => u.name === currentUser) || { role: 'user' };
  const isAdmin = currentUserObj.role === 'admin';

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      alert("HATA: " + err.message + "\n\nOlası Neden: Firebase konsolundan 'Authentication > Sign-in method' bölümünde 'Google' provider'ını aktifleştirmemiş olabilirsiniz.");
    }
  };

  const loginWithEmail = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      alert("Giriş Hatalı: Lütfen bilgilerinizi (ve yetkileri) kontrol ediniz.\n\nOlası Neden: Firebase panelinden 'Email/Password' yöntemini açmamış olabilirsiniz.");
    }
  };

  const registerWithEmail = async (email, password) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      alert("Kayıt Olma Hatası: " + err.message);
    }
  };

  const logout = async () => {
    try { 
      const me = usersList.find(u => u.name === currentUser);
      if (me && me.id) await updateDoc(doc(db, 'usersList', me.id), { isOnline: false }).catch(()=>{});
      await signOut(auth); 
    } catch (e) {}
  };

  const addNotification = (message) => {
    const id = Date.now().toString() + Math.random().toString();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  };

  const addUser = async (userData) => { 
    try { await addDoc(collection(db, 'usersList'), userData); } catch (e) { addNotification("Hata"); }
  };
  const editUser = async (id, updatedData) => { 
    try { await updateDoc(doc(db, 'usersList', id), updatedData); } catch (e) { addNotification("Hata"); }
  };
  const deleteUser = async (id) => { 
    try { await deleteDoc(doc(db, 'usersList', id)); } catch (e) { addNotification("Hata"); }
  };

  const addTag = async (tagData) => {
    try { await addDoc(collection(db, 'tagsList'), { ...tagData, order: tagsList.length }); } catch (e) { addNotification("Etiket eklenemedi."); }
  };
  const editTag = async (id, data) => {
    try { await updateDoc(doc(db, 'tagsList', id), data); } catch (e) { addNotification("Hata"); }
  };
  const deleteTag = async (id) => {
    try { await deleteDoc(doc(db, 'tagsList', id)); } catch (e) { addNotification("Hata"); }
  };

  const triggerCommunicationSimulations = (assigneeName, taskTitle) => {
    // Kullanıcı talebi üzerine iletişim simülasyonu şimdilik inaktif edildi
    return;
  };

  const markAppNotificationAsRead = (id) => {
    setAppNotifications(prev => prev.map(n => {
      if (n.id === id) {
         return { ...n, readBy: [...(n.readBy || []), currentUser] };
      }
      return n;
    }));
  };

  const logAppEvent = async (text, author = null) => {
    try {
      const newNotification = {
        id: Date.now().toString() + Math.random().toString(),
        text,
        author: author || currentUser || 'Sistem',
        date: new Date().toISOString(),
        readBy: []
      };
      setAppNotifications(prev => [newNotification, ...prev]);
    } catch (e) {
      console.error(e);
    }
  };

  const addTask = async (task) => {
    try {
      const logs = [{ id: Date.now().toString(), text: `Görev oluşturuldu.`, user: currentUser, date: new Date().toISOString() }];
      await addDoc(collection(db, 'tasks'), { 
        ...task, date: new Date().toISOString(), isDeleted: false, isNewForAssignee: true, logs
      });
      if (task.assignee) {
        addNotification(`${task.assignee} adlı kullanıcıya yeni iş atandı.`);
        triggerCommunicationSimulations(task.assignee, task.title);
        logAppEvent(`Yeni iş atandı: '${task.title}'`, task.assignee);
      } else {
        logAppEvent(`Yeni görev oluşturuldu: '${task.title}'`);
      }
    } catch (e) { addNotification("Kayıt başarısız."); }
  };

  const updateTaskStatus = async (id, newStatus) => {
    const oldTask = tasks.find(t => t.id === id);
    if (!oldTask) return;
    try {
      let logs = oldTask.logs || [];
      if (oldTask.status !== newStatus) {
         const sm = {'todo':'Yapılacak','in-progress':'Devam Eden','done':'Tamamlandı'};
         logs.push({ id: Date.now().toString()+Math.random(), text: `Durum değiştirildi: '${sm[oldTask.status]||oldTask.status}' -> '${sm[newStatus]||newStatus}'`, user: currentUser, date: new Date().toISOString() });
         logAppEvent(`'${oldTask.title}' görevinin durumunu '${sm[newStatus]||newStatus}' yaptı.`, oldTask.assignee);
      }
      await updateDoc(doc(db, 'tasks', id), { status: newStatus, logs }); 
    } catch (e) {}
  };
  
  const updateTask = async (id, updatedData) => {
    const oldTask = tasks.find(t => t.id === id);
    if (!oldTask) return;
    try {
      let finalData = { ...updatedData };
      let logs = oldTask.logs || [];
      
      const pMap = {'low':'Düşük','medium':'Orta','high':'Yüksek'};
      const sMap = {'todo':'Yapılacak','in-progress':'Devam Eden','done':'Tamamlandı'};
      
      if (updatedData.title && oldTask.title !== updatedData.title) logs.push({ id: Date.now()+Math.random(), text: `Başlık değiştirildi: '${oldTask.title}' -> '${updatedData.title}'`, user: currentUser, date: new Date().toISOString() });
      if (updatedData.assignee !== undefined && oldTask.assignee !== updatedData.assignee) logs.push({ id: Date.now()+Math.random(), text: `Kişi değiştirildi: '${oldTask.assignee || 'Atanmamış'}' -> '${updatedData.assignee || 'Atanmamış'}'`, user: currentUser, date: new Date().toISOString() });
      if (updatedData.priority && oldTask.priority !== updatedData.priority) logs.push({ id: Date.now()+Math.random(), text: `Öncelik değiştirildi: '${pMap[oldTask.priority]}' -> '${pMap[updatedData.priority]}'`, user: currentUser, date: new Date().toISOString() });
      if (updatedData.startDate !== undefined && oldTask.startDate !== updatedData.startDate) logs.push({ id: Date.now()+Math.random(), text: `Başlangıç Tarihi değiştirildi: '${oldTask.startDate ? oldTask.startDate.split('T')[0] : '-'}' -> '${updatedData.startDate ? updatedData.startDate.split('T')[0] : '-'}'`, user: currentUser, date: new Date().toISOString() });
      if (updatedData.deadline !== undefined && oldTask.deadline !== updatedData.deadline) logs.push({ id: Date.now()+Math.random(), text: `Bitiş Tarihi değiştirildi: '${oldTask.deadline ? oldTask.deadline.split('T')[0] : '-'}' -> '${updatedData.deadline ? updatedData.deadline.split('T')[0] : '-'}'`, user: currentUser, date: new Date().toISOString() });
      if (updatedData.status && oldTask.status !== updatedData.status) logs.push({ id: Date.now()+Math.random(), text: `Durum güncellendi: '${sMap[oldTask.status]}' -> '${sMap[updatedData.status]}'`, user: currentUser, date: new Date().toISOString() });
      
      finalData.logs = logs;

      if (updatedData.assignee && oldTask.assignee !== updatedData.assignee) {
        addNotification(`${updatedData.assignee} adlı kullanıcıya iş atandı.`);
        triggerCommunicationSimulations(updatedData.assignee, updatedData.title || oldTask.title);
        finalData.isNewForAssignee = true;
        logAppEvent(`'${updatedData.title || oldTask.title}' görevini ${updatedData.assignee} adlı kullanıcıya atadı.`, updatedData.assignee);
      } else if (updatedData.status && oldTask.status !== updatedData.status) {
        const sM = {'todo':'Yapılacak','in-progress':'Devam Eden','done':'Tamamlandı'};
        logAppEvent(`'${updatedData.title || oldTask.title}' görevinin durumunu '${sM[updatedData.status]}' yaptı.`, oldTask.assignee);
      } else if (updatedData.deadline !== undefined && oldTask.deadline !== updatedData.deadline) {
        logAppEvent(`'${updatedData.title || oldTask.title}' görevinin hedefini güncelledi.`, oldTask.assignee);
      }
      await updateDoc(doc(db, 'tasks', id), finalData);
    } catch (e) {}
  };

  const deleteTask = async (id) => {
    if (!window.confirm('Bu görevi silmek istediğinize emin misiniz? (Görev çöp kutusuna taşınacaktır.)')) return;
    try {
      await updateDoc(doc(db, 'tasks', id), { isDeleted: true });
      addNotification('Görev silinenler kutusuna taşındı.');
    } catch (e) {}
  };

  const permanentDeleteTask = async (id) => {
    if (!isAdmin) {
      addNotification('HATA: Kalıcı silme işlemi için Admin yetkisi gereklidir!');
      return;
    }
    if (!window.confirm('Bu görevi KALICI olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
    try {
      await deleteDoc(doc(db, 'tasks', id));
      addNotification('Görev kalıcı olarak silindi.');
    } catch (e) {}
  };

  const restoreTask = async (id) => {
    try {
      await updateDoc(doc(db, 'tasks', id), { isDeleted: false });
      addNotification('Görev başarıyla geri yüklendi.');
    } catch (e) {}
  };

  return (
    <TaskContext.Provider value={{ 
      tasks, addTask, updateTaskStatus, updateTask, deleteTask, permanentDeleteTask, restoreTask, 
      notifications, appNotifications, markAppNotificationAsRead, currentUser, setCurrentUser, usersList, 
      addUser, editUser, deleteUser, isAdmin,
      tagsList, addTag, editTag, deleteTag,
      loginWithGoogle, loginWithEmail, registerWithEmail, logout, authLoading
    }}>
      {children}
    </TaskContext.Provider>
  );
};
