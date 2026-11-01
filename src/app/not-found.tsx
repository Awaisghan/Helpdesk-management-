import Link from 'next/link';
import { Code2 } from 'lucide-react';
export default function NotFound() { return <main className="not-found"><Code2 size={42}/><span className="eyebrow">A LITTLE OFF THE PATH</span><h1>This page isn’t here.</h1><p>Let’s get you back to your CodxPy support workspace.</p><Link className="primary-button" href="/">Back to workspace</Link></main>; }
