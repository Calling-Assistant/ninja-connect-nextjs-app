import React from 'react';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
    constructor(props: React.PropsWithChildren) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-8">
                    <i className="fas fa-triangle-exclamation text-5xl text-red-500 mb-4"></i>
                    <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                    <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">
                        An unexpected error occurred. Your data is safe — please reload the app.
                    </p>
                    <button
                        onClick={this.handleReload}
                        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                        Reload App
                    </button>
                    {this.state.error && (
                        <details className="mt-6 text-xs text-slate-400 max-w-sm w-full">
                            <summary className="cursor-pointer">Error details</summary>
                            <pre className="mt-2 whitespace-pre-wrap break-all">{this.state.error.message}</pre>
                        </details>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}
