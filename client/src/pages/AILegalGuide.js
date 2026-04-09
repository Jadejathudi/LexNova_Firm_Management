import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function AILegalGuide() {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getAIQuestions()
      .then(data => setSuggestedQuestions(data.questions || []))
      .catch(() => {});
  }, []);

  const askQuestion = async (q) => {
    const text = q || question;
    if (!text.trim()) return;

    setConversation(prev => [...prev, { type: 'user', text }]);
    setQuestion('');
    setLoading(true);

    try {
      const result = await api.askAI(text);
      setConversation(prev => [...prev, {
        type: 'ai',
        text: result.answer,
        confidence: result.confidence,
        escalate: result.escalate,
        disclaimer: result.disclaimer,
      }]);
    } catch (err) {
      setConversation(prev => [...prev, { type: 'ai', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-guide page-with-nav">
      <button className="back-btn" onClick={() => window.history.back()}>← Back</button>
      <h2 style={{ color: '#0A1628', marginBottom: 4 }}>AI Legal Guide 🤖</h2>
      <p style={{ color: '#94A3B8', fontSize: 13, marginBottom: 20 }}>Not a substitute for professional advice.</p>

      {conversation.length === 0 && (
        <>
          <div className="ai-bubble">
            🤖 Hello! I can help you understand your legal situation and rights. What would you like to know?
          </div>
          <h3 style={{ fontSize: 15, marginBottom: 12, color: '#475569' }}>Quick Questions:</h3>
          <div className="suggested-questions">
            {suggestedQuestions.map((q, i) => (
              <div key={i} className="suggested-q" onClick={() => askQuestion(q)}>{q}</div>
            ))}
          </div>
        </>
      )}

      {conversation.map((msg, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          {msg.type === 'user' ? (
            <div className="chat-msg sent" style={{ marginLeft: 'auto' }}>{msg.text}</div>
          ) : (
            <div>
              <div className="ai-bubble">
                <div className="ai-response">{msg.text}</div>
                {msg.disclaimer && <div className="disclaimer">⚖️ {msg.disclaimer}</div>}
              </div>
              {msg.escalate && (
                <div className="ai-escalate">
                  ⚠️ For your specific situation, we recommend speaking with an advocate.{' '}
                  <a href="/book" style={{ fontWeight: 600 }}>Book a Free Consultation →</a>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {loading && (
        <div className="ai-bubble" style={{ opacity: 0.6 }}>🤖 Thinking...</div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
        🔒 Your questions are private and encrypted.
      </div>

      <div className="ai-input-area">
        <input placeholder="Ask anything about law..." value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && askQuestion()} />
        <button className="btn btn-gold btn-sm" onClick={() => askQuestion()} disabled={loading}>➤</button>
      </div>

      {conversation.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <a href="/book" className="btn btn-outline btn-sm">Book a Consultation to speak with an advocate</a>
        </div>
      )}
    </div>
  );
}
