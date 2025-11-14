import { useState, useEffect } from 'react';
import { StartProxy, StopProxy, GetProxyURL, GetStatus, GetProjectInfo, SelectProjectDirectory, SetAPIKey } from "../wailsjs/go/main/App";

interface ProjectInfo {
    projectDir: string;
    proxyPort: number;
    targetPort: number;
    serverActive: boolean;
}

function App() {
    const [isServerActive, setIsServerActive] = useState(false);
    const [proxyURL, setProxyURL] = useState('');
    const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
    const [statusMessage, setStatusMessage] = useState('Click "Start Proxy" to begin');
    const [isLoading, setIsLoading] = useState(false);
    const [showAPIKeyDialog, setShowAPIKeyDialog] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [apiKeyError, setApiKeyError] = useState('');

    // Load initial status
    useEffect(() => {
        loadStatus();
        loadProjectInfo();
    }, []);

    const loadStatus = async () => {
        try {
            const status = await GetStatus();
            setIsServerActive(status.serverActive);
            if (status.serverActive) {
                const url = await GetProxyURL();
                setProxyURL(url);
            }
        } catch (error) {
            console.error('Error loading status:', error);
        }
    };

    const loadProjectInfo = async () => {
        try {
            const info = await GetProjectInfo();
            setProjectInfo(info as ProjectInfo);
        } catch (error) {
            console.error('Error loading project info:', error);
        }
    };

    const handleStartProxy = async () => {
        setIsLoading(true);
        setStatusMessage('Starting proxy server...');
        try {
            // Use current directory (empty string means use default)
            const result = await StartProxy('');
            setStatusMessage(result);

            // Wait a bit for server to fully start
            setTimeout(async () => {
                const url = await GetProxyURL();
                setProxyURL(url);
                setIsServerActive(true);
                await loadProjectInfo();
                setIsLoading(false);
            }, 1000);
        } catch (error) {
            setStatusMessage(`Error: ${error}`);
            setIsLoading(false);
        }
    };

    const handleStopProxy = async () => {
        setIsLoading(true);
        setStatusMessage('Stopping proxy server...');
        try {
            const result = await StopProxy();
            setStatusMessage(result);
            setProxyURL('');
            setIsServerActive(false);
            setIsLoading(false);
        } catch (error) {
            setStatusMessage(`Error: ${error}`);
            setIsLoading(false);
        }
    };

    const handleSelectDirectory = async () => {
        try {
            const selectedDir = await SelectProjectDirectory();
            if (selectedDir) {
                await loadProjectInfo();
                setStatusMessage(`Project directory: ${selectedDir}`);
            }
        } catch (error) {
            setStatusMessage(`Error selecting directory: ${error}`);
        }
    };

    const handleSaveAPIKey = async () => {
        setApiKeyError('');

        if (!apiKeyInput.trim()) {
            setApiKeyError('API key cannot be empty');
            return;
        }

        if (!apiKeyInput.startsWith('sk-ant-')) {
            setApiKeyError('API key must start with "sk-ant-"');
            return;
        }

        try {
            await SetAPIKey(apiKeyInput);
            setShowAPIKeyDialog(false);
            setApiKeyInput('');
            setStatusMessage('API key saved successfully');
        } catch (error) {
            setApiKeyError(`Error saving API key: ${error}`);
        }
    };

    return (
        <div className="flex h-screen w-screen bg-slate-950 font-sans text-slate-200 overflow-hidden">
            {/* Control Panel */}
            <div className="w-[400px] bg-slate-850 border-r border-slate-700 flex flex-col p-6 overflow-y-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-br from-purple-500 to-purple-700 bg-clip-text text-transparent mb-2">
                        Layrr
                    </h1>
                    <p className="text-slate-400 text-sm">Visual Editor for Web Apps</p>
                </div>

                <div className="bg-slate-950 rounded-xl p-4 mb-6 border border-slate-700">
                    {projectInfo && (
                        <>
                            <div className="flex justify-between mb-3">
                                <span className="text-slate-400 text-xs">Project:</span>
                                <span
                                    className="text-slate-200 text-xs font-mono max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap"
                                    title={projectInfo.projectDir}
                                >
                                    {projectInfo.projectDir}
                                </span>
                            </div>
                            {projectInfo.targetPort > 0 && (
                                <div className="flex justify-between mb-0">
                                    <span className="text-slate-400 text-xs">Dev Server:</span>
                                    <span className="text-slate-200 text-xs font-mono">
                                        localhost:{projectInfo.targetPort}
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                    <button
                        className="w-full mt-3 bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 px-4 rounded-lg transition-all hover:bg-slate-600 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        onClick={handleSelectDirectory}
                        disabled={isServerActive}
                    >
                        📁 Change Directory
                    </button>
                </div>

                <div className="mb-6">
                    {!isServerActive ? (
                        <button
                            className="w-full bg-gradient-purple text-white py-3.5 px-6 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(102,126,234,0.3)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            onClick={handleStartProxy}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Starting...' : 'Start Proxy'}
                        </button>
                    ) : (
                        <button
                            className="w-full bg-gradient-pink text-white py-3.5 px-6 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(245,87,108,0.3)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            onClick={handleStopProxy}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Stopping...' : 'Stop Proxy'}
                        </button>
                    )}
                </div>

                <div className={`bg-slate-950 rounded-xl p-4 mb-6 border ${isServerActive ? 'border-green-500' : 'border-slate-700'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full animate-pulse ${isServerActive ? 'bg-green-500' : 'bg-slate-600'}`}></span>
                        <span className="text-sm">{isServerActive ? 'Running' : 'Stopped'}</span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">{statusMessage}</p>
                </div>

                <div className="bg-slate-950 rounded-xl p-4 border border-slate-700">
                    <h3 className="text-base mb-3 text-slate-200">Instructions:</h3>
                    <ol className="pl-5 text-slate-400 text-xs leading-loose list-decimal">
                        <li className="mb-2">
                            Make sure your dev server is running (e.g., <code className="bg-slate-850 px-1.5 py-0.5 rounded font-mono text-purple-400 text-xs">npm run dev</code>)
                        </li>
                        <li className="mb-2">Click "Start Proxy" to launch the visual editor</li>
                        <li className="mb-2">Your app will appear in the preview below with editing tools</li>
                        <li className="mb-0">Use the visual editor to modify your app</li>
                    </ol>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-700">
                    <button
                        className="w-full bg-transparent text-purple-400 text-xs font-semibold py-2 px-4 rounded-lg border border-slate-700 transition-all hover:bg-slate-850 hover:border-purple-400"
                        onClick={() => setShowAPIKeyDialog(true)}
                    >
                        🔑 Set API Key
                    </button>
                </div>
            </div>

            {/* Preview Panel */}
            <div className="flex-1 flex items-center justify-center bg-slate-950 relative">
                {isServerActive && proxyURL ? (
                    <iframe
                        src={proxyURL}
                        title="App Preview"
                        className="w-full h-full border-0 bg-white"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full">
                        <div className="text-center text-slate-600">
                            <svg
                                width="120"
                                height="120"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className="mb-6 opacity-30 mx-auto"
                            >
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="9" x2="15" y2="9"></line>
                                <line x1="9" y1="15" x2="15" y2="15"></line>
                            </svg>
                            <h2 className="text-2xl mb-2 text-slate-500">No Preview Available</h2>
                            <p className="text-sm text-slate-600">Start the proxy server to see your app here</p>
                        </div>
                    </div>
                )}
            </div>

            {/* API Key Dialog */}
            {showAPIKeyDialog && (
                <div
                    className="fixed inset-0 bg-black/75 flex items-center justify-center z-[1000] backdrop-blur-sm"
                    onClick={() => setShowAPIKeyDialog(false)}
                >
                    <div
                        className="bg-slate-850 rounded-2xl w-[90%] max-w-[500px] border border-slate-700 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-6 pb-4 border-b border-slate-700 flex justify-between items-center">
                            <h2 className="text-xl text-slate-200 m-0">Set Anthropic API Key</h2>
                            <button
                                className="bg-transparent border-0 text-slate-400 text-2xl cursor-pointer p-0 w-8 h-8 flex items-center justify-center rounded transition-all hover:bg-slate-700 hover:text-slate-200"
                                onClick={() => setShowAPIKeyDialog(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-400 text-sm leading-relaxed mb-4">
                                Enter your Anthropic API key to enable design-to-code features.
                                <br />
                                Get your key from: <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 no-underline hover:underline">console.anthropic.com</a>
                            </p>
                            <input
                                type="password"
                                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm font-mono transition-all focus:outline-none focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)] placeholder:text-slate-600"
                                placeholder="sk-ant-..."
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSaveAPIKey()}
                            />
                            {apiKeyError && (
                                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs">
                                    {apiKeyError}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 pb-6 flex gap-3 justify-end">
                            <button
                                className="px-6 py-2.5 bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg min-w-[100px] transition-all hover:bg-slate-600"
                                onClick={() => setShowAPIKeyDialog(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-6 py-2.5 bg-gradient-purple text-white text-sm font-semibold rounded-lg min-w-[100px] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(102,126,234,0.3)] active:translate-y-0"
                                onClick={handleSaveAPIKey}
                            >
                                Save API Key
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
