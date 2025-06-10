// Application State
class LoanApplicationState {
    constructor() {
        this.messages = [];
        this.applicationData = {
            personal: {},
            employment: {},
            loan: {},
            financial: {},
            documents: []
        };
        this.progress = {
            personal: false,
            employment: false,
            loan: false,
            financial: false,
            documents: false
        };
        this.apiKey = '';
        this.currentStep = 'greeting';
    }

    updateProgress() {
        const completed = Object.values(this.progress).filter(Boolean).length;
        const total = Object.keys(this.progress).length;
        const percentage = Math.round((completed / total) * 100);
        
        document.getElementById('progress-fill').style.width = `${percentage}%`;
        document.getElementById('progress-percentage').textContent = `${percentage}%`;
        
        // Update checklist
        Object.keys(this.progress).forEach(step => {
            const item = document.querySelector(`[data-step="${step}"]`);
            if (item) {
                if (this.progress[step]) {
                    item.classList.add('checklist-item--completed');
                    item.querySelector('.checklist-icon').textContent = '✓';
                } else {
                    item.classList.remove('checklist-item--completed');
                    item.querySelector('.checklist-icon').textContent = '◯';
                }
            }
        });
        
        // Enable review/submit buttons if progress is significant
        const reviewBtn = document.getElementById('review-btn');
        const submitBtn = document.getElementById('submit-btn');
        
        if (percentage >= 60) {
            reviewBtn.disabled = false;
        }
        
        if (percentage >= 80) {
            submitBtn.disabled = false;
        }
    }

    updateSummary() {
        const summaryContent = document.getElementById('summary-content');
        let html = '';
        
        if (Object.keys(this.applicationData.personal).length > 0) {
            html += '<div class="summary-item"><div class="summary-label">Personal Information</div>';
            if (this.applicationData.personal.fullName) {
                html += `<div class="summary-value">Name: ${this.applicationData.personal.fullName}</div>`;
            }
            if (this.applicationData.personal.email) {
                html += `<div class="summary-value">Email: ${this.applicationData.personal.email}</div>`;
            }
            if (this.applicationData.personal.phone) {
                html += `<div class="summary-value">Phone: ${this.applicationData.personal.phone}</div>`;
            }
            html += '</div>';
        }
        
        if (Object.keys(this.applicationData.employment).length > 0) {
            html += '<div class="summary-item"><div class="summary-label">Employment</div>';
            if (this.applicationData.employment.employer) {
                html += `<div class="summary-value">Employer: ${this.applicationData.employment.employer}</div>`;
            }
            if (this.applicationData.employment.income) {
                html += `<div class="summary-value">Monthly Income: $${this.applicationData.employment.income}</div>`;
            }
            html += '</div>';
        }
        
        if (Object.keys(this.applicationData.loan).length > 0) {
            html += '<div class="summary-item"><div class="summary-label">Loan Details</div>';
            if (this.applicationData.loan.type) {
                html += `<div class="summary-value">Type: ${this.applicationData.loan.type}</div>`;
            }
            if (this.applicationData.loan.amount) {
                html += `<div class="summary-value">Amount: $${this.applicationData.loan.amount}</div>`;
            }
            if (this.applicationData.loan.purpose) {
                html += `<div class="summary-value">Purpose: ${this.applicationData.loan.purpose}</div>`;
            }
            html += '</div>';
        }
        
        if (this.applicationData.documents.length > 0) {
            html += '<div class="summary-item"><div class="summary-label">Documents</div>';
            html += `<div class="summary-value">${this.applicationData.documents.length} files uploaded</div>`;
            html += '</div>';
        }
        
        if (html === '') {
            html = '<p class="text-secondary">Information will appear here as we collect it through our conversation.</p>';
        }
        
        summaryContent.innerHTML = html;
    }
}

// DeepSeek API Integration
class DeepSeekAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://api.deepseek.com';
    }

    async sendMessage(messages) {
        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: messages,
                    max_tokens: 1000,
                    temperature: 0.7,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
}

