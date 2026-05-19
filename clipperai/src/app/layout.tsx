import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'ClipForge AI — Create Viral Clips in Seconds',
  description: 'Download, trim, resize, and export HD clips for Instagram Reels, YouTube Shorts, TikTok, Facebook and X. AI-powered video clipping.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Professional fonts for text overlay system */}
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Poppins:wght@400;600;700;900&family=Bebas+Neue&family=Anton&family=Oswald:wght@400;700&family=Roboto:wght@400;700;900&family=Playfair+Display:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${outfit.variable} antialiased min-h-screen relative`} suppressHydrationWarning>
        {/* Animated mesh background orbs */}
        <div className="mesh-bg">
          <div className="mesh-orb w-[700px] h-[700px] bg-[#00e5bf] opacity-[0.035] top-[-20%] left-[-10%]" style={{ animationDelay: '0s' }} />
          <div className="mesh-orb w-[500px] h-[500px] bg-[#8b5cf6] opacity-[0.03] bottom-[-10%] right-[-5%]" style={{ animationDelay: '-7s' }} />
          <div className="mesh-orb w-[400px] h-[400px] bg-[#06b6d4] opacity-[0.025] top-[40%] left-[60%]" style={{ animationDelay: '-3s' }} />
        </div>

        <main className="relative z-10 flex flex-col min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
