import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { masterDb, initCompanyFirebase, cleanupCompanyFirebase } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

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
  const seeded = useRef(false);

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
      githubRepo: '',
      gasDeploymentUrl: '',
      createdAt: new Date().toISOString()
    }).catch(e => console.error('Seed error:', e));
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
      // Deselect / switch company
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
  };

  const addCompany = async (data) => {
    try {
      await addDoc(collection(masterDb, 'companies'), {
        ...data,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('Add company error:', e);
    }
  };

  const updateCompany = async (id, data) => {
    try {
      await updateDoc(doc(masterDb, 'companies', id), data);
      // If updating the currently selected company, refresh selection
      if (selectedCompany && selectedCompany.id === id && data.firebaseConfig) {
        const firebase = initCompanyFirebase(data.firebaseConfig);
        setCompanyFirebase(firebase);
        setSelectedCompany(prev => ({ ...prev, ...data }));
      }
    } catch (e) {
      console.error('Update company error:', e);
    }
  };

  const deleteCompany = async (id) => {
    try {
      await deleteDoc(doc(masterDb, 'companies', id));
      if (selectedCompany && selectedCompany.id === id) {
        selectCompany(null);
      }
    } catch (e) {
      console.error('Delete company error:', e);
    }
  };

  return (
    <CompanyContext.Provider value={{
      companies, companiesLoading,
      selectedCompany, companyFirebase,
      selectCompany,
      addCompany, updateCompany, deleteCompany
    }}>
      {children}
    </CompanyContext.Provider>
  );
};
