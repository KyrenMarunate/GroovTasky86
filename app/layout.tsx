import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: "GroovTasky '86 — Your day, rewound", description: 'A little structure for the beautiful chaos.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html> }
