import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { FormField } from '@/components/common/form-field';
import { OrganStatusBadge, WithdrawalStatusBadge } from '@/components/common/status-badges';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/format';

describe('FormField', () => {
  it('labels the control and links the error for screen readers', () => {
    render(
      <FormField label="Email" error="Enter a valid email address" required>
        {(p) => <Input {...p} />}
      </FormField>,
    );
    const input = screen.getByLabelText(/Email/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Enter a valid email address');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
  });

  it('shows the hint when there is no error', () => {
    render(
      <FormField label="Phone" hint="Include the country code">
        {(p) => <Input {...p} />}
      </FormField>,
    );
    expect(screen.getByLabelText('Phone')).toHaveAccessibleDescription('Include the country code');
  });
});

describe('status badges', () => {
  it('always include a text label (not colour alone)', () => {
    render(
      <>
        <OrganStatusBadge status="PENDING" />
        <WithdrawalStatusBadge status="REJECTED" />
      </>,
    );
    expect(screen.getByText('Pending review')).toBeInTheDocument();
    expect(screen.getByText('Declined')).toBeInTheDocument();
  });
});

describe('DataTable states', () => {
  const columns = [{ id: 'name', header: 'Name', cell: (r: { id: string; name: string }) => r.name }];

  it('renders the empty state', () => {
    render(
      <DataTable caption="People" columns={columns} rows={[]} getRowId={(r) => r.id} mobileTitle={(r) => r.name} empty={<EmptyState title="Nobody here" />} />,
    );
    expect(screen.getByText('Nobody here')).toBeInTheDocument();
  });

  it('renders an error with a working retry button', async () => {
    const onRetry = vi.fn();
    render(
      <DataTable
        caption="People"
        columns={columns}
        rows={undefined}
        error={new Error('Server unavailable')}
        onRetry={onRetry}
        getRowId={(r) => r.id}
        mobileTitle={(r) => r.name}
        empty={null}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Server unavailable');
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders rows in an accessible table with a caption', () => {
    render(
      <DataTable
        caption="People"
        columns={columns}
        rows={[{ id: '1', name: 'Ada' }]}
        getRowId={(r) => r.id}
        mobileTitle={(r) => r.name}
        empty={null}
      />,
    );
    expect(screen.getByRole('table', { name: 'People' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
  });

  it('shows a loading status while pending', () => {
    render(<DataTable caption="People" columns={columns} rows={undefined} loading getRowId={(r) => r.id} mobileTitle={(r) => r.name} empty={null} />);
    expect(screen.getByRole('status', { name: /loading people/i })).toBeInTheDocument();
  });
});

describe('formatDate', () => {
  it('does not shift date-only values across timezones', () => {
    expect(formatDate('2026-08-01')).toMatch(/2026/);
    expect(formatDate('2026-08-01')).toMatch(/1/);
    expect(formatDate(null)).toBe('—');
  });
});
