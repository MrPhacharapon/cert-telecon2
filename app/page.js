"use client";

import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import { Download, Search, FileText, CheckCircle, AlertCircle, Loader2, Lock, X } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [configError, setConfigError] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  
  // Admin Login Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassword === "telecon1284") {
      router.push("/admin");
    } else {
      setAdminError("รหัสผ่านไม่ถูกต้อง");
    }
  };

  const searchRef = useRef(null);

  // Fetch config on load
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSessions(data);
          setSelectedSession(data[0]);
        } else {
          setConfigError("ยังไม่มีข้อมูลการอบรมในระบบ");
        }
      })
      .catch(err => {
        console.error("Error fetching config:", err);
        setConfigError("ไม่สามารถเชื่อมต่อฐานข้อมูลได้");
      })
      .finally(() => {
        setIsConfigLoading(false);
      });
  }, []);

  // Fetch participants when a session is selected
  useEffect(() => {
    if (!selectedSession) return;
    
    setIsLoading(true);
    // Use papaparse to fetch and parse the CSV
    Papa.parse(selectedSession.sheetUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Process data to handle merged cells (fill down filenames)
        let lastFileName = "";
        const processed = results.data
          .filter(row => row["ชื่อ - สกุล "]) // Filter out empty rows
          .map((row) => {
            if (row["ชื่อไฟล์ดาวโหลด"]) {
              lastFileName = row["ชื่อไฟล์ดาวโหลด"];
            }
            return {
              id: row["เลขทะเบียนคุม"],
              name: row["ชื่อ - สกุล "].trim(),
              fileName: lastFileName,
              pageNumber: parseInt(row["หน้าที่"], 10)
            };
          });
        
        setParticipants(processed);
        setIsLoading(false);
      },
      error: (err) => {
        console.error("Error fetching CSV:", err);
        setIsLoading(false);
      }
    });
  }, [selectedSession]);

  // Handle outside click for dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredParticipants = participants.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5); // Show top 5 matches

  const handleSelectParticipant = (participant) => {
    setSelectedParticipant(participant);
    setSearchQuery(participant.name);
    setIsDropdownOpen(false);
    setDownloadSuccess(false);
  };

  const handleDownload = async () => {
    if (!selectedParticipant || !selectedSession) return;
    
    setIsDownloading(true);
    setDownloadSuccess(false);
    
    try {
      // Find the corresponding PDF URL from the session config
      const matchedPdf = selectedSession.pdfFiles?.find(
        (pdf) => pdf.filename === selectedParticipant.fileName
      );
      
      if (!matchedPdf || !matchedPdf.url) {
        throw new Error("ไม่พบลลิงก์ไฟล์ PDF สำหรับไฟล์นี้ กรุณาติดต่อผู้ดูแลระบบ");
      }
      
      // Fetch the PDF through our proxy to avoid CORS
      const proxyUrl = `/api/fetch-pdf?url=${encodeURIComponent(matchedPdf.url)}`;
      const res = await fetch(proxyUrl);
      
      if (!res.ok) {
        throw new Error("ไม่สามารถดาวน์โหลดไฟล์ต้นฉบับได้");
      }
      
      const pdfBytes = await res.arrayBuffer();
      
      // Load the full PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const newPdfDoc = await PDFDocument.create();
      
      // Extract the specific page (pdf-lib uses 0-based indexing)
      const pageIndex = selectedParticipant.pageNumber - 1;
      const totalPages = pdfDoc.getPageCount();
      
      if (pageIndex < 0 || pageIndex >= totalPages) {
        throw new Error(`ไม่พบหน้าที่ ${selectedParticipant.pageNumber} ในไฟล์ PDF นี้`);
      }
      
      const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageIndex]);
      newPdfDoc.addPage(copiedPage);
      
      const newPdfBytes = await newPdfDoc.save();
      
      // Trigger download
      const blob = new Blob([newPdfBytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `เกียรติบัตร_${selectedParticipant.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      
      setDownloadSuccess(true);
      
    } catch (error) {
      console.error("Download failed:", error);
      alert(error.message || "เกิดข้อผิดพลาดในการดาวน์โหลด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="glass-card" style={{ position: 'relative' }}>
      <button 
        onClick={() => setShowAdminModal(true)}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: 'rgba(255, 255, 255, 0.5)',
          border: '1px solid rgba(255,255,255,0.8)',
          borderRadius: '2rem',
          padding: '0.4rem 0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}
        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'}
        onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)'}
      >
        <Lock size={14} /> สำหรับ admin
      </button>

      <div className="header">
        <h1>ระบบดาวน์โหลดเกียรติบัตร</h1>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginTop: '0.5rem', fontWeight: 600 }}>โครงการแลกเปลี่ยนเรียนรู้ด้วยระบบ Teleconference ครั้งที่ 2</h2>
        <h3 style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: 500 }}>ศูนย์การศึกษาพิเศษ ประจำจังหวัดลำปาง</h3>
        <p style={{ marginTop: '1.5rem' }}>ค้นหารายชื่อของท่านเพื่อดาวน์โหลดเกียรติบัตร (PDF)</p>
      </div>
      
      {isConfigLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          กำลังโหลดข้อมูลการอบรม...
        </div>
      ) : configError ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
          {configError}
        </div>
      ) : (
        <>
          <div className="form-group">
            <label className="form-label">หัวข้อการอบรม</label>
            <select 
              className="form-select"
              value={selectedSession?.id || ''}
              onChange={(e) => setSelectedSession(sessions.find(s => s.id === e.target.value))}
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

      <div className="form-group" ref={searchRef}>
        <label className="form-label">ค้นหาชื่อ - นามสกุล</label>
        <div style={{ position: 'relative' }}>
          <Search className="form-input-icon" size={20} style={{ top: '1rem' }} />
          <input 
            type="text" 
            className="form-input with-icon" 
            placeholder={isLoading ? "กำลังโหลดข้อมูลรายชื่อ..." : "พิมพ์ชื่อ หรือ นามสกุล..."}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(e.target.value.length > 0);
              if (selectedParticipant && e.target.value !== selectedParticipant.name) {
                setSelectedParticipant(null);
                setDownloadSuccess(false);
              }
            }}
            onFocus={() => {
              if (searchQuery.length > 0) setIsDropdownOpen(true);
            }}
            disabled={isLoading}
          />
        </div>

        {/* Autocomplete Dropdown */}
        {isDropdownOpen && searchQuery.length > 0 && (
          <div className="autocomplete-dropdown">
            {filteredParticipants.length > 0 ? (
              filteredParticipants.map(p => (
                <div 
                  key={p.id} 
                  className="autocomplete-item"
                  onClick={() => handleSelectParticipant(p)}
                >
                  <Search size={16} className="autocomplete-icon" />
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      หน้าที่: {p.pageNumber} | ทะเบียน: {p.id}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                ไม่พบรายชื่อที่ค้นหา
              </div>
            )}
          </div>
        )}
      </div>

      {/* Result Card */}
      {selectedParticipant && (
        <div className="result-card">
          <div className="cert-icon-container">
            {downloadSuccess ? <CheckCircle size={40} color="#10b981" /> : <FileText size={40} />}
          </div>
          <div className="result-name">{selectedParticipant.name}</div>
          <div className="result-detail">
            ไฟล์: {selectedParticipant.fileName} <br/>
            (หน้าที่ {selectedParticipant.pageNumber})
          </div>
          
          <button 
            className="btn btn-primary" 
            onClick={handleDownload}
            disabled={isDownloading || downloadSuccess}
            style={{ width: '100%', maxWidth: '300px' }}
          >
            {isDownloading ? (
              <><Loader2 className="spinner" size={20} /> กำลังเตรียมไฟล์ PDF...</>
            ) : downloadSuccess ? (
              <><CheckCircle size={20} /> ดาวน์โหลดสำเร็จ</>
            ) : (
              <><Download size={20} /> ดาวน์โหลดเกียรติบัตร</>
            )}
          </button>
          
          {downloadSuccess && (
            <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#10b981', animation: 'fadeIn 0.5s' }}>
              ไฟล์เกียรติบัตรถูกบันทึกลงในเครื่องของคุณแล้ว
            </div>
          )}
        </div>
      )}
      </>
      )}

      {/* Admin Login Modal */}
      {showAdminModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-card" style={{ maxWidth: '400px', width: '90%', position: 'relative', animation: 'scaleIn 0.3s ease-out' }}>
            <button 
              onClick={() => {
                setShowAdminModal(false);
                setAdminPassword("");
                setAdminError("");
              }}
              style={{
                position: 'absolute',
                top: '1rem', right: '1rem',
                background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--text-muted)'
              }}
            >
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={20} /> ยืนยันสิทธิ์ผู้ดูแลระบบ
            </h3>
            <form onSubmit={handleAdminLogin}>
              <div className="form-group">
                <label className="form-label">รหัสผ่าน (Password)</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    setAdminError("");
                  }}
                  placeholder="กรอกรหัสผ่านเพื่อเข้าหน้า admin"
                  autoFocus
                />
              </div>
              {adminError && <div style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>{adminError}</div>}
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                เข้าสู่ระบบ
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
