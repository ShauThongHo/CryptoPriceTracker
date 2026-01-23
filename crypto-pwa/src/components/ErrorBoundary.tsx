import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white p-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-6">
              <h1 className="text-2xl font-bold text-red-400 mb-4">
                出错了 / Something went wrong
              </h1>
              
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2">错误信息：</h2>
                <pre className="bg-gray-800 p-3 rounded text-sm overflow-auto">
                  {this.state.error?.toString()}
                </pre>
              </div>

              {this.state.errorInfo && (
                <div className="mb-4">
                  <h2 className="text-lg font-semibold mb-2">错误堆栈：</h2>
                  <pre className="bg-gray-800 p-3 rounded text-xs overflow-auto max-h-64">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}

              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
              >
                刷新页面 / Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
