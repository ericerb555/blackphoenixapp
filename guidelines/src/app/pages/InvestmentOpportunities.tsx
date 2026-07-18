import InvestmentOpportunitiesPublicView from '../components/InvestmentOpportunitiesPublicView';

interface InvestmentOpportunitiesProps {
  onNavigate?: (page: string) => void;
}

export default function InvestmentOpportunities({ onNavigate }: InvestmentOpportunitiesProps) {
  // Always show public view - this is the browse page for everyone
  return <InvestmentOpportunitiesPublicView onNavigate={onNavigate} />;
}
