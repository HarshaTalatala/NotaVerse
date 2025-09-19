/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Pagination } from '@/components/ui/Pagination';

describe('Pagination component', () => {
  it('disables prev on first page and next on last page', () => {
    const onChange = vi.fn();
    const { getByText, rerender } = render(
      <Pagination page={1} pageSize={10} total={15} onChange={onChange} />
    );
    expect(getByText('Prev')).toBeDisabled();
    expect(getByText('Next')).not.toBeDisabled();

    // Move to page 2
    rerender(<Pagination page={2} pageSize={10} total={15} onChange={onChange} />);
    expect(getByText('Prev')).not.toBeDisabled();
    expect(getByText('Next')).toBeDisabled();
  });

  it('calls onChange with correct page when number clicked', () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <Pagination page={1} pageSize={5} total={30} onChange={onChange} />
    );
    fireEvent.click(getByText('3'));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
