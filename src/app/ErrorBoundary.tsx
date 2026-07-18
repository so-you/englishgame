import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  readonly children: ReactNode
}

interface ErrorBoundaryState {
  readonly error?: Error
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {}

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled application error', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <main className="app-shell">
          <section className="intro" role="alert">
            <p className="eyebrow">English Roguelike</p>
            <h1>应用遇到了问题</h1>
            <p>你的本地学习数据不会被自动清空。请刷新页面后重试。</p>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}
