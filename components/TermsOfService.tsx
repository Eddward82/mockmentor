interface TermsOfServiceProps {
  onGoHome: () => void;
}

const TermsOfService = ({ onGoHome }: TermsOfServiceProps) => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <button
        onClick={onGoHome}
        className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-8"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Home
      </button>

      <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Terms of Service</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-10">Last updated: February 16, 2026</p>

      <div className="space-y-8 text-slate-700 dark:text-slate-300 text-[15px] leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using MockMentor ("the Service"), available at mockmentor.app, you agree to be bound by these
            Terms of Service. If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">2. Description of Service</h2>
          <p>
            MockMentor is an AI-powered interview coaching platform that provides simulated interview sessions,
            real-time feedback, and performance analytics. The Service uses artificial intelligence to generate
            interview questions, evaluate responses, and provide improvement suggestions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">3. User Accounts</h2>
          <p className="mb-2">
            To use MockMentor, you must sign in using your Google account. By doing so, you agree to:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Accept responsibility for all activity under your account</li>
            <li>Notify us immediately of any unauthorized access</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">4. Subscription Plans</h2>
          <p className="mb-2">MockMentor offers the following plans:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Starter Plan:</strong> Limited interview sessions with basic features</li>
            <li><strong>Professional Plan:</strong> Increased session limits and enhanced features</li>
            <li><strong>Premium Plan:</strong> Extended sessions and full access to all features</li>
          </ul>
          <p className="mt-2">
            Paid plans are billed on a monthly basis. You may cancel your subscription at any time, and your access
            will continue until the end of the current billing period. Refunds are not provided for partial months.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">5. Acceptable Use</h2>
          <p className="mb-2">You agree not to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Use the Service for any unlawful or fraudulent purpose</li>
            <li>Attempt to reverse-engineer, decompile, or disassemble the Service</li>
            <li>Interfere with or disrupt the Service or its infrastructure</li>
            <li>Share your account access with unauthorized third parties</li>
            <li>Use the Service to generate harmful, abusive, or inappropriate content</li>
            <li>Attempt to bypass session limits or other usage restrictions</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">6. Intellectual Property</h2>
          <p>
            All content, features, and functionality of MockMentor — including but not limited to the user interface,
            design, logos, and AI-generated feedback — are owned by MockMentor and are protected by intellectual
            property laws. Your interview responses and transcriptions remain your own property.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">7. AI-Generated Content Disclaimer</h2>
          <p>
            MockMentor uses artificial intelligence to simulate interviews and provide feedback. AI-generated responses,
            scores, and suggestions are for practice and educational purposes only. They do not constitute professional
            career advice, and we make no guarantees regarding the accuracy or completeness of AI-generated content.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">8. Limitation of Liability</h2>
          <p>
            MockMentor is provided "as is" without warranties of any kind, either express or implied. We shall not
            be liable for any indirect, incidental, special, consequential, or punitive damages arising from your
            use of the Service. Our total liability shall not exceed the amount you have paid for the Service in the
            twelve months preceding any claim.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">9. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time for violations of these Terms.
            You may delete your account and data at any time through the Settings page. Upon termination, your
            right to use the Service will immediately cease.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">10. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify users of material changes by updating the
            "Last updated" date at the top of this page. Continued use of the Service after changes constitutes
            acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">11. Contact</h2>
          <p>
            If you have questions about these Terms of Service, please contact us at{' '}
            <a href="mailto:support@smartbloomai.online" className="text-blue-600 dark:text-blue-400 hover:underline">
              support@smartbloomai.online
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
