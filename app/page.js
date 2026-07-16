"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Search, FileText, CheckCircle, AlertCircle, Loader2, Lock, X } from "lucide-react";
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
  const [debugInfo, setDebugInfo] = useState(null);
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
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = setTimeout(() => {
        if (controller) controller.abort();
      }, 15000); // 15 seconds timeout
      
      const fetchOptions = controller ? { signal: controller.signal } : {};
      
      // Add timestamp to prevent aggressive Safari caching
      fetch(`/api/config?t=${Date.now()}`, fetchOptions)
        .then(res => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setSessions(data);
            setSelectedSession(data[0]);
          }
        })
        .catch(err => {
          console.error("Error fetching config:", err);
          setConfigError(`ไม่สามารถดึงข้อมูลได้: ${err.message || "เน็ตช้าเกินไป"}`);
        })
        .finally(() => {
          clearTimeout(timeoutId);
          setIsConfigLoading(false);
        });
    } catch (err) {
      console.error("Sync error in useEffect:", err);
      setConfigError(`เกิดข้อผิดพลาดในระบบมือถือรุ่นเก่า: ${err.message}`);
      setIsConfigLoading(false);
    }
  }, []);

  // Fetch participants when a session is selected
  useEffect(() => {
    if (!selectedSession) return;
    
    setIsLoading(true);
    const proxyUrl = `/api/fetch-csv?url=${encodeURIComponent(selectedSession.sheetUrl)}`;
    
    fetch(proxyUrl)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Proxy returned status ${res.status}: ${await res.text()}`);
        }
        return res.text();
      })
      .then(async (csvText) => {
        // Dynamically import PapaParse to reduce initial load time
        const Papa = (await import('papaparse')).default;
        
        // Parse the entire CSV as a 2D array of strings to bypass ANY line-ending issues
        Papa.parse(csvText, {
          header: false,
          skipEmptyLines: true,
          complete: (results) => {
            const rows = results.data;
            if (rows.length === 0) {
              setDebugInfo(`[Warning] CSV ว่างเปล่า ไม่มีข้อมูลเลย`);
              setIsLoading(false);
              return;
            }
            
            // Find the index of the row that acts as the header
            const headerRowIndex = rows.findIndex(row => 
              row.some(cell => typeof cell === 'string' && cell.includes('ชื่อ') && cell.includes('สกุล'))
            );
            
            if (headerRowIndex === -1) {
               setDebugInfo(`[Warning] ไม่พบคอลัมน์ 'ชื่อ - สกุล' ในไฟล์ CSV\\nตัวอย่างบรรทัดแรก: ${JSON.stringify(rows[0])}`);
               setIsLoading(false);
               return;
            }
            
            const headerRow = rows[headerRowIndex];
            const dataRows = rows.slice(headerRowIndex + 1);
            
            let lastFileName = "";
            const processed = dataRows
              .filter(row => {
                 // Check if the cell corresponding to 'ชื่อ - สกุล' has a value
                 const nameIndex = headerRow.findIndex(h => typeof h === 'string' && h.includes('ชื่อ') && h.includes('สกุล'));
                 return nameIndex !== -1 && row[nameIndex] && row[nameIndex].trim() !== "";
              })
              .map((row) => {
                const nameIndex = headerRow.findIndex(h => typeof h === 'string' && h.includes('ชื่อ') && h.includes('สกุล'));
                const fileIndex = headerRow.findIndex(h => typeof h === 'string' && h.includes('ชื่อไฟล์'));
                const pageIndex = headerRow.findIndex(h => typeof h === 'string' && h.includes('หน้า'));
                const idIndex = headerRow.findIndex(h => typeof h === 'string' && h.includes('ทะเบียน'));
                
                if (fileIndex !== -1 && row[fileIndex] && row[fileIndex].trim() !== "") {
                  lastFileName = row[fileIndex].trim();
                }
                
                return {
                  id: (idIndex !== -1 ? row[idIndex] : "") || "",
                  name: row[nameIndex].trim(),
                  fileName: lastFileName,
                  pageNumber: parseInt(pageIndex !== -1 ? row[pageIndex] : 1, 10) || 1
                };
              });
            
            if (processed.length === 0) {
               setDebugInfo(`[Warning] โหลดสำเร็จ แต่ไม่พบชื่อคนในระบบ (กรองจาก ${dataRows.length} บรรทัด)\\nHeader: ${JSON.stringify(headerRow)}\\nRow 1: ${JSON.stringify(dataRows[0])}`);
            } else {
               setDebugInfo(`[Success] โหลดข้อมูลเสร็จสิ้น พบรายชื่อทั้งหมด ${processed.length} คน`);
            }
            
            setParticipants(processed);
            setIsLoading(false);
          },
          error: (err) => {
            console.error("Error parsing CSV:", err);
            setDebugInfo(`[PapaParse Error] ${err.message}`);
            setIsLoading(false);
          }
        });
      })
      .catch(err => {
        console.error("Error fetching CSV:", err);
        setDebugInfo(`[Fetch Error] ${err.message}`);
        setIsLoading(false);
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
      // Dynamically import PDFDocument to reduce initial load time
      const { PDFDocument } = await import('pdf-lib');
      
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
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                ไม่พบรายชื่อที่ค้นหา หรือไม่พบรายชื่อผู้ที่ได้รับเกียรติบัตรอบรม
                {debugInfo && !debugInfo.includes('[Success]') && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'left', wordBreak: 'break-all' }}>
                    <strong>Log:</strong> {debugInfo}
                  </div>
                )}
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
          <div className="result-name" style={{ marginBottom: '1.5rem' }}>{selectedParticipant.name}</div>
          
          <button 
            className="btn btn-primary" 
            onClick={handleDownload}
            disabled={isDownloading || downloadSuccess}
            style={{ width: '100%', maxWidth: '300px' }}
          >
            {isDownloading ? (
              <><Loader2 className="spinner" size={20} /> กำลังเตรียมไฟล์ PDF...กรุณารอซักครู่</>
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
