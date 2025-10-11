"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ZohoAuthCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Extract tokens and user data from URL params
      const accessToken = searchParams.get("accessToken");
      const refreshToken = searchParams.get("refreshToken");
      const userJson = searchParams.get("user");

      if (!accessToken || !refreshToken || !userJson) {
        setError("Missing authentication data");
        return;
      }

      // Store tokens and user data in localStorage
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", userJson);

      // Redirect to dashboard
      setTimeout(() => router.push("/dashboard"), 500);
    } catch (err) {
      console.error("Failed to complete Zoho authentication:", err);
      setError("Authentication failed. Please try again.");
    }
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-semibold mb-3 text-red-600">
            Authentication Error
          </h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-semibold mb-3">Zoho sign-in complete!</h1>
        <p className="text-gray-600">You are being redirected to dashboard…</p>
      </div>
    </div>
  );
}

export default function ZohoAuthComplete() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-semibold mb-3">Loading...</h1>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    }>
      <ZohoAuthCompleteContent />
    </Suspense>
  );
}
