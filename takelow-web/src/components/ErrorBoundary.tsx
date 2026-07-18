import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-light-bg flex flex-col items-center justify-center p-6">
          <h1 className="text-light-text text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-gray-400 text-sm mb-6 text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-accent-primary text-white px-6 py-2 rounded-lg hover:bg-red-600"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
