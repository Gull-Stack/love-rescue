import React from 'react';
import { useParams } from 'react-router-dom';
import { ClientLinkingAccept } from './ClientLinking';

const TherapistJoin = () => {
  const { token } = useParams();
  return <ClientLinkingAccept token={token} />;
};

export default TherapistJoin;
