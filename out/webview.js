"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailySummaryProvider = void 0;
const vscode = __importStar(require("vscode"));
class DailySummaryProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'generate':
                    console.log('Webview: Generate button clicked');
                    vscode.commands.executeCommand('dailyCodeSummary.showSummary');
                    return;
                case 'getModels':
                    const models = await this._getAvailableModels();
                    webviewView.webview.postMessage({
                        command: 'setModels',
                        models: models
                    });
                    return;
                case 'updateModel':
                    await vscode.workspace.getConfiguration('dailyCodeSummary').update('aiModel', message.model, vscode.ConfigurationTarget.Global);
                    return;
            }
        });
    }
    async _getAvailableModels() {
        try {
            const models = await vscode.lm.selectChatModels({});
            const selectedModel = vscode.workspace.getConfiguration('dailyCodeSummary').get('aiModel', 'auto');
            return models.map(m => ({
                id: m.id,
                name: m.name,
                vendor: m.vendor,
                selected: m.id === selectedModel
            }));
        }
        catch (error) {
            console.error('Error getting models for webview:', error);
            return [];
        }
    }
    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Summary</title>
    <style>
        :root {
            --accent: #4a90e2;
            --bg-soft: rgba(255,255,255,0.05);
        }
        body {
            padding: 20px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            background: transparent;
        }
        
        .container {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .card {
            background: var(--bg-soft);
            border-radius: 12px;
            padding: 16px;
            border: 1px solid rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
        }

        h2 { margin-top: 0; font-weight: 600; font-size: 1.2rem; }
        p { color: var(--vscode-descriptionForeground); font-size: 0.9rem; }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 16px;
        }

        label {
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            opacity: 0.8;
        }

        select, button {
            width: 100%;
            padding: 10px;
            border-radius: 6px;
            font-family: inherit;
            transition: all 0.2s ease;
        }

        select {
            background: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
        }

        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        button:hover {
            filter: brightness(1.1);
            transform: translateY(-1px);
        }

        button:active { transform: translateY(0); }

        .loader {
            display: none;
            width: 16px;
            height: 16px;
            border: 2px solid #FFF;
            border-bottom-color: transparent;
            border-radius: 50%;
            animation: rotation 1s linear infinite;
        }

        @keyframes rotation {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h2>Settings</h2>
            <div class="form-group">
                <label for="modelSelect">AI Model</label>
                <select id="modelSelect" onchange="updateModel()">
                    <option value="auto">Auto (Smartest)</option>
                </select>
            </div>
        </div>

        <div class="card" style="text-align: center;">
            <div style="font-size: 32px; margin-bottom: 12px;">📊</div>
            <h2>Generate Report</h2>
            <p>Summarize today's work using AI analysis of your code changes.</p>
            <button id="genBtn" onclick="generateSummary()">
                <span class="loader" id="loader"></span>
                <span>Generate Summary</span>
            </button>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        const select = document.getElementById('modelSelect');
        const loader = document.getElementById('loader');
        const genBtn = document.getElementById('genBtn');

        function updateModel() {
            vscode.postMessage({ 
                command: 'updateModel', 
                model: select.value 
            });
        }

        function generateSummary() {
            loader.style.display = 'inline-block';
            genBtn.style.opacity = '0.7';
            genBtn.disabled = true;
            vscode.postMessage({ command: 'generate' });
            
            // Re-enable after some time as a fallback
            setTimeout(() => {
                loader.style.display = 'none';
                genBtn.style.opacity = '1';
                genBtn.disabled = false;
            }, 10000);
        }

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'setModels') {
                // Keep 'auto' then add others
                select.innerHTML = '<option value="auto">Auto (Smartest)</option>';
                message.models.forEach(m => {
                    const option = document.createElement('option');
                    option.value = m.id;
                    option.textContent = m.vendor + ' - ' + m.name;
                    if (m.selected) option.selected = true;
                    select.appendChild(option);
                });
            }
        });

        // Request models on load
        vscode.postMessage({ command: 'getModels' });
    </script>
</body>
</html>`;
    }
}
exports.DailySummaryProvider = DailySummaryProvider;
DailySummaryProvider.viewType = 'dailySummaryView';
//# sourceMappingURL=webview.js.map