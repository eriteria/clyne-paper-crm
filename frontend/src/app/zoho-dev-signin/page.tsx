"use client";
import Link from "next/link";

export default function ZohoDevSignin() {
  const backend =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold">Zoho Dev Sign-in</h1>
        <p className="text-gray-600">
          Use this page in development to test the Zoho OAuth flow.
        </p>
        <Link
          className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          href={`${backend}/api/auth/zoho/login`}
        >
          Sign in with Zoho
        </Link>
      </div>
    </div>
  );
}
