import { FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { PixelArrowLeft } from "@/components/icons/custom/PixelArrowLeft";

const TermsPage = () => {
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
          icon={FileText}
          title="Terms of Service"
          subtitle="Last updated: February 25, 2026"
        />

        <SectionCard title="1. Introduction">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Welcome to Bitplace ("we", "our", "us"). By accessing or using our collaborative pixel art platform (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.
            </p>
            <p>
              Bitplace is a collaborative pixel art platform where users can place pixels on a world map, stake Paint Energy (PE), compete for territory, and participate in a creative on-chain community.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="2. Eligibility">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              You must be at least 13 years old to use our Service. By using the Service, you represent and warrant that you meet this age requirement and have the legal capacity to enter into these Terms.
            </p>
            <p>
              If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="3. Account & Authentication">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              To access certain features of the Service, you must connect a Solana-compatible wallet (e.g., Phantom, Solflare). Your wallet address serves as your account identifier.
            </p>
            <p>
              You may also sign in using your Google account. When you do, we receive your email, display name, and profile picture from Google to create and manage your Bitplace account. Google-authenticated accounts receive Virtual Paint Energy (VPE) for a trial experience; pixels placed with VPE expire after 72 hours unless defended with real PE by a wallet-connected user.
            </p>
            <p>You are responsible for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Maintaining the security of your wallet and private keys</li>
              <li>Securing your Google account credentials if using Google sign-in</li>
              <li>All activities that occur through your connected wallet or Google account</li>
              <li>Keeping your wallet software up to date</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
            <p>
              We do not have access to your private keys and cannot recover lost wallets. You are solely responsible for safeguarding your wallet credentials.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="4. User Content and Conduct">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              When placing pixels on the world map, you create content ("User Content"). You are solely responsible for all User Content you submit through the Service.
            </p>
            <p>By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free license to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Display, reproduce, and distribute your User Content on the platform</li>
              <li>Create derivative works for the purpose of operating and improving the Service</li>
              <li>Use your User Content in promotional materials</li>
            </ul>
            <p>You agree not to create or share content that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Is illegal, harmful, threatening, abusive, harassing, or defamatory</li>
              <li>Contains nudity, pornography, or sexually explicit material</li>
              <li>Promotes violence, discrimination, or hatred</li>
              <li>Infringes on intellectual property rights of others</li>
              <li>Contains spam, advertising, or commercial solicitation</li>
              <li>Violates any applicable laws or regulations</li>
            </ul>
            <p>
              We reserve the right to remove any User Content that violates these Terms or is otherwise objectionable at our sole discretion. Pixel placements are subject to moderation and may be removed without notice.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="5. Virtual Currency & Paint Energy">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              The Service includes a virtual economy based on $BIT tokens and Paint Energy (PE). PE is derived from your $BIT balance and is used for all map actions including Paint, Defend, Attack, and Reinforce.
            </p>
            <p>Important information about the virtual economy:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>$BIT is a blockchain-based token; its value may fluctuate</li>
              <li>PE is used to stake on pixels and participate in map activities</li>
              <li>Staked PE is locked until withdrawn or released through gameplay mechanics</li>
              <li>We do not guarantee any specific monetary value for $BIT or PE</li>
              <li>Token economics and conversion rates may be adjusted to maintain platform balance</li>
              <li>PE cannot be transferred between accounts outside of gameplay mechanics</li>
            </ul>
            <p>PE can be used to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Paint pixels on the world map (claiming territory)</li>
              <li>Defend owned pixels by adding defensive stake</li>
              <li>Attack enemy pixels to weaken their value</li>
              <li>Reinforce your own pixels to increase their resilience</li>
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="6. On-Chain Transactions">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Certain interactions with the Service may involve blockchain transactions on the Solana network. By using these features, you acknowledge that:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Blockchain transactions are irreversible once confirmed</li>
              <li>Network fees (gas) are your responsibility</li>
              <li>Transaction confirmation times depend on network conditions</li>
              <li>We are not responsible for failed or delayed transactions due to network issues</li>
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="7. Intellectual Property">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              The Service, including its design, features, graphics, text, and software, is owned by Bitplace and is protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p>You retain ownership of your User Content, but:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You grant us the license described in Section 4</li>
              <li>Other users may view and interact with your pixel placements</li>
              <li>We may display pixel information (author, location, timestamp) to other users</li>
            </ul>
            <p>
              You may not copy, modify, distribute, sell, or lease any part of our Service without our express written permission.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="8. Prohibited Activities">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use bots, scripts, or automated tools to interact with the Service</li>
              <li>Exploit bugs, glitches, or vulnerabilities in the Service</li>
              <li>Attempt to gain unauthorized access to any part of the Service or other users' accounts</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Sell, trade, or transfer your account to another person</li>
              <li>Create multiple accounts to circumvent limitations or restrictions</li>
              <li>Engage in any form of harassment or abuse toward other users</li>
              <li>Use the Service for any illegal purpose</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Collect or harvest user information without consent</li>
            </ul>
            <p>
              Violation of these prohibitions may result in immediate account termination and potential legal action.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="9. Account Termination">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>We reserve the right to suspend or terminate your account at any time, with or without notice, for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Violation of these Terms</li>
              <li>Fraudulent or illegal activity</li>
              <li>Prolonged inactivity</li>
              <li>Any other reason at our sole discretion</li>
            </ul>
            <p>Upon termination:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You will lose access to your account and associated in-platform assets</li>
              <li>Your User Content may remain visible on the platform</li>
              <li>Staked PE may be subject to forfeiture as per gameplay mechanics</li>
              <li>You must cease all use of the Service</li>
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="10. Disclaimers">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="uppercase font-medium text-foreground text-xs">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p>We do not warrant that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The Service will be uninterrupted, secure, or error-free</li>
              <li>Pixel placements will be permanent or immune to modification</li>
              <li>Defects will be corrected</li>
              <li>The Service will meet your specific requirements</li>
              <li>Token values will remain stable or increase</li>
            </ul>
            <p>You use the Service at your own risk. We are not responsible for any loss or damage resulting from your use of the Service.</p>
          </div>
        </SectionCard>

        <SectionCard title="11. Limitation of Liability">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="uppercase font-medium text-foreground text-xs">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, BITPLACE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
            <p>This includes damages resulting from:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your use or inability to use the Service</li>
              <li>Unauthorized access to or alteration of your User Content</li>
              <li>Removal or modification of your pixel placements</li>
              <li>Loss of tokens, PE, or other virtual items</li>
              <li>Any conduct or content of third parties on the Service</li>
              <li>Blockchain network failures or delays</li>
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="12. Indemnification">
          <p className="text-sm text-muted-foreground">
            You agree to indemnify, defend, and hold harmless Bitplace, its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorney's fees, arising out of or in any way connected with your access to or use of the Service, your User Content, your violation of these Terms, or your violation of any rights of another party.
          </p>
        </SectionCard>

        <SectionCard title="13. Modifications to Service">
          <p className="text-sm text-muted-foreground">
            We reserve the right to modify, suspend, or discontinue any part of the Service at any time, with or without notice. We may also impose limits on certain features or restrict access to parts or all of the Service. We will not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.
          </p>
        </SectionCard>

        <SectionCard title="14. Changes to Terms">
          <p className="text-sm text-muted-foreground">
            We may update these Terms from time to time. When we make changes, we will update the "Last updated" date at the top of this page. Your continued use of the Service after changes become effective constitutes your acceptance of the revised Terms. If you do not agree to the new Terms, you must stop using the Service.
          </p>
        </SectionCard>

        <SectionCard title="15. Privacy">
          <p className="text-sm text-muted-foreground">
            Your privacy is important to us. Please review our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> to understand how we collect, use, and protect your personal information.
          </p>
        </SectionCard>

        <SectionCard title="16. Severability">
          <p className="text-sm text-muted-foreground">
            If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will remain in full force and effect. The invalid or unenforceable provision will be modified to the extent necessary to make it valid and enforceable while preserving its intent.
          </p>
        </SectionCard>

        <SectionCard title="17. Entire Agreement">
          <p className="text-sm text-muted-foreground">
            These Terms, together with our Privacy Policy, constitute the entire agreement between you and Bitplace regarding your use of the Service and supersede any prior agreements.
          </p>
        </SectionCard>

        <SectionCard title="18. Contact Information">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>If you have any questions about these Terms of Service, please contact us at:</p>
            <p>
              Email: <a href="mailto:contact@bitplace.com" className="text-primary hover:underline">contact@bitplace.com</a>
            </p>
            <p className="text-xs pt-2 border-t border-border/30">
              By using Bitplace, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default TermsPage;
