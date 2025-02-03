"use client"

import React from 'react'
import Chat, { ChatProvider } from '@/app/components/users/Chat';
import App from '@/app/components/users/App';

const AutoInterviewDetail = () => {
  return (
    <ChatProvider>
      <div className="relative h-screen w-full">
        <div className="absolute inset-0">
          <App />
        </div>
        <div className="absolute left-0 top-0 bottom-0 w-1/4 bg-gray-600 bg-opacity-40 rounded-lg overflow-hidden">
          <Chat />
        </div>
      </div>
    </ChatProvider>
  );
}

export default AutoInterviewDetail











// "use client"

// import React from 'react'
// import Chat, { ChatProvider } from '@/app/components/users/Chat';
// import App from '@/app/components/users/App';

// const AutoInterviewDetail = () => {
//   return (
//     <div className="flex h-screen justify-center items-center">
//       <div className="h-full flex" style={{ width: "1280px" }}>
//         <div className="w-full h-full relative">
//           <ChatProvider>
//             <div className="w-full absolute inset-0 pb-12">
//               <Chat />
//             </div>
//             <div className="w-4/5 absolute inset-0 z-10">
//               <App />
//             </div>
//           </ChatProvider>
//         </div>
//       </div>
//     </div>
//   )
// }

// export default AutoInterviewDetail