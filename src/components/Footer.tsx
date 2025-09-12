import React from 'react';
import { Github, Linkedin, Globe } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-8 bg-gray-900 border-t border-gray-800 flex items-center justify-center px-4 z-40">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>Made by Nikunj Khitha</span>
        <span className="text-gray-600">•</span>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/Nikunj2003"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-gray-300 transition-colors"
            aria-label="GitHub"
          >
            <Github className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <a
            href="https://www.linkedin.com/in/nikunj-khitha"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-gray-300 transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">LinkedIn</span>
          </a>
          <a
            href="https://nikunj.tech/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-gray-300 transition-colors"
            aria-label="Portfolio"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Portfolio</span>
          </a>
        </div>
      </div>
    </footer>
  );
};