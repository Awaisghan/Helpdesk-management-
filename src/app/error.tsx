'use client';
import { LoadError } from '@/components/ui/loading-states';
export default function ErrorPage({ retry }: { retry: () => void }) {
  return <div className="route-error"><LoadError retry={retry} title="Something interrupted your workspace." message="We couldn’t display this page. Try again to reload it."/></div>;
}
