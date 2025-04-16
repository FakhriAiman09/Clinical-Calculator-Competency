// __tests__/RaterDashboard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RaterDashboard from '@/components/(RaterComponents)/NeedRatingList';
import { useUser } from '@/context/UserContext';
import { mockFormRequests } from '../__mocks__/mockFormRequest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockSupabaseData: any;

let mockSupabaseError: { message: string; } | null = null;
jest.mock('@/context/UserContext');
jest.mock('@/utils/supabase/client', () => ({
    createClient: jest.fn(() => ({
      from: jest.fn().mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(() => ({
          eq: jest.fn().mockImplementation(() =>
            Promise.resolve({ data: mockSupabaseData, error: mockSupabaseError })
          )
        }))
      })),
      rpc: jest.fn().mockImplementation(() =>
        Promise.resolve({
          data: mockSupabaseData,
          error: null
        })
      )
    }))
  }));

jest.mock("next/navigation", () => ({
    useRouter() {
      return {
        prefetch: () => null
      };
    }
  }));

describe('RaterDashboard Component', () => {
  beforeEach(() => {
    mockSupabaseData = mockFormRequests;
    (useUser as jest.Mock).mockReturnValue({
      user: { id: 'rater-123', email: 'rater@test.com' },
      loading: true
    });
  });

  it('renders loading state initially', async () => {
    render(<RaterDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  it('displays form requests after loading', async () => {
    render(<RaterDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Student A')).toBeInTheDocument();
      expect(screen.getByText('a@test.com')).toBeInTheDocument();
      expect(screen.getByText('Note 1')).toBeInTheDocument();
      expect(screen.getByText('Student B')).toBeInTheDocument();
      expect(screen.getByText('b@test.com')).toBeInTheDocument();
      expect(screen.getByText('Note 2')).toBeInTheDocument();
      expect(screen.getByText('Student C')).toBeInTheDocument();
      expect(screen.getByText('c@test.com')).toBeInTheDocument();
      expect(screen.getByText('Note 3')).toBeInTheDocument();
    });
  });

  it('sorts requests by date', async () => {
    render(<RaterDashboard />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('list-group').children).toHaveLength(3);
    });

    // Default is ascending
    const initialItems = screen.getAllByTestId('request-item');
    expect(initialItems[0]).toHaveTextContent('Student A');
    expect(initialItems[1]).toHaveTextContent('Student B');
    expect(initialItems[2]).toHaveTextContent('Student C');

    // Find and click the sort button
    const sortButton = screen.getByRole('button', { name: /sort by date/i });
    fireEvent.click(sortButton);

    // Verify descending sort
    await waitFor(() => {
      const sortedItems = screen.getAllByTestId('request-item');
      expect(sortedItems[0]).toHaveTextContent('Student C');
      expect(sortedItems[1]).toHaveTextContent('Student B');
      expect(sortedItems[2]).toHaveTextContent('Student A');
    });

    // Click again to toggle back to ascending
    fireEvent.click(sortButton);

    await waitFor(() => {
      const revertedItems = screen.getAllByTestId('request-item');
      expect(revertedItems[0]).toHaveTextContent('Student A');
      expect(revertedItems[1]).toHaveTextContent('Student B');
      expect(revertedItems[2]).toHaveTextContent('Student C');
    });
  });

  it('shows empty state when no requests exist', async () => {
    mockSupabaseData = [];
    render(<RaterDashboard />)
    await waitFor(() => {
        expect(screen.getByTestId('list-group').children).toHaveLength(0);
      });
  });

  it('handles Supabase errors gracefully', async () => {
    console.error = jest.fn();
    mockSupabaseError = { message: 'Database error' };
    render(<RaterDashboard />);
    
    await waitFor(() => {
      expect(screen.queryByText('Student A')).not.toBeInTheDocument();
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching form requests:',
        'Database error'
      );
    });
  });
});