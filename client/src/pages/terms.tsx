import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
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
          <h1 className="text-4xl font-bold mb-2">Terms of Use</h1>
          <p className="text-muted-foreground">Last Updated: April 9, 2026 &middot; Effective Date: April 9, 2026</p>
        </div>

        {/* Content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <p>
            These Terms of Use ("Terms") govern your access to and use of Krew Recruiter, operated by Guru Boxz Tech LLC ("Company," "we," "us," or "our"). By accessing or using our Platform, you agree to be bound by these Terms.
          </p>
          <p><strong>If you do not agree to these Terms, do not use our Platform.</strong></p>

          <h2>1. Acceptance of Terms</h2>
          <p>By creating an account, posting a job, applying for a position, or otherwise using the Krew Recruiter platform (krewrecruiter.com), you confirm that:</p>
          <ul>
            <li>You are at least 18 years of age</li>
            <li>You have the legal capacity to enter into a binding agreement</li>
            <li>You will comply with these Terms and all applicable laws</li>
            <li>If using on behalf of a business, you have authority to bind that business to these Terms</li>
          </ul>

          <h2>2. Platform Description</h2>
          <p>Krew Recruiter is a hospitality-focused hiring platform that provides:</p>
          <ul>
            <li>Job posting and applicant tracking for restaurants and hospitality businesses</li>
            <li>Social media advertising campaigns for job openings (Facebook and Instagram)</li>
            <li>Async video interview tools</li>
            <li>Gig shift marketplace for temporary hospitality staffing</li>
            <li>Talent pool search for employers</li>
            <li>Job board aggregation from external sources</li>
          </ul>

          <h2>3. Account Registration</h2>
          <p>To use certain features, you must create an account. You agree to:</p>
          <ul>
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain and update your information as needed</li>
            <li>Keep your password confidential</li>
            <li>Notify us immediately of any unauthorized account access</li>
            <li>Be responsible for all activity under your account</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that provide false information or violate these Terms.</p>

          <h2>4. Employer Terms</h2>

          <h3>4.1 Job Postings</h3>
          <p>Employers may post job opportunities subject to these rules:</p>
          <p><strong>Permitted:</strong></p>
          <ul>
            <li>Bona fide job openings at real establishments</li>
            <li>Accurate descriptions of the role, pay, and requirements</li>
            <li>Hospitality and food service positions</li>
          </ul>
          <p><strong>Prohibited:</strong></p>
          <ul>
            <li>False, misleading, or discriminatory job postings</li>
            <li>Jobs that violate applicable employment laws</li>
            <li>Postings for illegal activities</li>
            <li>Spam or duplicate listings</li>
            <li>Jobs unrelated to the hospitality industry (on campaign features)</li>
          </ul>

          <h3>4.2 Ad Campaigns</h3>
          <p>When using Krew Recruiter's Campaign Engine:</p>
          <ul>
            <li>You authorize Krew Recruiter to create and run Meta (Facebook/Instagram) ads on your behalf</li>
            <li>You are responsible for the accuracy of job information submitted for ads</li>
            <li>Ad spend is billed to your payment method on a daily basis</li>
            <li>Krew Recruiter adds a management fee on top of actual Meta ad spend</li>
            <li>Campaigns may be paused by Krew Recruiter if they violate Meta's advertising policies, including employment ad requirements</li>
            <li>All job ads must comply with Equal Employment Opportunity (EEO) laws — no discrimination based on race, color, religion, sex, national origin, age, disability, or any other protected characteristic</li>
          </ul>

          <h3>4.3 Candidate Data</h3>
          <p>Employers agree to:</p>
          <ul>
            <li>Use candidate data only for legitimate hiring purposes</li>
            <li>Not export, sell, or share candidate contact information with third parties</li>
            <li>Comply with all applicable privacy laws regarding candidate data</li>
            <li>Delete candidate data upon request</li>
          </ul>

          <h3>4.4 Payment Terms</h3>
          <ul>
            <li>Subscription fees are billed monthly in advance</li>
            <li>Ad spend is billed daily based on actual spend</li>
            <li>All fees are non-refundable except as required by law</li>
            <li>Failed payments may result in service suspension</li>
            <li>You authorize us to charge your payment method on file</li>
          </ul>

          <h2>5. Job Seeker Terms</h2>

          <h3>5.1 Profile Accuracy</h3>
          <p>Job seekers agree to:</p>
          <ul>
            <li>Provide truthful information in their profiles</li>
            <li>Not misrepresent qualifications, experience, or identity</li>
            <li>Keep contact information current</li>
          </ul>

          <h3>5.2 Applications</h3>
          <p>By applying to a job on Krew Recruiter, you:</p>
          <ul>
            <li>Authorize us to share your application and profile with the employer</li>
            <li>Consent to being contacted by the employer regarding your application</li>
            <li>Acknowledge that Krew Recruiter does not guarantee employment outcomes</li>
          </ul>

          <h3>5.3 Video Interviews</h3>
          <p>By submitting a video interview response:</p>
          <ul>
            <li>You grant Krew Recruiter and the requesting employer a limited license to view and evaluate your video</li>
            <li>You understand video responses may be reviewed by multiple team members at the employer</li>
            <li>You confirm you have the right to appear in the video and that it does not infringe any third-party rights</li>
          </ul>

          <h3>5.4 Gig Portal</h3>
          <p>For gig workers on the platform:</p>
          <ul>
            <li>You are an independent contractor, not an employee of Krew Recruiter or the hiring establishment</li>
            <li>You are responsible for your own taxes, insurance, and compliance with applicable labor laws</li>
            <li>Krew Recruiter is not liable for disputes between gig workers and employers</li>
            <li>Payment is processed through Stripe Connect; typical payout is within 24-48 hours of shift completion</li>
          </ul>

          <h3>5.5 Talent Pool</h3>
          <p>By creating an account as a job seeker, you consent to being included in the Krew Recruiter Talent Pool, which allows verified employers to discover your profile. You may opt out at any time in your account settings.</p>

          <h2>6. Prohibited Conduct</h2>
          <p>All users are prohibited from:</p>
          <ul>
            <li>Violating any applicable law or regulation</li>
            <li>Infringing the intellectual property rights of others</li>
            <li>Uploading viruses, malware, or harmful code</li>
            <li>Attempting to gain unauthorized access to our systems</li>
            <li>Scraping, crawling, or harvesting data from the Platform</li>
            <li>Using the Platform to harass, threaten, or harm others</li>
            <li>Creating fake accounts or misrepresenting your identity</li>
            <li>Circumventing any Platform security measures</li>
            <li>Using our Platform to compete with us without our written consent</li>
          </ul>

          <h2>7. Intellectual Property</h2>
          <h3>7.1 Our Content</h3>
          <p>Krew Recruiter and its content, features, and functionality are owned by Guru Boxz Tech LLC and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our written permission.</p>
          <h3>7.2 Your Content</h3>
          <p>You retain ownership of content you submit to the Platform (job postings, profiles, videos, etc.). By submitting content, you grant Krew Recruiter a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content in connection with operating the Platform.</p>
          <p>You represent that you have the right to grant this license and that your content does not violate any third-party rights.</p>

          <h2>8. Disclaimers</h2>
          <p className="uppercase font-semibold text-sm">
            The Platform is provided "as is" and "as available" without warranties of any kind, express or implied.
          </p>
          <p className="uppercase text-sm">Krew Recruiter does not warrant that:</p>
          <ul>
            <li>The Platform will be uninterrupted or error-free</li>
            <li>Jobs posted will be filled or applications will result in employment</li>
            <li>Job listings from third-party sources are accurate or current</li>
            <li>Ad campaigns will achieve specific recruitment results</li>
          </ul>

          <h2>9. Limitation of Liability</h2>
          <p className="uppercase font-semibold text-sm">
            To the maximum extent permitted by law, Guru Boxz Tech LLC shall not be liable for:
          </p>
          <ul>
            <li>Indirect, incidental, or consequential damages</li>
            <li>Loss of profits, revenue, or business opportunities</li>
            <li>Data loss or corruption</li>
            <li>Any damages exceeding the amount you paid us in the 12 months preceding the claim</li>
          </ul>
          <p>Some jurisdictions do not allow limitation of liability for certain damages; in such cases, our liability is limited to the maximum extent permitted by law.</p>

          <h2>10. Indemnification</h2>
          <p>You agree to indemnify and hold harmless Guru Boxz Tech LLC, its officers, employees, and agents from any claims, damages, or expenses (including attorneys' fees) arising from:</p>
          <ul>
            <li>Your use of the Platform</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
            <li>Content you submit to the Platform</li>
          </ul>

          <h2>11. Third-Party Services</h2>
          <p>The Platform integrates with third-party services including Stripe, Meta, DigitalOcean, and others. Your use of these services is subject to their respective terms of service and privacy policies. We are not responsible for the actions or content of third-party services.</p>

          <h2>12. Employment Laws Compliance</h2>
          <p>Employers using Krew Recruiter agree to comply with all applicable federal, state, and local employment laws including:</p>
          <ul>
            <li>Title VII of the Civil Rights Act</li>
            <li>Americans with Disabilities Act (ADA)</li>
            <li>Age Discrimination in Employment Act (ADEA)</li>
            <li>Fair Labor Standards Act (FLSA)</li>
            <li>Equal Pay Act</li>
            <li>State and local employment laws</li>
          </ul>
          <p>Krew Recruiter is not responsible for employer non-compliance with employment laws.</p>

          <h2>13. Termination</h2>
          <p>We reserve the right to suspend or terminate your account at any time for violation of these Terms, with or without notice.</p>
          <p>Upon termination:</p>
          <ul>
            <li>Your right to use the Platform ceases immediately</li>
            <li>We may delete your account data per our Privacy Policy</li>
            <li>Outstanding payment obligations remain due</li>
            <li>Sections 7, 8, 9, 10, and 14 survive termination</li>
          </ul>

          <h2>14. Governing Law and Disputes</h2>
          <p>These Terms are governed by the laws of the State of North Carolina, without regard to conflict of law principles.</p>
          <p>Any disputes arising from these Terms shall be resolved through binding arbitration in accordance with the American Arbitration Association rules, conducted in Mecklenburg County, North Carolina. Class action lawsuits are waived.</p>
          <p>Nothing in this section prevents either party from seeking injunctive relief in court.</p>

          <h2>15. Changes to Terms</h2>
          <p>We may modify these Terms at any time. We will provide notice of material changes by:</p>
          <ul>
            <li>Email to your registered address</li>
            <li>Prominent notice on the Platform</li>
          </ul>
          <p>Continued use of the Platform after changes constitutes acceptance of the updated Terms. If you disagree with updated Terms, you must stop using the Platform.</p>

          <h2>16. Miscellaneous</h2>
          <ul>
            <li><strong>Entire Agreement:</strong> These Terms, along with our Privacy Policy, constitute the entire agreement between you and Krew Recruiter</li>
            <li><strong>Severability:</strong> If any provision is found unenforceable, the remaining provisions continue in effect</li>
            <li><strong>No Waiver:</strong> Failure to enforce any provision does not waive our right to enforce it later</li>
            <li><strong>Assignment:</strong> We may assign these Terms; you may not assign your rights without our written consent</li>
          </ul>

          <h2>17. Contact Us</h2>
          <p>For questions about these Terms:</p>
          <p>
            <strong>Guru Boxz Tech LLC</strong><br />
            Waxhaw, NC<br />
            Email: legal@krewhuddle.com<br />
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
