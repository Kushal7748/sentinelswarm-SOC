import React, { useState, useEffect } from 'react';
import { CreditCard, ExternalLink, RefreshCw, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { API_URL } from '../config/api.js';

export default function X402PaymentsTable({ events }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testIp, setTestIp] = useState('192.168.1.8');

  const fetchPayments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/x402/history`);
      const data = await res.json();
      setPayments(data);
    } catch (e) {
      console.warn('Failed to fetch payments:', e);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [events]);

  const triggerPaymentLookup = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/x402/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: testIp, incident_id: `INC-X402-${Date.now().toString().slice(-4)}` })
      });
      await fetchPayments();
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col h-full rounded-2xl p-0 overflow-hidden"
      style={{
        background: 'var(--col-surface-0)',
        border: '1px solid var(--col-border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--col-border)', background: 'var(--col-surface-1)' }}
      >
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4" style={{ color: 'var(--col-primary)' }} />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--col-text-primary)' }}>
              x402 On-Chain Micropayments (Algorand Testnet)
            </h2>
            <span className="text-[10px] font-mono" style={{ color: 'var(--col-text-muted)' }}>
              HTTP 402 Protocol • Centralized Commerce Agent • Algorand CAIP-2 Settlement
            </span>
          </div>
        </div>

        {/* Live Lookup Trigger */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={testIp}
            onChange={(e) => setTestIp(e.target.value)}
            className="px-2.5 py-1 rounded-lg text-xs font-mono w-32 focus:outline-none"
            style={{
              background: 'var(--col-surface-0)',
              border: '1px solid var(--col-border)',
              color: 'var(--col-text-primary)'
            }}
            placeholder="IP Address"
          />
          <button
            disabled={loading}
            onClick={triggerPaymentLookup}
            className="btn-primary text-xs px-3 py-1 font-mono disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Pay & Query ($0.01)</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-3">
        {payments.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-xs" style={{ color: 'var(--col-text-faint)' }}>
            <CreditCard className="w-8 h-8 mb-2 opacity-40 animate-pulse" style={{ color: 'var(--col-primary)' }} />
            <p>No x402 micropayments recorded yet. Click 'Pay & Query' to execute on-chain lookup.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="sticky top-0 border-b text-stone-600" style={{ background: 'var(--col-surface-2)', borderColor: 'var(--col-border)' }}>
              <tr>
                <th className="py-2.5 px-3">Target IP</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Network</th>
                <th className="py-2.5 px-3">Resource / Threat Intel</th>
                <th className="py-2.5 px-3">Algorand TxID / Explorer</th>
              </tr>
            </thead>
            <tbody className="divide-y text-stone-800" style={{ borderColor: 'var(--col-border)' }}>
              {payments.map((pmt, idx) => (
                <tr key={idx} className="hover:bg-stone-200/50">
                  <td className="py-2 px-3 text-rose-700 font-bold">{pmt.target_ip || pmt.ip || '192.168.1.8'}</td>
                  <td className="py-2 px-3 text-emerald-700 font-bold">{pmt.amount_usdc || '0.01'} USDC</td>
                  <td className="py-2 px-3 text-stone-600">{pmt.network || 'algorand-testnet'}</td>
                  <td className="py-2 px-3">
                    <span className="badge badge-danger text-[10px]">
                      {pmt.resource || 'ip-reputation'}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <a
                      href={pmt.explorer_url || `https://lora.algokit.io/testnet/transaction/${pmt.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-bold hover:underline"
                      style={{ color: 'var(--col-primary)' }}
                    >
                      <span>{pmt.tx_hash?.slice(0, 10)}…{pmt.tx_hash?.slice(-6)}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
