/**
 * Simulated Attack Telemetry Engine for SentinelSwarm SOC (Vercel Standalone Mode)
 */

export const generateAttackTelemetry = (attackType = 'full_chain', forceEscalate = true) => {
  const timestamp = new Date().toISOString();
  const incidentId = `INC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const attackerIp = '192.168.1.8';

  let events = [];
  let incident = null;

  if (attackType === 'phishing') {
    events = [
      {
        id: `ev-${Date.now()}-1`,
        type: 'detection',
        incident_id: incidentId,
        timestamp,
        payload: {
          sensor: 'phishing',
          reason: 'Spear-phishing attachment detected with malicious macro execution attempt',
          source_ip: '45.154.255.82',
          target_user: 'finance_lead@nanditraders.com'
        }
      },
      {
        id: `ev-${Date.now()}-2`,
        type: 'analysis',
        incident_id: incidentId,
        timestamp: new Date(Date.now() + 800).toISOString(),
        payload: {
          attacker_ip: '45.154.255.82',
          narrative: 'Inbound spear-phishing payload attempting credential harvest and macro dropper execution.',
          mitre_chain: ['T1566.001', 'T1204.002', 'T1059.005']
        }
      },
      {
        id: `ev-${Date.now()}-3`,
        type: 'decision',
        incident_id: incidentId,
        confidence: 0.96,
        timestamp: new Date(Date.now() + 1600).toISOString(),
        payload: {
          outcome: 'AUTO_EXECUTE',
          score: 0.96,
          reasoning: 'High-confidence phishing pattern matched. Domain quarantined at mail gateway.'
        }
      },
      {
        id: `ev-${Date.now()}-4`,
        type: 'action_executed',
        incident_id: incidentId,
        timestamp: new Date(Date.now() + 2400).toISOString(),
        payload: {
          action: 'MAIL_GATEWAY_BLOCK',
          target: '45.154.255.82',
          result: 'QUARANTINED',
          details: 'Malicious sender domain isolated and active sessions revoked.'
        }
      }
    ];

    incident = {
      incident_id: incidentId,
      attacker_ip: '45.154.255.82',
      narrative: 'Inbound spear-phishing payload attempting credential harvest and macro dropper execution.',
      mitre_chain: ['T1566.001', 'T1204.002', 'T1059.005'],
      outcome: 'AUTO_EXECUTE',
      score: 0.96,
      status: 'RESOLVED'
    };
  } else if (attackType === 'sqli' || attackType === 'intrusion') {
    events = [
      {
        id: `ev-${Date.now()}-1`,
        type: 'detection',
        incident_id: incidentId,
        timestamp,
        payload: {
          sensor: 'intrusion',
          reason: "SQL Injection vector detected on endpoint /api/v1/auth: \"' UNION SELECT username, password_hash FROM users --\"",
          source_ip: attackerIp,
          target: 'COMPANY_PORTAL:5000'
        }
      },
      {
        id: `ev-${Date.now()}-2`,
        type: 'analysis',
        incident_id: incidentId,
        timestamp: new Date(Date.now() + 1000).toISOString(),
        payload: {
          attacker_ip: attackerIp,
          narrative: 'Unauthenticated attacker attempting database dumping via automated blind SQL injection payload.',
          mitre_chain: ['T1190', 'T1068', 'T1213']
        }
      },
      {
        id: `ev-${Date.now()}-3`,
        type: 'remediation_proposal',
        incident_id: incidentId,
        timestamp: new Date(Date.now() + 1800).toISOString(),
        payload: {
          recommended_action: 'IPTABLES_DROP',
          attacker_ip: attackerIp
        }
      },
      {
        id: `ev-${Date.now()}-4`,
        type: 'action_executed',
        incident_id: incidentId,
        timestamp: new Date(Date.now() + 2600).toISOString(),
        payload: {
          action: 'FIREWALL_BLOCK',
          target: attackerIp,
          result: 'CONTAINED',
          details: 'Firewall drop rule enforced for 192.168.1.8. Web application path sanitized.'
        }
      }
    ];

    incident = {
      incident_id: incidentId,
      attacker_ip: attackerIp,
      narrative: 'Unauthenticated attacker attempting database dumping via automated blind SQL injection payload.',
      mitre_chain: ['T1190', 'T1068', 'T1213'],
      outcome: 'AUTO_EXECUTE',
      score: 0.97,
      status: 'RESOLVED'
    };
  } else {
    // Full-chain / Exfil attack
    events = [
      {
        id: `ev-${Date.now()}-1`,
        type: 'detection',
        incident_id: incidentId,
        timestamp,
        payload: {
          sensor: 'phishing',
          reason: 'Suspicious email attachment executed in sandbox',
          source_ip: attackerIp
        }
      },
      {
        id: `ev-${Date.now()}-2`,
        type: 'detection',
        incident_id: incidentId,
        timestamp: new Date(Date.now() + 800).toISOString(),
        payload: {
          sensor: 'intrusion',
          reason: 'SQL Injection on web portal /login endpoint',
          source_ip: attackerIp
        }
      },
      {
        id: `ev-${Date.now()}-3`,
        type: 'detection',
        incident_id: incidentId,
        timestamp: new Date(Date.now() + 1600).toISOString(),
        payload: {
          sensor: 'exfil',
          reason: 'Encrypted outbound data stream (42MB) directed to unauthorized external IP',
          source_ip: attackerIp
        }
      },
      {
        id: `ev-${Date.now()}-4`,
        type: 'analysis',
        incident_id: incidentId,
        timestamp: new Date(Date.now() + 2400).toISOString(),
        payload: {
          attacker_ip: attackerIp,
          narrative: 'Multi-stage intrusion chain: Initial compromise via phishing -> SQLi database dump -> Exfiltration payload to external listener.',
          mitre_chain: ['T1566.001', 'T1190', 'T1048.003']
        }
      },
      {
        id: `ev-${Date.now()}-5`,
        type: 'veto',
        incident_id: incidentId,
        timestamp: new Date(Date.now() + 3200).toISOString(),
        payload: {
          veto: false,
          reason: 'Verified target is external untrusted IP. Safety audit passed.'
        }
      },
      {
        id: `ev-${Date.now()}-6`,
        type: 'decision',
        incident_id: incidentId,
        confidence: 0.94,
        timestamp: new Date(Date.now() + 4000).toISOString(),
        payload: {
          outcome: forceEscalate ? 'ESCALATE_HUMAN' : 'AUTO_EXECUTE',
          score: 0.94,
          reasoning: forceEscalate 
            ? 'High impact exfiltration threat. Escalating to human lead via WhatsApp + SOC Dashboard.'
            : 'Autonomous containment approved by Swarm consensus.'
        }
      }
    ];

    if (!forceEscalate) {
      events.push({
        id: `ev-${Date.now()}-7`,
        type: 'action_executed',
        incident_id: incidentId,
        timestamp: new Date(Date.now() + 4800).toISOString(),
        payload: {
          action: 'PERIMETER_QUARANTINE',
          target: attackerIp,
          result: 'CONTAINED',
          details: 'Attacker IP 192.168.1.8 isolated across all edge routers. Session revoked.'
        }
      });
    }

    incident = {
      incident_id: incidentId,
      attacker_ip: attackerIp,
      narrative: 'Multi-stage intrusion chain: Initial compromise via phishing -> SQLi database dump -> Exfiltration payload to external listener.',
      mitre_chain: ['T1566.001', 'T1190', 'T1048.003'],
      outcome: forceEscalate ? 'ESCALATE_HUMAN' : 'AUTO_EXECUTE',
      score: 0.94,
      status: forceEscalate ? 'AWAITING_HUMAN' : 'RESOLVED'
    };
  }

  return { incidentId, events, incident };
};