// Loan Processing Agent
class LoanProcessingAgent {
    constructor(state) {
        this.state = state;
        this.api = null;
        
        // Loan types and their information
        this.loanTypes = {
            "Personal Loan": {
                description: "Unsecured loan for personal expenses",
                maxAmount: 50000,
                requirements: ["Income proof", "ID verification", "Credit check"]
            },
            "Home Loan": {
                description: "Mortgage for property purchase",
                maxAmount: 500000,
                requirements: ["Income proof", "Property documents", "Down payment", "Credit check"]
            },
            "Auto Loan": {
                description: "Financing for vehicle purchase",
                maxAmount: 75000,
                requirements: ["Income proof", "Vehicle details", "Insurance", "Credit check"]
            },
            "Business Loan": {
                description: "Funding for business needs",
                maxAmount: 200000,
                requirements: ["Business plan", "Financial statements", "Tax returns", "Credit check"]
            }
        };
    }

    setAPIKey(apiKey) {
        this.api = new DeepSeekAPI(apiKey);
    }

    buildSystemPrompt() {
        return `You are a professional loan processing agent working for LoanAgent Pro. Your role is to help customers apply for loans by collecting necessary information through natural conversation.

IMPORTANT GUIDELINES:
1. Be professional, friendly, and helpful
2. Collect information step by step - don't overwhelm the user
3. Ask follow-up questions to clarify or validate information
4. Provide helpful guidance about loan requirements and processes
5. Keep responses concise but informative
6. Always maintain a conversational tone

INFORMATION TO COLLECT:
1. Personal Information: Full name, date of birth, contact details, address
2. Employment: Current employer, position, monthly income, employment duration
3. Loan Details: Type, amount requested, purpose, preferred term
4. Financial Information: Monthly expenses, existing debts, assets
5. Required documents

LOAN TYPES AVAILABLE:
- Personal Loan: Up to $50,000 for personal expenses
- Home Loan: Up to $500,000 for property purchase
- Auto Loan: Up to $75,000 for vehicle purchase
- Business Loan: Up to $200,000 for business needs

CURRENT APPLICATION STATUS:
- Personal Info Complete: ${this.state.progress.personal}
- Employment Info Complete: ${this.state.progress.employment}
- Loan Info Complete: ${this.state.progress.loan}
- Financial Info Complete: ${this.state.progress.financial}
- Documents Complete: ${this.state.progress.documents}

Based on the conversation history, continue helping the user with their loan application. If you notice missing information for any section that should be marked complete, ask for it naturally in conversation.`;
    }

    async processMessage(userMessage) {
        if (!this.api) {
            throw new Error('API key not configured');
        }

        // Build conversation history for API
        const messages = [
            { role: 'system', content: this.buildSystemPrompt() }
        ];

        // Add conversation history
        this.state.messages.forEach(msg => {
            messages.push({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.content
            });
        });

        // Add current user message
        messages.push({ role: 'user', content: userMessage });

        try {
            const response = await this.api.sendMessage(messages);
            
            // Analyze response to extract information
            this.extractInformationFromConversation(userMessage, response);
            
            return response;
        } catch (error) {
            return "I apologize, but I'm having trouble connecting right now. Please check your API configuration and try again.";
        }
    }

    extractInformationFromConversation(userMessage, agentResponse) {
        const userLower = userMessage.toLowerCase();
        
        // Extract personal information
        this.extractPersonalInfo(userMessage);
        
        // Extract employment information
        this.extractEmploymentInfo(userMessage);
        
        // Extract loan information
        this.extractLoanInfo(userMessage);
        
        // Extract financial information
        this.extractFinancialInfo(userMessage);
        
        // Update progress based on collected information
        this.updateProgressFlags();
        
        // Update UI
        this.state.updateProgress();
        this.state.updateSummary();
    }

