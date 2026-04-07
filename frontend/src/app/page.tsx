import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Make the web
            <span className="text-blue-600"> accessible</span>
            <br />
            for everyone
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            AccessAI helps web developers instantly identify, understand, and
            fix accessibility barriers by combining automated WCAG scanning
            with AI-powered expert recommendations.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/scan"
              className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-lg transition-colors"
            >
              Start Scanning
            </Link>
            <Link
              href="/signup"
              className="px-8 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-lg transition-colors border border-gray-300"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center p-6">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                1. Scan
              </h3>
              <p className="text-gray-600">
                Enter any website URL. Our engine loads the page in a real
                browser and runs comprehensive WCAG 2.1 accessibility checks.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-6">
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                2. Analyze
              </h3>
              <p className="text-gray-600">
                Our AI agent classifies each issue by severity, explains its
                impact on users with disabilities, and references WCAG criteria.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-6">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                3. Fix
              </h3>
              <p className="text-gray-600">
                Get specific, actionable code-level fix suggestions for every
                issue — ready to copy and implement immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to improve your website&apos;s accessibility?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Over 96% of websites have accessibility issues. Let AccessAI help
            you find and fix them.
          </p>
          <Link
            href="/signup"
            className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-lg transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}
