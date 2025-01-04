"use client"

import React from 'react'
import Sidebar from '../../components/Sidebar'
import Chat, { ChatProvider } from '../../components/Chat'
import App from "../../components/App";

const AutoInterview = () => {
  return (
    <div className="flex h-screen justify-center items-center">
      <div className="h-full flex" style={{ width: "1280px" }}>
        <div className="w-1/5 h-full border-r">
          <Sidebar />
        </div>
        <div className="w-4/5 h-full relative">
          <ChatProvider>
            <div className="absolute inset-0 pb-12">
              <Chat />
            </div>
            <div className="w-4/5 absolute inset-0 z-10">
              <App />
            </div>
          </ChatProvider>
        </div>
      </div>
    </div>
  )
}

export default AutoInterview