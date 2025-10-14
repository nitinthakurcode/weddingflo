import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">WeddingFlow Pro</h1>
      <p className="mt-4 text-lg text-gray-600">
        AI-Powered Wedding Management Platform
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/sign-in"
          className="rounded-md bg-purple-600 px-6 py-3 text-white font-medium hover:bg-purple-700 transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md border border-purple-600 px-6 py-3 text-purple-600 font-medium hover:bg-purple-50 transition-colors"
        >
          Sign Up
        </Link>
      </div>
    </main>
  );
}
