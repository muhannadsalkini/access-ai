import Link from "next/link";
import { Shield } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — AccessAI",
  description: "Privacy policy for AccessAI web accessibility scanner.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "April 16, 2026";

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 mb-6">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-medium text-indigo-300">Privacy Policy</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-zinc-500 text-sm">Last updated: {lastUpdated}</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-zinc max-w-none space-y-10">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
            <p className="text-zinc-400 leading-relaxed">
              Welcome to AccessAI (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). We are committed to protecting your personal
              information and your right to privacy. This Privacy Policy explains how we collect, use,
              and safeguard your information when you use our web application, browser extension, or
              MCP server (collectively, the &quot;Service&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium text-zinc-300 mb-2">2.1 Account Information</h3>
                <p className="text-zinc-400 leading-relaxed">
                  When you create an account, we collect your email address and any profile information
                  you provide. Authentication is handled securely via Supabase.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-zinc-300 mb-2">2.2 Scan Data</h3>
                <p className="text-zinc-400 leading-relaxed">
                  When you scan a URL or submit HTML code, we process the content to perform
                  accessibility analysis. The URLs you scan and scan results (issues, scores, reports)
                  are stored in your account so you can access them later.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-zinc-300 mb-2">2.3 Usage Data</h3>
                <p className="text-zinc-400 leading-relaxed">
                  We may collect basic usage data such as scan timestamps and API request counts
                  to improve the Service and enforce rate limits.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-zinc-300 mb-2">2.4 Browser Extension</h3>
                <p className="text-zinc-400 leading-relaxed">
                  The AccessAI browser extension accesses only the URL of the current active tab
                  (with your permission) to initiate an accessibility scan. It does not read or
                  collect any page content, form data, passwords, or personal information from
                  websites you visit.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <ul className="space-y-2 text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span>To provide, operate, and maintain the AccessAI Service</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span>To authenticate you and manage your account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span>To store and display your scan history and reports</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span>To generate AI-powered accessibility analysis using third-party AI providers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span>To improve and develop new features of the Service</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span>To enforce our Terms of Service and prevent abuse</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Sharing & Third Parties</h2>
            <p className="text-zinc-400 leading-relaxed mb-4">
              We do not sell your personal data. We share data only with the following trusted providers
              necessary to operate the Service:
            </p>
            <ul className="space-y-2 text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span><strong className="text-zinc-300">Supabase</strong> — Authentication and database storage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span><strong className="text-zinc-300">OpenAI / AI Providers</strong> — Processing scan data to generate AI analysis and recommendations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span><strong className="text-zinc-300">Render / Hosting Providers</strong> — Cloud infrastructure for running the application</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Retention</h2>
            <p className="text-zinc-400 leading-relaxed">
              We retain your account data and scan history for as long as your account is active.
              You can delete your account and associated data at any time by contacting us.
              Scan results are associated with your account and are not shared with other users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Data Security</h2>
            <p className="text-zinc-400 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your data,
              including encrypted connections (HTTPS), secure authentication tokens, and access
              controls. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Your Rights</h2>
            <p className="text-zinc-400 leading-relaxed mb-4">
              Depending on your location, you may have the following rights regarding your personal data:
            </p>
            <ul className="space-y-2 text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span><strong className="text-zinc-300">Access</strong> — Request a copy of the data we hold about you</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span><strong className="text-zinc-300">Deletion</strong> — Request deletion of your account and data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span><strong className="text-zinc-300">Correction</strong> — Request correction of inaccurate data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span><strong className="text-zinc-300">Portability</strong> — Request an export of your data</span>
              </li>
            </ul>
            <p className="text-zinc-400 leading-relaxed mt-4">
              To exercise any of these rights, please contact us at the email below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Cookies</h2>
            <p className="text-zinc-400 leading-relaxed">
              We use essential cookies and local storage to maintain your authentication session.
              We do not use advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Children&apos;s Privacy</h2>
            <p className="text-zinc-400 leading-relaxed">
              The Service is not directed to children under the age of 13. We do not knowingly
              collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Changes to This Policy</h2>
            <p className="text-zinc-400 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by posting the new policy on this page with an updated &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Contact Us</h2>
            <p className="text-zinc-400 leading-relaxed">
              If you have any questions about this Privacy Policy or your data, please contact us at:
            </p>
            <div className="mt-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <p className="text-zinc-300 font-medium">AccessAI</p>
              <p className="text-zinc-400 text-sm mt-1">
                Email:{" "}
                <a
                  href="mailto:mohanad.salkini@gmail.com"
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  mohanad.salkini@gmail.com
                </a>
              </p>
              <p className="text-zinc-400 text-sm mt-1">
                GitHub:{" "}
                <a
                  href="https://github.com/muhannadsalkini/access-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  github.com/muhannadsalkini/access-ai
                </a>
              </p>
            </div>
          </section>
        </div>

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-white/[0.06]">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← Back to AccessAI
          </Link>
        </div>
      </div>
    </div>
  );
}
