import { Shield } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";

const PrivacyPage = () => {
  return (
    <div className="min-h-full bg-background p-6 md:p-8 lg:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <PageHeader
          icon={Shield}
          title="Privacy Policy"
          subtitle="Last updated: February 16, 2026"
        />

        <SectionCard title="1. Information We Collect">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>When you use Bitplace, we may collect the following information:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your Solana wallet address (used as your account identifier)</li>
              <li>Profile information you voluntarily provide (username, bio, avatar, social links)</li>
              <li>Pixel placement data and gameplay activity</li>
              <li>Device and browser information for analytics</li>
              <li>IP address and approximate location data</li>
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="2. How We Use Your Information">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>We use collected information to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide and maintain the Service</li>
              <li>Authenticate your wallet and manage your account</li>
              <li>Display your pixel placements and profile to other users</li>
              <li>Improve the Service and develop new features</li>
              <li>Communicate with you about updates and changes</li>
              <li>Prevent fraud and enforce our Terms of Service</li>
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="3. Data Sharing">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              We do not sell your personal information. We may share data with third-party service providers who assist in operating the Service, subject to confidentiality agreements.
            </p>
            <p>
              Your wallet address and pixel placements are publicly visible on the platform by design.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="4. Data Security">
          <p className="text-sm text-muted-foreground">
            We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </SectionCard>

        <SectionCard title="5. Your Rights">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction or deletion of your data</li>
              <li>Object to or restrict certain processing activities</li>
              <li>Data portability</li>
            </ul>
            <p>
              To exercise these rights, please contact us at{" "}
              <a href="mailto:contact@bitplace.app" className="text-primary hover:underline">contact@bitplace.app</a>.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="6. Cookies & Analytics">
          <p className="text-sm text-muted-foreground">
            We may use cookies and similar technologies to enhance your experience and collect usage analytics. You can manage cookie preferences through your browser settings.
          </p>
        </SectionCard>

        <SectionCard title="7. Changes to This Policy">
          <p className="text-sm text-muted-foreground">
            We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last updated" date at the top of this page. Your continued use of the Service constitutes acceptance of the updated policy.
          </p>
        </SectionCard>

        <SectionCard title="8. Contact">
          <p className="text-sm text-muted-foreground">
            For questions about this Privacy Policy, contact us at{" "}
            <a href="mailto:contact@bitplace.app" className="text-primary hover:underline">contact@bitplace.app</a>.
          </p>
        </SectionCard>
      </div>
    </div>
  );
};

export default PrivacyPage;