    extractPersonalInfo(message) {
        const lower = message.toLowerCase();
        
        // Extract name patterns
        const namePatterns = [
            /my name is ([a-zA-Z\s]+)/i,
            /i'm ([a-zA-Z\s]+)/i,
            /i am ([a-zA-Z\s]+)/i,
            /name:\s*([a-zA-Z\s]+)/i
        ];
        
        namePatterns.forEach(pattern => {
            const match = message.match(pattern);
            if (match && match[1].trim().length > 2) {
                this.state.applicationData.personal.fullName = match[1].trim();
            }
        });
        
        // Extract email
        const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
        const emailMatch = message.match(emailPattern);
        if (emailMatch) {
            this.state.applicationData.personal.email = emailMatch[1];
        }
        
        // Extract phone
        const phonePattern = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/;
        const phoneMatch = message.match(phonePattern);
        if (phoneMatch) {
            this.state.applicationData.personal.phone = phoneMatch[1];
        }
    }

    extractEmploymentInfo(message) {
        const lower = message.toLowerCase();
        
        // Extract employer
        const employerPatterns = [
            /work at ([^,.]+)/i,
            /employed at ([^,.]+)/i,
            /employer is ([^,.]+)/i,
            /company is ([^,.]+)/i
        ];
        
        employerPatterns.forEach(pattern => {
            const match = message.match(pattern);
            if (match && match[1].trim().length > 2) {
                this.state.applicationData.employment.employer = match[1].trim();
            }
        });
        
        // Extract income
        const incomePatterns = [
            /make \$?([0-9,]+)/i,
            /earn \$?([0-9,]+)/i,
            /income is \$?([0-9,]+)/i,
            /salary is \$?([0-9,]+)/i
        ];
        
        incomePatterns.forEach(pattern => {
            const match = message.match(pattern);
            if (match) {
                this.state.applicationData.employment.income = match[1].replace(/,/g, '');
            }
        });
    }

    extractLoanInfo(message) {
        const lower = message.toLowerCase();
        
        // Extract loan type
        Object.keys(this.loanTypes).forEach(type => {
            if (lower.includes(type.toLowerCase()) || 
                lower.includes(type.split(' ')[0].toLowerCase())) {
                this.state.applicationData.loan.type = type;
            }
        });
        
        // Extract loan amount
        const amountPatterns = [
            /need \$?([0-9,]+)/i,
            /borrow \$?([0-9,]+)/i,
            /loan for \$?([0-9,]+)/i,
            /amount of \$?([0-9,]+)/i
        ];
        
        amountPatterns.forEach(pattern => {
            const match = message.match(pattern);
            if (match) {
                this.state.applicationData.loan.amount = match[1].replace(/,/g, '');
            }
        });
        
        // Extract purpose
        const purposePatterns = [
            /for ([^,.]+)/i,
            /to ([^,.]+)/i,
            /purpose is ([^,.]+)/i
        ];
        
        if (lower.includes('car') || lower.includes('vehicle') || lower.includes('auto')) {
            this.state.applicationData.loan.purpose = 'Vehicle purchase';
        } else if (lower.includes('house') || lower.includes('home') || lower.includes('property')) {
            this.state.applicationData.loan.purpose = 'Home purchase';
        } else if (lower.includes('business') || lower.includes('company')) {
            this.state.applicationData.loan.purpose = 'Business expansion';
        }
    }

    extractFinancialInfo(message) {
        const lower = message.toLowerCase();
        
        // Extract monthly expenses
        if (lower.includes('expenses') || lower.includes('spend')) {
            const expensePattern = /\$?([0-9,]+)/;
            const match = message.match(expensePattern);
            if (match) {
                this.state.applicationData.financial.monthlyExpenses = match[1].replace(/,/g, '');
            }
        }
    }

