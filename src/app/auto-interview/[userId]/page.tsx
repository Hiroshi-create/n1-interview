"use client"

import React from 'react'
import InterviewHome from '@/app/components/users/InterviewHome';
import { useLastVisitedUrl } from '@/context/hooks/useLastVisitedUrl';

const AutoInterview = () => {
  useLastVisitedUrl();

  return (
    <div className="h-full flex flex-col p-4 mb-32">
      <InterviewHome />
    </div>
  )
}

export default AutoInterview