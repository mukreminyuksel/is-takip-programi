import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { masterDb, initCompanyFirebase, cleanupCompanyFirebase } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, getDocs, query, where } from 'firebase/firestore';

const CompanyContext = createContext();

export const useCompany = () => useContext(CompanyContext);

// AVRUPAPROJE default config for auto-seeding
const AVRUPAPROJE_CONFIG = {
  apiKey: "AIzaSyAPmmDgEeQ9hWGFv4BQbhvRWImKuLsW8RU",
  authDomain: "avrupa-proje-istakip.firebaseapp.com",
  projectId: "avrupa-proje-istakip",
  storageBucket: "avrupa-proje-istakip.firebasestorage.app",
  messagingSenderId: "278419836245",
  appId: "1:278419836245:web:1814c7a6b98c213d7fb3dc",
};

export const CompanyProvider = ({ children }) => {
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyFirebase, setCompanyFirebase] = useState(null);
  const [superAdminEmails, setSuperAdminEmails] = useState([]);
  const [superAdminLoaded, setSuperAdminLoaded] = useState(false);
  const seeded = useRef(false);
  const superSeeded = useRef(false);

  // Load super admins from master DB
  useEffect(() => {
    const unsub = onSnapshot(doc(masterDb, 'settings', 'superAdmins'), (snap) => {
      if (snap.exists()) {
        setSuperAdminEmails(snap.data().emails || []);
      } else {
        setSuperAdminEmails([]);
      }
      setSuperAdminLoaded(true);
    });
    return unsub;
  }, []);

  // Auto-seed superAdmins doc if missing
  useEffect(() => {
    if (!superAdminLoaded || superSeeded.current) return;
    if (superAdminEmails.length === 0) {
      superSeeded.current = true;
      setDoc(doc(masterDb, 'settings', 'superAdmins'), {
        emails: ['mukreminyuksel@gmail.com'],
        createdAt: new Date().toISOString()
      }).catch(() => {});
    }
  }, [superAdminLoaded, superAdminEmails]);

  // Load companies from master DB
  useEffect(() => {
    const unsub = onSnapshot(collection(masterDb, 'companies'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setCompanies(list);
      setCompaniesLoading(false);
    });
    return unsub;
  }, []);

  // Auto-seed AVRUPAPROJE if companies collection is empty
  useEffect(() => {
    if (companiesLoading || companies.length > 0 || seeded.current) return;
    seeded.current = true;
    addDoc(collection(masterDb, 'companies'), {
      name: 'AVRUPAPROJE',
      displayName: 'Avrupa Proje',
      color: '#3b82f6',
      firebaseConfig: AVRUPAPROJE_CONFIG,
      gasDeploymentUrl: 'https://script.google.com/macros/s/AKfycbxncRte5tnhqc68DIlTzdOpDkEYEywiLwwWtuUq9WJ-VR8gbdJBSc9xSUcWi0NjNyYdmw/exec',
      driveFolderId: '1nCPx7LbZU15OirK0IC_QCBgc7e7PCdzE',
      createdAt: new Date().toISOString()
    }).catch(() => {});
  }, [companiesLoading, companies]);

  // Auto-select last company from localStorage
  useEffect(() => {
    if (companiesLoading || companies.length === 0 || selectedCompany) return;
    const lastId = localStorage.getItem('lastCompanyId');
    if (lastId) {
      const found = companies.find(c => c.id === lastId);
      if (found) {
        selectCompany(found.id);
      }
    }
  }, [companiesLoading, companies]);

  const selectCompany = (companyId) => {
    if (!companyId) {
      cleanupCompanyFirebase();
      setCompanyFirebase(null);
      setSelectedCompany(null);
      localStorage.removeItem('lastCompanyId');
      return;
    }

    const company = companies.find(c => c.id === companyId);
    if (!company || !company.firebaseConfig) return;

    const firebase = initCompanyFirebase(company.firebaseConfig);
    setCompanyFirebase(firebase);
    setSelectedCompany(company);
    localStorage.setItem('lastCompanyId', companyId);

    // Lisans kontrolü (süper admin muaf)
    if (company.expiresAt && !superAdminEmails.length) {
      const expDate = new Date(company.expiresAt);
      if (expDate < new Date()) {
        // Seçimi iptal etme — ama uyarı ver, AppContent'te engellenir
      }
    }
  };

  const addCompany = async (data) => {
    try {
      await addDoc(collection(masterDb, 'companies'), {
        ...data,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      /* silent */
    }
  };

  const updateCompany = async (id, data) => {
    try {
      await updateDoc(doc(masterDb, 'companies', id), data);
      if (selectedCompany && selectedCompany.id === id) {
        if (data.firebaseConfig) {
          const firebase = initCompanyFirebase(data.firebaseConfig);
          setCompanyFirebase(firebase);
        }
        setSelectedCompany(prev => ({ ...prev, ...data }));
      }
    } catch (e) {
      /* silent */
    }
  };

  const deleteCompany = async (id) => {
    try {
      await deleteDoc(doc(masterDb, 'companies', id));
      if (selectedCompany && selectedCompany.id === id) {
        selectCompany(null);
      }
    } catch (e) {
      /* silent */
    }
  };

  const updateSuperAdmins = async (emails) => {
    try {
      await setDoc(doc(masterDb, 'settings', 'superAdmins'), { emails, updatedAt: new Date().toISOString() });
    } catch (e) {
      /* silent */
    }
  };

  // emailMap: email → companyId eşlemesi (master DB)
  const registerEmailToCompany = async (email, companyId) => {
    if (!email) return;
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await setDoc(doc(masterDb, 'emailMap', normalizedEmail), {
        email: normalizedEmail,
        companyId,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      /* silent */
    }
  };

  const removeEmailFromMap = async (email) => {
    if (!email) return;
    try {
      await deleteDoc(doc(masterDb, 'emailMap', email.trim().toLowerCase()));
    } catch (e) { /* silent */ }
  };

  const lookupCompanyByEmail = async (email) => {
    if (!email) return null;
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const snap = await getDoc(doc(masterDb, 'emailMap', normalizedEmail));
      if (snap.exists()) {
        return snap.data().companyId;
      }
    } catch (e) {
      /* silent */
    }
    return null;
  };

  // Tüm şirketlerde sırayla auth deneme (fallback)
  const tryAuthAllCompanies = async (email, password) => {
    const { signInWithEmailAndPassword, getAuth } = await import('firebase/auth');
    const { initializeApp, deleteApp } = await import('firebase/app');

    for (const company of companies) {
      if (!company.firebaseConfig?.apiKey) continue;
      let tempApp = null;
      try {
        tempApp = initializeApp(company.firebaseConfig, 'auth-probe-' + company.id + '-' + Date.now());
        const tempAuth = getAuth(tempApp);
        await signInWithEmailAndPassword(tempAuth, email, password);
        // Başarılı — bu şirket! Email'i kaydet ve temizle
        await registerEmailToCompany(email, company.id);
        try { deleteApp(tempApp); } catch(e) {}
        return company.id;
      } catch (err) {
        if (tempApp) { try { deleteApp(tempApp); } catch(e) {} }
        // auth/user-not-found veya wrong password → sonraki şirketi dene
        continue;
      }
    }
    return null; // Hiçbir şirkette bulunamadı
  };

  return (
    <CompanyContext.Provider value={{
      companies, companiesLoading,
      selectedCompany, companyFirebase,
      selectCompany,
      addCompany, updateCompany, deleteCompany,
      superAdminEmails, superAdminLoaded, updateSuperAdmins,
      registerEmailToCompany, removeEmailFromMap, lookupCompanyByEmail, tryAuthAllCompanies
    }}>
      {children}
    </CompanyContext.Provider>
  );
};
