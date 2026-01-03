import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-gray-800 border-t border-gray-700">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-8 md:space-y-0">
          <div className="flex items-center space-x-3">
            <p className="text-sm text-gray-400">Web Product Powered by</p>
            <a href="https://bmbez.com" target="_blank" rel="noopener noreferrer" title="Visit bmbez.com" className="hover:opacity-80 transition-opacity">
              <Image src="https://bmbez.com/wp-content/uploads/2024/04/BMBEZ__1_-removebg-preview-2.png" alt="BMBEZ Logo" width={120} height={30} className="h-auto" />
            </a>
          </div>
          <div className="text-center md:text-right">
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} AurahSell. All Rights Reserved.</p>
            <p className="text-xs text-gray-600 mt-1">BuidMore Build EZ</p>
          </div>
        </div>
      </div>
    </footer>
  );
}