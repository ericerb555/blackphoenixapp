import { Download, FileText, CheckCircle, Calendar, DollarSign, Shield, Building2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from '../ui/button/PrimaryButton';

interface InvestmentContractProps {
  applicationData: any;
  opportunity: any;
}

export default function InvestmentContract({ applicationData, opportunity }: InvestmentContractProps) {
  const contractDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const maturityDate = new Date(
    new Date().setFullYear(new Date().getFullYear() + parseInt(opportunity.term))
  ).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const calculateProjectedReturn = () => {
    return (applicationData.investmentAmount * opportunity.projectedROI) / 100;
  };

  const handleDownload = () => {
    toast.success('Downloading investment contract...');
    // In a real implementation, this would generate a PDF
  };

  const handleSign = () => {
    toast.success('Contract signed successfully! Funding instructions will be sent to your email.');
  };

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-600/10 to-red-600/10 border-b border-orange-500/30 p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Investment Agreement</h1>
            <p className="text-gray-400">{opportunity.title}</p>
            <p className="text-sm text-gray-500 mt-1">Contract ID: INV-{Date.now()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Effective Date</p>
            <p className="text-lg font-bold text-white">{contractDate}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[#0A0A0A] border border-orange-500/20 rounded-lg p-4">
            <DollarSign className="w-5 h-5 text-orange-400 mb-2" />
            <p className="text-xs text-gray-400">Investment Amount</p>
            <p className="text-xl font-bold text-white">${applicationData.investmentAmount.toLocaleString()}</p>
          </div>
          <div className="bg-[#0A0A0A] border border-orange-500/20 rounded-lg p-4">
            <DollarSign className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-xs text-gray-400">Projected Return</p>
            <p className="text-xl font-bold text-green-400">${calculateProjectedReturn().toLocaleString()}</p>
          </div>
          <div className="bg-[#0A0A0A] border border-orange-500/20 rounded-lg p-4">
            <Calendar className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-xs text-gray-400">Term</p>
            <p className="text-xl font-bold text-white">{opportunity.term}</p>
          </div>
          <div className="bg-[#0A0A0A] border border-orange-500/20 rounded-lg p-4">
            <Building2 className="w-5 h-5 text-purple-400 mb-2" />
            <p className="text-xs text-gray-400">ROI</p>
            <p className="text-xl font-bold text-white">{opportunity.projectedROI}%</p>
          </div>
        </div>
      </div>

      {/* Contract Content */}
      <div className="p-8 space-y-8 text-gray-300">
        {/* Parties */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-400" />
            I. Parties to this Agreement
          </h2>
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-6 space-y-4">
            <div>
              <p className="text-sm font-semibold text-white mb-2">Company (Issuer)</p>
              <p className="text-sm">
                <strong>Company Name:</strong> {process.env.COMPANY_NAME || 'Construction Platform LLC'}<br />
                <strong>Address:</strong> 123 Business Ave, Suite 100, Boston, MA 02101<br />
                <strong>EIN:</strong> XX-XXXXXXX
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-2">Investor</p>
              <p className="text-sm">
                <strong>Name:</strong> {applicationData.fullName}<br />
                <strong>Address:</strong> {applicationData.street}, {applicationData.city}, {applicationData.state} {applicationData.zipCode}<br />
                <strong>Email:</strong> {applicationData.email}<br />
                <strong>Phone:</strong> {applicationData.phone}
                {applicationData.investingAs !== 'individual' && (
                  <>
                    <br /><strong>Entity Name:</strong> {applicationData.entityName}
                    <br /><strong>Tax ID:</strong> {applicationData.taxId}
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Investment Terms */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            II. Investment Terms
          </h2>
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-white mb-2">Investment Details</p>
                <ul className="text-sm space-y-2">
                  <li><strong>Opportunity:</strong> {opportunity.title}</li>
                  <li><strong>Category:</strong> {opportunity.category}</li>
                  <li><strong>Investment Type:</strong> {applicationData.investingAs}</li>
                  <li><strong>Principal Amount:</strong> ${applicationData.investmentAmount.toLocaleString()}</li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-2">Returns & Timeline</p>
                <ul className="text-sm space-y-2">
                  <li><strong>Projected ROI:</strong> {opportunity.projectedROI}%</li>
                  <li><strong>Investment Term:</strong> {opportunity.term}</li>
                  <li><strong>Commencement Date:</strong> {contractDate}</li>
                  <li><strong>Maturity Date:</strong> {maturityDate}</li>
                </ul>
              </div>
            </div>

            {opportunity.category === 'Company Equity' && (
              <div className="pt-4 border-t border-[#2A2A2A]">
                <p className="text-sm font-semibold text-white mb-2">Equity Terms</p>
                <ul className="text-sm space-y-1">
                  {opportunity.benefits.map((benefit: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {opportunity.location && (
              <div className="pt-4 border-t border-[#2A2A2A]">
                <p className="text-sm font-semibold text-white mb-2">Property Details</p>
                <ul className="text-sm space-y-1">
                  <li><strong>Location:</strong> {opportunity.location}</li>
                  {opportunity.propertyDetails && (
                    <>
                      <li><strong>Property Type:</strong> {opportunity.propertyDetails.type}</li>
                      {opportunity.propertyDetails.sqft > 0 && (
                        <li><strong>Square Footage:</strong> {opportunity.propertyDetails.sqft.toLocaleString()} sqft</li>
                      )}
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Distribution Schedule */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            III. Distribution Schedule
          </h2>
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-6">
            {opportunity.projections && opportunity.projections.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2A2A2A]">
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Period</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Distribution</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Cumulative Return</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">ROI %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opportunity.projections.map((proj: any, idx: number) => {
                      const distribution = proj.distribution || proj.rentalIncome || 0;
                      const investorShare = (distribution / opportunity.targetRaise) * applicationData.investmentAmount;

                      return (
                        <tr key={idx} className="border-b border-[#2A2A2A]">
                          <td className="py-3 px-4 text-white">Year {proj.year}</td>
                          <td className="py-3 px-4 text-green-400 font-semibold">${investorShare.toLocaleString()}</td>
                          <td className="py-3 px-4 text-white">${(investorShare * (idx + 1)).toLocaleString()}</td>
                          <td className="py-3 px-4 text-white">{proj.roi}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm">
                Distributions will be made quarterly based on the performance of the investment,
                with a target annual return of {opportunity.projectedROI}%. Specific distribution
                dates and amounts will be communicated to investors no less than 15 days prior to
                each distribution date.
              </p>
            )}
          </div>
        </section>

        {/* Representations & Warranties */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            IV. Investor Representations & Warranties
          </h2>
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-6">
            <p className="text-sm mb-4">The Investor represents and warrants to the Company that:</p>
            <ol className="text-sm space-y-3 list-decimal list-inside">
              <li>
                <strong>Investment Experience:</strong> The Investor has sufficient knowledge and
                experience in financial and business matters to evaluate the merits and risks of
                this investment. Investment experience level: <strong>{applicationData.investmentExperience}</strong>.
              </li>
              <li>
                <strong>Accredited Investor Status:</strong> The Investor {applicationData.accreditedInvestor === 'yes' ? 'IS' : 'IS NOT'} an
                accredited investor as defined in Rule 501(a) of Regulation D under the Securities Act of 1933.
              </li>
              <li>
                <strong>Financial Capability:</strong> The Investor has adequate means of providing for
                current needs and personal contingencies, and the investment represents a reasonable
                portion of the Investor's overall investment portfolio.
              </li>
              <li>
                <strong>Source of Funds:</strong> The funds used for this investment are derived from
                lawful sources: <strong>{applicationData.fundingSource}</strong>.
              </li>
              <li>
                <strong>Risk Acknowledgment:</strong> The Investor understands that this investment
                involves a high degree of risk, including the possible loss of the entire principal
                amount invested.
              </li>
              <li>
                <strong>No Guarantees:</strong> The Investor acknowledges that projected returns are
                estimates only and that actual returns may be lower or negative.
              </li>
              <li>
                <strong>Illiquidity:</strong> The Investor understands that this investment is illiquid
                and there is no public market for the resale of the securities.
              </li>
            </ol>
          </div>
        </section>

        {/* Silent Investment Terms - Only for silent investments */}
        {opportunity.silentInvestment && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-400" />
              V. Silent/Passive Investment Terms
            </h2>
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-6">
              <p className="text-sm mb-4 font-semibold text-white">
                THIS IS A SILENT, PASSIVE INVESTMENT. The Investor acknowledges and agrees to the following terms:
              </p>
              <ol className="text-sm space-y-3 list-decimal list-inside">
                <li>
                  <strong>No Operational Control:</strong> The Investor shall have <strong>NO operational control</strong>,
                  decision-making authority, or management input regarding any aspect of the project, property, or business
                  operations. All operational decisions shall be made exclusively by the Company and its designated management team.
                </li>
                <li>
                  <strong>No Voting Rights:</strong> The Investor shall have <strong>NO voting rights</strong> on matters
                  relating to project execution, property management, contractor selection, budget allocation, timeline
                  modifications, or any other operational matters.
                </li>
                <li>
                  <strong>Information Rights Only:</strong> The Investor's rights are limited to:
                  <ul className="ml-6 mt-2 space-y-1 list-disc">
                    <li>Receiving quarterly financial reports and performance updates</li>
                    <li>Accessing project status dashboards and documentation</li>
                    <li>Reviewing annual audited financial statements</li>
                    <li>Receiving distribution statements and tax documents</li>
                  </ul>
                </li>
                <li>
                  <strong>No Project Interference:</strong> The Investor agrees not to contact, direct, or attempt to
                  influence contractors, property managers, vendors, tenants, or any other parties involved in the project
                  execution or operations.
                </li>
                <li>
                  <strong>Professional Management:</strong> The Investor acknowledges that all project decisions will be
                  made by qualified professionals with expertise in construction, property management, real estate development,
                  and financial management.
                </li>
                <li>
                  <strong>Communications:</strong> All investor communications and inquiries must be directed through the
                  official investor relations portal or designated contact email. The Company is under no obligation to
                  respond to requests for operational changes or recommendations.
                </li>
                <li>
                  <strong>Exit Restrictions:</strong> The Investor may not withdraw, demand return of capital, or exit
                  the investment prior to the agreed-upon maturity date or liquidation event, except as specifically
                  provided in this Agreement.
                </li>
                <li>
                  <strong>Passive Income Tax Treatment:</strong> The Investor understands that this investment may be
                  classified as passive income for tax purposes and should consult with their tax advisor regarding
                  the implications.
                </li>
              </ol>

              <div className="mt-4 pt-4 border-t border-yellow-500/20">
                <p className="text-xs text-gray-400">
                  <strong className="text-white">By executing this Agreement, the Investor expressly acknowledges and
                  accepts their role as a silent, passive investor with no operational authority or decision-making power.</strong> The
                  Investor's sole expectation is to receive financial returns as outlined in this Agreement, and they agree
                  to allow the professional management team to execute the project without interference.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Risk Factors */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">{opportunity.silentInvestment ? 'VI' : 'V'}. Risk Factors</h2>
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-6">
            <p className="text-sm mb-4 font-semibold">
              This investment involves substantial risks. Investors should carefully consider the
              following risk factors:
            </p>
            <ul className="text-sm space-y-2">
              {opportunity.risks && opportunity.risks.map((risk: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>{risk}</span>
                </li>
              ))}
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Economic conditions and market volatility may affect investment performance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Regulatory changes may impact the investment structure or returns</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>No guarantee of liquidity or ability to exit the investment before maturity</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Payment Instructions */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">{opportunity.silentInvestment ? 'VII' : 'VI'}. Payment & Funding Instructions</h2>
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-6">
            <p className="text-sm mb-4">
              Upon execution of this Agreement, the Investor shall transfer the Investment Amount
              of <strong className="text-white">${applicationData.investmentAmount.toLocaleString()}</strong> within
              <strong className="text-white"> 5 business days</strong> via one of the following methods:
            </p>

            <div className="space-y-4">
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                <p className="text-sm font-semibold text-white mb-2">Wire Transfer</p>
                <p className="text-sm">
                  Bank Name: First National Bank<br />
                  Account Name: {process.env.COMPANY_NAME || 'Construction Platform LLC'} - Investor Capital<br />
                  Account Number: XXXX-XXXX-1234<br />
                  Routing Number: 011000015<br />
                  Reference: Contract ID INV-{Date.now()}
                </p>
              </div>

              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                <p className="text-sm font-semibold text-white mb-2">ACH Transfer</p>
                <p className="text-sm">
                  Account Number: XXXX-XXXX-1234<br />
                  Routing Number: 011000015<br />
                  Account Type: Business Checking<br />
                  Reference: Contract ID INV-{Date.now()}
                </p>
              </div>
            </div>

            <div className="mt-4 bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
              <p className="text-xs text-gray-400">
                <strong className="text-white">Important:</strong> Please include the Contract ID in the
                wire/ACH reference field. You will receive email confirmation within 24 hours of funds receipt.
              </p>
            </div>

            {opportunity.needsMoreFunding && (
              <div className="mt-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-sm font-semibold text-white mb-2">Escrow & Minimum Funding Requirement</p>
                <p className="text-xs text-gray-400 space-y-2">
                  <p>
                    This project requires a <strong className="text-white">minimum of ${(opportunity.minimumToStart / 1000000).toFixed(1)}M</strong> in
                    committed capital before project execution can begin. Currently, <strong className="text-white">${(opportunity.currentCommitments / 1000000).toFixed(1)}M</strong> has
                    been committed by {opportunity.investors} investors.
                  </p>
                  <p>
                    Your investment funds will be held in a <strong className="text-white">segregated escrow account</strong> until
                    the minimum funding threshold is reached. If the minimum is not reached within 180 days of your investment date:
                  </p>
                  <ul className="ml-6 mt-2 space-y-1 list-disc">
                    <li>Your full principal will be returned to you</li>
                    <li>You will receive interest at 2% APR for the escrow period</li>
                    <li>No fees or penalties will be charged</li>
                  </ul>
                  <p className="mt-2">
                    Once the minimum is reached, you will be notified via email and the project will commence within 30 days.
                    Your funds will be released from escrow and deployed into the project.
                  </p>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Governing Law */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">{opportunity.silentInvestment ? 'VIII' : 'VII'}. Governing Law & Dispute Resolution</h2>
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-6">
            <p className="text-sm space-y-3">
              <p>
                <strong>7.1 Governing Law:</strong> This Agreement shall be governed by and construed
                in accordance with the laws of the State of Delaware, without regard to its conflict
                of law provisions.
              </p>
              <p>
                <strong>7.2 Arbitration:</strong> Any dispute arising out of or relating to this
                Agreement shall be resolved through binding arbitration in accordance with the rules
                of the American Arbitration Association.
              </p>
              <p>
                <strong>7.3 Venue:</strong> Any arbitration or legal proceeding shall take place in
                Wilmington, Delaware.
              </p>
            </p>
          </div>
        </section>

        {/* Signature Section */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">{opportunity.silentInvestment ? 'IX' : 'VIII'}. Signatures</h2>
          <div className="bg-gradient-to-br from-green-600/10 to-emerald-600/10 border border-green-500/30 rounded-lg p-6 space-y-6">
            <div>
              <p className="text-sm mb-4">
                By signing below, the parties agree to be bound by the terms and conditions of this
                Investment Agreement.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-white">COMPANY</p>
                <div className="border-b border-gray-600 pb-2">
                  <p className="text-sm text-gray-400">Signature</p>
                  <p className="text-sm italic text-gray-500 mt-8">Digitally Signed</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Name</p>
                  <p className="text-sm text-white">Eric Erb, CEO</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Date</p>
                  <p className="text-sm text-white">{contractDate}</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-semibold text-white">INVESTOR</p>
                <div className="border-b border-gray-600 pb-2">
                  <p className="text-sm text-gray-400">Signature</p>
                  <p className="text-sm italic text-gray-500 mt-8">Pending Electronic Signature</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Name</p>
                  <p className="text-sm text-white">{applicationData.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Date</p>
                  <p className="text-sm text-white">______________</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-[#2A2A2A] p-6 bg-[#0A0A0A] rounded-b-xl">
        <div className="flex items-center justify-between">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-gray-300 hover:text-white hover:border-orange-500/30 transition"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>

          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-400">
              By clicking "Sign Contract", you agree to use electronic signatures
            </p>
            <PrimaryButton
              onClick={handleSign}
              className="flex items-center gap-2 px-6"
            >
              <CheckCircle className="w-4 h-4" />
              Sign Contract
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
