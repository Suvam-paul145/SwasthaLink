import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card p-8 rounded-xl border border-white/5 text-center">
          <div className="text-red-400 mb-2">
            <span className="material-symbols-outlined text-4xl">error</span>
          </div>
          <h3 className="text-white font-bold mb-2">Component Error</h3>
          <p className="text-slate-400 text-sm">
            {this.props.fallbackMessage || 'This component failed to load.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
