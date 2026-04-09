import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white font-bold text-sm">K</div>
            <span className="font-semibold tracking-wide text-sm">KREW RECRUITER</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">Last Updated: April 9, 2026 &middot; Effective Date: April 9, 2026</p>
        </div>

        {/* Content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <p>
            Krew Recruiter ("Krew Recruiter," "we," "us," or "our") is operated by Guru Boxz Tech LLC ("Company"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at krewrecruiter.com and any related services (collectively, the "Platform").
          </p>
          <p>Please read this policy carefully. If you disagree with its terms, please discontinue use of our Platform.</p>

          <h2>1. Information We Collect</h2>

          <h3>Information You Provide Directly</h3>

          <p><strong>For Job Seekers:</strong></p>
          <ul>
            <li>Name, email address, phone number</li>
            <li>City and state (location preferences)</li>
            <li>Work history, job titles, skills, experience years</li>
            <li>Resume or CV (if uploaded)</li>
            <li>Profile photo (if uploaded)</li>
            <li>Video interview responses</li>
            <li>Availability and schedule preferences</li>
            <li>Pay rate preferences</li>
            <li>Social security number or tax ID (only if required for gig worker payment processing via Stripe)</li>
          </ul>

          <p><strong>For Employers / Restaurants:</strong></p>
          <ul>
            <li>Business name, address, website</li>
            <li>Contact name and email address</li>
            <li>Restaurant logo and brand assets</li>
            <li>Job posting information</li>
            <li>Payment and billing information (processed by Stripe — we do not store full card numbers)</li>
            <li>Facebook Page connection details (for ad campaigns)</li>
          </ul>

          <p><strong>For All Users:</strong></p>
          <ul>
            <li>Account credentials (email and encrypted password)</li>
            <li>Profile preferences and settings</li>
            <li>Communications you send us</li>
          </ul>

          <h3>Information Collected Automatically</h3>
          <p>When you use our Platform, we automatically collect:</p>
          <ul>
            <li>IP address and approximate location</li>
            <li>Browser type and version</li>
            <li>Device type and operating system</li>
            <li>Pages visited and time spent</li>
            <li>Referring URLs</li>
            <li>Click patterns and feature usage</li>
            <li>Error logs and performance data</li>
          </ul>

          <h3>Information From Third Parties</h3>
          <p>We may receive information from:</p>
          <ul>
            <li><strong>Meta (Facebook/Instagram):</strong> When you connect a Facebook Page or when candidates interact with our job ads</li>
            <li><strong>Stripe:</strong> Payment status and billing information</li>
            <li><strong>Google:</strong> If you sign in with Google</li>
            <li><strong>Job Boards:</strong> If we aggregate public job listings (Adzuna, The Muse, Arbeitnow, Indeed RSS)</li>
          </ul>

          <h2>2. How We Use Your Information</h2>

          <p><strong>Provide Our Services:</strong></p>
          <ul>
            <li>Create and manage your account</li>
            <li>Match job seekers with relevant job opportunities</li>
            <li>Enable employers to post jobs and manage candidates</li>
            <li>Run Facebook and Instagram advertising campaigns on behalf of employers</li>
            <li>Process gig shift bookings and payments</li>
            <li>Enable video interview submissions and reviews</li>
          </ul>

          <p><strong>Improve Our Platform:</strong></p>
          <ul>
            <li>Analyze usage patterns to improve features</li>
            <li>Debug technical issues</li>
            <li>Develop new features based on user behavior</li>
          </ul>

          <p><strong>Communications:</strong></p>
          <ul>
            <li>Send account-related notifications</li>
            <li>Deliver job alerts and application updates</li>
            <li>Send platform updates and announcements</li>
            <li>Marketing communications (with your consent, opt-out available at any time)</li>
          </ul>

          <p><strong>Legal and Safety:</strong></p>
          <ul>
            <li>Comply with applicable laws and regulations</li>
            <li>Prevent fraud and abuse</li>
            <li>Enforce our Terms of Use</li>
            <li>Respond to legal requests</li>
          </ul>

          <h2>3. The Talent Pool</h2>
          <p>
            When you apply to any job on Krew Recruiter, your profile information (name, job titles, skills, location, availability) is automatically added to our Talent Pool — a searchable database available to all verified employer accounts on the platform.
          </p>
          <p><strong>What employers can see in the Talent Pool:</strong></p>
          <ul>
            <li>Your first name and last initial</li>
            <li>Job titles you've worked</li>
            <li>Skills and experience level</li>
            <li>City and state (not your full address)</li>
            <li>Availability type (full-time, part-time, gig)</li>
          </ul>
          <p><strong>What employers CANNOT see:</strong></p>
          <ul>
            <li>Your full last name (until you apply to their specific job)</li>
            <li>Your email address</li>
            <li>Your phone number</li>
            <li>Any information you have not made public in your profile</li>
          </ul>
          <p><strong>Opting out of the Talent Pool:</strong> You can remove yourself from the Talent Pool at any time by going to Settings &rarr; Privacy &rarr; "Remove me from Talent Pool." This will not delete your account or your job applications.</p>

          <h2>4. Gig Portal Data</h2>
          <p>
            If you opt into the Gig Portal, your availability status ("available for gig shifts") is visible to employer accounts searching for workers. You can toggle your gig availability on or off at any time from your dashboard.
          </p>

          <h2>5. Facebook Advertising Data</h2>
          <p>When employers use Krew Recruiter's Campaign Engine to run job ads on Facebook and Instagram:</p>
          <ul>
            <li>Ads are run from Krew Recruiter's Facebook Page, not the employer's personal page</li>
            <li>We use your job details and location to set targeting parameters (geographic radius, interests)</li>
            <li>We do not share individual candidate data with Meta beyond what is necessary for ad targeting</li>
            <li>Candidate data collected through ad click-throughs is stored on Krew Recruiter's servers, not shared back to Meta</li>
            <li>Meta's own Privacy Policy governs how Meta handles advertising data on their platform</li>
          </ul>

          <h2>6. How We Share Your Information</h2>
          <p><strong>We do not sell your personal information.</strong> We may share information with:</p>
          <p><strong>Service Providers:</strong></p>
          <ul>
            <li>Stripe (payment processing)</li>
            <li>Meta (advertising services)</li>
            <li>DigitalOcean (hosting and infrastructure)</li>
            <li>Anthropic (AI features — anonymized job data only)</li>
          </ul>
          <p><strong>Other Users:</strong></p>
          <ul>
            <li>Employers can see job seeker profiles as described in Section 3 (Talent Pool)</li>
            <li>Job seekers can see employer profiles and job listings</li>
          </ul>
          <p><strong>Legal Requirements:</strong> We may disclose information if required by law, court order, or government request, or if we believe disclosure is necessary to protect our rights or the safety of others.</p>
          <p><strong>Business Transfers:</strong> If Krew Recruiter is acquired or merged, your information may be transferred as part of that transaction. We will notify you before this occurs.</p>

          <h2>7. Data Retention</h2>
          <ul>
            <li><strong>Active accounts:</strong> Data retained while account is active</li>
            <li><strong>Deleted accounts:</strong> Core data deleted within 30 days; anonymized usage data may be retained longer</li>
            <li><strong>Job applications:</strong> Retained for 2 years after application</li>
            <li><strong>Payment records:</strong> Retained for 7 years (tax/legal requirements)</li>
            <li><strong>Video interviews:</strong> Deleted 90 days after the position is filled or closed, unless employer explicitly saves them</li>
          </ul>

          <h2>8. Your Rights and Choices</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data we hold</li>
            <li><strong>Correction:</strong> Update inaccurate information in your profile</li>
            <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
            <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
            <li><strong>Opt-out:</strong> Unsubscribe from marketing emails at any time</li>
            <li><strong>Talent Pool opt-out:</strong> Remove yourself from employer searches</li>
          </ul>
          <p>To exercise these rights, email us at: <strong>privacy@krewhuddle.com</strong></p>
          <p>California residents have additional rights under CCPA. Please see Section 12 for details.</p>

          <h2>9. Security</h2>
          <p>We implement industry-standard security measures including:</p>
          <ul>
            <li>SSL/TLS encryption for all data in transit</li>
            <li>Encrypted password storage (bcrypt)</li>
            <li>Encrypted storage of sensitive credentials</li>
            <li>Regular security audits</li>
            <li>Access controls limiting employee data access</li>
          </ul>
          <p>However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security of your information.</p>

          <h2>10. Children's Privacy</h2>
          <p>Krew Recruiter is not intended for users under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, contact us at privacy@krewhuddle.com and we will delete it.</p>

          <h2>11. Cookies</h2>
          <p>We use cookies and similar tracking technologies to:</p>
          <ul>
            <li>Keep you logged in</li>
            <li>Remember your preferences</li>
            <li>Analyze usage patterns</li>
            <li>Enable advertising features</li>
          </ul>
          <p>You can control cookies through your browser settings. Disabling cookies may limit some Platform functionality.</p>

          <h2>12. California Privacy Rights (CCPA)</h2>
          <p>If you are a California resident, you have the right to:</p>
          <ul>
            <li>Know what personal information we collect about you</li>
            <li>Know whether we sell or disclose your information and to whom</li>
            <li>Say no to the sale of your personal information</li>
            <li>Access your personal information</li>
            <li>Equal service and price even if you exercise your privacy rights</li>
          </ul>
          <p><strong>We do not sell personal information.</strong></p>
          <p>To submit a CCPA request, email: privacy@krewhuddle.com</p>

          <h2>13. Changes to This Policy</h2>
          <p>We may update this Privacy Policy periodically. We will notify you of significant changes by:</p>
          <ul>
            <li>Email notification to your registered address</li>
            <li>Prominent notice on our Platform</li>
          </ul>
          <p>Continued use of the Platform after changes constitutes acceptance of the updated policy.</p>

          <h2>14. Contact Us</h2>
          <p>For privacy-related questions or requests:</p>
          <p>
            <strong>Guru Boxz Tech LLC</strong><br />
            Waxhaw, NC<br />
            Email: privacy@krewhuddle.com<br />
            Website: krewrecruiter.com
          </p>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Krew Recruiter. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <span>&middot;</span>
            <Link href="/terms" className="hover:text-foreground">Terms of Use</Link>
            <span>&middot;</span>
            <a href="mailto:legal@krewhuddle.com" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </div>
    </div>
  );
}
