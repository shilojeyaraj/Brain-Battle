import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ToastProvider, useToast } from '../toast'

// Helper component that exposes toast context for testing
function TestConsumer() {
  const { success, error, warning, info, toasts } = useToast()
  return (
    <div>
      <button onClick={() => success('Success message')}>Show success</button>
      <button onClick={() => error('Error message')}>Show error</button>
      <button onClick={() => warning('Warning message')}>Show warning</button>
      <button onClick={() => info('Info message')}>Show info</button>
      <span data-testid="count">{toasts.length}</span>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <TestConsumer />
    </ToastProvider>
  )
}

describe('Toast System', () => {
  it('renders without crashing', () => {
    renderWithProvider()
    expect(screen.getByText('Show success')).toBeInTheDocument()
  })

  it('shows a success toast', () => {
    renderWithProvider()
    fireEvent.click(screen.getByText('Show success'))
    expect(screen.getByText('Success message')).toBeInTheDocument()
  })

  it('shows an error toast', () => {
    renderWithProvider()
    fireEvent.click(screen.getByText('Show error'))
    expect(screen.getByText('Error message')).toBeInTheDocument()
  })

  it('shows a warning toast', () => {
    renderWithProvider()
    fireEvent.click(screen.getByText('Show warning'))
    expect(screen.getByText('Warning message')).toBeInTheDocument()
  })

  it('shows an info toast', () => {
    renderWithProvider()
    fireEvent.click(screen.getByText('Show info'))
    expect(screen.getByText('Info message')).toBeInTheDocument()
  })

  it('increments toast count when adding toasts', () => {
    renderWithProvider()
    expect(screen.getByTestId('count')).toHaveTextContent('0')

    fireEvent.click(screen.getByText('Show success'))
    expect(screen.getByTestId('count')).toHaveTextContent('1')

    fireEvent.click(screen.getByText('Show error'))
    expect(screen.getByTestId('count')).toHaveTextContent('2')
  })

  it('dismisses toast when close button is clicked', () => {
    renderWithProvider()
    fireEvent.click(screen.getByText('Show success'))

    expect(screen.getByText('Success message')).toBeInTheDocument()

    const closeBtn = screen.getByLabelText('Close toast')
    fireEvent.click(closeBtn)

    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })

  it('throws error when useToast is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      render(<TestConsumer />)
    }).toThrow('useToast must be used within ToastProvider')
    consoleSpy.mockRestore()
  })

  it('auto-dismisses after duration', async () => {
    jest.useFakeTimers()
    renderWithProvider()

    fireEvent.click(screen.getByText('Show success'))
    expect(screen.getByTestId('count')).toHaveTextContent('1')

    act(() => {
      jest.advanceTimersByTime(6000)
    })

    expect(screen.getByTestId('count')).toHaveTextContent('0')
    jest.useRealTimers()
  })
})
