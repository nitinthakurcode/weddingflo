import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('should render correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('should handle click events', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()

    render(<Button onClick={handleClick}>Click me</Button>)

    const button = screen.getByRole('button', { name: /click me/i })
    await user.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeDisabled()
  })

  it('should not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()

    render(<Button disabled onClick={handleClick}>Click me</Button>)

    const button = screen.getByRole('button', { name: /click me/i })
    await user.click(button)

    expect(handleClick).not.toHaveBeenCalled()
  })

  it('should render with default variant', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    // Default variant uses gradient from primary to secondary
    expect(button).toHaveClass('bg-gradient-to-r')
  })

  it('should render with destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button', { name: /delete/i })
    // Destructive variant uses gradient from destructive
    expect(button).toHaveClass('from-destructive')
  })

  it('should render with outline variant', () => {
    render(<Button variant="outline">Cancel</Button>)
    const button = screen.getByRole('button', { name: /cancel/i })
    // Outline variant uses border-2
    expect(button).toHaveClass('border-2')
  })

  it('should render with secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByRole('button', { name: /secondary/i })
    // Secondary variant uses gradient from secondary to accent
    expect(button).toHaveClass('from-secondary')
  })

  it('should render with ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const button = screen.getByRole('button', { name: /ghost/i })
    // Ghost variant has hover:bg-primary/10
    expect(button).toHaveClass('hover:bg-primary/10')
  })

  it('should render with link variant', () => {
    render(<Button variant="link">Link</Button>)
    const button = screen.getByRole('button', { name: /link/i })
    expect(button).toHaveClass('underline-offset-4')
  })

  it('should render with small size', () => {
    render(<Button size="sm">Small</Button>)
    const button = screen.getByRole('button', { name: /small/i })
    expect(button).toHaveClass('h-8')
  })

  it('should render with large size', () => {
    render(<Button size="lg">Large</Button>)
    const button = screen.getByRole('button', { name: /large/i })
    expect(button).toHaveClass('h-10')
  })

  it('should render with icon size', () => {
    render(<Button size="icon" aria-label="icon button">X</Button>)
    const button = screen.getByRole('button', { name: /icon button/i })
    expect(button).toHaveClass('h-9')
    expect(button).toHaveClass('w-9')
  })

  it('should accept custom className', () => {
    render(<Button className="custom-class">Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toHaveClass('custom-class')
  })

  it('should support button type attribute', () => {
    render(<Button type="submit">Submit</Button>)
    const button = screen.getByRole('button', { name: /submit/i })
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('should render children correctly', () => {
    render(
      <Button>
        <span>Icon</span>
        Text
      </Button>
    )

    expect(screen.getByText('Icon')).toBeInTheDocument()
    expect(screen.getByText('Text')).toBeInTheDocument()
  })

  it('should forward ref correctly', () => {
    const ref = jest.fn()
    render(<Button ref={ref}>Click me</Button>)
    expect(ref).toHaveBeenCalled()
  })

  it('should handle keyboard events', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()

    render(<Button onClick={handleClick}>Click me</Button>)

    const button = screen.getByRole('button', { name: /click me/i })
    button.focus()
    await user.keyboard('{Enter}')

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should have proper accessibility attributes', () => {
    render(<Button aria-label="Accessible button">Click</Button>)
    const button = screen.getByRole('button', { name: /accessible button/i })
    expect(button).toHaveAttribute('aria-label', 'Accessible button')
  })
})
