import { useState } from 'react';
import { X, FloppyDisk } from '@phosphor-icons/react';
import { CreateGitCheckpoint } from '../../wailsjs/go/main/App';

interface GitCheckpointModalProps {
    show: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function GitCheckpointModal({ show, onClose, onSuccess }: GitCheckpointModalProps) {
    const [message, setMessage] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async () => {
        if (!message.trim()) {
            setError('Please enter a commit message');
            return;
        }

        setIsCreating(true);
        setError('');

        try {
            await CreateGitCheckpoint(message);
            setMessage('');
            onSuccess();
            onClose();
        } catch (err) {
            setError(`Failed to create checkpoint: ${err}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleCreate();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[1000] backdrop-blur-sm">
            <div className="bg-primary-light rounded-2xl w-[90%] max-w-[500px] border border-primary-lighter shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                {/* Header */}
                <div className="px-6 py-6 pb-4 border-b border-primary-lighter flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <FloppyDisk size={24} weight="bold" className="text-black" />
                        <h2 className="text-xl text-black m-0">Create Checkpoint</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        <X size={24} weight="bold" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe what you changed..."
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-black text-sm resize-none focus:outline-none focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)] placeholder:text-gray-400"
                        rows={4}
                        autoFocus
                    />
                    {error && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs">
                            {error}
                        </div>
                    )}
                    <p className="mt-3 text-xs text-gray-500">
                        Tip: Press ⌘+Enter (or Ctrl+Enter) to save
                    </p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 pb-6 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-primary-lighter text-slate-200 text-sm font-semibold rounded-lg min-w-[100px] transition-all hover:bg-[#35322b]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={isCreating || !message.trim()}
                        className="px-6 py-2.5 bg-[#171717] text-white text-sm font-semibold rounded-lg min-w-[100px] transition-all hover:bg-[#2a2a2a] active:bg-[#0a0a0a] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCreating ? 'Creating...' : 'Create Checkpoint'}
                    </button>
                </div>
            </div>
        </div>
    );
}
