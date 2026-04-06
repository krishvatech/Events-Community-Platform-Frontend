/**
 * Tests for EditEventForm hours calculation feature
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditEventForm from '../EditEventForm';

// Mock the API calls
global.fetch = jest.fn();

describe('EditEventForm - Hours Calculation', () => {
  const mockEvent = {
    id: 1,
    title: 'Multi-Day Event',
    slug: 'multi-day-event',
    description: 'Test event',
    is_multi_day: true,
    start_time: '2026-04-06T09:00:00Z',
    end_time: '2026-04-08T17:00:00Z',
    timezone: 'UTC',
    hours_calculation_session_types: ['main', 'breakout', 'workshop'],
    sessions: [
      {
        id: 1,
        title: 'Main Session',
        session_type: 'main',
        start_time: '2026-04-06T09:00:00Z',
        end_time: '2026-04-06T11:00:00Z',
      },
      {
        id: 2,
        title: 'Breakout',
        session_type: 'breakout',
        start_time: '2026-04-06T14:00:00Z',
        end_time: '2026-04-06T15:00:00Z',
      },
    ],
  };

  const mockUserAdmin = {
    id: 1,
    username: 'admin',
    is_superuser: true,
  };

  const mockUserRegular = {
    id: 2,
    username: 'user1',
    is_superuser: false,
  };

  beforeEach(() => {
    fetch.mockClear();
    localStorage.setItem('access_token', 'mock_token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('For Superuser (Platform Admin)', () => {
    it('should show Hours Calculation section for multi-day events', async () => {
      fetch.mockImplementation((url) => {
        if (url.includes('/users/me/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUserAdmin),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(
        <EditEventForm
          event={mockEvent}
          onUpdated={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Hours Calculation/i)).toBeInTheDocument();
      });
    });

    it('should display all 4 session type toggles', async () => {
      fetch.mockImplementation((url) => {
        if (url.includes('/users/me/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUserAdmin),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(
        <EditEventForm
          event={mockEvent}
          onUpdated={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Main Sessions/i)).toBeInTheDocument();
        expect(screen.getByText(/Breakout Sessions/i)).toBeInTheDocument();
        expect(screen.getByText(/Workshops/i)).toBeInTheDocument();
        expect(screen.getByText(/Networking Sessions/i)).toBeInTheDocument();
      });
    });

    it('should toggle session type selections', async () => {
      fetch.mockImplementation((url) => {
        if (url.includes('/users/me/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUserAdmin),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const user = userEvent.setup();
      render(
        <EditEventForm
          event={mockEvent}
          onUpdated={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Networking Sessions/i)).toBeInTheDocument();
      });

      // Find the networking toggle
      const networkingLabel = screen.getByText(/Networking Sessions/i);
      const networkingSwitch = networkingLabel.closest('label').querySelector('input[type="checkbox"]');

      // Toggle networking on
      await user.click(networkingSwitch);

      expect(networkingSwitch).toBeChecked();
    });

    it('should include hours_calculation_session_types in form submission', async () => {
      fetch.mockImplementation((url, options) => {
        if (url.includes('/users/me/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUserAdmin),
          });
        }
        if (url.includes('/events/1/') && options?.method === 'PATCH') {
          // Capture the form data
          const formData = options.body;
          expect(formData.get('hours_calculation_session_types')).toBeDefined();
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEvent),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const user = userEvent.setup();
      const mockOnUpdated = jest.fn();

      render(
        <EditEventForm
          event={mockEvent}
          onUpdated={mockOnUpdated}
          onCancel={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Hours Calculation/i)).toBeInTheDocument();
      });

      // Find and click Save button
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/events/1/'),
          expect.objectContaining({
            method: 'PATCH',
          })
        );
      });
    });
  });

  describe('For Regular User (Non-Admin)', () => {
    it('should NOT show Hours Calculation section', async () => {
      fetch.mockImplementation((url) => {
        if (url.includes('/users/me/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUserRegular),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(
        <EditEventForm
          event={mockEvent}
          onUpdated={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Hours Calculation/i)).not.toBeInTheDocument();
      });
    });

    it('should NOT show session type toggles', async () => {
      fetch.mockImplementation((url) => {
        if (url.includes('/users/me/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUserRegular),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(
        <EditEventForm
          event={mockEvent}
          onUpdated={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      await waitFor(() => {
        // Should not see any of the admin-only toggles
        expect(screen.queryByText(/📌 Main Sessions/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/🔀 Breakout Sessions/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/🛠️ Workshops/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/🤝 Networking Sessions/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Single-Day Events', () => {
    it('should NOT show Hours Calculation section for single-day events', async () => {
      const singleDayEvent = { ...mockEvent, is_multi_day: false };

      fetch.mockImplementation((url) => {
        if (url.includes('/users/me/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUserAdmin),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(
        <EditEventForm
          event={singleDayEvent}
          onUpdated={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Hours Calculation/i)).not.toBeInTheDocument();
      });
    });
  });
});
