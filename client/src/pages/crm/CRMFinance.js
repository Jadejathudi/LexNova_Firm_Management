import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function CRMFinance() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    api.getInvoices()
      .then(setInvoices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterStatus === 'all' ? invoices : invoices.filter(i => i.status === filterStatus);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0);
  const totalPending = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total_amount, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total_amount, 0);

  const updateStatus = async (id, status) => {
    try {
      await api.updateInvoiceStatus(id, status);
      const inv = await api.getInvoices();
      setInvoices(inv);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading">Loading invoices...</div>;

  return (
    <div>
      <h2 style={{ color: '#0A1628', marginBottom: 20 }}>Finance</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#22C55E' }}>₹{(totalPaid / 1000).toFixed(0)}K</div>
          <div className="stat-label">Total Received</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#F59E0B' }}>₹{(totalPending / 1000).toFixed(0)}K</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#EF4444' }}>₹{(totalOverdue / 1000).toFixed(0)}K</div>
          <div className="stat-label">Overdue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{invoices.length}</div>
          <div className="stat-label">Total Invoices</div>
        </div>
      </div>

      <div className="doc-filters" style={{ marginBottom: 16 }}>
        {['all', 'draft', 'sent', 'paid', 'overdue', 'waived'].map(s => (
          <div key={s} className={`doc-filter ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </div>
        ))}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Matter</th>
            <th>Client</th>
            <th>Amount</th>
            <th>GST</th>
            <th>Total</th>
            <th>Status</th>
            <th>Due Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(inv => (
            <tr key={inv.invoice_id}>
              <td><strong>{inv.invoice_number}</strong></td>
              <td>{inv.matter_number || inv.matter_title}</td>
              <td>{inv.client_name || '—'}</td>
              <td>₹{inv.amount_base?.toLocaleString('en-IN')}</td>
              <td>₹{inv.gst_amount?.toLocaleString('en-IN')}</td>
              <td><strong>₹{inv.total_amount?.toLocaleString('en-IN')}</strong></td>
              <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
              <td>{new Date(inv.due_date).toLocaleDateString('en-IN')}</td>
              <td>
                {inv.status === 'draft' && (
                  <button className="btn btn-sm btn-navy" onClick={() => updateStatus(inv.invoice_id, 'sent')}>Send</button>
                )}
                {inv.status === 'sent' && (
                  <button className="btn btn-sm btn-gold" onClick={() => updateStatus(inv.invoice_id, 'paid')}>Mark Paid</button>
                )}
                {inv.status === 'overdue' && (
                  <button className="btn btn-sm btn-gold" onClick={() => updateStatus(inv.invoice_id, 'paid')}>Mark Paid</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
