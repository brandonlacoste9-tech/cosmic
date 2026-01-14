import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusBadge from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders with default status', () => {
    render(<StatusBadge status="success" />);
    const badge = screen.getByText('success');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle('background-color: green');
  });

  it('renders with custom label', () => {
    render(<StatusBadge status="error" label="Failed" />);
    const badge = screen.getByText('Failed');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle('background-color: red');
  });
});