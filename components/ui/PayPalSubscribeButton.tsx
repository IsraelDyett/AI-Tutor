// // src/components/PayPalSubscribeButton.tsx

// 'use client'; // This is essential! It marks the component for client-side execution.

// import React, { useEffect, useRef } from 'react';

// // Make sure the PayPal script is loaded before this component is rendered
// // Or handle script loading within the component itself.
// declare global {
//   interface Window {
//     paypal?: any;
//   }
// }

// const PAYPAL_CLIENT_ID = "AeUcgxH9MQbmurAZrrSQJ2seLlZNAAz21r0DJ2j1K84b1Wp-aedfiOu46C7Ml1lRrr2_eNtnmGePx4VX";
// const PAYPAL_PLAN_ID = "P-93B226610H289413JNCP5L4A";

// const PayPalSubscribeButton = () => {
//   const paypalRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     // Function to add the PayPal script to the document
//     const addPaypalScript = () => {
//       // Check if the script is already loaded to prevent duplicates
//       if (window.paypal) {
//         renderButton();
//         return;
//       }
//       const script = document.createElement('script');
//       script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription`;
//       script.setAttribute('data-sdk-integration-source', 'button-factory');
//       script.onload = () => renderButton(); // Render the button once the script is loaded
//       document.body.appendChild(script);
//     };

//     // Function to render the PayPal button
//     const renderButton = () => {
//       if (window.paypal && paypalRef.current) {
//         // Clear the container in case of re-renders
//         paypalRef.current.innerHTML = ''; 
        
//         window.paypal.Buttons({
//           style: {
//             shape: 'rect',
//             color: 'gold',
//             layout: 'vertical',
//             label: 'subscribe',
//           },
//           createSubscription: function (data: any, actions: any) {
//             return actions.subscription.create({
//               /* Creates the subscription */
//               plan_id: PAYPAL_PLAN_ID,
//             });
//           },
//           onApprove: function (data: any, actions: any) {
//             alert(`Subscription successful! ID: ${data.subscriptionID}`);
//             // Here you would typically handle the successful subscription:
//             // - Save the subscriptionID to your database against the user's account
//             // - Redirect to a thank you page
//           },
//           onError: function (err: any) {
//              console.error('PayPal button error:', err);
//              // Handle errors here, e.g., show an error message to the user
//           }
//         }).render(paypalRef.current); // Renders the PayPal button into the ref container
//       }
//     };
    
//     addPaypalScript();

//   }, []); // The empty dependency array ensures this runs only once when the component mounts

//   return <div ref={paypalRef}></div>;
// };

// export default PayPalSubscribeButton;




// src/components/PayPalSubscribeButton.tsx

'use client'; 

import React from 'react';

const PayPalSubscribeButton = () => {
  return (
    <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top">
      <input type="hidden" name="cmd" value="_s-xclick" />
      <input type="hidden" name="hosted_button_id" value="FNPJXHBLWVWSS" />
      <input type="hidden" name="currency_code" value="USD" />
      <input 
        type="image" 
        src="https://www.paypalobjects.com/en_US/i/btn/btn_subscribe_LG.gif" 
        //border="0" 
        name="submit" 
        title="PayPal - The safer, easier way to pay online!" 
        alt="Subscribe" 
      />
    </form>
  );
};

export default PayPalSubscribeButton;