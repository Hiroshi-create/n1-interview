"use client"

import Sidebar from "./components/Sidebar";
import { ChatProvider } from "./components/Chat";
import Chat from "./components/Chat";
import App from "./components/App";

export default function Home() {
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
  );
}















// "use client"

// import Sidebar from "./components/Sidebar";
// import Chat from "./components/Chat";
// import { Avatar } from "./components/Avatar";

// export default function Home() {
//   return (
//     <div className="flex h-screen justify-center items-center">
//       <div className="h-full flex" style={{ width: "1280px" }}>
//         <div className="w-1/5 h-full border-r">
//           <Sidebar />
//         </div>
//         <div className="w-4/5 h-full">
//           <div className="h-4/5">
//             <Avatar />
//           </div>
//           <div className="h-1/5">
//             <Chat />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }