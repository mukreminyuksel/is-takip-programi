import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useCompany } from './CompanyContext';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updatePassword, deleteUser as deleteAuthUser } from 'firebase/auth';

const TaskContext = createContext();

export const useTasks = () => useContext(TaskContext);

const DEFAULT_DEADLINE_COLORS = [
  { days: 7, color: 'rgba(253, 224, 71, 0.15)', label: '7 gün', hex: '#fde047', alpha: 0.15 },
  { days: 5, color: 'rgba(250, 204, 21, 0.18)', label: '5 gün', hex: '#facc15', alpha: 0.18 },
  { days: 3, color: 'rgba(245, 158, 11, 0.20)', label: '3 gün', hex: '#f59e0b', alpha: 0.20 },
  { days: 2, color: 'rgba(239, 68, 68, 0.20)', label: '2 gün', hex: '#ef4444', alpha: 0.20 },
  { days: 1, color: 'rgba(185, 28, 28, 0.25)', label: '1 gün', hex: '#b91c1c', alpha: 0.25 },
  { days: 0, color: 'rgba(168, 85, 247, 0.22)', label: 'Son gün (pembemsi mor)', hex: '#a855f7', alpha: 0.22 },
  { days: -1, color: 'rgba(124, 58, 237, 0.25)', label: 'Süresi geçmiş (mor)', hex: '#7c3aed', alpha: 0.25 },
];

