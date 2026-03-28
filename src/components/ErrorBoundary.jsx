import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#fefefe', color: '#1e293b', padding: '2rem', textAlign: 'center'
        }}>
          <AlertTriangle size={64} style={{ color: '#f59e0b', marginBottom: '1.5rem' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Bir Hata Oluştu
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#64748b', marginBottom: '1.5rem', maxWidth: '480px' }}>
            Uygulama beklenmeyen bir hatayla karşılaştı. Lütfen sayfayı yenileyin.
            Hata devam ederse yöneticinize başvurun.
          </p>
          <details style={{
            marginBottom: '1.5rem', fontSize: '0.8rem', color: '#94a3b8',
            maxWidth: '600px', textAlign: 'left', width: '100%'
          }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Hata Detayı</summary>
            <pre style={{
              background: '#f1f5f9', padding: '1rem', borderRadius: '8px',
              marginTop: '0.5rem', overflow: 'auto', fontSize: '0.75rem', whiteSpace: 'pre-wrap'
            }}>
              {this.state.error?.toString()}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.8rem 1.5rem', borderRadius: '8px',
              background: '#2563eb', color: '#fff', border: 'none',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem'
            }}
          >
            <RefreshCw size={18} />
            Sayfayı Yenile
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
