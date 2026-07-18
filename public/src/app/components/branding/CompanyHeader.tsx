import { useState, useEffect } from 'react';
import { Building2, Mail, Phone, Globe, MapPin } from 'lucide-react';
import { companyInfo, getFullAddress } from '../../lib/config/companyInfo';

interface CompanyHeaderProps {
  variant?: 'invoice' | 'contract' | 'quote';
  showFullDetails?: boolean;
}

export default function CompanyHeader({ variant = 'invoice', showFullDetails = true }: CompanyHeaderProps) {
  const [companyLogo, setCompanyLogo] = useState<string>('');

  useEffect(() => {
    // Load company logo from localStorage
    try {
      const logoVariants = localStorage.getItem('company_logo_variants');
      if (logoVariants) {
        const parsed = JSON.parse(logoVariants);
        setCompanyLogo(parsed.logo_primary || parsed.logo_secondary || '');
      }
    } catch (error) {
      console.error('Failed to load company logo:', error);
    }
  }, []);

  const getDocumentTitle = () => {
    switch (variant) {
      case 'invoice':
        return 'INVOICE';
      case 'contract':
        return 'CONTRACT';
      case 'quote':
        return 'QUOTE';
      default:
        return 'DOCUMENT';
    }
  };

  return (
    <div className="border-b border-[#2A2A2A] pb-6 mb-6">
      {/* Company Logo and Name */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Logo */}
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyInfo.name}
              className="w-16 h-16 object-contain rounded-2xl shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          )}
          
          {/* Company Info */}
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{companyInfo.name}</h1>
            <p className="text-sm text-orange-400 font-semibold">{companyInfo.tagline}</p>
            <p className="text-xs text-gray-500 mt-1">{companyInfo.legalName}</p>
          </div>
        </div>

        {/* Document Type Badge */}
        <div className="text-right">
          <div className="inline-block px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl shadow-lg shadow-orange-500/20">
            <p className="text-2xl font-bold text-white tracking-wider">{getDocumentTitle()}</p>
          </div>
        </div>
      </div>

      {/* Full Contact Details */}
      {showFullDetails && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
          {/* Address */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-1">Address</p>
              <p className="text-xs text-gray-300 leading-relaxed">
                {companyInfo.address.line1}
                {companyInfo.address.line2 && <><br />{companyInfo.address.line2}</>}
                <br />
                {companyInfo.address.city}, {companyInfo.address.state} {companyInfo.address.zipCode}
              </p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-1">Phone</p>
              <p className="text-xs text-gray-300">{companyInfo.contact.phone}</p>
              {companyInfo.contact.fax && (
                <p className="text-xs text-gray-400">Fax: {companyInfo.contact.fax}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-2">
            <Mail className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-1">Email</p>
              <p className="text-xs text-gray-300 break-all">{companyInfo.contact.email}</p>
            </div>
          </div>

          {/* Website */}
          <div className="flex items-start gap-2">
            <Globe className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-1">Website</p>
              <p className="text-xs text-gray-300">{companyInfo.contact.website}</p>
              <p className="text-xs text-gray-400 mt-1">
                {companyInfo.tax.taxLabel}: {companyInfo.tax.taxId}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compact Contact Line (when showFullDetails is false) */}
      {!showFullDetails && (
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {getFullAddress()}
          </span>
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {companyInfo.contact.phone}
          </span>
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {companyInfo.contact.email}
          </span>
        </div>
      )}
    </div>
  );
}
