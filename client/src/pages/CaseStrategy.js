import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';

const NAVY = '#1B2559', GOLD = '#C9A84C', BG = '#F4F6FB', GRAY = '#64748B';
const PURPLE = '#7C3AED';

const INITIAL_CHECKLIST = [
  { done: true, text: 'Upload signed contract to document vault' },
  { done: true, text: 'Share correspondence email thread with advocate' },
  { done: false, text: 'Obtain certified copy of bank transaction records' },
  { done: false, text: 'Review advocate\'s draft argument notes' },
  { done: false, text: 'Confirm hearing date and court room number' },
  { done: false, text: 'Prepare list of witnesses you can name' },
];

const TOOLS = [
  ['cross', '⚖ Cross-Exam Builder'],
  ['gap', '🚩 Flag a Gap'],
  ['checklist', '✅ Hearing Checklist'],
  ['notes', '✏ Argument Notes'],
  ['vault', '📁 Evidence Vault'],
];

export default function CaseStrategy() {
  const navigate = useNavigate();
  const [tool, setTool] = useState('cross');
  const [crossInput, setCrossInput] = useState('');
  const [crossQuestions, setCrossQuestions] = useState([
    'Establish when witness first reported the incident vs. FIR date',
    'Ask if witness knew accused before the alleged incident',
    'Confirm exact position of witness at time of alleged offence',
  ]);
  const [gapText, setGapText] = useState('');
  const [gapUrgency, setGapUrgency] = useState('');
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);
  const [argInput, setArgInput] = useState('');

  const addQuestion = () => {
    if (crossInput.trim()) {
      setCrossQuestions(qs => [...qs, crossInput.trim()]);
      setCrossInput('');
    }
  };

  return (
    <div style={{ fontFamily: "'Outfit', 'Inter', sans-serif", background: BG, minHeight: '100vh' }}>
      <PublicNavbar />

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0B1237,#1B2559)', padding: '40px 48px 28px' }}>
        <h1 style={{ color: '#fff', fontFamily: 'Georgia, serif', fontSize: '36px', fontWeight: 700, marginBottom: '8px' }}>Your Case Tools</h1>
        <p style={{ color: 'rgba(255,255,255,.55)', fontSize: '15px' }}>Prepare your instructions, flag gaps, and stay ahead of every hearing.</p>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '28px 48px' }}>
        {/* Tool tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {TOOLS.map(([id, label]) => (
            <div key={id} onClick={() => setTool(id)} style={{ padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: tool === id ? NAVY : '#fff', color: tool === id ? '#fff' : GRAY, border: `1.5px solid ${tool === id ? NAVY : '#E2E8F0'}`, transition: 'all .15s' }}>{label}</div>
          ))}
        </div>

        {/* Cross-exam builder */}
        {tool === 'cross' && (
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${PURPLE}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>⚖</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: NAVY }}>Cross-Examination Question Builder</div>
                <div style={{ fontSize: '12px', color: GRAY }}>Prepare questions you want your advocate to raise. You decide if and when to share them.</div>
              </div>
            </div>
            <div style={{ background: `${PURPLE}10`, borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: PURPLE, lineHeight: 1.6 }}>
              💡 <strong>How this works:</strong> Write down questions or points you want explored during cross-examination. These stay private until you choose to share with your advocate.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {crossQuestions.map((q, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: '#F8FAFC', borderRadius: '10px', padding: '12px 14px' }}>
                  <span style={{ color: GOLD, fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>Q{i + 1}.</span>
                  <span style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>{q}</span>
                </div>
              ))}
            </div>

            <textarea
              rows="4"
              value={crossInput}
              onChange={e => setCrossInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), addQuestion())}
              placeholder="e.g. 'Ask the witness when they first reported this incident — the FIR date is 3 days later.' Press Enter to add."
              style={{ width: '100%', resize: 'none', marginBottom: '12px', padding: '11px 14px', border: '1.5px solid #E2E8F0', borderRadius: '9px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={addQuestion} style={{ padding: '10px 18px', background: NAVY, color: '#fff', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>💾 Save to My Notes</button>
              <button style={{ padding: '10px 18px', background: GOLD, color: NAVY, border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>📤 Share with Advocate</button>
              <button onClick={() => navigate('/intelligence')} style={{ padding: '10px 18px', background: 'transparent', border: `1.5px solid ${NAVY}`, color: NAVY, borderRadius: '9px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>🤖 Get AI Suggestions</button>
            </div>
          </div>
        )}

        {/* Gap alert */}
        {tool === 'gap' && (
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🚩</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: NAVY }}>Flag a Gap</div>
                <div style={{ fontSize: '12px', color: GRAY }}>Noticed something missing? Send a formal note to your advocate through the platform.</div>
              </div>
            </div>
            <div style={{ background: '#FEF3C7', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#92400E', lineHeight: 1.6 }}>
              This creates a timestamped record on the platform. Your advocate will be notified and prompted to respond within 48 hours.
            </div>
            <textarea
              rows="4"
              value={gapText}
              onChange={e => setGapText(e.target.value)}
              placeholder="e.g. 'The delivery challan from March 2024 has not been included in the evidence list. Please review before the next hearing.'"
              style={{ width: '100%', resize: 'none', marginBottom: '12px', padding: '11px 14px', border: '1.5px solid #E2E8F0', borderRadius: '9px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <select value={gapUrgency} onChange={e => setGapUrgency(e.target.value)} style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #E2E8F0', borderRadius: '9px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}>
                <option value="">Select urgency</option>
                <option value="low">Low — FYI</option>
                <option value="medium">Medium — Please review</option>
                <option value="high">High — Before next hearing</option>
              </select>
              <button style={{ padding: '10px 18px', background: NAVY, color: '#fff', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>🚩 Send Gap Alert</button>
            </div>
          </div>
        )}

        {/* Hearing checklist */}
        {tool === 'checklist' && (
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>✅</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: NAVY }}>Hearing Prep Checklist</div>
                <div style={{ fontSize: '12px', color: GRAY }}>Auto-generated for your case type · Corporate matter</div>
              </div>
            </div>
            {checklist.map((item, i) => (
              <label key={i} onClick={() => setChecklist(cs => cs.map((c, j) => j === i ? { ...c, done: !c.done } : c))} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '11px 0', borderBottom: '1px solid #F8FAFC', cursor: 'pointer' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '5px', border: `2px solid ${item.done ? '#15803D' : '#CBD5E1'}`, background: item.done ? '#15803D' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                  {item.done && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: '13px', color: item.done ? GRAY : '#1E293B', textDecoration: item.done ? 'line-through' : 'none', lineHeight: 1.5 }}>{item.text}</span>
              </label>
            ))}
            <div style={{ marginTop: '14px', padding: '10px 14px', background: '#F8FAFC', borderRadius: '9px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: GRAY }}>{checklist.filter(c => c.done).length}/{checklist.length} items completed</span>
              <div style={{ width: `${Math.round(checklist.filter(c => c.done).length / checklist.length * 100)}%`, height: '6px', background: '#15803D', borderRadius: '3px', minWidth: '4px' }} />
            </div>
          </div>
        )}

        {/* Argument notes */}
        {tool === 'notes' && (
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>✏</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: NAVY }}>Points for Arguments</div>
                <div style={{ fontSize: '12px', color: GRAY }}>Notes on what you want emphasised before the court</div>
              </div>
            </div>
            <div style={{ background: '#EEF2FF', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: NAVY, lineHeight: 1.6 }}>
              These are your personal strategy notes. Share with your advocate when ready — or keep them private for your own reference.
            </div>
            <textarea
              rows="6"
              value={argInput}
              onChange={e => setArgInput(e.target.value)}
              placeholder="e.g. 'The oral agreement in June 2023 was acknowledged in email — this must be highlighted.' or 'The delay clause in Clause 8 specifically covers this scenario.'"
              style={{ width: '100%', resize: 'none', marginBottom: '12px', padding: '11px 14px', border: '1.5px solid #E2E8F0', borderRadius: '9px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ flex: 1, padding: '10px', background: NAVY, color: '#fff', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Save Private</button>
              <button style={{ flex: 1, padding: '10px', background: GOLD, color: NAVY, border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Share with Advocate</button>
            </div>
          </div>
        )}

        {/* Evidence vault */}
        {tool === 'vault' && (
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📁</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: NAVY }}>Annotated Evidence Vault</div>
                <div style={{ fontSize: '12px', color: GRAY }}>Upload documents and add notes about why they matter. You control what the advocate can see.</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
              {[
                { name: 'Supplier_Contract_2024.pdf', note: 'Clause 8 — delivery timeline committed. This is our strongest piece.', shared: true, icon: '📄' },
                { name: 'Email_Thread_March.pdf', note: 'Email acknowledges the delay — sent by their own director.', shared: true, icon: '📧' },
                { name: 'Invoice_Proof.jpg', note: 'Keep private — has our internal pricing. Don\'t share yet.', shared: false, icon: '🖼' },
              ].map((doc, i) => (
                <div key={i} style={{ border: `1.5px solid ${doc.shared ? '#BBFFD8' : '#E2E8F0'}`, borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>{doc.icon}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: NAVY, marginBottom: '4px', wordBreak: 'break-all' }}>{doc.name}</div>
                  <div style={{ fontSize: '11px', color: GRAY, lineHeight: 1.5, marginBottom: '10px', fontStyle: 'italic' }}>"{doc.note}"</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '3px 9px', background: doc.shared ? '#DCFCE7' : '#F1F5F9', color: doc.shared ? '#15803D' : GRAY }}>{doc.shared ? 'Shared' : 'Private'}</span>
                    <button style={{ fontSize: '11px', padding: '4px 10px', background: 'transparent', border: `1.5px solid #E2E8F0`, borderRadius: '6px', color: NAVY, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>{doc.shared ? 'Unshare' : 'Share'}</button>
                  </div>
                </div>
              ))}
              <div style={{ border: '2px dashed #D1D5DB', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', textAlign: 'center', minHeight: '140px' }} onClick={() => navigate('/documents')}>
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>+</div>
                <div style={{ fontSize: '12px', color: GRAY, fontWeight: 600 }}>Upload & Annotate</div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Goes to your vault</div>
              </div>
            </div>

            <div style={{ marginTop: '16px', background: '#FFF8E8', borderRadius: '10px', padding: '12px 14px', borderLeft: '3px solid #C9A84C' }}>
              <p style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.6, margin: 0 }}>Documents stored with 256-bit encryption in compliance with DPDP Act 2023. You may request deletion at any time.</p>
            </div>

            <button onClick={() => navigate('/documents')} style={{ marginTop: '14px', padding: '11px 22px', background: NAVY, color: '#fff', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Go to Full Evidence Vault →</button>
          </div>
        )}
      </div>
    </div>
  );
}
