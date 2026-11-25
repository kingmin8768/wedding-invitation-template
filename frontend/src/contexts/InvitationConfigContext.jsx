import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  fetchPublicInvitationSettings,
  getInitialInvitationConfig,
  mergeInvitationConfig,
} from '../lib/invitationSettings';
import InvitationConfigContext from './invitationConfigContext';

export const InvitationConfigProvider = ({ children }) => {
  const [config, setConfigState] = useState(getInitialInvitationConfig);

  const setConfig = useCallback((nextConfig) => {
    setConfigState(mergeInvitationConfig(nextConfig));
  }, []);

  const refreshConfig = useCallback(async () => {
    try {
      const latest = await fetchPublicInvitationSettings();
      setConfigState(latest);
      return latest;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = `${config.couple.groom.firstName} ♥ ${config.couple.bride.firstName} 결혼식에 초대합니다`;
    }
  }, [config.couple.bride.firstName, config.couple.groom.firstName]);

  return (
    <InvitationConfigContext.Provider value={{ config, setConfig, refreshConfig }}>
      {children}
    </InvitationConfigContext.Provider>
  );
};

InvitationConfigProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
