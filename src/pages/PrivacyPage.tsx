import { Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { PixelArrowLeft } from "@/components/icons/custom/PixelArrowLeft";

const PrivacyPage = () => {
  return (
    <div className="min-h-full bg-background p-6 md:p-8 lg:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <PixelArrowLeft className="w-4 h-4" />
          Back to Map
        </Link>

        <PageHeader
          icon={Shield}
          title="Privacy Policy"
          subtitle="Last updated: February 25, 2026"
        />

        <SectionCard title="1. Introduction">
          <p className="text-sm text-muted-foreground">
            Welcome to Bitplace, our collaborative pixel art platform. We are committed to protecting your privacy and ensuring you have a positive experience on our platform. This policy outlines our data collection and processing practices.
          </p>
        </SectionCard>

        <SectionCard title="2. Data We Collect">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>We collect the following types of information:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-medium text-foreground">Wallet Information:</span> Your Solana wallet address, used as your account identifier when you connect to the Service.</li>
              <li><span className="font-medium text-foreground">Profile Information:</span> Username, bio, avatar, country, and social links you voluntarily provide.</li>
              <li><span className="font-medium text-foreground">Canvas Interactions:</span> Pixel placements, color choices, PE stakes, and timestamps of your contributions on the world map.</li>
              <li><span className="font-medium text-foreground">Usage Data:</span> IP addresses, browser type, device information, and interaction patterns.</li>
              <li><span className="font-medium text-foreground">Authentication Data:</span> Wallet signatures, nonces, and session information used to verify your identity.</li>
              <li><span className="font-medium text-foreground">Google Account Information:</span> When you sign in with Google, we receive your email address, display name, and profile picture. We do not access your Google contacts, files, or any other Google account data.</li>
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="3. How We Use Your Data">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Your data is used for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-medium text-foreground">Service Delivery:</span> To provide and maintain the pixel art platform functionality.</li>
              <li><span className="font-medium text-foreground">Authentication:</span> To verify your identity via wallet signature or Google sign-in, and secure your account.</li>
              <li><span className="font-medium text-foreground">Synchronization:</span> To sync your pixel placements and game state across devices and sessions.</li>
              <li><span className="font-medium text-foreground">Analytics:</span> To understand usage patterns and improve the platform.</li>
              <li><span className="font-medium text-foreground">Communication:</span> To send you important updates about the Service.</li>
              <li><span className="font-medium text-foreground">Fraud Prevention:</span> To detect and prevent abuse, exploits, and violations of our Terms of Service.</li>
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="4. Data Storage and Security">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>We implement industry-standard security measures to protect your data:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Data is encrypted in transit using SSL/TLS protocols</li>
              <li>Secure wallet-based authentication through cryptographic signatures</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication requirements for all data operations</li>
              <li>Row-level security policies to ensure users can only access their own data</li>
              <li>OAuth-based authentication for Google sign-in, with tokens stored securely server-side</li>
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="5. Third-Party Services">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>We use the following third-party services to operate our platform:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-medium text-foreground">Cloud Infrastructure:</span> Database, authentication, and storage services provided by trusted cloud partners.</li>
              <li><span className="font-medium text-foreground">Solana Blockchain:</span> For wallet authentication and on-chain token interactions ($BIT).</li>
              <li><span className="font-medium text-foreground">Google OAuth:</span> Used solely for authentication. We request only your basic profile information (email, name, profile picture). We do not access your Google Drive, contacts, calendar, or any other Google service. You can revoke access at any time from your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Account settings</a>.</li>
            </ul>
            <p>These services have their own privacy policies and handle data according to their respective terms.</p>
          </div>
        </SectionCard>

        <SectionCard title="6. Cookies and Tracking">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>We use cookies and similar technologies to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Maintain your login session</li>
              <li>Remember your preferences (theme, sound settings, etc.)</li>
              <li>Analyze site traffic and usage patterns</li>
            </ul>
            <p>You can control cookie settings through your browser preferences.</p>
          </div>
        </SectionCard>

        <SectionCard title="7. Your Rights">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>You have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-medium text-foreground">Access:</span> Request a copy of your personal data.</li>
              <li><span className="font-medium text-foreground">Correction:</span> Update or correct your profile information.</li>
              <li><span className="font-medium text-foreground">Deletion:</span> Request deletion of your account and associated data.</li>
              <li><span className="font-medium text-foreground">Export:</span> Download your pixel contributions and profile data.</li>
              <li><span className="font-medium text-foreground">Opt-out:</span> Unsubscribe from promotional communications.</li>
            </ul>
            <p>
              To exercise these rights, please contact us at{" "}
              <a href="mailto:team@bitplace.live" className="text-primary hover:underline">team@bitplace.live</a>.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="8. Data Retention">
          <p className="text-sm text-muted-foreground">
            We retain your data for as long as your account is active or as needed to provide services. When you delete your account, we will remove your personal information within 30 days, except where we are required to retain it for legal purposes. Your pixel placements on the world map may remain visible as part of the collaborative canvas.
          </p>
        </SectionCard>

        <SectionCard title="9. Children's Privacy">
          <p className="text-sm text-muted-foreground">
            Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal data, please contact us at{" "}
            <a href="mailto:team@bitplace.live" className="text-primary hover:underline">team@bitplace.live</a>.
          </p>
        </SectionCard>

        <SectionCard title="10. Changes to This Policy">
          <p className="text-sm text-muted-foreground">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
          </p>
        </SectionCard>

        <SectionCard title="11. Contact Us">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>If you have any questions about this Privacy Policy or our data practices, please contact us at:</p>
            <p>
              Email: <a href="mailto:team@bitplace.live" className="text-primary hover:underline">team@bitplace.live</a>
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default PrivacyPage;
