interface PrivacyPolicyProps {
  onGoHome: () => void;
}

const PrivacyPolicy = ({ onGoHome }: PrivacyPolicyProps) => {
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

      <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Privacy Policy</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-10">Last updated: February 16, 2026</p>

      <div className="space-y-8 text-slate-700 dark:text-slate-300 text-[15px] leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">1. Introduction</h2>
          <p>
            MockMentor ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains
            how we collect, use, store, and protect your information when you use our AI interview coaching
            platform at mockmentor.app.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">2. Information We Collect</h2>
          <p className="mb-3">We collect the following types of information:</p>

          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Account Information</h3>
          <ul className="list-disc list-inside space-y-1 ml-2 mb-4">
            <li>Name and email address (from your Google account)</li>
            <li>Profile photo (from your Google account)</li>
            <li>Account creation date</li>
          </ul>

          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Interview Session Data</h3>
          <ul className="list-disc list-inside space-y-1 ml-2 mb-4">
            <li>Interview configuration (job title, experience level, interview mode)</li>
            <li>Audio recordings during live interview sessions (processed in real-time, not permanently stored)</li>
            <li>Transcriptions of your interview responses</li>
            <li>AI-generated performance metrics and feedback</li>
            <li>Session duration and timestamps</li>
          </ul>

          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Usage Data</h3>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Subscription plan and usage limits</li>
            <li>Session history and frequency</li>
            <li>Theme preferences (light/dark mode)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>To provide and improve the interview coaching experience</li>
            <li>To generate personalized feedback and performance analytics</li>
            <li>To track your progress across interview sessions</li>
            <li>To manage your account and subscription</li>
            <li>To communicate important service updates</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">4. Data Storage and Security</h2>
          <p className="mb-2">
            Your data is stored securely using Google Firebase and Firestore. We implement industry-standard
            security measures including:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Encrypted data transmission (HTTPS/TLS)</li>
            <li>Firebase Authentication for secure access control</li>
            <li>Firestore security rules restricting data access to authenticated users</li>
            <li>Data isolation — each user can only access their own interview data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">5. Third-Party Services</h2>
          <p className="mb-3">We use the following third-party services:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>
              <strong>Google Firebase:</strong> Authentication, data storage, and hosting.
              See <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Firebase Privacy Policy</a>.
            </li>
            <li>
              <strong>Google Gemini API:</strong> AI-powered interview simulation and feedback generation.
              Audio data is sent to Google's API for real-time processing during sessions.
              See <a href="https://ai.google.dev/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Google AI Terms</a>.
            </li>
            <li>
              <strong>Google Sign-In:</strong> Account authentication via your Google account.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">6. Data Retention</h2>
          <p>
            We retain your interview session data for as long as your account is active. You can delete your
            interview history at any time through the Settings page. When you delete your data, it is permanently
            removed from our databases.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">7. Your Rights</h2>
          <p className="mb-2">You have the right to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Access:</strong> View all your interview data in the Dashboard</li>
            <li><strong>Export:</strong> Download your data as JSON or PDF through the Dashboard</li>
            <li><strong>Delete:</strong> Clear your interview history through Settings</li>
            <li><strong>Portability:</strong> Export your data in standard formats at any time</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">8. Cookies and Local Storage</h2>
          <p>
            MockMentor uses browser local storage to save your theme preference (light/dark mode) and
            cache session data for faster loading. We do not use third-party tracking cookies or advertising cookies.
            Firebase Authentication uses essential cookies for session management.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">9. Children's Privacy</h2>
          <p>
            MockMentor is not intended for use by children under the age of 13. We do not knowingly collect
            personal information from children. If you believe a child has provided us with personal information,
            please contact us and we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify users of material changes by
            updating the "Last updated" date at the top of this page. We encourage you to review this page
            periodically.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">11. Contact</h2>
          <p>
            If you have questions or concerns about this Privacy Policy or your data, please contact us at{' '}
            <a href="mailto:support@smartbloomai.online" className="text-blue-600 dark:text-blue-400 hover:underline">
              support@smartbloomai.online
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
