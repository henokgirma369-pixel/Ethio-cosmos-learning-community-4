
import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    learn: [
      { to: '/learning', label: 'All Topics' },
      { to: '/tests', label: 'Quizzes' },
      { to: '/progress', label: 'Progress' },
    ],
    community: [
      { to: '/chat', label: 'Community Chat' },
      { to: '/materials', label: 'Materials' },
      { to: '/about', label: 'About Us' },
    ],
    legal: [
      { to: '#', label: 'Privacy Policy' },
      { to: '#', label: 'Terms of Service' },
    ],
  };

  return (
    <footer className="bg-slate-950 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-1.5">
              <span className="text-base">🌌</span>
              <span className="text-white font-bold text-xs">Ethio-Cosmos</span>
            </Link>
          </div>

          {/* Learn + Community Links (side by side horizontally) */}
          <div className="flex flex-row gap-6">
            {/* Learn Links */}
            <div>
              <h3 className="text-white font-semibold mb-1 text-xs">Learn</h3>
              <ul className="space-y-0.5">
                {footerLinks.learn.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-gray-400 hover:text-orange-500 transition-colors text-[11px]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Community Links */}
            <div>
              <h3 className="text-white font-semibold mb-1 text-xs">Community</h3>
              <ul className="space-y-0.5">
                {footerLinks.community.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-gray-400 hover:text-orange-500 transition-colors text-[11px]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-2 pt-2 flex flex-col md:flex-row items-center justify-between gap-1">
          <p className="text-gray-500 text-[11px]">
            {currentYear} Ethio-Cosmos Learning Community. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-gray-500 hover:text-gray-400 transition-colors text-[11px]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
