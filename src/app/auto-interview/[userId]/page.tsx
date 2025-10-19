"use client"

import React from 'react'
import InterviewHome from '@/app/components/users/InterviewHome';
import { useLastVisitedUrl } from '@/context/hooks/useLastVisitedUrl';

const AutoInterview = () => {
  useLastVisitedUrl();

  return (
    <div className="h-full flex flex-col">
      <InterviewHome />
    </div>
  )
}

export default AutoInterview