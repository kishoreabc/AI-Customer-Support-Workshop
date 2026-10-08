/**
 * Aegis TelcoAI - Frontend Application Controller
 * Handles customer switching, chat streaming/execution, real-time architecture visualization,
 * and live telemetry sync with FastAPI.
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentCustomerId = 'CUST-102';
  let activeCustomers = {};
  let runtimeConfig = {
    provider: 'auto',
    apiKey: ''
  };

  // DOM Elements
  const customerSelect = document.getElementById('customerSelect');
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const resetDemoBtn = document.getElementById('resetDemoBtn');
  const sendBtn = document.getElementById('sendBtn');
  const graphStateBadge = document.getElementById('graphStateBadge');
  const ticketCountBadge = document.getElementById('ticketCountBadge');

  // Inspector Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const reasoningContent = document.getElementById('reasoningContent');
  const decisionBadge = document.getElementById('decisionBadge');
  const intentCategory = document.getElementById('intentCategory');
  const intentName = document.getElementById('intentName');
  const intentUrgency = document.getElementById('intentUrgency');
  const intentSentiment = document.getElementById('intentSentiment');
  const churnRiskValue = document.getElementById('churnRiskValue');
  const churnBarFill = document.getElementById('churnBarFill');
  const ragDocsList = document.getElementById('ragDocsList');
  const telecomJsonView = document.getElementById('telecomJsonView');
  const actionResultView = document.getElementById('actionResultView');

  // Modals
  const ticketsModal = document.getElementById('ticketsModal');
  const viewTicketsBtn = document.getElementById('viewTicketsBtn');
  const ticketsListContainer = document.getElementById('ticketsListContainer');
  const kbModal = document.getElementById('kbModal');
  const viewKbBtn = document.getElementById('viewKbBtn');
  const kbListContainer = document.getElementById('kbListContainer');
  const settingsModal = document.getElementById('settingsModal');
  const settingsBtn = document.getElementById('settingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const settingProviderSelect = document.getElementById('settingProviderSelect');
  const settingApiKey = document.getElementById('settingApiKey');

  // Scenario presets
  const scenarioMap = {
    fiber: "Help! The optical LOS light on my fiber modem turned RED and my home internet is completely down. I work from home and need this fixed immediately!",
    roaming: "I just got my monthly bill and there is an unexpected $65 international roaming charge from my trip to Mexico. I thought this was included in my plan and want a credit!",
    esim: "I just purchased a new phone and need to transfer my line. Can you please generate and send me my new eSIM QR code activation profile?",
    speed: "My 5G mobile data has been painfully slow all afternoon in downtown Seattle. Videos won't even buffer. Can you check my connection?",
    enterprise: "Emergency alert from FinTech Cloud Operations: Our 10Gbps dedicated leased line (Circuit CKT-WDC-SFO-10G-099) is suffering severe BGP route flapping and 100% packet spikes. Need immediate P1 NOC escalation!"
  };

  // Scenario to customer mapping for seamless demo flow
  const scenarioCustomerMap = {
    fiber: 'CUST-102',
    roaming: 'CUST-103',
    esim: 'CUST-104',
    speed: 'CUST-101',
    enterprise: 'CUST-105'
  };

  // 1. Initial Data Fetch
  async function init() {
    await fetchCustomers();
    await updateTelemetryHUD(currentCustomerId);
    await refreshTicketsCount();
    setupEventListeners();
  }

  // 2. Fetch customers and populate dropdown
  async function fetchCustomers() {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      activeCustomers = {};
      customerSelect.innerHTML = '';
      
      data.forEach(c => {
        activeCustomers[c.customer_id] = c;
        const opt = document.createElement('option');
        opt.value = c.customer_id;
        opt.textContent = `${c.name} — ${c.plan.name}`;
        customerSelect.appendChild(opt);
      });

      customerSelect.value = currentCustomerId;
      updateCustomerProfileCard(activeCustomers[currentCustomerId]);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  }

  // 3. Update Customer Profile Card in Left Panel
  function updateCustomerProfileCard(c) {
    if (!c) return;
    document.getElementById('custName').textContent = c.name;
    document.getElementById('custAvatar').textContent = c.name.split(' ').map(n => n[0]).join('');
    document.getElementById('custPhone').textContent = c.phone;
    document.getElementById('custAccount').textContent = c.account_number;
    document.getElementById('custPlan').textContent = c.plan.name;
    document.getElementById('custTenure').textContent = `${c.tenure_months} months`;
    document.getElementById('custBalance').textContent = `$${c.billing.current_balance.toFixed(2)}`;

    const tierEl = document.getElementById('custTier');
    tierEl.textContent = c.tier;
    tierEl.className = 'tier-badge';
    if (c.tier.toLowerCase().includes('gold')) tierEl.classList.add('gold');
    else if (c.tier.toLowerCase().includes('platinum')) tierEl.classList.add('platinum');
    else tierEl.classList.add('silver');
  }

  // 4. Update Telemetry HUD
  async function updateTelemetryHUD(customerId) {
    try {
      const [netRes, billRes, accRes] = await Promise.all([
        fetch(`/api/telecom/network/${customerId}`).then(r => r.json()),
        fetch(`/api/telecom/billing/${customerId}`).then(r => r.json()),
        fetch(`/api/telecom/account/${customerId}`).then(r => r.json())
      ]);

      const netStatus = netRes.status || {};
      const hudNet = document.getElementById('hudNetStatus');
      const hudSignal = document.getElementById('hudSignal');
      const hudBilling = document.getElementById('hudBilling');
      const hudDevice = document.getElementById('hudDevice');

      if (netStatus.line_state === 'DOWN' || netStatus.bgp_status === 'FLAPPING') {
        hudNet.textContent = `${netStatus.service_type} (${netStatus.line_state || 'FLAPPING'})`;
        hudNet.className = 'hud-value danger';
      } else {
        hudNet.textContent = `${netStatus.service_type || 'CONNECTED'} (NORMAL)`;
        hudNet.className = 'hud-value ok';
      }

      hudSignal.textContent = netStatus.optical_power_rx || netStatus.signal_strength_rsrp || 'Active';
      hudBilling.textContent = `Balance: $${billRes.current_balance} (${billRes.status})`;
      
      const firstDevice = accRes.devices && accRes.devices[0];
      hudDevice.textContent = firstDevice ? `${firstDevice.model} (${firstDevice.status})` : 'Active';
    } catch (e) {
      console.warn('HUD fetch error:', e);
    }
  }

  // 5. Update Ticket Count
  async function refreshTicketsCount() {
    try {
      const res = await fetch('/api/tickets');
      const tickets = await res.json();
      ticketCountBadge.textContent = tickets.length;
    } catch (e) {
      console.warn('Ticket fetch error:', e);
    }
  }

  // 6. Event Listeners
  function setupEventListeners() {
    customerSelect.addEventListener('change', async (e) => {
      currentCustomerId = e.target.value;
      updateCustomerProfileCard(activeCustomers[currentCustomerId]);
      await updateTelemetryHUD(currentCustomerId);
    });

    // Preset chips
    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const scenario = chip.dataset.scenario;
        const msg = scenarioMap[scenario];
        const assignedCust = scenarioCustomerMap[scenario];
        
        if (assignedCust && assignedCust !== currentCustomerId) {
          currentCustomerId = assignedCust;
          customerSelect.value = assignedCust;
          updateCustomerProfileCard(activeCustomers[assignedCust]);
          updateTelemetryHUD(assignedCust);
        }

        chatInput.value = msg;
        chatInput.focus();
      });
    });

    // Chat form submit
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = chatInput.value.trim();
      if (!message) return;

      appendMessage('user', message);
      chatInput.value = '';
      sendBtn.disabled = true;

      await executeAgent(message);
      sendBtn.disabled = false;
    });

    // Clear chat
    clearChatBtn.addEventListener('click', () => {
      chatMessages.innerHTML = `
        <div class="message assistant">
          <div class="message-avatar">AI</div>
          <div class="message-content">
            <p>Chat session reset. Ready for your inquiry.</p>
          </div>
        </div>
      `;
    });

    // Reset Demo
    resetDemoBtn.addEventListener('click', async () => {
      if (confirm('Reset demo customers, simulated line status, and ticket queues to default state?')) {
        await fetch('/api/reset-demo', { method: 'POST' });
        await init();
        appendMessage('assistant', 'System demo state has been successfully reset.');
      }
    });

    // Inspector Tabs
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.tab);
        if (target) target.classList.add('active');
      });
    });

    // Modal Triggers
    viewTicketsBtn.addEventListener('click', openTicketsModal);
    viewKbBtn.addEventListener('click', openKbModal);
    settingsBtn.addEventListener('click', () => settingsModal.showModal());

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.close;
        const modal = document.getElementById(modalId);
        if (modal) modal.close();
      });
    });

    // Save Settings
    saveSettingsBtn.addEventListener('click', () => {
      runtimeConfig.provider = settingProviderSelect.value;
      runtimeConfig.apiKey = settingApiKey.value.trim();
      settingsModal.close();
      appendMessage('assistant', `Configuration updated: Active provider set to [${runtimeConfig.provider}].`);
    });
  }

  // 7. Append chat message
  function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    const avatar = role === 'user' ? 'U' : 'AI';
    
    // Format basic markdown (bold, links, code)
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');

    msgDiv.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-content">
        <p>${formatted}</p>
      </div>
    `;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msgDiv;
  }

  // 8. Execute Agent via LangGraph Pipeline
  async function executeAgent(message) {
    graphStateBadge.textContent = 'RUNNING';
    graphStateBadge.className = 'status-indicator running';

    // Highlight step 1
    animatePipelineStep('step-ingress');

    // Add typing indicator placeholder
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.innerHTML = `
      <div class="message-avatar">AI</div>
      <div class="message-content">
        <p><em>Analyzing telecom telemetry & running LangGraph reasoning...</em></p>
      </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: currentCustomerId,
          message: message,
          provider_override: runtimeConfig.provider,
          api_key_override: runtimeConfig.apiKey || null
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Step animations
      await delay(200);
      animatePipelineStep('step-context');
      await delay(200);
      animatePipelineStep('step-reasoning');
      await delay(200);
      animatePipelineStep('step-decision');
      await delay(200);
      animatePipelineStep('step-egress');

      // Remove typing indicator and append real response
      chatMessages.removeChild(typingDiv);
      appendMessage('assistant', data.response);

      // Update Inspector Panes
      updateInspector(data);

      // Refresh HUD and Tickets
      await updateTelemetryHUD(currentCustomerId);
      await refreshTicketsCount();

      graphStateBadge.textContent = 'COMPLETE';
      graphStateBadge.className = 'status-indicator ok';
    } catch (err) {
      console.error('Agent execution error:', err);
      chatMessages.removeChild(typingDiv);
      appendMessage('assistant', `⚠️ System Error: Unable to complete agent workflow: ${err.message}`);
      graphStateBadge.textContent = 'ERROR';
      graphStateBadge.className = 'status-indicator idle';
    }
  }

  // Helper for pipeline animation
  function animatePipelineStep(stepId) {
    document.querySelectorAll('.node-step').forEach(s => s.classList.remove('active'));
    const stepEl = document.getElementById(stepId);
    if (stepEl) {
      stepEl.classList.add('active');
      stepEl.classList.add('completed');
      const icon = stepEl.querySelector('.node-status-icon');
      if (icon) icon.textContent = '✓';
    }
  }

  // 9. Update Inspector with execution trace
  function updateInspector(data) {
    // Tab 1: Reasoning
    reasoningContent.textContent = data.llm_reasoning || 'No reasoning trace returned.';
    if (data.decision) {
      decisionBadge.textContent = data.decision.action_type;
      decisionBadge.className = 'badge ' + (data.decision.action_type === 'AUTO_RESOLVE' ? 'badge-emerald' : 'badge-rose');
    }

    // Tab 2: Intent & Classification
    if (data.classification) {
      intentCategory.textContent = data.classification.category;
      intentName.textContent = data.classification.intent;
      intentUrgency.textContent = data.classification.urgency;
      intentSentiment.textContent = data.classification.sentiment;
      
      const churn = data.classification.churn_risk_score || 0;
      churnRiskValue.textContent = `${churn} / 10`;
      churnBarFill.style.width = `${churn * 10}%`;
    }

    // Tab 3: RAG Sources
    if (data.rag_sources && data.rag_sources.length > 0) {
      ragDocsList.innerHTML = data.rag_sources.map(doc => `
        <div class="rag-doc-card">
          <div class="rag-doc-title">${doc.title}</div>
          <div class="rag-doc-score">Relevance Score: ${doc.score} (Category: ${doc.category})</div>
        </div>
      `).join('');
    } else {
      ragDocsList.innerHTML = `<p class="placeholder-text">No matching Knowledge Base articles needed.</p>`;
    }

    // Tab 4: Telecom APIs
    telecomJsonView.textContent = JSON.stringify(data.telecom_api_data || {}, null, 2);

    // Tab 5: Action & Ticket Result
    if (data.ticket) {
      actionResultView.innerHTML = `
        <div class="ticket-item ${data.ticket.priority.toLowerCase()}">
          <div class="ticket-header">
            <span class="ticket-id">${data.ticket.ticket_id}</span>
            <span class="badge badge-rose">${data.ticket.priority} Escalation</span>
          </div>
          <div class="ticket-summary">${data.ticket.summary}</div>
          <div class="ticket-meta">
            <span><strong>Queue:</strong> ${data.ticket.assigned_queue}</span>
            <span><strong>Status:</strong> ${data.ticket.status}</span>
          </div>
        </div>
      `;
    } else if (data.action_result) {
      actionResultView.innerHTML = `
        <div class="ticket-item" style="border-left-color: var(--accent-emerald);">
          <div class="ticket-header">
            <span class="ticket-id" style="color: var(--accent-emerald);">AUTO RESOLVED</span>
            <span class="badge badge-emerald">Success</span>
          </div>
          <div class="ticket-summary">Telecom API Remediations Executed</div>
          <pre class="code-preview" style="margin-top: 0.5rem;">${JSON.stringify(data.action_result, null, 2)}</pre>
        </div>
      `;
    } else {
      actionResultView.innerHTML = `<p class="placeholder-text">General informational response.</p>`;
    }
  }

  // 10. Open Tickets Modal
  async function openTicketsModal() {
    ticketsModal.showModal();
    try {
      const res = await fetch('/api/tickets');
      const tickets = await res.json();
      if (tickets.length === 0) {
        ticketsListContainer.innerHTML = '<p class="placeholder-text">No active escalation tickets.</p>';
        return;
      }
      ticketsListContainer.innerHTML = tickets.map(t => `
        <div class="ticket-item ${t.priority.toLowerCase()}">
          <div class="ticket-header">
            <span class="ticket-id">${t.ticket_id}</span>
            <span class="badge ${t.priority === 'P1' ? 'badge-rose' : 'badge-purple'}">${t.priority} (${t.status})</span>
          </div>
          <div class="ticket-summary">${t.summary}</div>
          <div class="ticket-meta">
            <span><strong>Customer:</strong> ${t.customer_name} (${t.customer_id})</span>
            <span><strong>Queue:</strong> ${t.assigned_queue}</span>
            <span><strong>Created:</strong> ${new Date(t.created_at).toLocaleTimeString()}</span>
          </div>
          <div style="margin-top: 0.5rem; font-size: 0.75rem; color: #94a3b8;">
            <strong>AI Handover Notes:</strong> ${t.ai_handover_notes}
          </div>
        </div>
      `).join('');
    } catch (e) {
      ticketsListContainer.innerHTML = `<p class="placeholder-text">Failed to fetch tickets: ${e.message}</p>`;
    }
  }

  // 11. Open Knowledge Base Modal
  async function openKbModal() {
    kbModal.showModal();
    try {
      const res = await fetch('/api/knowledge-base');
      const docs = await res.json();
      kbListContainer.innerHTML = docs.map(d => `
        <div class="kb-card">
          <h4>${d.title} (${d.id})</h4>
          <pre>${d.content.trim()}</pre>
        </div>
      `).join('');
    } catch (e) {
      kbListContainer.innerHTML = `<p class="placeholder-text">Failed to load KB: ${e.message}</p>`;
    }
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Run initialization
  init();
});
