import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-heading font-bold text-text mb-3">Something went wrong</h1>
          <p className="text-muted mb-6">Reload the page and try again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary-light"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
