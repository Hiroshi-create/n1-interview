// "use client";

// import React, { useContext } from 'react'
// import { AppContext } from '@/context/AppContext';

// const ClientViewContent = () => {
//   const { getCookie, setCookie, deleteCookie } = useContext(AppContext);
  
//   const lastVisitedPage = getCookie('lastVisitedPage');
//   if (lastVisitedPage) {
//     deleteCookie('lastVisitedPage');
//     setCookie('lastVisitedPage', window.location.href, 3600);
//   } 

//   return (
//     <div>ClientView</div>
//   )
// }

// export default ClientViewContent