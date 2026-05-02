import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dna, Star } from 'lucide-react';

const HeroView = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Navigation Bar */}
      <nav className="w-full py-5 px-16 flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1f1f1f] rounded-xl">
            <Dna size={24} className="text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-[#1f1f1f]">
            CrimeNexus
          </span>
        </div>
        <div className="hidden md:flex items-center gap-10 text-[15px] text-[#444] font-semibold">
          <button className="hover:text-black transition-colors">Product</button>
          <button className="hover:text-black transition-colors">Why us</button>
          <button className="hover:text-black transition-colors">Cases</button>
          <button className="hover:text-black transition-colors">Blog</button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="text-[15px] font-semibold text-[#1f1f1f] border border-[#d4d4d4] px-6 py-3 rounded-full hover:bg-gray-50 transition-colors"
          >
            Log in
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="text-[15px] font-semibold text-white bg-[#1f1f1f] px-6 py-3 rounded-full hover:bg-black transition-colors"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex items-center px-16 max-w-screen-2xl mx-auto w-full py-10 gap-12">
        {/* Left Column */}
        <div className="flex-1 max-w-[600px]">
          <h1 className="text-[72px] font-black text-[#1a1a1a] tracking-tight leading-[1.05] mb-7">
            Investigate{' '}
            <span className="relative inline-block">
              smarter.
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 260 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 7 C65 2, 195 2, 258 7" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p className="text-[#555] text-xl leading-relaxed mb-10 max-w-[480px]">
            AI-powered digital forensics — analyze evidence, build timelines, uncover connections, and get answers from your case files instantly.
          </p>

          {/* CTA Row */}
          <div className="flex gap-4 mb-14">
            <button
              onClick={() => navigate('/signup')}
              className="bg-[#1f1f1f] text-white font-bold px-8 py-4 rounded-full text-[16px] hover:bg-black transition-colors shadow-md"
            >
              Start Investigating
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-[#1f1f1f] font-bold px-8 py-4 rounded-full text-[16px] border border-[#d4d4d4] hover:bg-gray-50 transition-colors"
            >
              Sign In
            </button>
          </div>

          {/* Stats Row */}
          <div className="flex items-start gap-10 pb-10 border-b border-gray-100 mb-8">
            <div>
              <p className="text-[44px] font-black text-[#1a1a1a] tracking-tight leading-none">98.4%</p>
              <p className="text-[#888] text-[15px] mt-2">Evidence accuracy</p>
            </div>
            <div className="w-px h-16 bg-gray-200 mt-1" />
            <div>
              <p className="text-[44px] font-black text-[#1a1a1a] tracking-tight leading-none">~10x</p>
              <p className="text-[#888] text-[15px] mt-2">Faster case analysis</p>
            </div>
          </div>

          {/* Star Rating */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map(i => (
                <Star key={i} size={22} className="text-[#1a1a1a] fill-[#1a1a1a]" />
              ))}
              <Star size={22} className="text-[#1a1a1a]" />
            </div>
            <span className="text-[16px] font-extrabold text-[#1a1a1a]">4.8</span>
            <span className="text-[15px] text-[#888]">Average user rating</span>
          </div>
        </div>

        {/* Right Column - Illustration */}
        <div className="flex-1 flex items-center justify-center">
          <img
            src="/illustrater.jpg"
            alt="CrimeNexus Forensic Dashboard Illustration"
            className="w-full max-w-[640px] h-auto object-contain"
          />
        </div>
      </main>
    </div>
  );
};

export default HeroView;
