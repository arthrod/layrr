import { useState, useEffect } from 'react';
import { X, ArrowsLeftRight, Clock, GitCommit, CheckCircle, MagnifyingGlass } from '@phosphor-icons/react';
import { GetGitCommitHistory, SwitchToGitCommit, GetCurrentGitCommit } from '../../wailsjs/go/main/App';

interface Commit {
    hash: string;
    shortHash: string;
    message: string;
    author: string;
    date: string;
}

interface GitHistoryModalProps {
    show: boolean;
    onClose: () => void;
    onCheckout: () => void; // Callback to refresh iframe
}

export default function GitHistoryModal({ show, onClose, onCheckout }: GitHistoryModalProps) {
    const [commits, setCommits] = useState<Commit[]>([]);
    const [currentCommitHash, setCurrentCommitHash] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);
    const [switchingHash, setSwitchingHash] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (show) {
            loadCommits();
        }
    }, [show]);

    const loadCommits = async () => {
        setIsLoading(true);
        setError('');
        try {
            const [history, currentHash] = await Promise.all([
                GetGitCommitHistory(50),
                GetCurrentGitCommit()
            ]);
            setCommits(history);
            setCurrentCommitHash(currentHash);
        } catch (err) {
            setError(`Failed to load commits: ${err}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckout = async (commitHash: string, commitShortHash: string) => {
        setSwitchingHash(commitShortHash);
        setIsSwitching(true);
        setError('');
        try {
            await SwitchToGitCommit(commitHash);
            onCheckout(); // Trigger iframe refresh
            onClose();
        } catch (err) {
            setError(`Failed to switch commit: ${err}`);
        } finally {
            setIsSwitching(false);
            setSwitchingHash('');
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Filter commits by search query
    const filteredCommits = commits.filter(commit =>
        commit.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        commit.shortHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
        commit.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[1000] backdrop-blur-sm">
            <div className="bg-primary-light rounded-2xl w-[90%] max-w-[700px] max-h-[80vh] border border-primary-lighter shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col">
                {/* Header */}
                <div className="px-6 py-6 pb-4 border-b border-primary-lighter flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <ArrowsLeftRight size={24} weight="bold" className="text-black" />
                            <h2 className="text-xl text-black m-0">Checkpoint History</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <X size={24} weight="bold" />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <MagnifyingGlass size={16} weight="bold" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by message, hash, or author..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]"
                        />
                    </div>
                </div>

                {/* Commit List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
                            {error}
                        </div>
                    ) : commits.length === 0 ? (
                        <div className="text-center py-12">
                            <GitCommit size={48} weight="thin" className="text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">No commits found</p>
                        </div>
                    ) : filteredCommits.length === 0 ? (
                        <div className="text-center py-12">
                            <MagnifyingGlass size={48} weight="thin" className="text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">No checkpoints match your search</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredCommits.map((commit) => {
                                const isCurrentCommit = commit.hash === currentCommitHash;
                                return (
                                    <div
                                        key={commit.hash}
                                        className={`px-4 py-3 rounded-lg border-2 transition-all cursor-pointer group ${
                                            isCurrentCommit
                                                ? 'border-solid border-purple-500 bg-purple-50'
                                                : 'border-dashed border-gray-300 hover:border-purple-500'
                                        } ${
                                            isSwitching && switchingHash === commit.shortHash ? 'opacity-50' : ''
                                        }`}
                                        onClick={() => !isSwitching && handleCheckout(commit.hash, commit.shortHash)}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {isCurrentCommit && (
                                                    <CheckCircle size={16} weight="fill" className="text-purple-500" />
                                                )}
                                                <p className={`font-medium transition-colors truncate ${
                                                    isCurrentCommit
                                                        ? 'text-purple-600'
                                                        : 'text-black group-hover:text-purple-600'
                                                }`} style={{ maxWidth: '240px' }}>
                                                    {commit.message}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-600">
                                                <span className="font-mono bg-gray-100 px-2 py-1 rounded border border-gray-300">
                                                    {commit.shortHash}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} weight="bold" />
                                                    {formatDate(commit.date)}
                                                </span>
                                                {commit.author !== 'Layrr' && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{commit.author}</span>
                                                    </>
                                                )}
                                                {isSwitching && switchingHash === commit.shortHash && (
                                                    <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!isLoading && commits.length > 0 && (
                    <div className="px-6 py-4 border-t border-primary-lighter flex-shrink-0">
                        <p className="text-xs text-slate-500 text-center">
                            {searchQuery && filteredCommits.length > 0 && (
                                <span className="font-medium">Showing {filteredCommits.length} of {commits.length} checkpoints • </span>
                            )}
                            Click any checkpoint to switch to that version
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
