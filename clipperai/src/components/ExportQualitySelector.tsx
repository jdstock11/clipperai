import React from 'react';
import { Settings2 } from 'lucide-react';

interface ExportQualitySelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const ExportQualitySelector: React.FC<ExportQualitySelectorProps> = ({ value, onChange, disabled }) => {
  const options = [
    { id: 'Fast Preview', label: 'Fast Preview', desc: 'Low res, instant encode' },
    { id: 'Standard', label: 'Standard', desc: '720p, fast encode' },
    { id: 'HD 720p', label: 'HD 720p', desc: 'High quality (Recommended)' },
    { id: 'Full HD 1080p', label: 'Full HD 1080p', desc: 'Max quality, slow encode' }
  ];

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2 px-1 text-sm font-medium text-[var(--muted)]">
        <Settings2 size={14} />
        <span>Export Quality</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={`
              flex flex-col items-start p-3 rounded-xl border text-left transition-all
              ${value === opt.id 
                ? 'border-blue-500 bg-blue-500/10 text-white' 
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--border-hover)] hover:text-white'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <span className="font-bold text-sm mb-1">{opt.label}</span>
            <span className="text-[10px] opacity-70 leading-tight">{opt.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
