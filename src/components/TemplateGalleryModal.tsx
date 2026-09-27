import React from 'react';
import { X, Sparkles, Check, ArrowRight } from 'lucide-react';
import { TEMPLATES, TemplateDefinition } from '../utils/templates';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TemplateDefinition) => void;
}

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Motion Graphics Templates</h2>
              <p className="text-xs text-zinc-400">Choose a pre-made motion template to start creating immediately</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gallery Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              className="group bg-zinc-950/70 border border-zinc-800 hover:border-purple-500/60 rounded-xl overflow-hidden flex flex-col transition-all hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-0.5"
            >
              {/* Visual Banner Thumbnail */}
              <div
                className={`h-36 bg-gradient-to-br ${tmpl.thumbnailColor} p-4 flex flex-col justify-between relative overflow-hidden`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase bg-black/40 backdrop-blur-md text-white px-2 py-0.5 rounded font-semibold border border-white/10">
                    {tmpl.badge}
                  </span>
                  <span className="text-[10px] font-mono text-white/80 bg-black/30 px-2 py-0.5 rounded">
                    {tmpl.project.duration}s
                  </span>
                </div>

                <div className="text-white drop-shadow-md">
                  <span className="text-[11px] font-medium tracking-wider uppercase text-white/80 block">
                    {tmpl.category}
                  </span>
                  <h3 className="font-extrabold text-base tracking-tight leading-tight">
                    {tmpl.name}
                  </h3>
                </div>
              </div>

              {/* Body & Description */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                  {tmpl.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-850">
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {tmpl.project.layers.length} layers · {tmpl.project.canvasWidth}x{tmpl.project.canvasHeight}
                  </span>
                  <button
                    onClick={() => onSelectTemplate(tmpl)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-sm transition-all group-hover:scale-105"
                  >
                    <span>Use Template</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
