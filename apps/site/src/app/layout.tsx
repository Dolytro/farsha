import type { Metadata } from "next";
import "../styles/globals.scss";
import "../styles/components/_button.scss";

export const metadata: Metadata = {
  title: "Farsha: free, open source design tool",
  description: "Design, prototype and hand off without a subscription. Open source, in your browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@1&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
