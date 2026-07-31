import { useState, useEffect, useCallback } from 'react';

// Centralized Backend URL logic
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://myquro.com');

export function useInvitations(userId?: string) {
  const [invitationData, setInvitationData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasInvitations, setHasInvitations] = useState(false);

  // 1. Check if user has any invites (Lightweight check for the Navbar badge)
  const checkInvitations = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/staff-requests/my-invites`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Assuming the API returns a list of IDs or a boolean flag
        setHasInvitations(data.invites && data.invites.length > 0);
      } else {
        setHasInvitations(false);
      }
    } catch (error) {
      console.error('Failed to check invitations:', error);
      setHasInvitations(false);
    }
  }, [userId]);

  // 2. Fetch detailed invitation data (For the Modal)
  const fetchInvitations = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/staff-requests/my-invites/detail`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setInvitationData(data.invites || []);
      } else {
        setInvitationData([]);
      }
    } catch (error) {
      console.error('Failed to fetch invitation details:', error);
      setInvitationData([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 3. Accept Invitation
  const acceptInvitation = async (inviteToken: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/staff-requests/${inviteToken}/accept-invite`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        alert('Invitation accepted successfully!');
        // Refresh data to update UI
        await fetchInvitations();
        await checkInvitations();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      alert('Failed to accept invitation');
    }
  };

  // 4. Reject Invitation
  const rejectInvitation = async (inviteToken: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/staff-requests/${inviteToken}/reject-invite`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        alert('Invitation rejected successfully!');
        // Refresh data to update UI
        await fetchInvitations();
        await checkInvitations();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to reject invitation');
      }
    } catch (error) {
      console.error('Failed to reject invitation:', error);
      alert('Failed to reject invitation');
    }
  };

  // Initial check when user logs in
  useEffect(() => {
    if (userId) {
      checkInvitations();
    } else {
      setHasInvitations(false);
    }
  }, [userId, checkInvitations]);

  return {
    invitationData,
    loading,
    hasInvitations,
    fetchInvitations,
    acceptInvitation,
    rejectInvitation,
    checkInvitations
  };
}