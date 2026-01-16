/**
 * AI Tutor Module - Full page AI Chat experience
 */

export class AITutorModule {
    constructor(app) {
        this.app = app;
        this.name = 'aiTutor';
        this.title = 'AI Tutor';
        this.description = 'Chat with Gemini to understand electromagnetic concepts';
    }

    init() {
        // Hide 3D canvas since this is a chat page
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) {
            canvasContainer.style.display = 'none';
        }

        // Hide control panel
        const controlPanel = document.getElementById('control-panel');
        if (controlPanel) {
            controlPanel.classList.add('hidden');
        }

        // Create full-page AI UI
        this.createAIUI();
    }

    createAIUI() {
        let aiUI = document.getElementById('ai-tutor-ui');
        if (!aiUI) {
            aiUI = document.createElement('div');
            aiUI.id = 'ai-tutor-ui';
            document.getElementById('main-content').appendChild(aiUI);
        }

        aiUI.innerHTML = `
            <div class="ai-fullpage-container">
                <div class="ai-header">
                    <div class="ai-title-section">
                        <h1 class="ai-main-title">Gemini Physics Tutor</h1>
                        <h2 class="ai-subtitle">Your AI-powered Electromagnetic Induction Expert</h2>
                    </div>
                </div>
                
                <div class="ai-chat-area">
                    <div class="ai-messages" id="ai-fullpage-messages">
                        <div class="ai-welcome">
                            <div class="welcome-avatar">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                            <h3>Welcome! I'm your Physics Tutor</h3>
                            <p>I specialize in Electromagnetic Induction. Ask me about:</p>
                            <div class="topic-grid">
                                <button class="topic-card" data-topic="Faraday's Law">
                                    <span class="topic-icon">⚡</span>
                                    <span class="topic-name">Faraday's Law</span>
                                </button>
                                <button class="topic-card" data-topic="Lenz's Law">
                                    <span class="topic-icon">🔄</span>
                                    <span class="topic-name">Lenz's Law</span>
                                </button>
                                <button class="topic-card" data-topic="Magnetic Flux">
                                    <span class="topic-icon">🧲</span>
                                    <span class="topic-name">Magnetic Flux</span>
                                </button>
                                <button class="topic-card" data-topic="Solenoids">
                                    <span class="topic-icon">🔌</span>
                                    <span class="topic-name">Solenoids</span>
                                </button>
                                <button class="topic-card" data-topic="Transformers">
                                    <span class="topic-icon">🔋</span>
                                    <span class="topic-name">Transformers</span>
                                </button>
                                <button class="topic-card" data-topic="Eddy Currents">
                                    <span class="topic-icon">🌀</span>
                                    <span class="topic-name">Eddy Currents</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ai-input-container">
                        <div class="style-selector">
                            <span class="style-label">Explanation Style:</span>
                            <div class="style-buttons">
                                <button class="style-btn active" data-style="conceptual">💭 Conceptual</button>
                                <button class="style-btn" data-style="mathematical">📐 Mathematical</button>
                                <button class="style-btn" data-style="step-by-step">📝 Step-by-Step</button>
                            </div>
                        </div>
                        <div class="input-wrapper">
                            <textarea id="ai-fullpage-input" placeholder="Ask your physics question..." rows="1"></textarea>
                            <button id="ai-fullpage-send" class="send-btn" disabled>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.addAIStyles();
        this.setupAIListeners();
    }

    setupAIListeners() {
        // Topic cards
        document.querySelectorAll('#ai-tutor-ui .topic-card').forEach(card => {
            card.addEventListener('click', () => {
                const topic = card.dataset.topic;
                this.sendMessage(`Explain ${topic} in the context of electromagnetic induction. Include the key formula and a practical example.`);
            });
        });

        // Style buttons
        document.querySelectorAll('#ai-tutor-ui .style-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#ai-tutor-ui .style-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.app.geminiTutor) {
                    this.app.geminiTutor.explanationStyle = btn.dataset.style;
                }
            });
        });

        // Input handling
        const input = document.getElementById('ai-fullpage-input');
        const sendBtn = document.getElementById('ai-fullpage-send');

        input.addEventListener('input', () => {
            sendBtn.disabled = !input.value.trim();
            this.autoResizeTextarea(input);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.value.trim()) {
                    this.sendMessage(input.value.trim());
                    input.value = '';
                    input.style.height = 'auto';
                    sendBtn.disabled = true;
                }
            }
        });

        sendBtn.addEventListener('click', () => {
            if (input.value.trim()) {
                this.sendMessage(input.value.trim());
                input.value = '';
                input.style.height = 'auto';
                sendBtn.disabled = true;
            }
        });
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }

    async sendMessage(message) {
        const messagesContainer = document.getElementById('ai-fullpage-messages');

        // Remove welcome if present
        const welcome = messagesContainer.querySelector('.ai-welcome');
        if (welcome) welcome.remove();

        // Add user message
        this.addMessage('user', message);

        // Show typing indicator
        this.showTyping();

        // Get response from GeminiTutor
        if (this.app.geminiTutor) {
            try {
                const response = await this.app.geminiTutor.callGeminiAPI(message);
                this.hideTyping();
                this.addMessage('assistant', response);
            } catch (error) {
                this.hideTyping();
                this.addMessage('assistant', `Error: ${error.message}`);
            }
        } else {
            this.hideTyping();
            this.addMessage('assistant', 'AI Tutor is not available. Please refresh the page.');
        }
    }

    addMessage(role, content) {
        const messagesContainer = document.getElementById('ai-fullpage-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ai-message-${role}`;

        // Format content
        const formatted = this.formatContent(content);

        messageDiv.innerHTML = `
            <div class="message-avatar">${role === 'user' ? '👤' : '🤖'}</div>
            <div class="message-content">${formatted}</div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    formatContent(content) {
        return content
            .replace(/```([\s\S]*?)```/g, '<pre class="code-block">$1</pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/^### (.*$)/gm, '<h5>$1</h5>')
            .replace(/^## (.*$)/gm, '<h4>$1</h4>')
            .replace(/^# (.*$)/gm, '<h3>$1</h3>')
            .replace(/\n/g, '<br>');
    }

    showTyping() {
        const messagesContainer = document.getElementById('ai-fullpage-messages');
        const typing = document.createElement('div');
        typing.id = 'ai-typing';
        typing.className = 'ai-typing';
        typing.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="typing-dots"><span></span><span></span><span></span></div>
        `;
        messagesContainer.appendChild(typing);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTyping() {
        const typing = document.getElementById('ai-typing');
        if (typing) typing.remove();
    }

    addAIStyles() {
        if (document.getElementById('ai-tutor-styles')) return;

        const style = document.createElement('style');
        style.id = 'ai-tutor-styles';
        style.textContent = `
            #ai-tutor-ui {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, var(--bg-primary), var(--bg-secondary));
                z-index: 10;
            }
            
            .ai-fullpage-container {
                height: 100%;
                display: flex;
                flex-direction: column;
                max-width: 1000px;
                margin: 0 auto;
                padding: 2rem;
            }
            
            .ai-header {
                margin-bottom: 1.5rem;
            }
            
            .ai-main-title {
                font-size: 2.5rem;
                font-weight: 700;
                background: linear-gradient(135deg, #e74c3c, #3498db);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin: 0 0 0.5rem 0;
                line-height: 1.2;
            }
            
            .ai-subtitle {
                font-size: 1.1rem;
                color: var(--text-secondary);
                font-weight: 400;
                margin: 0;
            }
            
            .ai-chat-area {
                flex: 1;
                display: flex;
                flex-direction: column;
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: var(--border-radius);
                overflow: hidden;
            }
            
            .ai-messages {
                flex: 1;
                overflow-y: auto;
                padding: 1.5rem;
            }
            
            .ai-welcome {
                text-align: center;
                padding: 2rem;
            }
            
            .welcome-avatar {
                width: 80px;
                height: 80px;
                margin: 0 auto 1.5rem;
                background: linear-gradient(135deg, #4285F4, #34A853);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }
            
            .welcome-avatar svg {
                width: 40px;
                height: 40px;
            }
            
            .ai-welcome h3 {
                font-size: 1.5rem;
                color: var(--text-primary);
                margin: 0 0 0.5rem 0;
            }
            
            .ai-welcome p {
                color: var(--text-secondary);
                margin: 0 0 1.5rem 0;
            }
            
            .topic-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 1rem;
                max-width: 600px;
                margin: 0 auto;
            }
            
            .topic-card {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
                padding: 1.25rem 1rem;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid var(--border);
                border-radius: var(--border-radius);
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .topic-card:hover {
                background: rgba(66, 133, 244, 0.1);
                border-color: #4285F4;
                transform: translateY(-2px);
            }
            
            .topic-icon {
                font-size: 1.5rem;
            }
            
            .topic-name {
                font-size: 0.85rem;
                color: var(--text-primary);
                font-weight: 500;
            }
            
            /* Messages */
            .ai-message {
                display: flex;
                gap: 1rem;
                margin-bottom: 1.5rem;
                max-width: 85%;
            }
            
            .ai-message-user {
                margin-left: auto;
                flex-direction: row-reverse;
            }
            
            .message-avatar {
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.25rem;
                flex-shrink: 0;
            }
            
            .ai-message-user .message-avatar {
                background: rgba(66, 133, 244, 0.2);
            }
            
            .message-content {
                padding: 1rem 1.25rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 16px;
                color: var(--text-primary);
                line-height: 1.6;
            }
            
            .ai-message-user .message-content {
                background: linear-gradient(135deg, rgba(231, 76, 60, 0.2), rgba(52, 152, 219, 0.2));
            }
            
            .message-content code {
                background: rgba(0, 0, 0, 0.3);
                padding: 0.15rem 0.4rem;
                border-radius: 4px;
                font-family: 'Fira Code', monospace;
            }
            
            .message-content pre.code-block {
                background: rgba(0, 0, 0, 0.4);
                padding: 1rem;
                border-radius: 8px;
                overflow-x: auto;
                font-family: 'Fira Code', monospace;
                margin: 0.75rem 0;
            }
            
            .message-content strong {
                color: var(--accent);
            }
            
            /* Typing indicator */
            .ai-typing {
                display: flex;
                gap: 1rem;
                align-items: center;
            }
            
            .typing-dots {
                display: flex;
                gap: 4px;
                padding: 1rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 16px;
            }
            
            .typing-dots span {
                width: 8px;
                height: 8px;
                background: #4285F4;
                border-radius: 50%;
                animation: typingBounce 1.4s infinite;
            }
            
            .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
            .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
            
            @keyframes typingBounce {
                0%, 60%, 100% { transform: translateY(0); }
                30% { transform: translateY(-6px); }
            }
            
            /* Input */
            .ai-input-container {
                padding: 1rem 1.5rem;
                border-top: 1px solid var(--border);
                background: rgba(0, 0, 0, 0.2);
            }
            
            .style-selector {
                display: flex;
                align-items: center;
                gap: 1rem;
                margin-bottom: 1rem;
            }
            
            .style-label {
                font-size: 0.85rem;
                color: var(--text-secondary);
            }
            
            .style-buttons {
                display: flex;
                gap: 0.5rem;
            }
            
            #ai-tutor-ui .style-btn {
                padding: 0.4rem 0.75rem;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid var(--border);
                border-radius: 20px;
                color: var(--text-secondary);
                font-size: 0.8rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            #ai-tutor-ui .style-btn:hover,
            #ai-tutor-ui .style-btn.active {
                background: rgba(66, 133, 244, 0.2);
                border-color: #4285F4;
                color: #4285F4;
            }
            
            .input-wrapper {
                display: flex;
                gap: 0.75rem;
                align-items: flex-end;
            }
            
            #ai-fullpage-input {
                flex: 1;
                padding: 0.875rem 1rem;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid var(--border);
                border-radius: 12px;
                color: var(--text-primary);
                font-size: 1rem;
                font-family: inherit;
                resize: none;
                min-height: 48px;
                max-height: 150px;
            }
            
            #ai-fullpage-input:focus {
                outline: none;
                border-color: #4285F4;
            }
            
            #ai-fullpage-input::placeholder {
                color: var(--text-secondary);
            }
            
            .send-btn {
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #e74c3c, #3498db);
                border: none;
                border-radius: 12px;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }
            
            .send-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .send-btn:not(:disabled):hover {
                transform: scale(1.05);
                box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
            }
            
            .send-btn svg {
                width: 22px;
                height: 22px;
            }
            
            @media (max-width: 768px) {
                .ai-fullpage-container {
                    padding: 1rem;
                }
                
                .ai-main-title {
                    font-size: 1.8rem;
                }
                
                .topic-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
        `;
        document.head.appendChild(style);
    }

    cleanup() {
        const aiUI = document.getElementById('ai-tutor-ui');
        if (aiUI) aiUI.remove();

        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) canvasContainer.style.display = '';

        const controlPanel = document.getElementById('control-panel');
        if (controlPanel) controlPanel.classList.remove('hidden');
    }
}
