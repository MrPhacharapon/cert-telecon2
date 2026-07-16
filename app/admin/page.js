"use client";

import { useState, useEffect } from "react";
import { Save, Plus, Trash2, Link as LinkIcon, FileText, Settings, AlertTriangle } from "lucide-react";

export default function AdminPage() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch config on load
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSessions(data);
        } else {
          console.error("Invalid config format:", data);
          setSessions([]);
        }
      })
      .catch(err => {
        console.error("Error fetching config:", err);
        setErrorMsg("ไม่สามารถดึงข้อมูลตั้งค่าได้ กรุณาตรวจสอบการเชื่อมต่อ");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleAddSession = () => {
    setSessions([
      ...sessions,
      {
        id: `session-${Date.now()}`,
        name: "หัวข้อการอบรมใหม่...",
        sheetUrl: "",
        pdfFiles: []
      }
    ]);
  };

  const handleRemoveSession = (index) => {
    const newSessions = [...sessions];
    newSessions.splice(index, 1);
    setSessions(newSessions);
  };

  const handleUpdateSession = (index, field, value) => {
    const newSessions = [...sessions];
    newSessions[index][field] = value;
    setSessions(newSessions);
  };

  const handleAddPdf = (sessionIndex) => {
    const newSessions = [...sessions];
    if (!newSessions[sessionIndex].pdfFiles) newSessions[sessionIndex].pdfFiles = [];
    newSessions[sessionIndex].pdfFiles.push({ filename: "", url: "" });
    setSessions(newSessions);
  };

  const handleRemovePdf = (sessionIndex, pdfIndex) => {
    const newSessions = [...sessions];
    newSessions[sessionIndex].pdfFiles.splice(pdfIndex, 1);
    setSessions(newSessions);
  };

  const handleUpdatePdf = (sessionIndex, pdfIndex, field, value) => {
    const newSessions = [...sessions];
    newSessions[sessionIndex].pdfFiles[pdfIndex][field] = value;
    setSessions(newSessions);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMsg("");
    
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessions)
      });
      
      const result = await res.json();
      if (res.ok && result.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        throw new Error(result.error || "Save failed");
      }
    } catch (error) {
      console.error("Error saving:", error);
      setErrorMsg("บันทึกข้อมูลไม่สำเร็จ: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="header">
        <h1><Settings size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}/> ระบบจัดการข้อมูล (Admin)</h1>
        <p>จัดการหัวข้อการอบรมและลิงก์ข้อมูลต่างๆ</p>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: 'rgba(254, 226, 226, 0.8)', border: '1px solid #f87171', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <AlertTriangle color="#dc2626" />
          <div>
            <h4 style={{ color: '#991b1b', fontWeight: 'bold', marginBottom: '0.25rem' }}>เกิดข้อผิดพลาด</h4>
            <p style={{ color: '#7f1d1d', fontSize: '0.9rem' }}>{errorMsg}</p>
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          กำลังโหลดข้อมูลตั้งค่าจาก Google Sheet...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {sessions.map((session, sIndex) => (
            <div key={session.id} style={{ background: 'rgba(255, 255, 255, 0.5)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(255, 255, 255, 0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--primary-hover)', fontWeight: 600 }}>การอบรมที่ {sIndex + 1}</h3>
              <button onClick={() => handleRemoveSession(sIndex)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Trash2 size={16} /> ลบ
              </button>
            </div>
            
            <div className="form-group">
              <label className="form-label">ชื่อหัวข้อการอบรม</label>
              <input 
                type="text" 
                className="form-input" 
                value={session.name}
                onChange={(e) => handleUpdateSession(sIndex, 'name', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">ลิงก์ Google Sheet รายชื่อ (CSV Export Link)</label>
              <div style={{ position: 'relative' }}>
                <LinkIcon className="form-input-icon" size={18} style={{ top: '0.95rem' }} />
                <input 
                  type="text" 
                  className="form-input with-icon" 
                  value={session.sheetUrl}
                  onChange={(e) => handleUpdateSession(sIndex, 'sheetUrl', e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0"
                />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>จับคู่ชื่อไฟล์ PDF กับลิงก์ดาวน์โหลด</span>
                <button 
                  onClick={() => handleAddPdf(sIndex)}
                  style={{ background: '#d9f99d', color: '#3f2e12', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold' }}
                >
                  <Plus size={14} /> เพิ่มไฟล์
                </button>
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                {session.pdfFiles.map((pdf, pIndex) => (
                  <div key={pIndex} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="ชื่อไฟล์ (ตรงกับใน Sheet รายชื่อ)" 
                        value={pdf.filename}
                        onChange={(e) => handleUpdatePdf(sIndex, pIndex, 'filename', e.target.value)}
                        style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="ลิงก์ไฟล์ (Google Drive Direct Link)" 
                        value={pdf.url}
                        onChange={(e) => handleUpdatePdf(sIndex, pIndex, 'url', e.target.value)}
                        style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}
                      />
                    </div>
                    <button 
                      onClick={() => handleRemovePdf(sIndex, pIndex)}
                      style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '0.6rem', borderRadius: '0.5rem', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                {session.pdfFiles.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    ยังไม่มีการจับคู่ไฟล์ กรุณากด "เพิ่มไฟล์"
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={handleAddSession}
          style={{ background: 'rgba(255,255,255,0.7)', color: 'var(--text-main)', border: '2px dashed var(--primary-color)', padding: '0.875rem 1.5rem', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={20} /> เพิ่มหัวข้อการอบรมใหม่
        </button>

        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          disabled={isSaving || isLoading}
        >
          {isSaving ? "กำลังบันทึก..." : saveSuccess ? "บันทึกข้อมูลสำเร็จ!" : <><Save size={20} /> บันทึกการตั้งค่า</>}
        </button>
      </div>
    </div>
  );
}