    updateProgressFlags() {
        const { personal, employment, loan, financial } = this.state.applicationData;
        
        // Check personal information completeness
        this.state.progress.personal = !!(
            personal.fullName && 
            (personal.email || personal.phone)
        );
        
        // Check employment information completeness
        this.state.progress.employment = !!(
            employment.employer && 
            employment.income
        );
        
        // Check loan information completeness
        this.state.progress.loan = !!(
            loan.type && 
            loan.amount
        );
        
        // Check financial information completeness
        this.state.progress.financial = !!(
            financial.monthlyExpenses || 
            Object.keys(financial).length > 0
        );
        
        // Check documents
        this.state.progress.documents = this.state.applicationData.documents.length > 0;
    }

    getGreetingMessage() {
        return "Hello! I'm your personal loan processing agent powered by DeepSeek AI. I'm here to help you with your loan application today. I'll guide you through the entire process step by step, making it as simple and convenient as possible.\n\nWhat type of loan are you interested in applying for today? We offer:\n\n• **Personal Loans** - Up to $50,000 for personal expenses\n• **Home Loans** - Up to $500,000 for property purchase  \n• **Auto Loans** - Up to $75,000 for vehicle purchase\n• **Business Loans** - Up to $200,000 for business needs\n\nWhich one interests you most?";
    }
}

// Chat Interface
class ChatInterface {
    constructor(state, agent) {
        this.state = state;
        this.agent = agent;
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chat-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.fileInput = document.getElementById('file-input');
        this.uploadBtn = document.getElementById('upload-btn');
    }

    setupEventListeners() {
        // Send button click
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Enter key in input
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Input validation
        this.messageInput.addEventListener('input', () => {
            const hasText = this.messageInput.value.trim().length > 0;
            this.sendBtn.disabled = !hasText;
        });
        
        // File upload
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Add user message to chat
        this.addMessage(message, 'user');
        
        // Clear input
        this.messageInput.value = '';
        this.sendBtn.disabled = true;
        this.messageInput.style.height = 'auto';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            // Process message with agent
            const response = await this.agent.processMessage(message);
            
            // Hide typing indicator
            this.hideTypingIndicator();
            
            // Add agent response
            this.addMessage(response, 'agent');
            
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage("I apologize, but I'm having trouble processing your request. Please check your connection and try again.", 'agent');
        }
    }

    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message--${type}`;
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message__bubble">
                ${this.formatMessage(content)}
                <div class="message__time">${time}</div>
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Store in state
        this.state.messages.push({
            content,
            type,
            timestamp: new Date().toISOString()
        });
    }

    formatMessage(content) {
        // Convert markdown-style formatting to HTML
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    showTypingIndicator() {
        this.typingIndicator.classList.remove('hidden');
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator.classList.add('hidden');
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    handleFileUpload(event) {
        const files = Array.from(event.target.files);
        
        files.forEach(file => {
            this.state.applicationData.documents.push({
                name: file.name,
                size: file.size,
                type: file.type,
                uploadedAt: new Date().toISOString()
            });
        });
        
        // Update progress
        this.state.updateProgress();
        this.state.updateSummary();
        
        // Add confirmation message
        const fileNames = files.map(f => f.name).join(', ');
        this.addMessage(`📎 Uploaded: ${fileNames}`, 'user');
        this.addMessage(`Thank you for uploading those documents! I've added them to your application. ${files.length > 1 ? 'These files' : 'This file'} will be reviewed as part of your loan application process.`, 'agent');
        
        // Clear file input
        event.target.value = '';
    }

    showGreeting() {
        const greeting = this.agent.getGreetingMessage();
        this.addMessage(greeting, 'agent');
    }
}

// Application Initialization
class LoanApplication {
    constructor() {
        this.state = new LoanApplicationState();
        this.agent = new LoanProcessingAgent(this.state);
        this.chat = new ChatInterface(this.state, this.agent);
        
        this.initializeApp();
    }

    initializeApp() {
        // Check if API key is available
        const savedApiKey = sessionStorage.getItem('deepseek_api_key');
        
        if (savedApiKey) {
            this.state.apiKey = savedApiKey;
            this.agent.setAPIKey(savedApiKey);
            this.hideApiModal();
            this.startApplication();
        } else {
            this.showApiModal();
        }
        
        this.setupAPIModal();
        this.setupActionButtons();
    }

