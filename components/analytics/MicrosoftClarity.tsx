"use client";

import Script from "next/script";

export function MicrosoftClarity() {
  const clarityId = process.env.NEXT_PUBLIC_MICROSOFT_CLARITY_ID;

  if (!clarityId) {
    return null;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("Microsoft Clarity configured:", Boolean(clarityId));
  }

  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${clarityId}");
        `,
      }}
    />
  );
}
