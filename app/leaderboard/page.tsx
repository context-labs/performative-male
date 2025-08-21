export const dynamic = 'force-dynamic';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import LeaderboardContent from '@/components/LeaderboardContent';
export default function LeaderboardPage() {
  return (
    <div className="min-h-dvh p-6 sm:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <div className="mb-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Leaderboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">Top submissions ranked by performativity score.</p>
            </div>
          </div>
        </div>
        <Suspense fallback={
          <div className="space-y-4">
            <div className="rounded-xl border p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </div>
              <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 h-52 sm:h-60 animate-pulse" />
                <div className="rounded-lg border bg-muted/30 h-64 sm:h-72 animate-pulse" />
                <div className="rounded-lg border bg-muted/30 h-56 sm:h-64 animate-pulse" />
              </div>
            </div>
            <div className="block sm:hidden rounded-xl border divide-y">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="h-3 w-6 bg-muted animate-pulse rounded" />
                  <div className="h-14 w-14 rounded-md bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                    <div className="flex gap-2">
                      <div className="h-4 w-10 bg-muted animate-pulse rounded-full" />
                      <div className="h-4 w-12 bg-muted animate-pulse rounded-full" />
                      <div className="h-4 w-8 bg-muted animate-pulse rounded-full" />
                    </div>
                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden sm:block rounded-xl border overflow-hidden">
              <div className="bg-muted/50 px-4 py-3">
                <div className="h-4 w-64 bg-muted animate-pulse rounded" />
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-5 gap-4 border-t px-4 py-3">
                  <div className="h-4 w-10 bg-muted animate-pulse rounded" />
                  <div className="h-14 w-14 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                  <div className="flex gap-2">
                    <div className="h-4 w-10 bg-muted animate-pulse rounded-full" />
                    <div className="h-4 w-12 bg-muted animate-pulse rounded-full" />
                    <div className="h-4 w-8 bg-muted animate-pulse rounded-full" />
                  </div>
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
        }>
          <LeaderboardContent />
        </Suspense>
      </div>
    </div>
  );
}

