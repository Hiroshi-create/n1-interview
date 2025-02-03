"use client"

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation';
import GuestUserHome from '@/app/components/guest-user/guestUserHome';

const AutoInterview = () => {
  return (
    <div>
      <GuestUserHome />
    </div>
  )
}

export default AutoInterview