export const TaskProvider = ({ children }) => {
  const { companyFirebase, selectedCompany, registerEmailToCompany } = useCompany();
  const db = companyFirebase?.db || null;
  const auth = companyFirebase?.auth || null;
  const googleProvider = companyFirebase?.googleProvider || null;
  const secondaryAuth = companyFirebase?.secondaryAuth || null;

  const [tasks, setTasks] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [tagsList, setTagsList] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [appNotifications, setAppNotifications] = useState([]);
  const [hideAllTasksForUsers, setHideAllTasksForUsers] = useState(false);
  const [customersList, setCustomersList] = useState([]);
  const [deadlineColors, setDeadlineColors] = useState(DEFAULT_DEADLINE_COLORS);

  const [authUser, setAuthUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const companyId = selectedCompany?.id || null;

  // Reset state when company changes
  useEffect(() => {
    setTasks([]);
    setUsersList([]);
    setTagsList([]);
    setAppNotifications([]);
    setCustomersList([]);
    setHideAllTasksForUsers(false);
    setAuthUser(null);
    setCurrentUser(null);
    setAuthLoading(!!companyId);
  }, [companyId]);

  // Authentication Listener
  useEffect(() => {
    if (!auth) { setAuthLoading(false); return; }
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (!user) {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, [companyId]);

  // Database Listeners
  useEffect(() => {
    if (!authUser || !db) {
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
          if (authUser.email && selectedCompany?.id) registerEmailToCompany(authUser.email, selectedCompany.id);
        } catch (e) { /* silent */ }
      } else {
        const activeUsers = dbUsers.filter(u => !u.isDeleted);
        setUsersList(activeUsers);

        if (authUser) {
           let match = activeUsers.find(u => u.email && authUser.email && u.email.trim().toLowerCase() === authUser.email.trim().toLowerCase());

           if (!match && authUser.email && authUser.email.includes('@tasktrack.net')) {
               const phonePrefix = authUser.email.split('@')[0];
               if (phonePrefix.length >= 10) {
                 const purePhone = phonePrefix.slice(-10);
                 match = activeUsers.find(u => {
                    const dbPhone = (u.phone || '').replace(/\D/g, '');
                    const dbWp = (u.whatsapp || '').replace(/\D/g, '');
                    return (dbPhone && dbPhone.endsWith(purePhone)) || (dbWp && dbWp.endsWith(purePhone));
                 });
               }
           }

           if (!match && authUser.displayName) {
               match = activeUsers.find(u => u.name.trim().toLowerCase() === authUser.displayName.trim().toLowerCase());
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

    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setHideAllTasksForUsers(data.hideAllTasksForUsers || false);
        if (data.deadlineColors && Array.isArray(data.deadlineColors)) {
          setDeadlineColors(data.deadlineColors);
        }
      }
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomersList(snapshot.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    const unsubAppNotifs = onSnapshot(collection(db, 'appNotifications'), (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      notifs.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAppNotifications(notifs);

      // 7 günden eski bildirimleri temizle
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      notifs.forEach(n => {
        if (n.date && new Date(n.date) < sevenDaysAgo) {
          deleteDoc(doc(db, 'appNotifications', n.id)).catch(() => {});
        }
      });
    });

    return () => {
      unsubTasks();
      unsubUsers();
      unsubTags();
      unsubSettings();
      unsubCustomers();
      unsubAppNotifs();
    };
  }, [authUser, companyId]);

  const currentUserObj = usersList.find(u => u.name === currentUser) || { role: 'user' };
  const isAdmin = currentUserObj.role === 'admin';

  const getUserColor = (userName) => {
    if (!userName) return null;
    const user = usersList.find(u => u.name === userName);
    return user?.color || null;
  };

  const updateUserColor = async (userId, color) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'usersList', userId), { color });
    } catch (e) {
      addNotification('Renk güncellenemedi.');
    }
  };

  const toggleHideAllTasks = async (value) => {
    if (!db) return;
    try {
      await setDoc(doc(db, 'settings', 'general'), { hideAllTasksForUsers: value }, { merge: true });
    } catch (e) {
      addNotification('Ayar güncellenemedi.');
    }
  };

  const saveDeadlineColors = async (colors) => {
    if (!db) return;
    try {
      setDeadlineColors(colors);
      await setDoc(doc(db, 'settings', 'general'), { deadlineColors: colors }, { merge: true });
    } catch (e) {
      addNotification('Renk ayarları kaydedilemedi.');
    }
  };

  // Helper: returns array of assignees from task (supports both old single-string and new array format)
  const getAssignees = (task) => {
    if (!task) return [];
    if (Array.isArray(task.assignees) && task.assignees.length > 0) return task.assignees;
    if (task.assignee) return [task.assignee];
    return [];
  };

  const sortedDeadlineColors = useMemo(() => [...deadlineColors].sort((a, b) => a.days - b.days), [deadlineColors]);

  const getDeadlineRowColor = (daysLeft, isDone) => {
    if (isDone || daysLeft === null) return 'transparent';
    if (daysLeft < 0) {
      const overdue = sortedDeadlineColors.find(c => c.days === -1);
      return overdue ? overdue.color : 'rgba(124, 58, 237, 0.25)';
    }
    for (const entry of sortedDeadlineColors) {
      if (entry.days < 0) continue;
      if (daysLeft <= entry.days) return entry.color;
    }
    return 'transparent';
  };

  const getDeadlineBarColor = (daysLeft, isDone, defaultColor) => {
    if (isDone) return `${defaultColor}60`;
    if (daysLeft === null) return `${defaultColor}cc`;
    if (daysLeft < 0) {
      const overdue = sortedDeadlineColors.find(c => c.days === -1);
      return overdue ? overdue.hex + 'cc' : '#7c3aedcc';
    }
    if (daysLeft <= 1) {
      const lastDay = sortedDeadlineColors.find(c => c.days === 0 || c.days === 1);
      return lastDay ? lastDay.hex + 'cc' : '#a855f7cc';
    }
    return `${defaultColor}cc`;
  };

  const loginWithGoogle = async () => {
    if (!auth || !googleProvider) return;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      /* error handled via alert */
      alert("HATA: " + err.message + "\n\nOlası Neden: Firebase konsolundan 'Authentication > Sign-in method' bölümünde 'Google' provider'ını aktifleştirmemiş olabilirsiniz.");
    }
  };

  const loginWithEmail = async (email, password) => {
    if (!auth) return;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      /* error handled via alert */
      alert("Giriş Hatalı: Lütfen bilgilerinizi (ve yetkileri) kontrol ediniz.\n\nOlası Neden: Firebase panelinden 'Email/Password' yöntemini açmamış olabilirsiniz.");
    }
  };

  const registerWithEmail = async (email, password) => {
    if (!auth) return;
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      /* error handled via alert */
      alert("Kayıt Olma Hatası: " + err.message);
    }
  };

  const publicResetPassword = async (email) => {
    if (!auth) return { success: false, error: 'Firebase bağlantısı yok' };
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (err) {
      let msg = err.message;
      if (err.code === 'auth/user-not-found') msg = 'Bu e-posta adresine ait hesap bulunamadı.';
      else if (err.code === 'auth/invalid-email') msg = 'Geçersiz e-posta adresi.';
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    if (!auth || !db) return;
    try {
      const me = usersList.find(u => u.name === currentUser);
      if (me && me.id) await updateDoc(doc(db, 'usersList', me.id), { isOnline: false }).catch(()=>{});
      await signOut(auth);
    } catch (e) {}
  };

  // Tarayıcı kapanınca / sayfa değişince isOnline false yap
  useEffect(() => {
    if (!db || !currentUser) return;
    const handleOffline = () => {
      const me = usersList.find(u => u.name === currentUser);
      if (me?.id) {
        updateDoc(doc(db, 'usersList', me.id), { isOnline: false }).catch(() => {});
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') handleOffline();
      else if (document.visibilityState === 'visible') {
        const me = usersList.find(u => u.name === currentUser);
        if (me?.id) updateDoc(doc(db, 'usersList', me.id), { isOnline: true, lastLogin: new Date().toISOString() }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('beforeunload', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [db, currentUser, usersList]);

  const addNotification = (message) => {
    const id = Date.now().toString() + Math.random().toString();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  };

  const addUser = async (userData) => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'usersList'), userData);
      // emailMap sync
      if (userData.email && selectedCompany?.id) registerEmailToCompany(userData.email, selectedCompany.id);
      if (userData.authEmail && selectedCompany?.id) registerEmailToCompany(userData.authEmail, selectedCompany.id);
    } catch (e) { addNotification("Hata"); }
  };
  const editUser = async (id, updatedData) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'usersList', id), updatedData);
      // emailMap sync
      if (updatedData.email && selectedCompany?.id) registerEmailToCompany(updatedData.email, selectedCompany.id);
      if (updatedData.authEmail && selectedCompany?.id) registerEmailToCompany(updatedData.authEmail, selectedCompany.id);
    } catch (e) { addNotification("Hata"); }
  };
  const deleteUser = async (id) => {
    if (!db) return;
    const user = usersList.find(u => u.id === id);
    if (!user) return;

    const activeTasks = tasks.filter(t => getAssignees(t).includes(user.name) && !t.isDeleted && t.status !== 'done');
    if (activeTasks.length > 0) {
      alert(`"${user.name}" üzerinde ${activeTasks.length} adet aktif görev bulunmaktadır!\n\nBu kullanıcıyı silmeden önce üzerindeki görevleri başka bir kullanıcıya atamalısınız.\n\nAktif görevler:\n${activeTasks.map(t => `- ${t.title}`).join('\n')}`);
      return;
    }

    const allUserTasks = tasks.filter(t => getAssignees(t).includes(user.name) && !t.isDeleted);
    let confirmMsg = `"${user.name}" adlı kullanıcıyı silmek istediğinize emin misiniz?`;
    if (allUserTasks.length > 0) {
      confirmMsg += `\n\n(${allUserTasks.length} adet tamamlanmış görevi bulunmaktadır. Görev geçmişindeki notlar ve loglar korunacaktır.)`;
    }
    if (!window.confirm(confirmMsg)) return;

    try {
      await updateDoc(doc(db, 'usersList', id), { isDeleted: true, deletedAt: new Date().toISOString() });
      addNotification(`"${user.name}" kullanıcısı silindi.`);
      logAppEvent(`"${user.name}" kullanıcısı silindi.`);
    } catch (e) { addNotification("Hata"); }
  };

  const addTag = async (tagData) => {
    if (!db) return;
    try { await addDoc(collection(db, 'tagsList'), { ...tagData, order: tagsList.length }); } catch (e) { addNotification("Etiket eklenemedi."); }
  };
  const editTag = async (id, data) => {
    if (!db) return;
    try { await updateDoc(doc(db, 'tagsList', id), data); } catch (e) { addNotification("Hata"); }
  };
  const deleteTag = async (id) => {
    if (!db) return;
    try { await deleteDoc(doc(db, 'tagsList', id)); } catch (e) { addNotification("Hata"); }
  };

  const addCustomer = async (customerData) => {
    if (!db) return;
    try { await addDoc(collection(db, 'customers'), { ...customerData, createdAt: new Date().toISOString() }); } catch (e) { addNotification("Müşteri eklenemedi."); }
  };
  const editCustomer = async (id, updatedData) => {
    if (!db) return;
    try { await updateDoc(doc(db, 'customers', id), { ...updatedData, updatedAt: new Date().toISOString() }); } catch (e) { addNotification("Müşteri güncellenemedi."); }
  };
  const deleteCustomer = async (id) => {
    if (!db) return;
    if (!window.confirm('Bu müşteri kaydını silmek istediğinize emin misiniz?')) return;
    try { await deleteDoc(doc(db, 'customers', id)); } catch (e) { addNotification("Hata"); }
  };
  const saveCustomerFromTask = async (taskData) => {
    if (!db || !taskData.customerName) return;
    const existing = customersList.find(c => c.customerName && c.customerName.trim().toLowerCase() === taskData.customerName.trim().toLowerCase());
    const custFields = {
      customerName: taskData.customerName || '',
      customerOfficialName: taskData.customerOfficialName || taskData.customerName || '',
      customerPhone: taskData.customerPhone || '',
      customerEmail: taskData.customerEmail || '',
      customerPhone2: taskData.customerPhone2 || '',
      customerAddress: taskData.customerAddress || '',
      customerTaxNo: taskData.customerTaxNo || '',
      customerTaxOffice: taskData.customerTaxOffice || '',
      customerTradeRegNo: taskData.customerTradeRegNo || ''
    };
    if (existing) {
      await updateDoc(doc(db, 'customers', existing.id), { ...custFields, updatedAt: new Date().toISOString() });
    } else {
      await addDoc(collection(db, 'customers'), { ...custFields, createdAt: new Date().toISOString() });
    }
  };

  const sendEmailNotification = async (toName, subject, htmlBody) => {
    const emailGasUrl = selectedCompany?.emailGasUrl;
    if (!emailGasUrl) return;
    const user = usersList.find(u => u.name === toName);
    const email = user?.email;
    if (!email) return;
    try {
      const params = new URLSearchParams();
      params.append('action', 'sendEmail');
      params.append('to', email);
      params.append('subject', subject);
      params.append('body', htmlBody);
      fetch(emailGasUrl, { method: 'POST', body: params, redirect: 'follow' }).catch(() => {});
    } catch (e) { /* silent fail */ }
  };

  const triggerCommunicationSimulations = (assigneeName, taskTitle) => {
    if (selectedCompany?.emailNotifyOnAssign !== false) {
      sendEmailNotification(
        assigneeName,
        `TaskTrack - Yeni Görev: ${taskTitle}`,
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#2563eb">Yeni Görev Atandı</h2><p><strong>${assigneeName}</strong>, size yeni bir görev atandı:</p><div style="background:#f1f5f9;border-radius:8px;padding:1rem;margin:1rem 0"><h3 style="margin:0 0 0.5rem">${taskTitle}</h3><p style="margin:0;color:#64748b">Atayan: ${currentUser}</p></div><p style="color:#64748b;font-size:0.85em">Bu e-posta TaskTrack tarafından otomatik gönderilmiştir.</p></div>`
      );
    }
  };

  const markAppNotificationAsRead = async (id) => {
    if (!db) return;
    const notif = appNotifications.find(n => n.id === id);
    if (!notif) return;
    const newReadBy = [...(notif.readBy || []), currentUser];
    try {
      await updateDoc(doc(db, 'appNotifications', id), { readBy: newReadBy });
    } catch (e) {
      // fallback: local update
      setAppNotifications(prev => prev.map(n => n.id === id ? { ...n, readBy: newReadBy } : n));
    }
  };

  const logAppEvent = async (text, author = null) => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'appNotifications'), {
        text,
        author: author || currentUser || 'Sistem',
        date: new Date().toISOString(),
        readBy: []
      });
    } catch (e) {
      /* error handled */
    }
  };

  const addTask = async (task) => {
    if (!db) return;
    try {
      // Normalize: assignees array is canonical, assignee string for backward compat
      const assigneesList = Array.isArray(task.assignees) ? task.assignees : (task.assignee ? [task.assignee] : []);
      const primaryAssignee = assigneesList[0] || '';
      const normalizedTask = { ...task, assignees: assigneesList, assignee: primaryAssignee };

      const logs = [{ id: Date.now().toString(), text: `Görev oluşturuldu.`, user: currentUser, date: new Date().toISOString() }];
      await addDoc(collection(db, 'tasks'), {
        ...normalizedTask, date: new Date().toISOString(), isDeleted: false, isNewForAssignee: assigneesList.length > 0, logs
      });
      if (task.customerName) saveCustomerFromTask(task);
      if (assigneesList.length > 0) {
        const names = assigneesList.join(', ');
        addNotification(`${names} adlı kullanıcıya yeni iş atandı.`);
        assigneesList.forEach(name => triggerCommunicationSimulations(name, task.title));
        logAppEvent(`Yeni iş atandı: '${task.title}'`, names);
      } else {
        logAppEvent(`Yeni görev oluşturuldu: '${task.title}'`);
      }
    } catch (e) { addNotification("Kayıt başarısız."); }
  };

  const createNextRecurringTask = async (completedTask) => {
    if (!db) return;
    try {
      const remaining = completedTask.recurrenceRemaining;

      if (remaining != null && remaining <= 0) {
        const recLabels = {'daily':'Günlük','weekly':'Haftalık','monthly':'Aylık','yearly':'Yıllık'};
        const shouldRenew = window.confirm(
          `"${completedTask.title}" görevinin ${recLabels[completedTask.recurrence] || ''} tekrar süresi doldu.\n\nGörev tekrarını yeniden başlatmak ister misiniz?`
        );
        if (shouldRenew) {
          completedTask.recurrenceRemaining = completedTask.recurrenceCount || 3;
        } else {
          addNotification(`"${completedTask.title}" tekrarlayan görevi sona erdi.`);
          logAppEvent(`Tekrarlayan görev sona erdi: '${completedTask.title}'`, completedTask.assignee);
          return;
        }
      }

      const newRemaining = (completedTask.recurrenceRemaining != null) ? completedTask.recurrenceRemaining - 1 : null;

      const now = new Date();
      let nextStart = completedTask.startDate ? new Date(completedTask.startDate) : now;
      let nextDeadline = completedTask.deadline ? new Date(completedTask.deadline) : null;
      const duration = (nextDeadline && completedTask.startDate) ? (nextDeadline - new Date(completedTask.startDate)) : 7 * 24 * 60 * 60 * 1000;

      switch (completedTask.recurrence) {
        case 'daily':
          nextStart = new Date(Math.max(now.getTime(), nextStart.getTime()));
          nextStart.setDate(nextStart.getDate() + 1);
          break;
        case 'weekly':
          nextStart = new Date(Math.max(now.getTime(), nextStart.getTime()));
          nextStart.setDate(nextStart.getDate() + 7);
          break;
        case 'monthly':
          nextStart = new Date(Math.max(now.getTime(), nextStart.getTime()));
          nextStart.setMonth(nextStart.getMonth() + 1);
          if (completedTask.recurrenceDay) {
            nextStart.setDate(Math.min(completedTask.recurrenceDay, new Date(nextStart.getFullYear(), nextStart.getMonth() + 1, 0).getDate()));
          }
          break;
        case 'yearly':
          nextStart = new Date(Math.max(now.getTime(), nextStart.getTime()));
          nextStart.setFullYear(nextStart.getFullYear() + 1);
          break;
        default: return;
      }

      nextDeadline = new Date(nextStart.getTime() + duration);

      const newTask = {
        title: completedTask.title,
        customerName: completedTask.customerName || '',
        customerPhone: completedTask.customerPhone || '',
        customerEmail: completedTask.customerEmail || '',
        customerAddress: completedTask.customerAddress || '',
        customerTaxNo: completedTask.customerTaxNo || '',
        customerTaxOffice: completedTask.customerTaxOffice || '',
        customerTradeRegNo: completedTask.customerTradeRegNo || '',
        customerPhone2: completedTask.customerPhone2 || '',
        description: completedTask.description || '',
        priority: completedTask.priority || 'medium',
        assignees: getAssignees(completedTask),
        assignee: completedTask.assignee || '',
        startDate: nextStart.toISOString(),
        deadline: nextDeadline.toISOString(),
        notes: [],
        attachments: [],
        subtasks: (completedTask.subtasks || []).map(s => ({ ...s, isCompleted: false })),
        tags: completedTask.tags || [],
        recurrence: completedTask.recurrence,
        recurrenceDay: completedTask.recurrenceDay || null,
        recurrenceCount: completedTask.recurrenceCount || null,
        recurrenceRemaining: newRemaining,
        status: 'todo',
        date: new Date().toISOString(),
        isDeleted: false,
        isNewForAssignee: true,
        logs: [{ id: Date.now().toString(), text: `Tekrarlayan görev otomatik oluşturuldu. (Kalan: ${newRemaining != null ? newRemaining : '∞'})`, user: 'Sistem', date: new Date().toISOString() }]
      };

      await addDoc(collection(db, 'tasks'), newTask);
      addNotification(`Tekrarlayan görev oluşturuldu: "${completedTask.title}" (Kalan: ${newRemaining != null ? newRemaining : '∞'})`);
      logAppEvent(`Tekrarlayan görev otomatik oluşturuldu: '${completedTask.title}' (Kalan: ${newRemaining != null ? newRemaining : '∞'})`, completedTask.assignee);
    } catch (e) {
      /* error handled */
    }
  };

  const updateTaskStatus = async (id, newStatus) => {
    if (!db) return;
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

      if (newStatus === 'done' && oldTask.recurrence && oldTask.recurrence !== 'none') {
        await createNextRecurringTask(oldTask);
      }
    } catch (e) {}
  };

  const updateTask = async (id, updatedData) => {
    if (!db) return;
    const oldTask = tasks.find(t => t.id === id);
    if (!oldTask) return;
    try {
      let finalData = { ...updatedData };
      let logs = oldTask.logs || [];

      const pMap = {'low':'Düşük','medium':'Orta','high':'Yüksek'};
      const sMap = {'todo':'Yapılacak','in-progress':'Devam Eden','done':'Tamamlandı'};

      if (updatedData.title && oldTask.title !== updatedData.title) logs.push({ id: Date.now()+Math.random(), text: `Başlık değiştirildi: '${oldTask.title}' -> '${updatedData.title}'`, user: currentUser, date: new Date().toISOString() });
      const oldAssigneeStr = getAssignees(oldTask).join(', ') || 'Atanmamış';
      const newAssigneesRaw = updatedData.assignees ?? (updatedData.assignee !== undefined ? (updatedData.assignee ? [updatedData.assignee] : []) : null);
      if (newAssigneesRaw !== null) {
        const newAssigneeStr = newAssigneesRaw.join(', ') || 'Atanmamış';
        if (oldAssigneeStr !== newAssigneeStr) logs.push({ id: Date.now()+Math.random(), text: `Kişi değiştirildi: '${oldAssigneeStr}' -> '${newAssigneeStr}'`, user: currentUser, date: new Date().toISOString() });
      }
      if (updatedData.priority && oldTask.priority !== updatedData.priority) logs.push({ id: Date.now()+Math.random(), text: `Öncelik değiştirildi: '${pMap[oldTask.priority]}' -> '${pMap[updatedData.priority]}'`, user: currentUser, date: new Date().toISOString() });
      if (updatedData.startDate !== undefined && oldTask.startDate !== updatedData.startDate) logs.push({ id: Date.now()+Math.random(), text: `Başlangıç Tarihi değiştirildi: '${oldTask.startDate ? oldTask.startDate.split('T')[0] : '-'}' -> '${updatedData.startDate ? updatedData.startDate.split('T')[0] : '-'}'`, user: currentUser, date: new Date().toISOString() });
      if (updatedData.deadline !== undefined && oldTask.deadline !== updatedData.deadline) logs.push({ id: Date.now()+Math.random(), text: `Bitiş Tarihi değiştirildi: '${oldTask.deadline ? oldTask.deadline.split('T')[0] : '-'}' -> '${updatedData.deadline ? updatedData.deadline.split('T')[0] : '-'}'`, user: currentUser, date: new Date().toISOString() });
      if (updatedData.status && oldTask.status !== updatedData.status) logs.push({ id: Date.now()+Math.random(), text: `Durum güncellendi: '${sMap[oldTask.status]}' -> '${sMap[updatedData.status]}'`, user: currentUser, date: new Date().toISOString() });

      finalData.logs = logs;

      // Normalize assignees on update
      if (updatedData.assignees !== undefined) {
        const assigneesList = updatedData.assignees;
        finalData.assignees = assigneesList;
        finalData.assignee = assigneesList[0] || '';
        const oldList = getAssignees(oldTask);
        const newNames = assigneesList.filter(n => !oldList.includes(n));
        if (newNames.length > 0) {
          addNotification(`${newNames.join(', ')} adlı kullanıcıya iş atandı.`);
          newNames.forEach(n => triggerCommunicationSimulations(n, updatedData.title || oldTask.title));
          finalData.isNewForAssignee = true;
          logAppEvent(`'${updatedData.title || oldTask.title}' görevi ${assigneesList.join(', ')} adlı kullanıcıya atandı.`, assigneesList.join(', '));
        }
      } else if (updatedData.assignee !== undefined && oldTask.assignee !== updatedData.assignee) {
        // backward compat: single assignee update
        const assigneesList = updatedData.assignee ? [updatedData.assignee] : [];
        finalData.assignees = assigneesList;
        addNotification(`${updatedData.assignee} adlı kullanıcıya iş atandı.`);
        triggerCommunicationSimulations(updatedData.assignee, updatedData.title || oldTask.title);
        finalData.isNewForAssignee = true;
        logAppEvent(`'${updatedData.title || oldTask.title}' görevini ${updatedData.assignee} adlı kullanıcıya atadı.`, updatedData.assignee);
      }

      if (updatedData.assignees !== undefined || (updatedData.assignee !== undefined && oldTask.assignee !== updatedData.assignee)) {
        // assignee change handled above
      } else if (updatedData.status && oldTask.status !== updatedData.status) {
        const sM = {'todo':'Yapılacak','in-progress':'Devam Eden','done':'Tamamlandı'};
        logAppEvent(`'${updatedData.title || oldTask.title}' görevinin durumunu '${sM[updatedData.status]}' yaptı.`, oldTask.assignee);
        // E-posta: durum değişikliği bildirimi
        if (selectedCompany?.emailNotifyOnStatusChange !== false) {
          const taskTitle = updatedData.title || oldTask.title;
          getAssignees(oldTask).forEach(name => {
            if (name !== currentUser) {
              sendEmailNotification(name, `TaskTrack - Durum Değişti: ${taskTitle}`,
                `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#2563eb">Görev Durumu Değişti</h2><p><strong>${taskTitle}</strong> görevinin durumu değiştirildi:</p><div style="background:#f1f5f9;border-radius:8px;padding:1rem;margin:1rem 0"><p style="margin:0"><strong>${sM[oldTask.status]}</strong> → <strong>${sM[updatedData.status]}</strong></p><p style="margin:0.5rem 0 0;color:#64748b">Değiştiren: ${currentUser}</p></div></div>`
              );
            }
          });
        }
      } else if (updatedData.deadline !== undefined && oldTask.deadline !== updatedData.deadline) {
        logAppEvent(`'${updatedData.title || oldTask.title}' görevinin hedefini güncelledi.`, oldTask.assignee);
      }
      await updateDoc(doc(db, 'tasks', id), finalData);
      if (updatedData.customerName) saveCustomerFromTask({ ...oldTask, ...updatedData });

      if (updatedData.status === 'done' && oldTask.status !== 'done' && oldTask.recurrence && oldTask.recurrence !== 'none') {
        await createNextRecurringTask({ ...oldTask, ...updatedData });
      }
    } catch (e) {}
  };

  const deleteTask = async (id) => {
    if (!db) return;
    if (!window.confirm('Bu görevi silmek istediğinize emin misiniz? (Görev çöp kutusuna taşınacaktır.)')) return;
    try {
      await updateDoc(doc(db, 'tasks', id), { isDeleted: true });
      addNotification('Görev silinenler kutusuna taşındı.');
    } catch (e) {}
  };

  const permanentDeleteTask = async (id) => {
    if (!db) return;
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
    if (!db) return;
    try {
      await updateDoc(doc(db, 'tasks', id), { isDeleted: false });
      addNotification('Görev başarıyla geri yüklendi.');
    } catch (e) {}
  };

  const toAuthEmail = (input) => {
    const trimmed = (input || '').trim();
    if (/^0?\d{10,11}$/.test(trimmed)) return trimmed + '@tasktrack.net';
    if (!trimmed.includes('@')) return trimmed + '@tasktrack.net';
    return trimmed;
  };

  const adminCreateAuthUser = async (loginInput, password, linkedUserId) => {
    if (!secondaryAuth || !db) return { success: false, error: 'Firebase bağlantısı yok' };
    if (!isAdmin) {
      addNotification('HATA: Bu işlem için Admin yetkisi gereklidir!');
      return { success: false, error: 'Yetki yok' };
    }
    try {
      const authEmail = toAuthEmail(loginInput);
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, authEmail, password);
      await signOut(secondaryAuth);

      if (linkedUserId) {
        await updateDoc(doc(db, 'usersList', linkedUserId), {
          authEmail: authEmail,
          authLogin: loginInput.trim(),
          authPassword: btoa(unescape(encodeURIComponent(password)))
        });
      }

      addNotification(`Yeni hesap oluşturuldu: ${loginInput}`);
      logAppEvent(`Yeni Firebase hesabı oluşturuldu: ${loginInput}`);
      return { success: true, uid: userCredential.user.uid };
    } catch (err) {
      /* error handled via alert */
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') msg = 'Bu kullanıcı adı zaten kullanımda.';
      else if (err.code === 'auth/weak-password') msg = 'Şifre en az 6 karakter olmalıdır.';
      else if (err.code === 'auth/invalid-email') msg = 'Geçersiz kullanıcı adı formatı.';
      return { success: false, error: msg };
    }
  };

  const adminSendPasswordReset = async (email) => {
    if (!auth) return { success: false, error: 'Firebase bağlantısı yok' };
    if (!isAdmin) {
      addNotification('HATA: Bu işlem için Admin yetkisi gereklidir!');
      return { success: false, error: 'Yetki yok' };
    }
    try {
      await sendPasswordResetEmail(auth, email);
      addNotification(`Şifre sıfırlama e-postası gönderildi: ${email}`);
      logAppEvent(`Şifre sıfırlama e-postası gönderildi: ${email}`);
      return { success: true };
    } catch (err) {
      /* error handled via alert */
      let msg = err.message;
      if (err.code === 'auth/user-not-found') msg = 'Bu e-posta adresine ait hesap bulunamadı.';
      else if (err.code === 'auth/invalid-email') msg = 'Geçersiz e-posta adresi.';
      return { success: false, error: msg };
    }
  };

  const changeMyPassword = async (currentPassword, newPassword) => {
    if (!auth || !authUser) return { success: false, error: 'Giriş yapmış olmalısınız.' };
    try {
      const cred = await signInWithEmailAndPassword(auth, authUser.email, currentPassword);
      await updatePassword(cred.user, newPassword);
      addNotification('Şifreniz başarıyla değiştirildi.');
      return { success: true };
    } catch (err) {
      let msg = err.message;
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = 'Mevcut şifre yanlış.';
      else if (err.code === 'auth/weak-password') msg = 'Yeni şifre en az 6 karakter olmalıdır.';
      return { success: false, error: msg };
    }
  };

  const adminChangePassword = async (authEmail, currentPassword, newPassword) => {
    if (!secondaryAuth || !db) return { success: false, error: 'Firebase bağlantısı yok' };
    if (!isAdmin) {
      addNotification('HATA: Bu işlem için Admin yetkisi gereklidir!');
      return { success: false, error: 'Yetki yok' };
    }
    try {
      const cred = await signInWithEmailAndPassword(secondaryAuth, authEmail, currentPassword);
      await updatePassword(cred.user, newPassword);
      await signOut(secondaryAuth);

      const linkedUser = usersList.find(u => u.authEmail === authEmail || u.email === authEmail);
      if (linkedUser) {
        await updateDoc(doc(db, 'usersList', linkedUser.id), { authPassword: btoa(unescape(encodeURIComponent(newPassword))) });
      }

      addNotification(`Şifre başarıyla değiştirildi: ${authEmail}`);
      logAppEvent(`Şifre değiştirildi: ${authEmail}`);
      return { success: true };
    } catch (err) {
      /* error handled via alert */
      try { await signOut(secondaryAuth); } catch(e) {}
      let msg = err.message;
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = 'Mevcut şifre yanlış.';
      else if (err.code === 'auth/user-not-found') msg = 'Bu kullanıcı adına ait hesap bulunamadı.';
      else if (err.code === 'auth/weak-password') msg = 'Yeni şifre en az 6 karakter olmalıdır.';
      return { success: false, error: msg };
    }
  };

  const adminUpdateAuthLogin = async (oldAuthEmail, password, newLoginInput) => {
    if (!secondaryAuth || !db) return { success: false, error: 'Firebase bağlantısı yok' };
    if (!isAdmin) {
      addNotification('HATA: Bu işlem için Admin yetkisi gereklidir!');
      return { success: false, error: 'Yetki yok' };
    }
    try {
      const newAuthEmail = toAuthEmail(newLoginInput);

      const oldCred = await signInWithEmailAndPassword(secondaryAuth, oldAuthEmail, password);
      await deleteAuthUser(oldCred.user);

      await createUserWithEmailAndPassword(secondaryAuth, newAuthEmail, password);
      await signOut(secondaryAuth);

      const linkedUser = usersList.find(u => u.authEmail === oldAuthEmail);
      if (linkedUser) {
        await updateDoc(doc(db, 'usersList', linkedUser.id), {
          authEmail: newAuthEmail,
          authLogin: newLoginInput.trim()
        });
      }

      addNotification(`Giriş bilgisi değiştirildi: ${newLoginInput}`);
      logAppEvent(`Giriş bilgisi değiştirildi: ${oldAuthEmail} → ${newLoginInput}`);
      return { success: true };
    } catch (err) {
      /* error handled via alert */
      try { await signOut(secondaryAuth); } catch(e) {}
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') msg = 'Bu kullanıcı adı zaten başka bir hesapta kullanımda.';
      else if (err.code === 'auth/invalid-email') msg = 'Geçersiz kullanıcı adı formatı.';
      else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = 'Şifre yanlış, giriş bilgisi değiştirilemedi.';
      else if (err.code === 'auth/requires-recent-login') msg = 'İşlem için yeniden giriş gerekli. Lütfen tekrar deneyin.';
      return { success: false, error: msg };
    }
  };

  return (
    <TaskContext.Provider value={{
      tasks, addTask, updateTaskStatus, updateTask, deleteTask, permanentDeleteTask, restoreTask,
      notifications, appNotifications, markAppNotificationAsRead, currentUser, setCurrentUser, usersList,
      addUser, editUser, deleteUser, isAdmin,
      tagsList, addTag, editTag, deleteTag,
      getUserColor, updateUserColor,
      hideAllTasksForUsers, toggleHideAllTasks,
      authUser, loginWithGoogle, loginWithEmail, registerWithEmail, publicResetPassword, logout, authLoading,
      changeMyPassword, adminCreateAuthUser, adminSendPasswordReset, adminChangePassword, adminUpdateAuthLogin,
      customersList, addCustomer, editCustomer, deleteCustomer,
      deadlineColors, saveDeadlineColors, getDeadlineRowColor, getDeadlineBarColor, getAssignees,
      companyDb: db
    }}>
      {children}
    </TaskContext.Provider>
  );
};