    showApiModal() {
        document.getElementById('api-modal-overlay').style.display = 'flex';
    }

    hideApiModal() {
        document.getElementById('api-modal-overlay').style.display = 'none';
    }

    setupAPIModal() {
        const saveBtn = document.getElementById('save-api-key');
        const apiKeyInput = document.getElementById('api-key-input');
        
        saveBtn.addEventListener('click', () => {
            const apiKey = apiKeyInput.value.trim();
            
            if (!apiKey) {
                alert('Please enter a valid API key');
                return;
            }
            
            this.state.apiKey = apiKey;
            this.agent.setAPIKey(apiKey);
            sessionStorage.setItem('deepseek_api_key', apiKey);
            
            this.hideApiModal();
            this.startApplication();
        });
        
        // Enter key support
        apiKeyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveBtn.click();
            }
        });
    }

    setupActionButtons() {
        const reviewBtn = document.getElementById('review-btn');
        const submitBtn = document.getElementById('submit-btn');
        
        reviewBtn.addEventListener('click', () => this.reviewApplication());
        submitBtn.addEventListener('click', () => this.submitApplication());
    }

    startApplication() {
        // Update connection status
        document.getElementById('connection-status').textContent = 'Connected';
        document.getElementById('connection-status').className = 'status status--success';
        
        // Show greeting message
        this.chat.showGreeting();
    }

    reviewApplication() {
        const summary = this.generateApplicationSummary();
        this.chat.addMessage("I'd like to review my application", 'user');
        this.chat.addMessage(`Here's a complete summary of your loan application:\n\n${summary}\n\nPlease review this information carefully. If you need to make any changes, just let me know what you'd like to update.`, 'agent');
    }

    submitApplication() {
        if (Object.values(this.state.progress).filter(Boolean).length < 4) {
            alert('Please complete more sections before submitting');
            return;
        }
        
        this.chat.addMessage("I'd like to submit my application", 'user');
        this.chat.addMessage(`Perfect! I'm submitting your loan application now. You should receive a confirmation email within the next few minutes with your application reference number.\n\n**Next Steps:**\n1. Our underwriting team will review your application within 2-3 business days\n2. We may contact you for additional documentation\n3. You'll receive a decision notification via email\n4. If approved, funding can be as fast as 1-2 business days\n\nThank you for choosing LoanAgent Pro! Is there anything else I can help you with today?`, 'agent');
        
        // Disable submit button
        document.getElementById('submit-btn').disabled = true;
        document.getElementById('submit-btn').textContent = 'Application Submitted';
    }

    generateApplicationSummary() {
        const { personal, employment, loan, financial, documents } = this.state.applicationData;
        
        let summary = '';
        
        if (Object.keys(personal).length > 0) {
            summary += '**Personal Information:**\n';
            if (personal.fullName) summary += `• Name: ${personal.fullName}\n`;
            if (personal.email) summary += `• Email: ${personal.email}\n`;
            if (personal.phone) summary += `• Phone: ${personal.phone}\n`;
            summary += '\n';
        }
        
        if (Object.keys(employment).length > 0) {
            summary += '**Employment Information:**\n';
            if (employment.employer) summary += `• Employer: ${employment.employer}\n`;
            if (employment.income) summary += `• Monthly Income: $${employment.income}\n`;
            summary += '\n';
        }
        
        if (Object.keys(loan).length > 0) {
            summary += '**Loan Details:**\n';
            if (loan.type) summary += `• Loan Type: ${loan.type}\n`;
            if (loan.amount) summary += `• Requested Amount: $${loan.amount}\n`;
            if (loan.purpose) summary += `• Purpose: ${loan.purpose}\n`;
            summary += '\n';
        }
        
        if (documents.length > 0) {
            summary += '**Documents Uploaded:**\n';
            documents.forEach(doc => {
                summary += `• ${doc.name}\n`;
            });
        }
        
        return summary || 'No information collected yet.';
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.loanApp = new LoanApplication();
});