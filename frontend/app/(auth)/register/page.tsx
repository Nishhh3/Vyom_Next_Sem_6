'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import StepIndicator from '@/components/StepIndicator';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName.trim()) {
      alert('Please enter your full name');
      return;
    }
    if (!formData.email.trim()) {
      alert('Please enter your email address');
      return;
    }
    if (!formData.mobile.trim() || formData.mobile.length !== 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }
    
    console.log('Registration data:', formData);
    router.push('/aadhaar-upload');
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (field === 'mobile') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const steps = [
    { number: 1, label: 'Registration', status: 'active' as const },
    { number: 2, label: 'Aadhaar', status: 'pending' as const },
    { number: 3, label: 'Face Auth', status: 'pending' as const },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black flex items-center justify-center px-4 pt-24 pb-12">
      <div className="w-full max-w-md">
        {/* Step Indicator */}
        <StepIndicator steps={steps} />

        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Create Your Account
          </h1>
          <p className="text-sm md:text-base text-gray-400">
            Complete KYC verification to start secure digital banking
          </p>
        </div>

        {/* Registration Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            {/* Full Name */}
            <FormInput
              label="Full Name"
              type="text"
              placeholder="Enter your full name as per Aadhaar"
              value={formData.fullName}
              onChange={handleChange('fullName')}
              required
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              }
            />

            {/* Email */}
            <FormInput
              label="Email Address"
              type="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={handleChange('email')}
              required
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              }
            />

            {/* Mobile Number */}
            <FormInput
              label="Mobile Number"
              type="tel"
              placeholder="10-digit mobile number"
              value={formData.mobile}
              onChange={handleChange('mobile')}
              required
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              }
            />

            {/* Info Box */}
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-gray-400">
                  Your login credentials will be automatically generated and sent to
                  your registered email after successful KYC verification.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <PrimaryButton type="submit" fullWidth>
              Proceed to Aadhaar Verification
            </PrimaryButton>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-red-500 hover:text-red-400 font-medium transition-colors"
              >
                Login here
              </Link>
            </p>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 flex items-center justify-center space-x-2">
            <svg
              className="w-4 h-4 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>Secured by blockchain technology and military-grade encryption</span>
          </p>
        </div>
      </div>
    </div>
  );
}