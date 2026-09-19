import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030a12] px-5 text-white">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-slate-400">
          The page you requested is not available.
        </p>
        <Link
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-blue-600 px-6 font-semibold text-white hover:bg-blue-500"
          to="/"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
