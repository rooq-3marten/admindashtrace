/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TraceHarvest Production Error Boundary
 * Prevents application crashing, provides diagnostics, and offers seamless state recovery.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldWarning, ArrowClockwise, House } from '@phosphor-icons/react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[TraceHarvest ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-[#FBFCFB] dark:bg-[#0F1F17]">
          <div className="max-w-lg w-full bg-white dark:bg-[#152B20] border border-red-200 dark:border-red-900/40 rounded-xl p-6 sm:p-8 shadow-lg text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-red-50 dark:bg-red-950/50 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
              <ShieldWarning size={32} weight="bold" />
            </div>

            <h2 className="text-xl font-bold text-[#1A2E23] dark:text-white mb-2">
              {this.props.fallbackTitle || 'Component Encountered an Unexpected Error'}
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              TraceHarvest safeguards protected your session from crashing. The error has been captured safely.
            </p>

            {this.state.error && (
              <div className="text-left bg-gray-50 dark:bg-[#0d1a13] p-3 rounded-lg mb-6 border border-gray-200 dark:border-gray-800 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto max-h-36">
                <span className="font-semibold text-red-600 dark:text-red-400">{this.state.error.name}: </span>
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#1A4D2E] hover:bg-[#143D24] text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowClockwise size={18} weight="bold" />
                Retry View
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <House size={18} weight="bold" />
                Reload Portal
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
