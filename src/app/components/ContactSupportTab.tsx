/**
 * ContactSupportTab Component
 * 
 * Support contact form for customer portals
 */

import { useState } from 'react';
import { Send, MessageCircle, Mail, Phone, Clock } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ContactSupportTabProps {
  customerId?: string;
  portalType?: string;
}

export function ContactSupportTab({ customerId, portalType = 'customer' }: ContactSupportTabProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject || !message) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Support request submitted successfully!');
      setSubject('');
      setMessage('');
      setCategory('general');
    } catch (error) {
      console.error('Error submitting support request:', error);
      toast.error('Failed to submit support request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Contact Support</h2>
        <p className="text-gray-400">
          Need help? Send us a message and we'll get back to you as soon as possible.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Form */}
        <div className="lg:col-span-2">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                >
                  <option value="general">General Inquiry</option>
                  <option value="technical">Technical Support</option>
                  <option value="billing">Billing Question</option>
                  <option value="project">Project Update</option>
                  <option value="complaint">Complaint</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                  placeholder="Brief description of your issue"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition resize-none"
                  placeholder="Please provide details about your request..."
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-orange-700 hover:shadow-lg hover:shadow-[#ea580c]/50 rounded-xl text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          {/* Quick Contact */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#ea580c]" />
              Quick Contact
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#ea580c] mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-400">Email</div>
                  <a href="mailto:support@company.com" className="text-white hover:text-[#ea580c] transition">
                    support@company.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#ea580c] mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-400">Phone</div>
                  <a href="tel:+18005551234" className="text-white hover:text-[#ea580c] transition">
                    (800) 555-1234
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#ea580c] mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-400">Hours</div>
                  <div className="text-white text-sm">
                    Mon-Fri: 8am - 6pm EST
                    <br />
                    Sat: 9am - 2pm EST
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Response Time */}
          <div className="bg-gradient-to-br from-[#ea580c]/20 to-orange-700/20 border border-[#ea580c]/30 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-2">
              Fast Response Time
            </h3>
            <p className="text-gray-300 text-sm">
              We typically respond to support requests within 2-4 business hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactSupportTab;
