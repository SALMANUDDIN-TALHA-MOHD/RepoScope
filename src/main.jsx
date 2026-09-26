import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Global error boundary to prevent blank screens
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight:'100vh', background:'#06060e', color:'#f0f0ff', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, padding:24 }}>
          <div style={{ fontSize:40 }}>⚠️</div>
          <div style={{ fontSize:20, fontWeight:700 }}>Something went wrong</div>
          <div style={{ fontSize:13, color:'#aaaac8', maxWidth:480, textAlign:'center', lineHeight:1.7 }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
          <button onClick={() => window.location.href = '/'} style={{ marginTop:8, background:'linear-gradient(135deg,#22c55e,#38bdf8)', color:'#06060e', border:'none', borderRadius:10, padding:'12px 28px', fontWeight:700, fontSize:14, cursor:'pointer' }}>
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);