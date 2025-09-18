import React from 'react';
import { FaGraduationCap, FaMedal } from 'react-icons/fa';

const HeroSection = () => {
  const illustrationUrl =
    'https://images.unsplash.com/photo-1755548413928-4aaeba7c740e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBuZXR3b3JraW5nJTIwZWR1Y2F0aW9uJTIwbGVhcm5pbmd8ZW58MXx8fHwxNzU3OTI0ODEzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral';

  return (
    <div className="flex flex-col items-center justify-center text-center
                gap-3 md:gap-4 px-4 sm:px-6 py-12 h-full lg:min-h-screen
                text-white bg-gradient-to-br from-primary via-blue-600 to-secondary relative overflow-hidden">

      {/* Badge */}
      <div className="relative mb-2">
        <div className="h-16 w-16 rounded-[22px]
          [transform:scaleX(-1)]
          bg-white/10 backdrop-blur-sm ring-1 ring-white/20 shadow-lg
          flex items-center justify-center text-white">
          <FaGraduationCap className="text-3xl" />
        </div>
        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full
                        bg-yellow-400 ring-2 ring-white flex items-center justify-center">
          <FaMedal className="text-[12px] text-white" />
        </div>
      </div>

      {/* Headings */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight tracking-[-0.01em]">
        IMAA Institute
      </h1>
      <p className="mt-1 text-lg sm:text-xl md:text-2xl font-light leading-snug">
        Events &amp; Community Hub
      </p>

      {/* Image card */}
      <div className="w-full max-w-[520px] mt-4 px-2 sm:px-0">
        <img
          src={illustrationUrl}
          alt="Learning session"
          className="w-full rounded-2xl shadow-2xl ring-1 ring-white/15
                     object-cover object-left aspect-[16/9] sm:aspect-[16/7]"
        />
      </div>

      {/* Description */}
      <p className="mt-6 mx-auto px-2 sm:px-3
             max-w-[700px] md:max-w-[820px]
             text-center text-sm sm:text-base md:text-[15px]
             leading-relaxed text-white/95 tracking-[0.01em]
             drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">
        Connect with industry professionals, advance your career
        <br className="hidden md:block" />
        through continuous learning, and participate in transformative
        <br className="hidden md:block" />
        events that shape the future of your field.
      </p>
    </div>
  );
};

export default HeroSection;
