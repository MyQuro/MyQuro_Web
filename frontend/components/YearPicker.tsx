"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';

interface YearPickerProps {
  value: string;
  onChange: (year: string) => void;
  label: string;
  minYear?: number;
  maxYear?: number;
}

export function YearPicker({ 
  value, 
  onChange, 
  label,
  minYear = 1900,
  maxYear = new Date().getFullYear()
}: YearPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDecade, setSelectedDecade] = useState<number>(
    value ? Math.floor(parseInt(value) / 10) * 10 : Math.floor(maxYear / 10) * 10
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate decades
  const decades: number[] = [];
  for (let year = Math.floor(minYear / 10) * 10; year <= Math.floor(maxYear / 10) * 10; year += 10) {
    decades.push(year);
  }

  // Generate years for selected decade
  const years: number[] = [];
  for (let year = selectedDecade; year < selectedDecade + 10 && year <= maxYear; year++) {
    if (year >= minYear) {
      years.push(year);
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleYearSelect = (year: number) => {
    onChange(year.toString());
    setIsOpen(false);
  };

  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none bg-white flex items-center justify-between hover:border-gray-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>
            {value || 'Select Year'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
          
          {/* Decade Selector */}
          <div className="bg-gray-50 border-b border-gray-100 p-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Select Decade</label>
            <div className="grid grid-cols-4 gap-1 max-h-32 overflow-y-auto">
              {decades.reverse().map(decade => (
                <button
                  key={decade}
                  type="button"
                  onClick={() => setSelectedDecade(decade)}
                  className={`px-2 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    selectedDecade === decade
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {decade}s
                </button>
              ))}
            </div>
          </div>

          {/* Year Grid */}
          <div className="p-3 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-5 gap-2">
              {years.reverse().map(year => (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleYearSelect(year)}
                  className={`px-3 py-2 text-sm font-bold rounded-lg transition-all ${
                    value === year.toString()
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-900 hover:bg-red-50 hover:text-red-700'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
