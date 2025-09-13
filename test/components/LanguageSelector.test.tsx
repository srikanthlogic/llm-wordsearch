import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSelector, { LANGUAGES } from '../../components/LanguageSelector';

/**
 * Test suite for LanguageSelector component
 * This suite verifies the LanguageSelector component's functionality including:
 * - Rendering all supported languages as options
 * - Proper value selection and onChange handling
 * - Label rendering and accessibility features
 * - Custom ID support for form integration
 * - CSS styling and responsive design
 * - Multiple selection changes and event handling
 */
describe('LanguageSelector', () => {
  /**
   * Test language options rendering
   * Ensures all configured languages are available as selectable options
   */
  it('should render all available languages', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="en" onChange={mockOnChange} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    // Check that all languages are present as options
    Object.entries(LANGUAGES).forEach(([code, name]) => {
      expect(screen.getByRole('option', { name })).toBeInTheDocument();
    });
  });

  /**
   * Test initial value selection
   * Verifies the select element shows the correct initial value
   */
  it('should display the correct selected value', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="es" onChange={mockOnChange} />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('es');
  });

  /**
   * Test onChange callback
   * Ensures onChange is called with the correct value when selection changes
   */
  it('should call onChange when selection changes', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="en" onChange={mockOnChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'fr' } });

    expect(mockOnChange).toHaveBeenCalledWith('fr');
  });

  /**
   * Test label rendering
   * Verifies label is displayed and properly associated when provided
   */
  it('should render with label when provided', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="en" onChange={mockOnChange} label="Select Language" />);

    expect(screen.getByText('Select Language')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Language')).toBeInTheDocument();
  });

  /**
   * Test label absence
   * Ensures no label is rendered when not provided
   */
  it('should render without label when not provided', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="en" onChange={mockOnChange} />);

    expect(screen.queryByText('Select Language')).not.toBeInTheDocument();
  });

  /**
   * Test custom ID
   * Verifies custom ID is applied to select and label elements
   */
  it('should use custom id when provided', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="en" onChange={mockOnChange} id="custom-id" label="Language" />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('id', 'custom-id');

    const label = screen.getByText('Language');
    expect(label).toHaveAttribute('for', 'custom-id');
  });

  /**
   * Test default ID
   * Ensures default ID is used when not specified
   */
  it('should use default id when not provided', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="en" onChange={mockOnChange} label="Language" />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('id', 'language-selector');

    const label = screen.getByText('Language');
    expect(label).toHaveAttribute('for', 'language-selector');
  });

  /**
   * Test select element styling
   * Verifies all required CSS classes are applied for proper appearance, including responsive design
   */
  it('should have correct CSS classes', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="en" onChange={mockOnChange} />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveClass(
      'w-full',
      'px-2',
      'sm:px-4',
      'py-2',
      'sm:py-3',
      'bg-slate-200',
      'dark:bg-slate-700',
      'border',
      'border-slate-300',
      'dark:border-slate-600',
      'rounded-lg',
      'text-slate-900',
      'dark:text-white',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-purple-500'
    );
  });

  /**
   * Test label styling
   * Ensures label has correct CSS classes when present
   */
  it('should have correct label CSS classes when label is provided', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="en" onChange={mockOnChange} label="Language" />);

    const label = screen.getByText('Language');
    expect(label).toHaveClass(
      'block',
      'text-slate-700',
      'dark:text-slate-300',
      'text-sm',
      'font-bold',
      'mb-2'
    );
  });

  /**
   * Test language options completeness
   * Verifies all expected languages are present with correct codes
   */
  it('should contain all expected language options', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="en" onChange={mockOnChange} />);

    const expectedLanguages = {
      'en': 'English',
      'es': 'Español (Spanish)',
      'fr': 'Français (French)',
      'de': 'Deutsch (German)',
      'hi': 'हिन्दी (Hindi)',
      'bn': 'বাংলা (Bengali)',
      'ta': 'தமிழ் (Tamil)',
    };

    Object.entries(expectedLanguages).forEach(([code, name]) => {
      const option = screen.getByRole('option', { name }) as HTMLOptionElement;
      expect(option.value).toBe(code);
    });
  });

  /**
   * Test multiple selection changes
   * Ensures onChange is called correctly for multiple sequential changes
   */
  it('should handle multiple onChange calls', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="en" onChange={mockOnChange} />);

    const select = screen.getByRole('combobox');

    fireEvent.change(select, { target: { value: 'es' } });
    fireEvent.change(select, { target: { value: 'fr' } });
    fireEvent.change(select, { target: { value: 'de' } });

    expect(mockOnChange).toHaveBeenCalledTimes(3);
    expect(mockOnChange).toHaveBeenNthCalledWith(1, 'es');
    expect(mockOnChange).toHaveBeenNthCalledWith(2, 'fr');
    expect(mockOnChange).toHaveBeenNthCalledWith(3, 'de');
  });
});