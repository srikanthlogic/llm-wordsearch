import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSelector, { LANGUAGES } from '../../components/LanguageSelector';

describe('LanguageSelector', () => {
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

  it('should display the correct selected value', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="es" onChange={mockOnChange} />);
    
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('es');
  });

  it('should call onChange when selection changes', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="en" onChange={mockOnChange} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'fr' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('fr');
  });

  it('should render with label when provided', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="en" onChange={mockOnChange} label="Select Language" />);
    
    expect(screen.getByText('Select Language')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Language')).toBeInTheDocument();
  });

  it('should render without label when not provided', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="en" onChange={mockOnChange} />);
    
    expect(screen.queryByText('Select Language')).not.toBeInTheDocument();
  });

  it('should use custom id when provided', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="en" onChange={mockOnChange} id="custom-id" label="Language" />);
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('id', 'custom-id');
    
    const label = screen.getByText('Language');
    expect(label).toHaveAttribute('for', 'custom-id');
  });

  it('should use default id when not provided', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="en" onChange={mockOnChange} label="Language" />);
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('id', 'language-selector');
    
    const label = screen.getByText('Language');
    expect(label).toHaveAttribute('for', 'language-selector');
  });

  it('should have correct CSS classes', () => {
    const mockOnChange = vi.fn();
    render(<LanguageSelector value="en" onChange={mockOnChange} />);
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass(
      'w-full',
      'px-4',
      'py-2',
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