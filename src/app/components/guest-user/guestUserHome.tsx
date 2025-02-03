import React from 'react';
import Auth from '../users/Auth';

const GuestUserHome = () => {
  return (
    <div className='flex items-center justify-center h-full mt-8'>
      <Auth
        acceptingGuestUsers={true}
      />
    </div>
  );
};

export default GuestUserHome;
