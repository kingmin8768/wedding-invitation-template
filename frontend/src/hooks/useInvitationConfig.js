import { useContext } from 'react';
import InvitationConfigContext from '../contexts/invitationConfigContext';
import { INVITATION_CONFIG } from '../config/invitationConfig';

export const useInvitationConfig = () => {
  const context = useContext(InvitationConfigContext);
  if (!context) {
    return {
      config: INVITATION_CONFIG,
      setConfig: () => {},
      refreshConfig: async () => null,
    };
  }

  return context;
};
